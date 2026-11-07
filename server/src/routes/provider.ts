import { randomUUID } from 'node:crypto'

import { Router } from 'express'
import { z } from 'zod'

import { asyncHandler, badRequest, conflict, notFound, routeParam } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { serializeAppointment, serializeProviderProfile, serializeSlot } from '../lib/serialize.js'
import { currentAccount, currentProvider, requireDoctor } from '../middleware/auth.js'
import { parseBody, parseQuery } from '../middleware/validate.js'

const consultationTypeSchema = z.enum(['video', 'phone', 'async'])
const consultationTypeEnum = {
  video: 'VIDEO',
  phone: 'PHONE',
  async: 'ASYNC',
} as const

const profileSchema = z.object({
  title: z.string().trim().min(1).max(20).optional(),
  bio: z.string().trim().min(1).max(2000).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(20).optional(),
  consultationTypes: z.array(consultationTypeSchema).min(1).max(3).optional(),
})

const feeSchema = z.object({
  consultationType: consultationTypeSchema,
  amountMinor: z.number().int().min(100).max(100_000_000),
})

const feesSchema = z.object({
  fees: z.array(feeSchema).min(1).max(3),
})

const slotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
})

const slotQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

const appointmentStatusSchema = z.enum([
  'pending_payment',
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
  'expired',
])
const appointmentStatusEnum = {
  pending_payment: 'PENDING_PAYMENT',
  scheduled: 'SCHEDULED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  no_show: 'NO_SHOW',
  expired: 'EXPIRED',
} as const

const appointmentListSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
})

const appointmentUpdateSchema = z.object({
  status: z.enum(['completed', 'no_show']),
  notes: z.string().trim().max(1000).optional(),
})

function firstParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

function serializeFee(fee: { consultationType: string; amountMinor: number; currency: string }) {
  return {
    consultationType: fee.consultationType.toLowerCase(),
    amountMinor: fee.amountMinor,
    currency: fee.currency,
  }
}

function toDate(value: string, field: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw badRequest('Request body failed schema validation.', {
      [field]: ['Use an ISO date-time value.'],
    })
  }
  return date
}

export const providerRouter = Router()

providerRouter.use(requireDoctor)

providerRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    res.json(serializeProviderProfile(provider, currentAccount(req).email))
  }),
)

providerRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const body = parseBody(profileSchema, req)

    const updated = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.bio ? { bio: body.bio } : {}),
        ...(body.languages ? { languages: body.languages } : {}),
        ...(body.consultationTypes
          ? {
              consultationTypes: body.consultationTypes.map((type) => consultationTypeEnum[type]),
            }
          : {}),
      },
      include: { fees: true, specialties: { select: { specialtyId: true } } },
    })

    res.json(serializeProviderProfile(updated, currentAccount(req).email))
  }),
)

providerRouter.get(
  '/fees',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    res.json(provider.fees.map(serializeFee))
  }),
)

providerRouter.put(
  '/fees',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const body = parseBody(feesSchema, req)
    const offered = new Set(provider.consultationTypes)

    for (const fee of body.fees) {
      if (!offered.has(consultationTypeEnum[fee.consultationType])) {
        throw badRequest('Request body failed schema validation.', {
          fees: [`The provider does not offer ${fee.consultationType}.`],
        })
      }
    }

    await prisma.$transaction(
      body.fees.map((fee) =>
        prisma.consultationFee.upsert({
          where: {
            providerId_consultationType: {
              providerId: provider.id,
              consultationType: consultationTypeEnum[fee.consultationType],
            },
          },
          create: {
            providerId: provider.id,
            consultationType: consultationTypeEnum[fee.consultationType],
            amountMinor: fee.amountMinor,
            currency: 'NGN',
          },
          update: { amountMinor: fee.amountMinor, currency: 'NGN' },
        }),
      ),
    )

    const fees = await prisma.consultationFee.findMany({
      where: { providerId: provider.id },
      orderBy: { consultationType: 'asc' },
    })
    res.json(fees.map(serializeFee))
  }),
)

providerRouter.get(
  '/slots',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const query = parseQuery(slotQuerySchema, req)
    const from = firstParam(query.from)
    const to = firstParam(query.to)

    if (!from || !to) {
      const fieldErrors: Record<string, string[]> = {}
      if (!from) fieldErrors.from = ['`from` is required.']
      if (!to) fieldErrors.to = ['`to` is required.']
      throw badRequest('Query parameters are invalid.', fieldErrors)
    }

    const fromDate = toDate(from, 'from')
    const toDateValue = toDate(to, 'to')
    if (fromDate >= toDateValue) {
      throw badRequest('Query parameters are invalid.', {
        to: ['`to` must be after `from`.'],
      })
    }

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        providerId: provider.id,
        start: { gte: fromDate, lte: toDateValue },
      },
      orderBy: { start: 'asc' },
    })
    res.json(slots.map(serializeSlot))
  }),
)

providerRouter.post(
  '/slots',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const body = parseBody(slotSchema, req)
    const start = toDate(body.start, 'start')
    const end = toDate(body.end, 'end')
    const minutes = (end.getTime() - start.getTime()) / 60_000

    if (start <= new Date()) {
      throw badRequest('Request body failed schema validation.', {
        start: ['Choose a future time.'],
      })
    }
    if (minutes < 15 || minutes > 120) {
      throw badRequest('Request body failed schema validation.', {
        end: ['Slots must be between 15 and 120 minutes.'],
      })
    }

    const slot = await prisma.$transaction(async (tx) => {
      const overlap = await tx.availabilitySlot.findFirst({
        where: {
          providerId: provider.id,
          status: { not: 'BLOCKED' },
          start: { lt: end },
          end: { gt: start },
        },
        select: { id: true },
      })
      if (overlap) throw conflict('SLOT_OVERLAP', 'That time overlaps an existing slot.')

      return tx.availabilitySlot.create({
        data: {
          id: `slot_${randomUUID()}`,
          providerId: provider.id,
          start,
          end,
        },
      })
    })

    res.status(201).json(serializeSlot(slot))
  }),
)

providerRouter.delete(
  '/slots/:id',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const slot = await prisma.availabilitySlot.findUnique({
      where: { id: routeParam(req, 'id') },
    })

    if (!slot) throw notFound('Slot not found.')
    if (slot.providerId !== provider.id) throw notFound('Slot not found.')
    if (slot.status !== 'AVAILABLE') {
      throw conflict('SLOT_NOT_AVAILABLE', 'Only an unbooked slot can be deleted.')
    }

    await prisma.availabilitySlot.delete({ where: { id: slot.id } })
    res.status(204).end()
  }),
)

providerRouter.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const query = parseQuery(appointmentListSchema, req)
    const rawStatus = firstParam(query.status)

    if (rawStatus && !appointmentStatusSchema.safeParse(rawStatus).success) {
      throw badRequest('Query parameters are invalid.', {
        status: ['Unknown appointment status.'],
      })
    }

    const rows = await prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        ...(rawStatus
          ? { status: appointmentStatusEnum[rawStatus as keyof typeof appointmentStatusEnum] }
          : {}),
      },
      orderBy: { scheduledAt: 'desc' },
      include: { patient: { select: { firstName: true, lastName: true } } },
    })

    res.json(
      rows.map((row) => ({
        ...serializeAppointment(row),
        patientName: `${row.patient.firstName} ${row.patient.lastName}`,
      })),
    )
  }),
)

providerRouter.patch(
  '/appointments/:id',
  asyncHandler(async (req, res) => {
    const provider = currentProvider(req)
    const body = parseBody(appointmentUpdateSchema, req)
    const appointment = await prisma.appointment.findUnique({
      where: { id: routeParam(req, 'id') },
    })

    if (!appointment) throw notFound('Appointment not found.')
    if (appointment.providerId !== provider.id) {
      throw notFound('Appointment not found.')
    }
    if (appointment.status !== 'SCHEDULED') {
      throw conflict(
        'INVALID_TRANSITION',
        'Only a scheduled appointment can be completed or marked no-show.',
      )
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: body.status === 'completed' ? 'COMPLETED' : 'NO_SHOW',
        ...(body.notes ? { notes: body.notes } : {}),
      },
    })

    res.json(serializeAppointment(updated))
  }),
)
