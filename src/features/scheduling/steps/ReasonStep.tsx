import type { UseFormReturn } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import type { WizardValues } from '../schemas'

export function ReasonStep({ form }: { form: UseFormReturn<WizardValues> }) {
  const error = form.formState.errors.reason

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor="reason">What would you like to discuss?</FieldLabel>
      <textarea
        id="reason"
        rows={5}
        maxLength={500}
        aria-invalid={error ? true : undefined}
        className="border-border bg-surface focus-visible:border-ring w-full rounded-md border px-3 py-2 text-sm outline-none"
        placeholder="A sentence or two is enough."
        {...form.register('reason')}
      />
      <FieldError>{error?.message}</FieldError>
    </Field>
  )
}
