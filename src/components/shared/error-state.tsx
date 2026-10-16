import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  message: string
  title?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/**
 * Renders the message and, when a retry handler is supplied, a button that
 * re-runs the failed request. role="alert" so a screen reader announces it.
 */
export function ErrorState({
  message,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-danger/30 bg-danger/5 flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center',
        className,
      )}
      data-slot="error-state"
    >
      <span className="bg-danger/10 text-danger rounded-full p-3" aria-hidden="true">
        <AlertTriangle className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-text-muted mx-auto max-w-prose text-sm">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
