import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import type { ProviderFilters, SlotQuery } from '@/types'
import { fetchProvider, fetchProviders, fetchProviderSlots } from './api'

const FIVE_MINUTES = 5 * 60 * 1000

/** docs/state-matrix.md: provider list, keyed by ProviderFilters. */
export function useProviders(filters: ProviderFilters = {}) {
  return useQuery({
    queryKey: queryKeys.providers.list(filters),
    queryFn: () => fetchProviders(filters),
  })
}

/** docs/state-matrix.md: provider detail, `staleTime: 5 min`. */
export function useProvider(providerId: string) {
  return useQuery({
    queryKey: queryKeys.providers.detail(providerId),
    queryFn: () => fetchProvider(providerId),
    enabled: providerId.length > 0,
    staleTime: FIVE_MINUTES,
  })
}

/** docs/state-matrix.md: slots keyed by (providerId, from, to). */
export function useProviderSlots(providerId: string, range: SlotQuery) {
  return useQuery({
    queryKey: queryKeys.providers.slots(providerId, range.from, range.to),
    queryFn: () => fetchProviderSlots(providerId, range),
    enabled: providerId.length > 0 && Boolean(range.from) && Boolean(range.to),
  })
}
