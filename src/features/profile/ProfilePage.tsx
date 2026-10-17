import { LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { EmptyState, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { useAuth, useLogout } from '@/features/auth'
import { usePageTitle } from '@/hooks/use-page-title'
import { formatDate, formatDateTime } from '@/lib/format'
import type { Patient } from '@/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="font-medium">{title}</h2>
      <dl className="divide-border border-border divide-y rounded-lg border">{children}</dl>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-text-muted text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function details(patient: Patient) {
  return (
    <>
      <Row label="Name" value={`${patient.firstName} ${patient.lastName}`} />
      <Row label="Email" value={patient.email} />
      <Row label="Phone" value={patient.phone} />
      <Row label="Date of birth" value={formatDate(patient.dateOfBirth)} />
    </>
  )
}

export default function ProfilePage() {
  usePageTitle('Profile')

  const { session } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()

  const patient = session?.patient

  if (!patient) {
    return (
      <>
        <PageHeader title="Profile" />
        <EmptyState
          title="Not signed in"
          description="Sign in to see your profile."
          action={
            <Button variant="outline" nativeButton={false} render={<Link to="/auth/login" />}>
              Sign in
            </Button>
          }
        />
      </>
    )
  }

  async function handleLogout() {
    try {
      await logout.mutateAsync()
    } finally {
      // Even if POST /auth/logout fails, the local session is already gone.
      await navigate('/auth/login', { replace: true })
    }
  }

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your details as they are stored on this device."
        actions={
          <img
            src={patient.avatarUrl}
            alt=""
            className="size-10 rounded-full"
            width={40}
            height={40}
          />
        }
      />

      <div className="grid max-w-3xl gap-6">
        <Section title="Personal information">{details(patient)}</Section>

        <Section title="Insurance">
          <Row label="Provider" value={patient.insuranceProvider ?? 'Not provided'} />
          <Row label="Member ID" value={patient.insuranceMemberId ?? 'Not provided'} />
        </Section>

        <Section title="Session">
          <Row label="Signed in as" value={patient.email} />
          <Row label="Token expires" value={session ? formatDateTime(session.expiresAt) : '—'} />
        </Section>

        {logout.isError ? (
          <p role="alert" className="text-danger text-sm">
            Signing out had a problem, but the local session was cleared.
          </p>
        ) : null}

        <div>
          <Button variant="outline" onClick={() => void handleLogout()} disabled={logout.isPending}>
            <LogOut className="size-4" aria-hidden="true" />
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    </>
  )
}
