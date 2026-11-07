import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ErrorState, LoadingSkeleton, PageHeader } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppointment } from '@/features/appointments'
import { usePageTitle } from '@/hooks/use-page-title'
import { ApiError } from '@/lib/apiClient'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useInitializePayment, useVerifyPayment } from './queries'

function countdown(holdExpiresAt: string | null): string {
  if (!holdExpiresAt) return '—'
  const remaining = Date.parse(holdExpiresAt) - Date.now()
  if (remaining <= 0) return 'Expired'
  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function CheckoutPage() {
  usePageTitle('Complete payment')
  const { appointmentId = '' } = useParams()
  const navigate = useNavigate()
  const appointment = useAppointment(appointmentId)
  const initialize = useInitializePayment()
  const verify = useVerifyPayment()

  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => Date.now())
  const fakePayments = import.meta.env.VITE_PAYMENTS_FAKE === 'true'

  useEffect(() => {
    if (appointment.data?.status !== 'pending_payment') return
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [appointment.data?.status])

  async function finish(reference: string): Promise<void> {
    try {
      await verify.mutateAsync(reference)
      await navigate(`/appointments/${appointmentId}`, { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Payment verification failed.')
    }
  }

  async function pay(): Promise<void> {
    setError(null)
    try {
      const initialized = await initialize.mutateAsync(appointmentId)
      const accessCode = initialized.payment.accessCode
      if (!accessCode) {
        setError('The payment provider did not return an access code.')
        return
      }

      if (fakePayments) {
        await finish(initialized.payment.reference)
        return
      }

      const { default: PaystackPop } = await import('@paystack/inline-js')
      const popup = new PaystackPop()
      const callbacks = {
        onSuccess: (transaction: { reference?: string }) => {
          void finish(transaction.reference ?? initialized.payment.reference)
        },
        onCancel: () =>
          setError('Payment was cancelled. You can try again before the hold expires.'),
        onError: () => setError('The payment provider could not complete the transaction.'),
      }

      if (typeof popup.checkout === 'function') {
        popup.checkout({
          accessCode,
          ...(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
            ? { key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY }
            : {}),
          ...callbacks,
        })
      } else {
        popup.resumeTransaction(accessCode, callbacks)
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The payment could not be started.')
    }
  }

  if (appointment.isPending) {
    return (
      <>
        <PageHeader title="Complete payment" />
        <LoadingSkeleton variant="detail" />
      </>
    )
  }

  if (appointment.isError) {
    return (
      <ErrorState
        title="Could not load this booking"
        message={
          appointment.error instanceof ApiError
            ? appointment.error.message
            : 'Try again in a moment.'
        }
        onRetry={() => void appointment.refetch()}
      />
    )
  }

  const row = appointment.data
  const holdExpired = row.holdExpiresAt !== null && Date.parse(row.holdExpiresAt) <= clock
  const canPay = row.status === 'pending_payment' && !holdExpired && !initialize.isPending

  return (
    <>
      <PageHeader
        title="Complete payment"
        description="Your slot is held while you pay. This is a Paystack test transaction."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{formatMoney(row.amountMinor, row.currency)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">Appointment</span>
            <span className="font-medium">{formatDateTime(row.scheduledAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">Consultation</span>
            <span className="font-medium capitalize">{row.consultationType}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">Hold expires in</span>
            <span className="font-mono font-medium">
              {holdExpired ? 'Expired' : countdown(row.holdExpiresAt)}
            </span>
          </div>

          {error ? (
            <p
              role="alert"
              className="text-danger rounded-md border border-danger/30 bg-danger/5 px-3 py-2"
            >
              {error}
            </p>
          ) : null}

          {row.status === 'scheduled' || row.status === 'completed' ? (
            <div className="flex flex-col gap-2">
              <p className="text-success font-medium">This appointment is already paid.</p>
              <Button nativeButton={false} render={<Link to={`/appointments/${row.id}`} />}>
                View appointment
              </Button>
            </div>
          ) : row.status === 'expired' || row.status === 'cancelled' || row.status === 'no_show' ? (
            <p className="text-text-muted">
              This hold is no longer active. Choose another slot to book again.
            </p>
          ) : (
            <Button onClick={() => void pay()} disabled={!canPay}>
              {initialize.isPending
                ? 'Opening Paystack…'
                : holdExpired
                  ? 'Hold expired'
                  : fakePayments
                    ? 'Simulate payment'
                    : 'Pay with Paystack'}
            </Button>
          )}

          <p className="text-text-muted text-xs">
            Test mode only. Never use a real card in this demo.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
