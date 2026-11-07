import { useState } from 'react'

import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatMoney } from '@/lib/format'
import type { ConsultationFee, ConsultationType, ProviderProfile } from '@/types'
import {
  useProviderFees,
  useProviderMe,
  useUpdateProviderFees,
  useUpdateProviderMe,
} from './queries'

const TYPES: readonly ConsultationType[] = ['video', 'phone', 'async']

function ProfileForm({ profile, fees }: { profile: ProviderProfile; fees: ConsultationFee[] }) {
  const updateMe = useUpdateProviderMe()
  const updateFees = useUpdateProviderFees()

  const [title, setTitle] = useState(profile.title)
  const [bio, setBio] = useState(profile.bio)
  const [languages, setLanguages] = useState(profile.languages.join(', '))
  const [types, setTypes] = useState<ConsultationType[]>([...profile.consultationTypes])
  const [feeValues, setFeeValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fees.map((fee) => [fee.consultationType, String(fee.amountMinor)])),
  )
  const [error, setError] = useState<string | null>(null)

  function toggleType(type: ConsultationType): void {
    setTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    )
  }

  async function save(): Promise<void> {
    setError(null)
    try {
      await updateMe.mutateAsync({
        title: title.trim(),
        bio: bio.trim(),
        languages: languages
          .split(',')
          .map((language) => language.trim())
          .filter(Boolean),
        consultationTypes: types.length > 0 ? types : undefined,
      })

      const feePayload = types
        .map((type) => {
          const raw = Number(feeValues[type])
          if (!Number.isInteger(raw) || raw < 100) return null
          return { consultationType: type, amountMinor: raw }
        })
        .filter(
          (fee): fee is { consultationType: ConsultationType; amountMinor: number } => fee !== null,
        )
      if (feePayload.length > 0) await updateFees.mutateAsync(feePayload)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The profile could not be saved.')
    }
  }

  return (
    <>
      <PageHeader
        title="Doctor profile"
        description="Your public profile and consultation prices."
        actions={
          <Button onClick={() => void save()} disabled={updateMe.isPending || updateFees.isPending}>
            {updateMe.isPending || updateFees.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      {error ? (
        <p role="alert" className="text-danger mb-4 text-sm">
          {error}
        </p>
      ) : null}

      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium">Title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Bio</span>
              <textarea
                className="border-input bg-background min-h-28 rounded-md border px-3 py-2"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Languages (comma separated)</span>
              <Input value={languages} onChange={(event) => setLanguages(event.target.value)} />
            </label>
            <div className="flex flex-col gap-2">
              <span className="font-medium">Consultation types</span>
              <div className="flex flex-wrap gap-4">
                {TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 capitalize">
                    <input
                      type="checkbox"
                      checked={types.includes(type)}
                      onChange={() => toggleType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prices (NGN minor units)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {types.length === 0 ? (
              <p className="text-text-muted">Select at least one consultation type.</p>
            ) : (
              types.map((type) => (
                <label key={type} className="flex items-center justify-between gap-4">
                  <span className="font-medium capitalize">{type}</span>
                  <span className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={100}
                      step={100}
                      value={feeValues[type] ?? ''}
                      onChange={(event) =>
                        setFeeValues((current) => ({
                          ...current,
                          [type]: event.target.value,
                        }))
                      }
                      className="w-40"
                    />
                    <span className="text-text-muted w-24 text-right">
                      {formatMoney(Number(feeValues[type] ?? 0), 'NGN')}
                    </span>
                  </span>
                </label>
              ))
            )}
            <p className="text-text-muted text-xs">
              Paystack amounts are kobo; 1,500,000 means ₦15,000.
            </p>
            <p className="text-text-muted text-xs">Public email: {profile.email}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function ProviderProfilePage() {
  usePageTitle('Doctor profile')
  const me = useProviderMe()
  const fees = useProviderFees()

  if (me.isPending || fees.isPending) {
    return (
      <>
        <PageHeader title="Doctor profile" />
        <LoadingSkeleton variant="detail" />
      </>
    )
  }

  if (me.isError || fees.isError) {
    return (
      <ErrorState
        title="Could not load your profile"
        message="Try again in a moment."
        onRetry={() => {
          void me.refetch()
          void fees.refetch()
        }}
      />
    )
  }

  return <ProfileForm profile={me.data} fees={fees.data} />
}
