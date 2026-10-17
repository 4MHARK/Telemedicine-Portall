import { formatDateTime } from '@/lib/format'
import type { ConsultationType } from '@/types'
import type { WizardValues } from '../schemas'

const CONSULTATION_LABELS: Record<ConsultationType, string> = {
  video: 'Video call',
  phone: 'Phone call',
  async: 'Async message',
}

export interface ReviewStepProps {
  values: WizardValues
  providerName: string
  slotStart: string | null
  /** On the final step the summary is repeated with an explicit confirmation. */
  confirming: boolean
  onEdit: (step: number) => void
}

export function ReviewStep({
  values,
  providerName,
  slotStart,
  confirming,
  onEdit,
}: ReviewStepProps) {
  const rows: ReadonlyArray<{ label: string; value: string; step: number }> = [
    { label: 'Provider', value: providerName, step: 0 },
    { label: 'Time', value: slotStart ? formatDateTime(slotStart) : 'Not chosen', step: 0 },
    {
      label: 'Consultation',
      value: values.consultationType ? CONSULTATION_LABELS[values.consultationType] : 'Not chosen',
      step: 1,
    },
    { label: 'Reason', value: values.reason || 'Not provided', step: 2 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-border border-border divide-y rounded-lg border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-text-muted text-xs">{row.label}</dt>
              <dd className="text-sm break-words">{row.value}</dd>
            </div>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="text-primary shrink-0 text-xs underline-offset-2 hover:underline"
            >
              Edit
            </button>
          </div>
        ))}
      </dl>

      {confirming ? (
        <p className="text-text-muted text-sm">
          Confirming books this appointment. You can cancel later from the appointments page.
        </p>
      ) : null}
    </div>
  )
}
