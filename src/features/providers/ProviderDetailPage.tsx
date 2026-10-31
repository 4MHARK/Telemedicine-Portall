import { CalendarClock, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime, formatRating } from '@/lib/format'
import { useProvider, useProviderSlots } from './queries'
import { useSpecialties } from '@/features/specialties'

const SEVEN_DAYS_MS = 7 * 86_400_000

export default function ProviderDetailPage() {
  const { providerId = '' } = useParams()

  const provider = useProvider(providerId)
  const specialties = useSpecialties()

  // Computed once per mount. Recomputing per render would give the query a new
  // key on every pass and refetch forever; the state initializer is the one
  // place the purity rule allows reading the clock.
  const [slotRange] = useState(() => {
    const now = Date.now()
    return {
      from: new Date(now).toISOString(),
      to: new Date(now + SEVEN_DAYS_MS).toISOString(),
    }
  })

  const slots = useProviderSlots(providerId, slotRange)

  const providerName = provider.data
    ? `${provider.data.title} ${provider.data.firstName} ${provider.data.lastName}`
    : 'Provider profile'
  usePageTitle(providerName)

  if (provider.isPending) {
    return (
      <>
        <PageHeader title="Provider profile" />
        <LoadingSkeleton variant="detail" />
      </>
    )
  }

  if (provider.isError) {
    const notFound = provider.error instanceof ApiError && provider.error.status === 404
    return (
      <>
        <PageHeader title={notFound ? 'Provider not found' : 'Could not load provider'} />
        <ErrorState
          title={notFound ? 'Provider not found' : 'Could not load provider'}
          message={
            notFound
              ? 'That provider does not exist, or is no longer listed.'
              : provider.error instanceof ApiError
                ? provider.error.message
                : 'The provider is unavailable right now.'
          }
          onRetry={notFound ? undefined : () => void provider.refetch()}
        />
        {notFound ? (
          <p className="mt-4 text-center">
            <Button variant="outline" nativeButton={false} render={<Link to="/doctors" />}>
              Back to doctors
            </Button>
          </p>
        ) : null}
      </>
    )
  }

  const data = provider.data
  const providerSpecialties = (specialties.data ?? []).filter((s) =>
    data.specialtyIds.includes(s.id),
  )

  const nextSlots = (slots.data ?? [])
    .filter((slot) => slot.status === 'available')
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, 3)

  return (
    <>
      <PageHeader
        title={providerName}
        description={providerSpecialties.map((s) => s.name).join(', ')}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4" aria-label="Profile">
            <div className="flex items-start gap-4">
              <img
                src={data.avatarUrl}
                alt=""
                className="size-20 shrink-0 rounded-full"
                width={80}
                height={80}
              />
              <div className="flex min-w-0 flex-col gap-2">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Star className="size-4 fill-current" aria-hidden="true" />
                  <span className="font-medium">{formatRating(data.rating)}</span>
                  <span className="text-text-muted">({data.reviewCount} reviews)</span>
                  <span className="text-text-subtle">·</span>
                  <span className="text-text-muted">{data.yearsExperience} years in practice</span>
                </p>
                <p className="text-text-muted text-sm">
                  <span className="font-medium text-text">Languages:</span>{' '}
                  {data.languages.join(', ')}
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2" aria-label="Biography">
            <h2 className="font-medium">About</h2>
            <p className="text-text-muted text-sm leading-relaxed">{data.bio}</p>
          </section>

          <section className="flex flex-col gap-2" aria-label="Consultation types">
            <h2 className="font-medium">Consultation types</h2>
            <div className="flex flex-wrap gap-2">
              {data.consultationTypes.map((type) => (
                <Badge key={type} variant="secondary" className="capitalize">
                  {type}
                </Badge>
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Availability">
          <div className="border-border rounded-lg border p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium">
              <CalendarClock className="size-4" aria-hidden="true" />
              Next available
            </h2>

            {slots.isPending ? (
              <LoadingSkeleton variant="list" count={2} />
            ) : slots.isError ? (
              <div role="alert" className="text-danger flex flex-col gap-2 text-sm">
                <p>
                  {slots.error instanceof ApiError
                    ? slots.error.message
                    : 'Availability is unavailable right now.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => void slots.refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : nextSlots.length === 0 ? (
              <p className="text-text-muted text-sm">No availability in the next 7 days.</p>
            ) : (
              <ul className="flex list-none flex-col gap-2 p-0 text-sm">
                {nextSlots.map((slot) => (
                  <li key={slot.id} className="bg-surface-muted rounded-md px-3 py-2">
                    {formatDateTime(slot.start)}
                  </li>
                ))}
              </ul>
            )}

            <Button
              className="mt-4 w-full"
              nativeButton={false}
              render={<Link to={`/schedule/${data.id}`} />}
            >
              Book appointment
            </Button>
          </div>
        </aside>
      </div>
    </>
  )
}
