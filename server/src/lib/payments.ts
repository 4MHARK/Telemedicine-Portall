import { randomBytes, randomUUID } from 'node:crypto'

import type { Appointment, Payment, Prisma } from '@prisma/client'

import { conflict, notFound } from './http.js'
import { createPaystackProvider, type PaystackProvider } from './paystack.js'
import { prisma } from './prisma.js'

const HOLD_TTL_MINUTES = Number(process.env.HOLD_TTL_MINUTES ?? 10)

export const HOLD_TTL_MS = (Number.isFinite(HOLD_TTL_MINUTES) ? HOLD_TTL_MINUTES : 10) * 60_000

export interface SettledPayment {
  payment: Payment
  appointment: Appointment
  confirmed: boolean
}

async function releaseSlotIfUnused(
  tx: Prisma.TransactionClient,
  slotId: string,
  appointmentId: string,
): Promise<void> {
  const other = await tx.appointment.findFirst({
    where: {
      slotId,
      id: { not: appointmentId },
      status: { in: ['PENDING_PAYMENT', 'SCHEDULED'] },
    },
    select: { id: true },
  })

  if (!other) {
    await tx.availabilitySlot.updateMany({
      where: { id: slotId, status: 'BOOKED' },
      data: { status: 'AVAILABLE' },
    })
  }
}

async function refundLatePayment(payment: Payment, provider: PaystackProvider): Promise<void> {
  try {
    const result = await provider.refund({
      reference: payment.reference,
      amountMinor: payment.amountMinor,
    })

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundStatus:
          result.status === 'processed'
            ? 'CONFIRMED'
            : result.status === 'failed'
              ? 'FAILED'
              : 'PENDING',
      },
    })
  } catch (error) {
    // The payment stays refund-pending so an operator can retry it.
    console.error('Late-payment refund failed.', error)
  }
}

export async function createOrReusePayment(
  appointmentId: string,
  patientId: string,
  email: string,
  provider: PaystackProvider,
): Promise<Payment> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId, status: 'PENDING_PAYMENT' },
  })

  if (!appointment) {
    throw notFound('Appointment not found or is not awaiting payment.')
  }
  if (!appointment.holdExpiresAt || appointment.holdExpiresAt <= new Date()) {
    throw conflict('HOLD_EXPIRED', 'This payment hold has expired.')
  }

  const succeeded = await prisma.payment.findFirst({
    where: { appointmentId, status: 'SUCCEEDED' },
    select: { id: true },
  })
  if (succeeded) {
    throw conflict('PAYMENT_ALREADY_SUCCEEDED', 'This appointment is already paid.')
  }

  const reusable = await prisma.payment.findFirst({
    where: {
      appointmentId,
      status: 'PENDING',
      accessCode: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (reusable) return reusable

  const reference = `TP-${appointment.id}-${randomBytes(6).toString('hex')}`
  const payment = await prisma.payment.create({
    data: {
      appointmentId,
      patientId,
      reference,
      amountMinor: appointment.amountMinor,
      currency: appointment.currency,
    },
  })

  const initialized = await provider.initialize({
    email,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    reference: payment.reference,
    metadata: { appointmentId, patientId },
  })

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      accessCode: initialized.accessCode,
      authorizationUrl: initialized.authorizationUrl,
    },
  })
}

export async function settlePayment(
  reference: string,
  provider: PaystackProvider,
  source: 'verify' | 'webhook',
): Promise<SettledPayment> {
  const existing = await prisma.payment.findUnique({
    where: { reference },
    include: { appointment: true },
  })
  if (!existing) throw notFound('Payment not found.')

  if (existing.status === 'SUCCEEDED') {
    if (existing.refundStatus === 'PENDING' && existing.appointment.status !== 'SCHEDULED') {
      // A previous settlement recorded the money but may have crashed before
      // starting the refund; retrying verify/webhook is safe.
      await refundLatePayment(existing, provider)
    }
    return {
      payment: existing,
      appointment: existing.appointment,
      confirmed: existing.appointment.status === 'SCHEDULED',
    }
  }

  const verification = await provider.verify(reference)
  if (verification.status !== 'success') {
    const failed = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'FAILED',
        failureReason: `Provider reported ${verification.status}.`,
      },
    })
    return { payment: failed, appointment: existing.appointment, confirmed: false }
  }

  if (
    verification.amountMinor !== existing.amountMinor ||
    verification.currency !== existing.currency
  ) {
    await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'FAILED',
        failureReason: 'The provider amount or currency did not match the booking.',
      },
    })
    throw conflict('PAYMENT_MISMATCH', 'The payment amount did not match the booking.')
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference },
      include: { appointment: true },
    })
    if (!payment) throw notFound('Payment not found.')

    if (payment.status === 'SUCCEEDED') {
      return {
        payment,
        appointment: payment.appointment,
        confirmed: payment.appointment.status === 'SCHEDULED',
      }
    }

    const now = new Date()
    const appointment = payment.appointment
    const holdValid =
      appointment.status === 'PENDING_PAYMENT' &&
      appointment.holdExpiresAt !== null &&
      appointment.holdExpiresAt > now

    if (holdValid) {
      const claimed = await tx.appointment.updateMany({
        where: {
          id: appointment.id,
          status: 'PENDING_PAYMENT',
          holdExpiresAt: { gt: now },
        },
        data: { status: 'SCHEDULED', confirmedAt: now },
      })

      if (claimed.count === 1) {
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCEEDED',
            verifiedAt: now,
            paidAt: now,
            providerReference: verification.providerReference,
          },
        })

        await tx.conversation.upsert({
          where: {
            patientId_providerId: {
              patientId: appointment.patientId,
              providerId: appointment.providerId,
            },
          },
          create: {
            id: `cnv_${randomUUID()}`,
            patientId: appointment.patientId,
            providerId: appointment.providerId,
            lastMessageAt: now,
            lastMessagePreview: '',
            patientUnreadCount: 0,
            providerUnreadCount: 0,
          },
          update: {},
        })

        const updatedAppointment = await tx.appointment.findUniqueOrThrow({
          where: { id: appointment.id },
        })
        return { payment: updatedPayment, appointment: updatedAppointment, confirmed: true }
      }
    }

    // Money arrived after the hold was released, or the appointment was
    // cancelled. Never revive the slot; record the money and refund it.
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCEEDED',
        verifiedAt: now,
        paidAt: now,
        providerReference: verification.providerReference,
        refundStatus: 'PENDING',
      },
    })

    if (appointment.status === 'PENDING_PAYMENT') {
      await tx.appointment.updateMany({
        where: { id: appointment.id, status: 'PENDING_PAYMENT' },
        data: { status: 'EXPIRED' },
      })
      await releaseSlotIfUnused(tx, appointment.slotId, appointment.id)
    }

    const updatedAppointment = await tx.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
    })
    return { payment: updatedPayment, appointment: updatedAppointment, confirmed: false }
  })

  let finalPayment = result.payment
  if (!result.confirmed && result.payment.refundStatus === 'PENDING') {
    // A verified success that cannot be honoured should start the refund path.
    // The payment remains PENDING until Paystack confirms.
    await refundLatePayment(result.payment, provider)
    finalPayment =
      (await prisma.payment.findUnique({ where: { id: result.payment.id } })) ?? result.payment
  }

  console.info(`Payment settlement via ${source}: ${reference} confirmed=${result.confirmed}`)
  return { ...result, payment: finalPayment }
}

/**
 * Starts the refund for a paid appointment that was cancelled. The payment row
 * is marked PENDING by the cancellation transaction; this calls Paystack and
 * records whatever the provider says. Failures stay visible as pending.
 */
export async function refundCancelledPayment(appointmentId: string): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: {
      appointmentId,
      status: 'SUCCEEDED',
      refundStatus: 'PENDING',
    },
  })
  if (!payment) return

  await refundLatePayment(payment, createPaystackProvider())
}

export async function markRefundFromWebhook(
  reference: string,
  status: 'processed' | 'failed' | 'pending' | string,
): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ reference }, { providerReference: reference }],
    },
    select: { id: true },
  })
  if (!payment) return

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refundStatus:
        status === 'processed' ? 'CONFIRMED' : status === 'failed' ? 'FAILED' : 'PENDING',
    },
  })
}

export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date()
  const expired = await prisma.appointment.findMany({
    where: { status: 'PENDING_PAYMENT', holdExpiresAt: { lte: now } },
    take: 100,
    select: { id: true, slotId: true },
  })

  for (const appointment of expired) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.updateMany({
        where: {
          id: appointment.id,
          status: 'PENDING_PAYMENT',
          holdExpiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      })
      if (updated.count === 0) return

      await tx.payment.updateMany({
        where: { appointmentId: appointment.id, status: 'PENDING' },
        data: { status: 'ABANDONED' },
      })
      await releaseSlotIfUnused(tx, appointment.slotId, appointment.id)
    })
  }

  return expired.length
}
