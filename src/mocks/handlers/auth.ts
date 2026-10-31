// /auth/me validates the token — it's what rehydrates the session on boot.
import { http, HttpResponse } from 'msw'

import { patients } from '../db'
import { issueSession } from '../token'
import { apiError, authenticate, latency, readJson } from './shared'

export const authHandlers = [
  // POST /auth/login — "any non-empty credentials succeed; token expires in 60 min"
  http.post('/api/auth/login', async ({ request }) => {
    await latency()

    const parsed = await readJson<{ email?: unknown; password?: unknown }>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return apiError(401, 'INVALID_CREDENTIALS', 'Enter both an email address and a password.')
    }

    const patient = patients[0]
    if (!patient) return apiError(500, 'INTERNAL', 'No patient seed data available.')

    return HttpResponse.json(issueSession(patient))
  }),

  // POST /auth/logout — 204
  http.post('/api/auth/logout', async () => {
    await latency()
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /auth/me — 200 Patient, or 401 when the token is missing/invalid/expired
  http.get('/api/auth/me', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const patient = patients.find((p) => p.id === auth.patientId)
    if (!patient) return apiError(401, 'UNAUTHORIZED', 'Token subject is unknown.')

    return HttpResponse.json(patient)
  }),
]
