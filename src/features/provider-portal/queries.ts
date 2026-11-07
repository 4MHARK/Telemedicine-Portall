import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import type { AppointmentStatus } from '@/types'
import {
  createProviderSlot,
  deleteProviderSlot,
  fetchProviderAppointments,
  fetchProviderFees,
  fetchProviderMe,
  fetchProviderSlots,
  updateProviderAppointment,
  updateProviderFees,
  updateProviderMe,
} from './api'
import type {
  CreateSlotInput,
  FeeInput,
  UpdateProviderAppointmentInput,
  UpdateProviderProfileInput,
} from './api'

export function useProviderMe() {
  return useQuery({
    queryKey: queryKeys.providerPortal.me,
    queryFn: fetchProviderMe,
  })
}

export function useUpdateProviderMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProviderProfileInput) => updateProviderMe(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.providerPortal.me, profile)
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useProviderFees() {
  return useQuery({
    queryKey: queryKeys.providerPortal.fees,
    queryFn: fetchProviderFees,
  })
}

export function useUpdateProviderFees() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fees: FeeInput[]) => updateProviderFees(fees),
    onSuccess: (fees) => {
      queryClient.setQueryData(queryKeys.providerPortal.fees, fees)
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useProviderSlots(range: { from: string; to: string }) {
  return useQuery({
    queryKey: queryKeys.providerPortal.slots(range.from, range.to),
    queryFn: () => fetchProviderSlots(range.from, range.to),
    enabled: Boolean(range.from) && Boolean(range.to),
  })
}

export function useCreateProviderSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSlotInput) => createProviderSlot(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['provider-portal', 'slots'] })
    },
  })
}

export function useDeleteProviderSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slotId: string) => deleteProviderSlot(slotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['provider-portal', 'slots'] })
    },
  })
}

export function useProviderAppointments(status?: AppointmentStatus) {
  return useQuery({
    queryKey: queryKeys.providerPortal.appointments(status),
    queryFn: () => fetchProviderAppointments(status),
  })
}

export function useUpdateProviderAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      appointmentId,
      input,
    }: {
      appointmentId: string
      input: UpdateProviderAppointmentInput
    }) => updateProviderAppointment(appointmentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['provider-portal', 'appointments'] })
    },
  })
}
