/**
 * docs/api-contract.md § Specialties.
 *
 * Public, unlike the rest of the API: docs/routes.md marks /doctors and
 * /doctors/:providerId public, and those pages cannot render without this
 * list. See the conflict note in providers.ts.
 */

import { http, HttpResponse } from 'msw'

import { specialties } from '../db'
import { latency } from './shared'

export const specialtyHandlers = [
  // GET /specialties — ~12 specialties, stable across reloads (seeded)
  http.get('/api/specialties', async () => {
    await latency()
    return HttpResponse.json(specialties)
  }),
]
