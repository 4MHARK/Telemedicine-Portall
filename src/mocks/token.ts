/**
 * Mock JWT.
 *
 * docs/decisions.md row 4: a mock JWT is stored in localStorage, and route
 * guards read it. There is no signature to verify — the third segment is a
 * placeholder — so the token is only ever decoded, never trusted.
 */

import type { AuthSession, ISODateString, JwtPayload, Patient, UUID } from '@/types'

/** docs/api-contract.md: "token expires in 60 min". */
export const TOKEN_TTL_MINUTES = 60

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
}

export function issueSession(patient: Patient, ttlMinutes = TOKEN_TTL_MINUTES): AuthSession {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + ttlMinutes * 60

  const payload: JwtPayload = {
    sub: patient.id,
    role: 'patient',
    iat: issuedAt,
    exp: expiresAt,
  }

  const token = [
    base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    base64UrlEncode(JSON.stringify(payload)),
    'mock-signature',
  ].join('.')

  const expiresAtIso: ISODateString = new Date(expiresAt * 1000).toISOString()

  return { token, expiresAt: expiresAtIso, patient }
}

/** Returns the payload only if the token is structurally well-formed. */
export function decodeToken(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const payloadPart = parts[1]
  if (payloadPart === undefined) return null

  try {
    const parsed: unknown = JSON.parse(base64UrlDecode(payloadPart))
    if (typeof parsed !== 'object' || parsed === null) return null

    const candidate = parsed as Partial<JwtPayload>
    if (
      typeof candidate.sub !== 'string' ||
      typeof candidate.iat !== 'number' ||
      typeof candidate.exp !== 'number'
    ) {
      return null
    }

    return { sub: candidate.sub as UUID, role: 'patient', iat: candidate.iat, exp: candidate.exp }
  } catch {
    return null
  }
}

export function isTokenValid(payload: JwtPayload | null): boolean {
  if (!payload) return false
  return payload.exp * 1000 > Date.now()
}
