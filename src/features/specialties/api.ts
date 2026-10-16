import { apiClient } from '@/lib/apiClient'
import type { Specialty } from '@/types'

export function fetchSpecialties(): Promise<Specialty[]> {
  return apiClient.get<Specialty[]>('/specialties')
}
