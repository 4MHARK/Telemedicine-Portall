import type { UseFormReturn } from 'react-hook-form'

import { LoadingSkeleton } from '@/components/shared'
import { ErrorState } from '@/components/shared'
import { useProviderSlots } from '@/features/providers'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SlotQuery } from '@/types'
import type { WizardValues } from '../schemas'

export interface SlotStepProps {
  form: UseFormReturn<WizardValues>
  providerId: string
  /** Owned by the page, so the review step can read the same cached list. */
  range: SlotQuery
}

export function SlotStep({ form, providerId, range }: SlotStepProps) {
  const slots = useProviderSlots(providerId, range)
  const selected = form.watch('slotId')
  const error = form.formState.errors.slotId

  if (slots.isPending) return <LoadingSkeleton variant="list" count={4} />

  if (slots.isError) {
    return (
      <ErrorState
        title="Could not load availability"
        message={
          slots.error instanceof ApiError ? slots.error.message : 'Availability is unavailable.'
        }
        onRetry={() => void slots.refetch()}
      />
    )
  }

  const available = (slots.data ?? [])
    .filter((slot) => slot.status === 'available')
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))

  if (available.length === 0) {
    return <p className="text-text-muted text-sm">No availability in the next 14 days.</p>
  }

  const byDay = new Map<string, typeof available>()
  for (const slot of available) {
    const day = new Date(slot.start).toDateString()
    const existing = byDay.get(day)
    if (existing) existing.push(slot)
    else byDay.set(day, [slot])
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="mb-2 text-sm font-medium">Choose a time</legend>
        {[...byDay.entries()].map(([day, daySlots]) => (
          <div key={day} className="flex flex-col gap-2">
            <p className="text-text-muted text-xs font-medium">{day}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={selected === slot.id}
                  onClick={() => form.setValue('slotId', slot.id, { shouldDirty: true })}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    selected === slot.id
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border hover:bg-surface-muted',
                  )}
                >
                  {formatDateTime(slot.start)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error.message}
        </p>
      ) : null}
    </div>
  )
}
