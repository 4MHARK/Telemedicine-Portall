import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { fetchPayment, initializePayment, verifyPayment } from './api'

export function useInitializePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appointmentId: string) => initializePayment(appointmentId),
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.appointments.detail(result.appointment.id),
        result.appointment,
      )
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
    },
  })
}

export function useVerifyPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) => verifyPayment(reference),
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.appointments.detail(result.appointment.id),
        result.appointment,
      )
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['provider-portal'] })
    },
  })
}

export function usePayment(reference: string) {
  return useQuery({
    queryKey: ['payments', reference] as const,
    queryFn: () => fetchPayment(reference),
    enabled: reference.length > 0,
  })
}
