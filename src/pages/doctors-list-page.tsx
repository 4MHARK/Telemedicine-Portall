import { SearchX } from 'lucide-react'

import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { DoctorCard } from '@/features/providers/components/doctor-card'
import { useProviders } from '@/features/providers'
import { useSpecialties } from '@/features/specialties'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'

/**
 * Phase 2 renders the directory unfiltered. Search, specialty filters and
 * pagination controls are Phase 3; the query hook already accepts
 * ProviderFilters, so wiring them is additive.
 */
export default function DoctorsListPage() {
  usePageTitle('Find a doctor')

  const providers = useProviders({})
  const specialties = useSpecialties()

  return (
    <>
      <PageHeader
        title="Find a doctor"
        description="Search and filter providers by specialty, availability and consultation type."
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
          title="No providers found"
          description="Try a different search or specialty."
        />
      ) : null}

      {providers.isSuccess && providers.data.items.length > 0 ? (
        <>
          <p className="text-text-muted mb-4 text-sm">
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
