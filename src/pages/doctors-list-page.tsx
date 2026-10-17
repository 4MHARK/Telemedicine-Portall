import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { DoctorCard } from '@/features/providers/components/doctor-card'
import { ProviderFiltersBar } from '@/features/providers/components/provider-filters'
import { useProviders } from '@/features/providers'
import { useProviderFilters } from '@/features/providers/useProviderFilters'
import { useSpecialties } from '@/features/specialties'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'

/**
 * Phase 3 provider directory. Filters live in the URL (docs/state-matrix.md),
 * so a reload or a back/forward restores exactly what was on screen.
 */
export default function DoctorsListPage() {
  usePageTitle('Find a doctor')

  const filterState = useProviderFilters()
  const providers = useProviders(filterState.filters)
  const specialties = useSpecialties()

  return (
    <>
      <PageHeader
        title="Find a doctor"
        description="Search and filter providers by specialty, availability and consultation type."
      />

      <ProviderFiltersBar
        state={filterState}
        specialties={specialties.data ?? []}
        isLoadingSpecialties={specialties.isPending}
      />

      {providers.isPending ? <LoadingSkeleton variant="card" count={6} /> : null}

      {providers.isError ? (
        <ErrorState
          title="Could not load providers"
          message={
            providers.error instanceof ApiError
              ? providers.error.message
              : 'The provider directory is unavailable right now.'
          }
          onRetry={() => void providers.refetch()}
        />
      ) : null}

      {providers.isSuccess && providers.data.items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No providers match"
          description="Try removing a filter or searching for something broader."
          action={
            <Button variant="outline" onClick={filterState.clear}>
              Clear filters
            </Button>
          }
        />
      ) : null}

      {providers.isSuccess && providers.data.items.length > 0 ? (
        <>
          <p className="text-text-muted mb-4 text-sm" aria-live="polite">
            Showing {providers.data.items.length} of {providers.data.total} providers
          </p>
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {providers.data.items.map((provider) => (
              <li key={provider.id}>
                <DoctorCard provider={provider} specialties={specialties.data ?? []} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  )
}
