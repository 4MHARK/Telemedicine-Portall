// Latency, auth guard, and the ApiErrorBody shape.
import { delay, HttpResponse } from 'msw'

import type { ApiErrorBody, UUID } from '@/types'
import { decodeToken, isTokenValid } from '@/lib/jwt'
import { patients } from '../db'

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

export type AuthResult = { ok: true; patientId: UUID } | { ok: false; response: Response }

// Bearer token check. Returns a result so handlers can early-return.
export function authenticate(request: Request): AuthResult {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

  const payload = token ? decodeToken(token) : null
  if (!payload || !isTokenValid(payload)) {
    return {
      ok: false,
      response: apiError(401, 'UNAUTHORIZED', 'Missing, invalid or expired token.'),
    }
  }

  const patient = patients.find((p) => p.id === payload.sub)
  if (!patient) {
    return { ok: false, response: apiError(401, 'UNAUTHORIZED', 'Token subject is unknown.') }
  }

  return { ok: true, patientId: patient.id }
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
