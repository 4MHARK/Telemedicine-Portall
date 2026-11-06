import { Router } from 'express'
import { z } from 'zod'

import { asyncHandler, badRequest, notFound, routeParam } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { serializeProvider, serializeSlot } from '../lib/serialize.js'
import { parseQuery } from '../middleware/validate.js'

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 50

// The contract names the values but not the windows; these match the mock.
const AVAILABILITY_WINDOWS = {
  now: 2 * 60 * 60 * 1000,
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
} as const

type AvailabilityValue = keyof typeof AVAILABILITY_WINDOWS

function isAvailabilityValue(value: string): value is AvailabilityValue {
  return value in AVAILABILITY_WINDOWS
}

const stringParam = z.union([z.string(), z.array(z.string())]).optional()

const providerListSchema = z.object({
  q: stringParam,
  specialty: stringParam,
  availability: stringParam,
  consultationType: stringParam,
  page: stringParam,
  pageSize: stringParam,
})

const slotQuerySchema = z.object({
  from: stringParam,
  to: stringParam,
})

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function arrayParam(value: string | string[] | undefined): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item) => item.length > 0)
  return []
}

export const providersRouter = Router()

// Public directory. Filter semantics are ported from the mock handler:
// q matches name + bio, specialty is OR, availability is a rolling window.
providersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(providerListSchema, req)
    const q = (firstParam(query.q) ?? '').trim().toLowerCase()
    const specialtySlugs = arrayParam(query.specialty)
    const availabilityRaw = firstParam(query.availability)
    const availability =
      availabilityRaw && isAvailabilityValue(availabilityRaw) ? availabilityRaw : null
    const consultationType = firstParam(query.consultationType) ?? ''
    const page = Math.max(1, Number(firstParam(query.page)) || 1)
    const requestedSize = Number(firstParam(query.pageSize)) || DEFAULT_PAGE_SIZE
    const pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE)

    const [specialties, providerRows] = await Promise.all([
      prisma.specialty.findMany({ select: { id: true, slug: true } }),
      prisma.provider.findMany({
        orderBy: { id: 'asc' },
        include: {
          specialties: { select: { specialtyId: true } },
          slots: {
            where: { status: 'AVAILABLE', start: { gt: new Date() } },
            orderBy: { start: 'asc' },
            take: 1,
            select: { start: true },
          },
        },
      }),
    ])

    const specialtyIds = new Set(
      specialties.filter((specialty) => specialtySlugs.includes(specialty.slug)).map((s) => s.id),
    )

    const filtered = providerRows.filter((provider) => {
      if (q) {
        const haystack = `${provider.firstName} ${provider.lastName} ${provider.bio}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      if (specialtyIds.size > 0) {
        const ids = provider.specialties.map((entry) => entry.specialtyId)
        if (!ids.some((id) => specialtyIds.has(id))) return false
      }

      const nextStart = provider.slots[0]?.start ?? null
      if (availability) {
        if (!nextStart) return false
        if (nextStart.getTime() - Date.now() > AVAILABILITY_WINDOWS[availability]) return false
      }

      if (
        consultationType &&
        !provider.consultationTypes.some((type) => type.toLowerCase() === consultationType)
      ) {
        return false
      }

      return true
    })

    const start = (page - 1) * pageSize
    const pageRows = filtered.slice(start, start + pageSize)

    res.json({
      items: pageRows.map((provider) =>
        serializeProvider(
          provider,
          provider.specialties.map((entry) => entry.specialtyId).sort(),
          provider.slots[0]?.start ?? null,
        ),
      ),
      page,
      pageSize,
      total: filtered.length,
      hasNext: start + pageRows.length < filtered.length,
    })
  }),
)

providersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const provider = await prisma.provider.findUnique({
      where: { id: routeParam(req, 'id') },
      include: {
        specialties: { select: { specialtyId: true } },
        slots: {
          where: { status: 'AVAILABLE', start: { gt: new Date() } },
          orderBy: { start: 'asc' },
          take: 1,
          select: { start: true },
        },
      },
    })

    if (!provider) throw notFound('Provider not found.')

    res.json(
      serializeProvider(
        provider,
        provider.specialties.map((entry) => entry.specialtyId).sort(),
        provider.slots[0]?.start ?? null,
      ),
    )
  }),
)

providersRouter.get(
  '/:id/slots',
  asyncHandler(async (req, res) => {
    const query = parseQuery(slotQuerySchema, req)
    const from = firstParam(query.from) ?? ''
    const to = firstParam(query.to) ?? ''

    const fieldErrors: Record<string, string[]> = {}
    if (!from) fieldErrors.from = ['`from` is required.']
    if (!to) fieldErrors.to = ['`to` is required.']

    const fromMs = from ? Date.parse(from) : Number.NaN
    const toMs = to ? Date.parse(to) : Number.NaN
    if (from && Number.isNaN(fromMs)) fieldErrors.from = ['`from` must be an ISO date string.']
    if (to && Number.isNaN(toMs)) fieldErrors.to = ['`to` must be an ISO date string.']

    if (Object.keys(fieldErrors).length > 0) {
      throw badRequest('Query parameters are invalid.', fieldErrors)
    }

    const provider = await prisma.provider.findUnique({
      where: { id: routeParam(req, 'id') },
      select: { id: true },
    })
    if (!provider) throw notFound('Provider not found.')

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        providerId: provider.id,
        start: { gte: new Date(fromMs), lte: new Date(toMs) },
      },
      orderBy: { start: 'asc' },
    })

    res.json(slots.map(serializeSlot))
  }),
)
