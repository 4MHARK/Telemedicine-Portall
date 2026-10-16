/**
 * docs/api-contract.md § Providers.
 *
 * NOTE — docs conflict, resolved in favour of routes.md:
 *   api-contract.md: "Auth: Authorization: Bearer <token> on every route
 *                     except /auth/*"
 *   routes.md:       "/doctors public", "/doctors/:providerId public"
 * Both cannot hold: a public doctor directory whose data endpoint demands a
 * token would bounce every anonymous visitor to the login screen. These three
 * endpoints are therefore left unauthenticated to match the public routes,
 * and the issue is reported for a docs decision.
 */

import { http, HttpResponse } from 'msw'

import { providers, slots, specialties } from '../db'
import { apiError, latency } from './shared'

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 50

/**
 * docs/api-contract.md names the three `availability` values but not their
 * bounds. These are our definition, rolling forward from "now" — the code
 * review should confirm them.
 */
const AVAILABILITY_WINDOW_MS = {
  now: 2 * 60 * 60 * 1000,
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
} as const

type AvailabilityValue = keyof typeof AVAILABILITY_WINDOW_MS

function isAvailabilityValue(value: string): value is AvailabilityValue {
  return value in AVAILABILITY_WINDOW_MS
}

export const providerHandlers = [
  // GET /providers — q, specialty (repeated), availability, consultationType,
  // page, pageSize -> Paginated<Provider>
  http.get('/api/providers', async ({ request }) => {
    await latency()

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const specialtySlugs = url.searchParams.getAll('specialty')
    const availability = url.searchParams.get('availability')
    const consultationType = url.searchParams.get('consultationType')

    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const requestedSize = Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE
    const pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE)

    const specialtyIds = new Set(
      specialties.filter((s) => specialtySlugs.includes(s.slug)).map((s) => s.id),
    )

    const filtered = providers.filter((provider) => {
      if (q) {
        const haystack = `${provider.firstName} ${provider.lastName} ${provider.bio}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      // Multi-select reads as OR — a provider matches if it holds any of the
      // selected specialties. api-contract.md does not say; reported.
      if (specialtyIds.size > 0 && !provider.specialtyIds.some((id) => specialtyIds.has(id))) {
        return false
      }

      if (availability && isAvailabilityValue(availability)) {
        if (!provider.nextAvailableAt) return false
        const untilAvailable = Date.parse(provider.nextAvailableAt) - Date.now()
        if (untilAvailable > AVAILABILITY_WINDOW_MS[availability]) return false
      }

      if (consultationType && !provider.consultationTypes.some((t) => t === consultationType)) {
        return false
      }

      return true
    })

    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return HttpResponse.json({
      items,
      page,
      pageSize,
      total: filtered.length,
      hasNext: start + items.length < filtered.length,
    })
  }),

  // GET /providers/:id
  http.get('/api/providers/:id', async ({ params }) => {
    await latency()

    const provider = providers.find((p) => p.id === String(params.id))
    if (!provider) return apiError(404, 'NOT_FOUND', 'Provider not found.')

    return HttpResponse.json(provider)
  }),

  // GET /providers/:id/slots?from=&to= — both required
  http.get('/api/providers/:id/slots', async ({ params, request }) => {
    await latency()

    const provider = providers.find((p) => p.id === String(params.id))
    if (!provider) return apiError(404, 'NOT_FOUND', 'Provider not found.')

    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const fieldErrors: Record<string, string[]> = {}
    if (!from) fieldErrors.from = ['`from` is required.']
    if (!to) fieldErrors.to = ['`to` is required.']
    if (!from || !to) {
      return apiError(422, 'VALIDATION', 'Query parameters are invalid.', fieldErrors)
    }

    const fromMs = Date.parse(from)
    const toMs = Date.parse(to)
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      return apiError(422, 'VALIDATION', 'Query parameters are invalid.', {
        from: ['`from` must be an ISO date string.'],
        to: ['`to` must be an ISO date string.'],
      })
    }

    const result = slots
      .filter(
        (slot) =>
          slot.providerId === provider.id &&
          Date.parse(slot.start) >= fromMs &&
          Date.parse(slot.start) <= toMs,
      )
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))

    return HttpResponse.json(result)
  }),
]
