// ─────────────────────────────────────────────────────────────
// Domain model · auth
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'
import type { ProviderProfile } from './provider'

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

// ── Account / session ────────────────────────────────────────

export type AccountRole = 'patient' | 'doctor'

export interface Account {
  id: UUID
  email: string
  role: AccountRole
  isActive: boolean
}

export interface AuthSession {
  account: Account
  patient?: Patient
  provider?: ProviderProfile
}
