import { apiClient } from '@/lib/apiClient'
import type { Payment, PaymentInitialization, PaymentVerification } from '@/types'

export function initializePayment(appointmentId: string): Promise<PaymentInitialization> {
  return apiClient.post<PaymentInitialization>('/payments/initialize', { appointmentId })
}

export function verifyPayment(reference: string): Promise<PaymentVerification> {
  return apiClient.post<PaymentVerification>('/payments/verify', { reference })
}

export function fetchPayment(reference: string): Promise<Payment> {
  return apiClient.get<Payment>(`/payments/${encodeURIComponent(reference)}`)
}
