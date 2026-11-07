// ─────────────────────────────────────────────────────────────
// Domain model · payment
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'

export type PaymentStatus =
  'pending' | 'succeeded' | 'failed' | 'abandoned' | 'refund_pending' | 'refunded'

export type RefundStatus = 'not_required' | 'pending' | 'confirmed' | 'failed'

export interface Payment {
  id: UUID
  appointmentId: UUID
  reference: string
  amountMinor: number
  currency: string
  status: PaymentStatus
  refundStatus: RefundStatus
  accessCode?: string
  authorizationUrl?: string
  paidAt?: ISODateString
  verifiedAt?: ISODateString
  createdAt: ISODateString
}

export interface PaymentInitialization {
  payment: Payment
  appointment: import('./appointment').Appointment
}

export interface PaymentVerification {
  payment: Payment
  appointment: import('./appointment').Appointment
}
