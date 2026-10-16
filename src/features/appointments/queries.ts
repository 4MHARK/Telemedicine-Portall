import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import type { AppointmentStatus } from '@/types'
import { cancelAppointment, createAppointment, fetchAppointment, fetchAppointments } from './api'
import type { CreateAppointmentInput } from './api'

export function useAppointments(status?: AppointmentStatus) {
  return useQuery({
    queryKey: queryKeys.appointments.list(status),
    queryFn: () => fetchAppointments(status),
  })
}

export function useAppointment(appointmentId: string) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId),
    queryFn: () => fetchAppointment(appointmentId),
    enabled: appointmentId.length > 0,
  })
}

/**
 * docs/state-matrix.md, Invalidation Rules:
 * create -> appointments.list, providers.slots(providerId, ...)
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess: (_appointment, input) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      void queryClient.invalidateQueries({
        queryKey: ['providers', 'slots', input.providerId],
      })
    },
  })
}

/**
 * docs/state-matrix.md, Invalidation Rules:
 * cancel -> appointments.list, appointments.detail(id), providers.slots(...)
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      appointmentId,
      cancelReason,
    }: {
      appointmentId: string
      cancelReason?: string
    }) => cancelAppointment(appointmentId, cancelReason),
    onSuccess: (appointment) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointment.id),
      })
      void queryClient.invalidateQueries({
        queryKey: ['providers', 'slots', appointment.providerId],
      })
    },
  })
}
