import { ArrowLeft, CalendarClock, Stethoscope } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { ConfirmDialog, ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { useProvider } from '@/features/providers'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime } from '@/lib/format'
import { useAppointment, useCancelAppointment } from './queries'
import { AppointmentDocuments } from './AppointmentDocuments'
import { AppointmentStatusBadge } from './status-badge'

export default function AppointmentDetailPage() {
  const { id = '' } = useParams()
  const appointment = useAppointment(id)
  const provider = useProvider(appointment.data?.providerId ?? '')
  const cancel = useCancelAppointment()

  usePageTitle('Appointment detail')

  if (appointment.isPending) {
    return (
      <>
        <PageHeader title="Appointment detail" />
        <LoadingSkeleton variant="detail" />
      </>
    )
  }

  if (appointment.isError) {
    const apiError = appointment.error instanceof ApiError ? appointment.error : null
    const notFound = apiError?.status === 404
    const forbidden = apiError?.status === 403
    return (
      <>
        <PageHeader title="Appointment detail" />
        <ErrorState
          title={
            notFound
              ? 'Appointment not found'
              : forbidden
                ? 'Not your appointment'
                : 'Could not load appointment'
          }
          message={
            notFound
              ? 'That appointment does not exist.'
              : forbidden
                ? 'This appointment belongs to another patient.'
                : (apiError?.message ?? 'Appointments are unavailable right now.')
          }
          onRetry={notFound || forbidden ? undefined : () => void appointment.refetch()}
        />
        <p className="mt-4 text-center">
          <Button variant="outline" nativeButton={false} render={<Link to="/appointments" />}>
            Back to appointments
          </Button>
        </p>
      </>
    )
  }

  const data = appointment.data
  const canCancel = data.status === 'scheduled'

  const rows: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'When', value: formatDateTime(data.scheduledAt) },
    { label: 'Duration', value: `${data.durationMinutes} minutes` },
    {
      label: 'Consultation',
      value: data.consultationType.charAt(0).toUpperCase() + data.consultationType.slice(1),
    },
    { label: 'Reason', value: data.reason },
    { label: 'Booked', value: formatDateTime(data.createdAt) },
    ...(data.notes ? [{ label: 'Provider notes', value: data.notes }] : []),
    ...(data.cancelledAt ? [{ label: 'Cancelled', value: formatDateTime(data.cancelledAt) }] : []),
    ...(data.cancelReason ? [{ label: 'Cancellation reason', value: data.cancelReason }] : []),
  ]

  return (
    <>
      <PageHeader
        title="Appointment detail"
        actions={
          <Button variant="ghost" nativeButton={false} render={<Link to="/appointments" />}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            All appointments
          </Button>
        }
      />

      <div className="grid max-w-3xl gap-6">
        <div className="flex items-center gap-3">
          <AppointmentStatusBadge status={data.status} />
          <span className="text-text-muted text-sm">{formatDateTime(data.scheduledAt)}</span>
        </div>

        <section aria-label="Appointment details">
          <dl className="divide-border border-border divide-y rounded-lg border">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-text-muted text-xs">{row.label}</dt>
                <dd className="text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Provider" className="border-border rounded-lg border p-4">
          <h2 className="mb-3 flex items-center gap-2 font-medium">
            <Stethoscope className="size-4" aria-hidden="true" />
            Provider
          </h2>
          {provider.data ? (
            <div className="flex items-center gap-3">
              <img
                src={provider.data.avatarUrl}
                alt=""
                className="size-10 rounded-full"
                width={40}
                height={40}
              />
              <div className="flex min-w-0 flex-col">
                <Link
                  to={`/doctors/${provider.data.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {provider.data.title} {provider.data.firstName} {provider.data.lastName}
                </Link>
                <span className="text-text-muted truncate text-sm">
                  {provider.data.bio.slice(0, 80)}…
                </span>
              </div>
            </div>
          ) : (
            <p className="text-text-muted text-sm">
              <CalendarClock className="mr-1 inline size-4" aria-hidden="true" />
              Provider details unavailable.
            </p>
          )}
        </section>

        <AppointmentDocuments appointment={data} />

        {cancel.isError ? (
          <p
            role="alert"
            className="border-danger/30 bg-danger/5 text-danger rounded-md border px-3 py-2 text-sm"
          >
            {cancel.error instanceof ApiError
              ? cancel.error.message
              : 'The appointment could not be cancelled.'}
          </p>
        ) : null}

        <div>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" disabled={!canCancel || cancel.isPending}>
                Cancel appointment
              </Button>
            }
            title="Cancel this appointment?"
            description="The slot is released and the appointment moves to your history."
            confirmLabel="Cancel appointment"
            destructive
            isPending={cancel.isPending}
            onConfirm={() =>
              cancel.mutate({ appointmentId: data.id, cancelReason: 'Cancelled by patient' })
            }
          />
          {!canCancel ? (
            <p className="text-text-muted mt-2 text-xs">
              Only scheduled appointments can be cancelled.
            </p>
          ) : null}
        </div>
      </div>
    </>
  )
}
