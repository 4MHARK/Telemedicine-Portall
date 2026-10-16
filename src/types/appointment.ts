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
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

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
  createdAt: ISODateString
  cancelledAt?: ISODateString
  cancelReason?: string
}
