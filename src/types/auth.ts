// ─────────────────────────────────────────────────────────────
// Domain model · auth
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'

// ── Patient ──────────────────────────────────────────────────
//
// Lives here because AuthSession is the only place the full entity is
// embedded; other features reference it by id only.

export interface Patient {
  id: UUID
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: ISODateString
  avatarUrl?: string
  insuranceProvider?: string
  insuranceMemberId?: string
}

// ── Auth ─────────────────────────────────────────────────────

export interface JwtPayload {
  sub: UUID // patient id
  role: 'patient'
  iat: number // issued-at, seconds
  exp: number // expiry, seconds
}

export interface AuthSession {
  token: string // mock JWT
  expiresAt: ISODateString
  patient: Patient
}
