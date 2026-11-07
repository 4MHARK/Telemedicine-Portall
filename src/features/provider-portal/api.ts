import { apiClient } from '@/lib/apiClient'
import type {
  AppointmentStatus,
  AvailabilitySlot,
  ConsultationFee,
  ConsultationType,
  ProviderAppointment,
  ProviderProfile,
} from '@/types'

export function fetchProviderMe(): Promise<ProviderProfile> {
  return apiClient.get<ProviderProfile>('/provider/me')
}

export interface UpdateProviderProfileInput {
  title?: string
  bio?: string
  languages?: string[]
  consultationTypes?: ConsultationType[]
}

export function updateProviderMe(input: UpdateProviderProfileInput): Promise<ProviderProfile> {
  return apiClient.patch<ProviderProfile>('/provider/me', input)
}

export function fetchProviderFees(): Promise<ConsultationFee[]> {
  return apiClient.get<ConsultationFee[]>('/provider/fees')
}

export interface FeeInput {
  consultationType: ConsultationType
  amountMinor: number
}

export function updateProviderFees(fees: FeeInput[]): Promise<ConsultationFee[]> {
  return apiClient.put<ConsultationFee[]>('/provider/fees', { fees })
}

export function fetchProviderSlots(from: string, to: string): Promise<AvailabilitySlot[]> {
  const params = new URLSearchParams({ from, to })
  return apiClient.get<AvailabilitySlot[]>(`/provider/slots?${params.toString()}`)
}

export interface CreateSlotInput {
  start: string
  end: string
}

export function createProviderSlot(input: CreateSlotInput): Promise<AvailabilitySlot> {
  return apiClient.post<AvailabilitySlot>('/provider/slots', input)
}

export function deleteProviderSlot(slotId: string): Promise<void> {
  return apiClient.delete<void>(`/provider/slots/${slotId}`)
}

export function fetchProviderAppointments(
  status?: AppointmentStatus,
): Promise<ProviderAppointment[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiClient.get<ProviderAppointment[]>(`/provider/appointments${query}`)
}

export interface UpdateProviderAppointmentInput {
  status: 'completed' | 'no_show'
  notes?: string
}

export function updateProviderAppointment(
  appointmentId: string,
  input: UpdateProviderAppointmentInput,
): Promise<ProviderAppointment> {
  return apiClient.patch<ProviderAppointment>(`/provider/appointments/${appointmentId}`, input)
}
