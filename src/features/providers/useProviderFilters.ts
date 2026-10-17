import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { ConsultationType, ProviderFilters } from '@/types'

export type AvailabilityFilter = NonNullable<ProviderFilters['availability']>

const CONSULTATION_TYPES: readonly ConsultationType[] = ['video', 'phone', 'async']
const AVAILABILITY_VALUES: readonly AvailabilityFilter[] = ['now', 'today', 'week']

function isAvailability(value: string): value is AvailabilityFilter {
  return (AVAILABILITY_VALUES as readonly string[]).includes(value)
}

function isConsultationType(value: string): value is ConsultationType {
  return (CONSULTATION_TYPES as readonly string[]).includes(value)
}

export interface ProviderFilterState {
  filters: ProviderFilters
  /** Number of active filters, for the "Clear filters" affordance. */
  activeCount: number
  setSearch: (q: string) => void
  toggleSpecialty: (slug: string) => void
  setAvailability: (value: AvailabilityFilter | null) => void
  setConsultationType: (value: ConsultationType | null) => void
  setPage: (page: number) => void
  clear: () => void
}

/**
 * Provider filters live in the URL — docs/state-matrix.md names search params
 * as the source of truth ("shareable, back-button friendly").
 *
 * Every write replaces the history entry rather than pushing one, so typing a
 * search does not bury the previous page under thirty history entries. The URL
 * still round-trips through reloads and back/forward.
 */
export function useProviderFilters(): ProviderFilterState {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<ProviderFilters>(() => {
    const q = searchParams.get('q')?.trim() ?? ''
    const specialty = searchParams.getAll('specialty').filter(Boolean)
    const availabilityParam = searchParams.get('availability') ?? ''
    const consultationParam = searchParams.get('consultationType') ?? ''
    const pageParam = Number(searchParams.get('page'))

    return {
      ...(q ? { q } : {}),
      ...(specialty.length > 0 ? { specialty } : {}),
      ...(isAvailability(availabilityParam) ? { availability: availabilityParam } : {}),
      ...(isConsultationType(consultationParam) ? { consultationType: consultationParam } : {}),
      ...(Number.isInteger(pageParam) && pageParam > 1 ? { page: pageParam } : {}),
    }
  }, [searchParams])

  // Filter changes reset pagination; page changes do not.
  const update = useCallback(
    (mutate: (params: URLSearchParams) => void, keepPage = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          mutate(next)
          if (!keepPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (q: string) => {
      update((params) => {
        const trimmed = q.trim()
        if (trimmed) params.set('q', trimmed)
        else params.delete('q')
      })
    },
    [update],
  )

  const toggleSpecialty = useCallback(
    (slug: string) => {
      update((params) => {
        const current = params.getAll('specialty')
        params.delete('specialty')
        const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
        for (const value of next) params.append('specialty', value)
      })
    },
    [update],
  )

  const setAvailability = useCallback(
    (value: AvailabilityFilter | null) => {
      update((params) => {
        if (value) params.set('availability', value)
        else params.delete('availability')
      })
    },
    [update],
  )

  const setConsultationType = useCallback(
    (value: ConsultationType | null) => {
      update((params) => {
        if (value) params.set('consultationType', value)
        else params.delete('consultationType')
      })
    },
    [update],
  )

  const setPage = useCallback(
    (page: number) => {
      update((params) => {
        if (page > 1) params.set('page', String(page))
        else params.delete('page')
      }, true)
    },
    [update],
  )

  const clear = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.specialty?.length ? 1 : 0) +
    (filters.availability ? 1 : 0) +
    (filters.consultationType ? 1 : 0)

  return {
    filters,
    activeCount,
    setSearch,
    toggleSpecialty,
    setAvailability,
    setConsultationType,
    setPage,
    clear,
  }
}
