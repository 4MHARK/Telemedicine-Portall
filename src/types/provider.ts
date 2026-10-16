// ─────────────────────────────────────────────────────────────
// Domain model · provider
//
// Also owns Specialty, ConsultationType and the availability slot types:
// all three are provider-scoped in docs/domain.ts (slots are fetched from
// /providers/:id/slots), and the type split has no slot.ts.
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'

export interface Specialty {
  id: UUID
  name: string // "Cardiology"
  slug: string // "cardiology"
  icon: string // lucide icon name, e.g. "HeartPulse"
}

export type ConsultationType = 'video' | 'phone' | 'async'

export interface Provider {
  id: UUID
  firstName: string
  lastName: string
  title: string // "Dr."
  specialtyIds: UUID[]
  bio: string
  avatarUrl: string
  yearsExperience: number
  rating: number // 0–5
  reviewCount: number
  languages: string[] // ["English", "Spanish"]
  consultationTypes: ConsultationType[]
  nextAvailableAt: ISODateString | null // null = no availability in the next N days
}

// ── Availability ─────────────────────────────────────────────

export type SlotStatus = 'available' | 'booked' | 'blocked'

export interface AvailabilitySlot {
  id: UUID
  providerId: UUID
  start: ISODateString
  end: ISODateString
  status: SlotStatus
}

// ── Query / filter types ─────────────────────────────────────

export interface ProviderFilters {
  q?: string
  specialty?: string[] // specialty slugs
  availability?: 'now' | 'today' | 'week' | null
  consultationType?: ConsultationType | null
  page?: number
  pageSize?: number
}

export interface SlotQuery {
  from: ISODateString
  to: ISODateString
}
