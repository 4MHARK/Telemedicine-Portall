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
