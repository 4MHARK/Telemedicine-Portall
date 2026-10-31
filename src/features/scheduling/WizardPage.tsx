import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useBlocker, useNavigate, useParams } from 'react-router'

import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateAppointment } from '@/features/appointments'
import { useProvider, useProviderSlots } from '@/features/providers'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { STEP_FIELDS, STEP_LABELS, wizardSchema } from './schemas'
import type { WizardValues } from './schemas'
import { ConsultationTypeStep } from './steps/ConsultationTypeStep'
import { ReasonStep } from './steps/ReasonStep'
import { ReviewStep } from './steps/ReviewStep'
import { SlotStep } from './steps/SlotStep'
import { useWizard } from './wizard-context'
import { WizardProvider } from './WizardProvider'

const FOURTEEN_DAYS_MS = 14 * 86_400_000
const LAST_STEP = STEP_LABELS.length - 1

function WizardContent({ providerId }: { providerId: string }) {
  usePageTitle('Schedule an appointment')

  const navigate = useNavigate()
  const provider = useProvider(providerId)
  const createAppointment = useCreateAppointment()
  const { state, dispatch } = useWizard()

  const [slotRange] = useState(() => {
    const now = Date.now()
    return { from: new Date(now).toISOString(), to: new Date(now + FOURTEEN_DAYS_MS).toISOString() }
  })

  // Same key as SlotStep, so this reuses the cached list.
  const slots = useProviderSlots(providerId, slotRange)

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      slotId: '',
      consultationType: undefined,
      reason: '',
    } as unknown as WizardValues,
  })

  const step = state.step

  // useWatch, not form.watch(): the no-arg version breaks the compiler rules.
  const values: WizardValues = {
    slotId: useWatch({ control: form.control, name: 'slotId' }) ?? '',
    consultationType: useWatch({ control: form.control, name: 'consultationType' }),
    reason: useWatch({ control: form.control, name: 'reason' }) ?? '',
  }

  const selectedSlot = (slots.data ?? []).find((slot) => slot.id === values.slotId)
  const providerName = provider.data
    ? `${provider.data.title} ${provider.data.firstName} ${provider.data.lastName}`
    : 'Provider'

  // Leaving mid-wizard
  const isDirty = form.formState.isDirty

  // Set on success; the effect below does the redirect.
  const [bookedId, setBookedId] = useState<string | null>(null)

  useEffect(() => {
    if (!bookedId) return
    // One tick late on purpose: useBlocker refreshes its predicate in an
    // effect, so navigating now would still hit the stale one and pop the
    // unsaved-changes dialog.
    const timer = setTimeout(() => {
      void navigate(`/appointments/${bookedId}`, { replace: true })
    }, 0)
    return () => clearTimeout(timer)
  }, [bookedId, navigate])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bookedId && isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  async function goNext() {
    const fields = STEP_FIELDS[step] ?? []
    if (fields.length > 0) {
      const valid = await form.trigger([...fields])
      if (!valid) return
    }
    if (step < LAST_STEP) dispatch({ type: 'NEXT' })
  }

  async function submit(values: WizardValues) {
    dispatch({ type: 'SUBMIT_START' })
    try {
      const appointment = await createAppointment.mutateAsync({
        providerId,
        slotId: values.slotId,
        consultationType: values.consultationType,
        reason: values.reason,
      })
      dispatch({ type: 'SUBMIT_SUCCESS' })
      form.reset()
      setBookedId(appointment.id)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'The appointment could not be booked.'

      if (error instanceof ApiError && error.code === 'SLOT_TAKEN') {
        // Slot got taken while we were filling the form.
        form.setValue('slotId', '', { shouldDirty: true })
        dispatch({ type: 'GOTO', step: 0 })
        void slots.refetch()
      }
      dispatch({ type: 'SUBMIT_ERROR', message })
    }
  }

  if (provider.isPending) {
    return (
      <>
        <PageHeader title="Schedule an appointment" />
        <LoadingSkeleton variant="detail" />
      </>
    )
  }

  if (provider.isError) {
    return (
      <>
        <PageHeader title="Schedule an appointment" />
        <ErrorState
          title="Could not load this provider"
          message={
            provider.error instanceof ApiError ? provider.error.message : 'Try again in a moment.'
          }
          onRetry={() => void provider.refetch()}
        />
      </>
    )
  }

  const submitting = state.status === 'submitting'

  return (
    <>
      <PageHeader title="Schedule an appointment" description={`with ${providerName}`} />

      <ol className="mb-6 flex list-none flex-wrap gap-2 p-0 text-xs" aria-label="Booking steps">
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={cn(
              'rounded-full border px-2.5 py-1',
              index === step
                ? 'border-primary bg-primary text-primary-fg'
                : index < step
                  ? 'border-border bg-surface-muted text-text'
                  : 'border-border text-text-subtle',
            )}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {state.error ? (
        <p
          role="alert"
          className="border-danger/30 bg-danger/5 text-danger mb-4 rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="flex max-w-2xl flex-col gap-6"
      >
        {step === 0 ? <SlotStep form={form} providerId={providerId} range={slotRange} /> : null}

        {step === 1 ? (
          <ConsultationTypeStep form={form} options={provider.data.consultationTypes} />
        ) : null}

        {step === 2 ? <ReasonStep form={form} /> : null}

        {step >= 3 ? (
          <ReviewStep
            values={values}
            providerName={providerName}
            slotStart={selectedSlot?.start ?? null}
            confirming={step === LAST_STEP}
            onEdit={(target) => dispatch({ type: 'GOTO', step: target })}
          />
        ) : null}

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: 'BACK' })}
              disabled={submitting}
            >
              Back
            </Button>
          ) : null}

          {step < LAST_STEP ? (
            <Button type="button" onClick={() => void goNext()}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </Button>
          )}
        </div>
      </form>

      {blocker.state === 'blocked' ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) blocker.reset()
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this booking?</DialogTitle>
              <DialogDescription>Your progress on this appointment will be lost.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => blocker.reset()}>
                Stay
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

export default function WizardPage() {
  const { providerId = '' } = useParams()

  return (
    <WizardProvider>
      <WizardContent providerId={providerId} />
    </WizardProvider>
  )
}
