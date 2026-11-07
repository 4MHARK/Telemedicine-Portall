import { Router } from 'express'
import { z } from 'zod'

import {
  AppError,
  asyncHandler,
  badRequest,
  conflict,
  forbidden,
  notFound,
  routeParam,
} from '../lib/http.js'
import { refundCancelledPayment } from '../lib/payments.js'
import { prisma } from '../lib/prisma.js'
import { serializeAppointment } from '../lib/serialize.js'
import { currentPatient, requirePatient } from '../middleware/auth.js'
import { parseBody, parseQuery } from '../middleware/validate.js'

const CONSULTATION_ENUM = {
  video: 'VIDEO',
  phone: 'PHONE',
  async: 'ASYNC',
} as const

const STATUS_ENUM = {
  pending_payment: 'PENDING_PAYMENT',
  scheduled: 'SCHEDULED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  no_show: 'NO_SHOW',
  expired: 'EXPIRED',
} as const

type StatusValue = keyof typeof STATUS_ENUM

const HOLD_TTL_MINUTES = Number(process.env.HOLD_TTL_MINUTES ?? 10)
const HOLD_TTL_MS = (Number.isFinite(HOLD_TTL_MINUTES) ? HOLD_TTL_MINUTES : 10) * 60_000

const createSchema = z.object({
  providerId: z.string().min(1, '`providerId` is required.'),
  slotId: z.string().min(1, '`slotId` is required.'),
  consultationType: z.enum(['video', 'phone', 'async'], {
    error: '`consultationType` must be one of video, phone, async.',
  }),
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(500, 'Keep the reason under 500 characters.'),
})

const cancelSchema = z.object({
  status: z.string().optional(),
  cancelReason: z
    .string()
    .trim()
    .max(500, 'Keep the cancellation reason under 500 characters.')
    .optional(),
})

const listQuerySchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
})

function isStatusValue(value: string): value is StatusValue {
  return value in STATUS_ENUM
}

function appointmentId(req: Parameters<typeof currentPatient>[0]): string {
  return routeParam(req, 'id')
}

export const appointmentsRouter = Router()

appointmentsRouter.use(requirePatient)

appointmentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const body = parseBody(createSchema, req)

    const provider = await prisma.provider.findFirst({
      where: { id: body.providerId, isActive: true },
      select: { id: true, consultationTypes: true },
    })
    if (!provider) throw notFound('Provider not found.')

    const consultationType = CONSULTATION_ENUM[body.consultationType]
    if (!provider.consultationTypes.includes(consultationType)) {
      throw badRequest('Request body failed schema validation.', {
        consultationType: ['That provider does not offer this consultation type.'],
      })
    }

    const fee = await prisma.consultationFee.findUnique({
      where: {
        providerId_consultationType: { providerId: provider.id, consultationType },
      },
    })
    if (!fee) {
      throw badRequest('Request body failed schema validation.', {
        consultationType: ['This provider has not set a fee for that consultation type.'],
      })
    }

    const slot = await prisma.availabilitySlot.findUnique({ where: { id: body.slotId } })
    if (!slot) throw notFound('Slot not found.')

    if (slot.providerId !== provider.id) {
      throw badRequest('Request body failed schema validation.', {
        slotId: ['That slot does not belong to this provider.'],
      })
    }

    if (slot.status !== 'AVAILABLE') {
      throw conflict('SLOT_TAKEN', 'That slot has already been booked.')
    }

    const appointment = await prisma.$transaction(async (tx) => {
      // Conditional update: if another request claimed the slot first, count is
      // zero and no appointment is created.
      const claimed = await tx.availabilitySlot.updateMany({
        where: { id: slot.id, status: 'AVAILABLE' },
        data: { status: 'BOOKED' },
      })
      if (claimed.count === 0) {
        throw conflict('SLOT_TAKEN', 'That slot has already been booked.')
      }

      return tx.appointment.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          slotId: slot.id,
          consultationType,
          status: 'PENDING_PAYMENT',
          reason: body.reason,
          scheduledAt: slot.start,
          durationMinutes: Math.round((slot.end.getTime() - slot.start.getTime()) / 60_000),
          amountMinor: fee.amountMinor,
          currency: fee.currency,
          holdExpiresAt: new Date(Date.now() + HOLD_TTL_MS),
        },
      })
    })

    res.status(201).json(serializeAppointment(appointment))
  }),
)

appointmentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const query = parseQuery(listQuerySchema, req)
    const rawStatus = Array.isArray(query.status) ? query.status[0] : query.status

    if (rawStatus && !isStatusValue(rawStatus)) {
      throw badRequest('Query parameters are invalid.', {
        status: [
          '`status` must be one of pending_payment, scheduled, completed, cancelled, no_show, expired.',
        ],
      })
    }

    const status = rawStatus && isStatusValue(rawStatus) ? STATUS_ENUM[rawStatus] : undefined

    const rows = await prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        ...(status ? { status } : {}),
      },
      orderBy: { scheduledAt: 'desc' },
    })

    res.json(rows.map(serializeAppointment))
  }),
)

appointmentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId(req) },
    })

    if (!appointment) throw notFound('Appointment not found.')
    if (appointment.patientId !== patient.id) {
      throw forbidden('This appointment belongs to another patient.')
    }

    res.json(serializeAppointment(appointment))
  }),
)

appointmentsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const body = parseBody(cancelSchema, req)

    if (body.status !== 'cancelled') {
      throw badRequest('Request body failed schema validation.', {
        status: ['Only `cancelled` is a supported transition.'],
      })
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId(req) },
    })
    if (!appointment) throw notFound('Appointment not found.')
    if (appointment.patientId !== patient.id) {
      throw forbidden('This appointment belongs to another patient.')
    }
    if (appointment.status !== 'PENDING_PAYMENT' && appointment.status !== 'SCHEDULED') {
      throw new AppError(
        409,
        'VALIDATION',
        `Cannot cancel an appointment with status "${appointment.status.toLowerCase()}".`,
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          ...(body.cancelReason ? { cancelReason: body.cancelReason } : {}),
        },
      })

      // Cancelling frees the slot, mirroring the mock.
      await tx.availabilitySlot.updateMany({
        where: { id: appointment.slotId, status: 'BOOKED' },
        data: { status: 'AVAILABLE' },
      })

      // An unpaid hold has no money to refund. A paid cancellation is marked
      // refund-pending; Paystack confirms the refund separately.
      await tx.payment.updateMany({
        where: { appointmentId: appointment.id, status: 'PENDING' },
        data: { status: 'ABANDONED' },
      })
      await tx.payment.updateMany({
        where: {
          appointmentId: appointment.id,
          status: 'SUCCEEDED',
          refundStatus: 'NOT_REQUIRED',
        },
        data: { refundStatus: 'PENDING' },
      })

      return next
    })

    if (appointment.status === 'SCHEDULED') {
      await refundCancelledPayment(appointment.id).catch((error: unknown) => {
        console.error('Cancellation refund failed.', error)
      })
    }

    res.json(serializeAppointment(updated))
  }),
)
