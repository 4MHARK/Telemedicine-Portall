import { useState } from 'react'

import { AsyncStatus, EmptyState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime } from '@/lib/format'
import { useCreateProviderSlot, useDeleteProviderSlot, useProviderSlots } from './queries'

const FOURTEEN_DAYS_MS = 14 * 86_400_000

function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

export default function AvailabilityPage() {
  usePageTitle('Availability')
  const [range] = useState(() => {
    const now = Date.now()
    return {
      from: new Date(now).toISOString(),
      to: new Date(now + FOURTEEN_DAYS_MS).toISOString(),
    }
  })
  const slots = useProviderSlots(range)
  const createSlot = useCreateProviderSlot()
  const deleteSlot = useDeleteProviderSlot()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(): Promise<void> {
    setError(null)
    if (!start || !end) {
      setError('Choose both a start and an end time.')
      return
    }
    try {
      await createSlot.mutateAsync({
        start: localInputToIso(start),
        end: localInputToIso(end),
      })
      setStart('')
      setEnd('')
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The slot could not be created.')
    }
  }

  return (
    <>
      <PageHeader
        title="Availability"
        description="Publish the slots patients can book. Slots are 15–120 minutes long."
      />

      <Card className="mb-6 max-w-xl">
        <CardHeader>
          <CardTitle>Add a slot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Start</span>
            <Input
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">End</span>
            <Input
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          {error ? (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          ) : null}
          <Button onClick={() => void submit()} disabled={createSlot.isPending}>
            {createSlot.isPending ? 'Adding…' : 'Add slot'}
          </Button>
        </CardContent>
      </Card>

      <AsyncStatus
        query={slots}
        skeleton={<LoadingSkeleton />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="No slots in the next 14 days"
            description="Add a slot above so patients can book you."
          />
        }
      >
        {(rows) => (
          <ul className="flex flex-col gap-2">
            {rows.map((slot) => (
              <li
                key={slot.id}
                className="border-input flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{formatDateTime(slot.start)}</span>
                  <span className="text-text-muted capitalize">{slot.status}</span>
                </div>
                {slot.status === 'available' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void deleteSlot.mutateAsync(slot.id)}
                    disabled={deleteSlot.isPending}
                  >
                    Remove
                  </Button>
                ) : (
                  <span className="text-text-muted text-xs">Booked or blocked</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncStatus>
    </>
  )
}
