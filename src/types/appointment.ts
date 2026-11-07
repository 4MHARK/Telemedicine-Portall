// ─────────────────────────────────────────────────────────────
// Domain model · appointment
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'
import type { ConsultationType } from './provider'

// Lifecycle (from docs/domain.ts):
//
//     scheduled ──► completed
//          │
//          ├──► cancelled   (cancelledAt, cancelReason set)
//          └──► no_show
//
export type AppointmentStatus =
  'pending_payment' | 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'expired'

export interface Appointment {
  id: UUID
  patientId: UUID
  providerId: UUID
  slotId: UUID
  consultationType: ConsultationType
  status: AppointmentStatus
  reason: string // patient-stated reason
  notes?: string // provider notes, post-visit
  scheduledAt: ISODateString // denormalized from slot.start
  durationMinutes: number
  amountMinor: number
  currency: string
  holdExpiresAt: ISODateString | null
  confirmedAt?: ISODateString
  createdAt: ISODateString
  cancelledAt?: ISODateString
  cancelReason?: string
}

/** Doctor-facing appointment rows include the patient's display name. */
export interface ProviderAppointment extends Appointment {
  patientName: string
}
