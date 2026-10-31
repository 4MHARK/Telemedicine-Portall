import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AsyncStatus, EmptyState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { DoctorCard } from '@/features/providers/components/doctor-card'
import { ProviderFiltersBar } from '@/features/providers/components/provider-filters'
import { useProviders } from '@/features/providers'
import { useProviderFilters } from '@/features/providers/useProviderFilters'
import { useSpecialties } from '@/features/specialties'
import { usePageTitle } from '@/hooks/use-page-title'

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

      <AsyncStatus
        query={providers}
        skeleton={<LoadingSkeleton variant="card" count={6} />}
        errorTitle="Could not load providers"
        errorFallback="The provider directory is unavailable right now."
        isEmpty={(data) => data.items.length === 0}
        empty={
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
        }
      >
        {(data) => (
          <>
            <p className="text-text-muted mb-4 text-sm" aria-live="polite">
              Showing {data.items.length} of {data.total} providers
            </p>
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((provider) => (
                <li key={provider.id}>
                  <DoctorCard provider={provider} specialties={specialties.data ?? []} />
                </li>
              ))}
            </ul>
          </>
        )}
      </AsyncStatus>
    </>
  )
}
