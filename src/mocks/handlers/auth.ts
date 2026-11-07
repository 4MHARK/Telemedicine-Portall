// Auth is a module-level mock session; see ./shared.ts.
import { http, HttpResponse } from 'msw'

import type { Patient } from '@/types'
import { mockSignIn, mockSignOut } from '../session'
import { apiError, authenticate, latency, readJson } from './shared'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await latency()

    const parsed = await readJson<{ email?: unknown; password?: unknown }>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return apiError(401, 'INVALID_CREDENTIALS', 'Enter both an email address and a password.')
    }

    const role = email.endsWith('@doctors.example') ? 'doctor' : 'patient'
    return HttpResponse.json(mockSignIn(role), {
      headers: { 'Set-Cookie': `mock_session=${role}; Path=/; SameSite=Lax` },
    })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await latency()

    const parsed = await readJson<Partial<Patient> & { password?: unknown }>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const session = mockSignIn('patient')
    if (!session.patient) return apiError(500, 'INTERNAL', 'No patient seed data available.')

    const patient: Patient = {
      ...session.patient,
      firstName: typeof body.firstName === 'string' ? body.firstName : session.patient.firstName,
      lastName: typeof body.lastName === 'string' ? body.lastName : session.patient.lastName,
      email: typeof body.email === 'string' ? body.email : session.patient.email,
      phone: typeof body.phone === 'string' ? body.phone : session.patient.phone,
    }

    return HttpResponse.json(
      { ...session, patient },
      {
        status: 201,
        headers: {
          'Set-Cookie': 'mock_session=patient; Path=/; SameSite=Lax',
        },
      },
    )
  }),

  http.post('/api/auth/logout', async () => {
    await latency()
    mockSignOut()
    return new HttpResponse(null, {
      status: 204,
      headers: {
        'Set-Cookie': 'mock_session=; Path=/; Max-Age=0; SameSite=Lax',
      },
    })
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await latency()
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(auth.session)
  }),
]
