// The token is only decoded, never trusted — there's no signature to check.
// Lives here so the route guard doesn't import from mocks/.
import type { ISODateString, JwtPayload, UUID } from '@/types'

/** docs/api-contract.md: the mock token expires 60 min after it is issued. */
export const TOKEN_TTL_MINUTES = 60

export function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
}

export function encodeJwt(payload: JwtPayload): string {
  return [
    base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    base64UrlEncode(JSON.stringify(payload)),
    'mock-signature',
  ].join('.')
}

/** Returns the payload only when the token is structurally well-formed. */
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

/** docs/routes.md: guards validate structure + `exp` against the current time. */
export function isTokenUsable(token: string | null): boolean {
  if (!token) return false
  return isTokenValid(decodeToken(token))
}

export function expiresAtFromPayload(payload: JwtPayload): ISODateString {
  return new Date(payload.exp * 1000).toISOString()
}
