import { useState } from 'react'

import { AsyncStatus, EmptyState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { AppointmentStatusBadge } from '@/features/appointments'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useProviderAppointments, useUpdateProviderAppointment } from './queries'

export default function ProviderAppointmentsPage() {
  usePageTitle('Appointments')
  const appointments = useProviderAppointments()
  const update = useUpdateProviderAppointment()
  const [error, setError] = useState<string | null>(null)

  async function transition(appointmentId: string, status: 'completed' | 'no_show'): Promise<void> {
    setError(null)
    try {
      await update.mutateAsync({ appointmentId, input: { status } })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The appointment could not be updated.')
    }
  }

  return (
    <>
      <PageHeader title="Appointments" description="Confirmed visits with your patients." />

      {error ? (
        <p role="alert" className="text-danger mb-4 text-sm">
          {error}
        </p>
      ) : null}

      <AsyncStatus
        query={appointments}
        skeleton={<LoadingSkeleton />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No appointments yet"
            description="Booked and paid visits will appear here."
          />
        }
      >
        {(rows) => (
          <ul className="flex flex-col gap-2">
            {rows.map((appointment) => (
              <li
                key={appointment.id}
                className="border-input flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3 text-sm"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{appointment.patientName}</span>
                  <span className="text-text-muted">
                    {formatDateTime(appointment.scheduledAt)} ·{' '}
                    {formatMoney(appointment.amountMinor, appointment.currency)} ·{' '}
                    <span className="capitalize">{appointment.consultationType}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AppointmentStatusBadge status={appointment.status} />
                  {appointment.status === 'scheduled' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void transition(appointment.id, 'completed')}
                        disabled={update.isPending}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void transition(appointment.id, 'no_show')}
                        disabled={update.isPending}
                      >
                        No-show
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncStatus>
    </>
  )
}
