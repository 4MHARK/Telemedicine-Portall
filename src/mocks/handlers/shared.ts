/**
 * Shared handler plumbing: simulated latency, the auth guard, and the
 * ApiErrorBody response shape from docs/api-contract.md.
 */

import { delay, HttpResponse } from 'msw'

import type { ApiErrorBody, UUID } from '@/types'
import { patients } from '../db'
import { decodeToken, isTokenValid } from '../token'

/**
 * docs/api-contract.md, Simulated Conditions: 200–600 ms of random latency on
 * every handler. Left in place during tests too — the loading states the
 * integration tests assert on need it.
 */
export function latency(): Promise<void> {
  return delay(200 + Math.floor(Math.random() * 401))
}

/** docs/api-contract.md, Errors: always the ApiErrorBody shape. */
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

/**
 * docs/api-contract.md: `Authorization: Bearer <token>` on every route except
 * `/auth/*`.
 *
 * Returns a discriminated result rather than throwing, so a handler reads:
 *
 *     const auth = authenticate(request)
 *     if (!auth.ok) return auth.response
 */
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

/** Body parsing that answers 422 rather than throwing on malformed JSON. */
export async function readJson<T>(request: Request): Promise<JsonResult<T>> {
  try {
    return { ok: true, data: (await request.json()) as T }
  } catch {
    return { ok: false, response: apiError(422, 'VALIDATION', 'Request body must be valid JSON.') }
  }
}
