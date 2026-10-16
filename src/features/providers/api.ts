import { apiClient } from '@/lib/apiClient'
import type { AvailabilitySlot, Paginated, Provider, ProviderFilters, SlotQuery } from '@/types'

export function fetchProviders(filters: ProviderFilters = {}): Promise<Paginated<Provider>> {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)
  for (const slug of filters.specialty ?? []) params.append('specialty', slug)
  if (filters.availability) params.set('availability', filters.availability)
  if (filters.consultationType) params.set('consultationType', filters.consultationType)
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize))

  const query = params.toString()
  return apiClient.get<Paginated<Provider>>(`/providers${query ? `?${query}` : ''}`)
}

export function fetchProvider(providerId: string): Promise<Provider> {
  return apiClient.get<Provider>(`/providers/${providerId}`)
}

export function fetchProviderSlots(
  providerId: string,
  query: SlotQuery,
): Promise<AvailabilitySlot[]> {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  return apiClient.get<AvailabilitySlot[]>(`/providers/${providerId}/slots?${params.toString()}`)
}
