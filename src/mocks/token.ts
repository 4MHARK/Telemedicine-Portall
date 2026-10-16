/**
 * Issuing side of the mock JWT. Decoding lives in src/lib/jwt.ts, because the
 * route guard needs it and app code must not import from the mock layer.
 */

import { encodeJwt, expiresAtFromPayload, TOKEN_TTL_MINUTES } from '@/lib/jwt'
import type { AuthSession, JwtPayload, Patient } from '@/types'

export function issueSession(patient: Patient, ttlMinutes = TOKEN_TTL_MINUTES): AuthSession {
  const issuedAt = Math.floor(Date.now() / 1000)

  const payload: JwtPayload = {
    sub: patient.id,
    role: 'patient',
    iat: issuedAt,
    exp: issuedAt + ttlMinutes * 60,
  }

  return {
    token: encodeJwt(payload),
    expiresAt: expiresAtFromPayload(payload),
    patient,
  }
}
