import { apiClient } from '@/lib/apiClient'
import type { Appointment, AppointmentStatus, ConsultationType } from '@/types'

export interface CreateAppointmentInput {
  providerId: string
  slotId: string
  consultationType: ConsultationType
  reason: string
}

export function fetchAppointments(status?: AppointmentStatus): Promise<Appointment[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiClient.get<Appointment[]>(`/appointments${query}`)
}

export function fetchAppointment(appointmentId: string): Promise<Appointment> {
  return apiClient.get<Appointment>(`/appointments/${appointmentId}`)
}

export function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  return apiClient.post<Appointment>('/appointments', input)
}

export function cancelAppointment(
  appointmentId: string,
  cancelReason?: string,
): Promise<Appointment> {
  return apiClient.patch<Appointment>(`/appointments/${appointmentId}`, {
    status: 'cancelled',
    ...(cancelReason ? { cancelReason } : {}),
  })
}
