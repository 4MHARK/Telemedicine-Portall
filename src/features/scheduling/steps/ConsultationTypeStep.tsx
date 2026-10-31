import type { UseFormReturn } from 'react-hook-form'

import { cn } from '@/lib/utils'
import type { ConsultationType } from '@/types'
import type { WizardValues } from '../schemas'

const LABELS: Record<ConsultationType, string> = {
  video: 'Video call',
  phone: 'Phone call',
  async: 'Async message',
}

export interface ConsultationTypeStepProps {
  form: UseFormReturn<WizardValues>
  options: readonly ConsultationType[]
}

export function ConsultationTypeStep({ form, options }: ConsultationTypeStepProps) {
  const selected = form.watch('consultationType')
  const error = form.formState.errors.consultationType

  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 text-sm font-medium">How would you like to meet?</legend>

      {options.map((type) => (
        <label
          key={type}
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors',
            selected === type
              ? 'border-primary bg-primary/5'
              : 'border-input hover:bg-surface-muted',
          )}
        >
          <input
            type="radio"
            name="consultationType"
            value={type}
            checked={selected === type}
            onChange={() => form.setValue('consultationType', type, { shouldDirty: true })}
            className="accent-primary size-4"
          />
          {LABELS[type]}
        </label>
      ))}

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error.message}
        </p>
      ) : null}
    </fieldset>
  )
}
