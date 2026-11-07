import { Link } from 'react-router'

import { AsyncStatus, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatDateTime } from '@/lib/format'
import { useProviderAppointments, useProviderMe } from './queries'

export default function DashboardPage() {
  usePageTitle('Doctor dashboard')
  const me = useProviderMe()
  const appointments = useProviderAppointments('scheduled')

  return (
    <>
      <PageHeader
        title="Doctor dashboard"
        description="Your live availability, appointments, and patient messages."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link to="/provider/profile" />}>
            Edit profile
          </Button>
        }
      />

      <AsyncStatus query={me} skeleton={<LoadingSkeleton variant="detail" />}>
        {(profile) => (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  {profile.title} {profile.firstName} {profile.lastName}
                </CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </CardHeader>
              <CardContent className="text-text-muted text-sm">{profile.bio}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{appointments.data?.length ?? 0}</CardTitle>
                <CardDescription>Upcoming confirmed appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/provider/appointments" />}
                >
                  Manage appointments
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{profile.fees.length}</CardTitle>
                <CardDescription>Consultation prices configured</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/provider/availability" />}
                >
                  Manage availability
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/provider/messages" />}
                >
                  Open messages
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </AsyncStatus>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Next appointments</h2>
        <AsyncStatus
          query={appointments}
          skeleton={<LoadingSkeleton />}
          isEmpty={(rows) => rows.length === 0}
          empty={<p className="text-text-muted text-sm">No confirmed appointments yet.</p>}
        >
          {(rows) => (
            <ul className="flex flex-col gap-2">
              {rows.slice(0, 5).map((appointment) => (
                <li
                  key={appointment.id}
                  className="border-input flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">{appointment.patientName}</span>
                  <span className="text-text-muted">{formatDateTime(appointment.scheduledAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </AsyncStatus>
      </div>
    </>
  )
}
