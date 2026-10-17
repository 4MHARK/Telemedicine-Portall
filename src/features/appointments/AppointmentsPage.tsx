import { CalendarDays } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProviders } from '@/features/providers'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime } from '@/lib/format'
import type { Appointment, Provider } from '@/types'
import { useAppointments } from './queries'
import { AppointmentStatusBadge } from './status-badge'

const PAST_STATUSES = new Set(['completed', 'cancelled', 'no_show'])

function AppointmentRow({
  appointment,
  provider,
}: {
  appointment: Appointment
  provider: Provider | undefined
}) {
  return (
    <li>
      <Link
        to={`/appointments/${appointment.id}`}
        className="border-border hover:bg-surface-muted flex items-center gap-4 rounded-lg border p-4 transition-colors"
      >
        {provider ? (
          <img
            src={provider.avatarUrl}
            alt=""
            className="size-10 rounded-full"
            width={40}
            height={40}
          />
        ) : (
          <span className="bg-surface-muted size-10 rounded-full" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">
            {provider ? `${provider.title} ${provider.firstName} ${provider.lastName}` : 'Provider'}
          </span>
          <span className="text-text-muted text-sm">
            {formatDateTime(appointment.scheduledAt)} ·{' '}
            <span className="capitalize">{appointment.consultationType}</span>
          </span>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </Link>
    </li>
  )
}

function AppointmentList({
  appointments,
  providers,
  emptyTitle,
  emptyDescription,
}: {
  appointments: readonly Appointment[]
  providers: Map<string, Provider>
  emptyTitle: string
  emptyDescription: string
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button variant="outline" nativeButton={false} render={<Link to="/doctors" />}>
            Find a doctor
          </Button>
        }
      />
    )
  }

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {appointments.map((appointment) => (
        <AppointmentRow
          key={appointment.id}
          appointment={appointment}
          provider={providers.get(appointment.providerId)}
        />
      ))}
    </ul>
  )
}

export default function AppointmentsPage() {
  usePageTitle('Appointments')

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'past' ? 'past' : 'upcoming'

  const appointments = useAppointments()
  // One page of 50 covers the whole seeded directory; this is a name/avatar
  // lookup, not a directory view.
  const directory = useProviders({ pageSize: 50 })

  const providers = new Map((directory.data?.items ?? []).map((p) => [p.id, p]))

  const all = appointments.data ?? []
  const upcoming = all
    .filter((a) => a.status === 'scheduled')
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
  const past = all
    .filter((a) => PAST_STATUSES.has(a.status))
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))

  function setTab(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'past') params.set('tab', 'past')
        else params.delete('tab')
        return params
      },
      { replace: true },
    )
  }

  const pending = appointments.isPending || directory.isPending

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Upcoming visits and your history."
        actions={
          <Button nativeButton={false} render={<Link to="/doctors" />}>
            Book appointment
          </Button>
        }
      />

      {pending ? <LoadingSkeleton variant="list" count={4} /> : null}

      {appointments.isError ? (
        <ErrorState
          title="Could not load appointments"
          message={
            appointments.error instanceof ApiError
              ? appointments.error.message
              : 'Appointments are unavailable right now.'
          }
          onRetry={() => void appointments.refetch()}
        />
      ) : null}

      {appointments.isSuccess && directory.isSuccess ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="pt-4">
            <AppointmentList
              appointments={upcoming}
              providers={providers}
              emptyTitle="No upcoming appointments"
              emptyDescription="Book a visit and it will appear here."
            />
          </TabsContent>
          <TabsContent value="past" className="pt-4">
            <AppointmentList
              appointments={past}
              providers={providers}
              emptyTitle="No past appointments"
              emptyDescription="Completed and cancelled visits will show up here."
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </>
  )
}
