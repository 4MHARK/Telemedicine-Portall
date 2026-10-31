// Decoding lives in lib/jwt so the route guard doesn't import from mocks/.
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
