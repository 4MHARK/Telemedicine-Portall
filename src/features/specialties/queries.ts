import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { fetchSpecialties } from './api'

/**
 * docs/state-matrix.md: Specialties live in TanStack Query with
 * `staleTime: Infinity` — they never change within a session.
 */
export function useSpecialties() {
  return useQuery({
    queryKey: queryKeys.specialties.all,
    queryFn: fetchSpecialties,
    staleTime: Infinity,
  })
}
