// Latency, auth guard, and the ApiErrorBody shape.
import { delay, HttpResponse } from 'msw'

import type { ApiErrorBody, AuthSession, UUID } from '@/types'
import { mockSessionForRequest } from '../session'

// 200-600ms. Kept on in tests too, otherwise loading states are never visible.
export function latency(): Promise<void> {
  return delay(200 + Math.floor(Math.random() * 401))
}

// Errors always use the ApiErrorBody shape.
export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): Response {
  const body: ApiErrorBody = fieldErrors ? { code, message, fieldErrors } : { code, message }
  return HttpResponse.json(body, { status })
}

export type AuthResult = { ok: true; session: AuthSession } | { ok: false; response: Response }

/**
 * The browser mock keeps a module-level session instead of an HttpOnly cookie:
 * jsdom cannot set cookies from a service worker. Tests call mockSignIn() to
 * establish the same role the real cookie would carry.
 */
export function authenticate(request: Request): AuthResult {
  const session = mockSessionForRequest(request)
  if (!session) {
    return {
      ok: false,
      response: apiError(401, 'UNAUTHORIZED', 'Missing, invalid or expired session.'),
    }
  }
  return { ok: true, session }
}

export function patientIdOf(session: AuthSession): UUID {
  const patientId = session.patient?.id
  if (!patientId) throw new Error('The mock session is not a patient session.')
  return patientId
}

export function providerIdOf(session: AuthSession): UUID {
  const providerId = session.provider?.id
  if (!providerId) throw new Error('The mock session is not a doctor session.')
  return providerId
}

export type JsonResult<T> = { ok: true; data: T } | { ok: false; response: Response }

// 422 instead of throwing on bad JSON.
export async function readJson<T>(request: Request): Promise<JsonResult<T>> {
  try {
    return { ok: true, data: (await request.json()) as T }
  } catch {
    return { ok: false, response: apiError(422, 'VALIDATION', 'Request body must be valid JSON.') }
  }
}
