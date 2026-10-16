import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type LoadingSkeletonVariant = 'list' | 'card' | 'detail'

export interface LoadingSkeletonProps {
  variant?: LoadingSkeletonVariant
  /** Rows for `list`, tiles for `card`. Ignored by `detail`. */
  count?: number
  className?: string
}

/**
 * One component for the three shapes the app waits on, so loading states stay
 * consistent instead of each page inventing its own.
 *
 * aria-busy + a polite live region: the skeleton is decorative, but a screen
 * reader should know the region is still loading.
 */
export function LoadingSkeleton({ variant = 'list', count = 3, className }: LoadingSkeletonProps) {
  const rows = Math.max(1, count)

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn('flex flex-col gap-3', className)}
      data-slot="loading-skeleton"
    >
      <span className="sr-only">Loading…</span>

      {variant === 'list'
        ? Array.from({ length: rows }, (_, i) => (
            <div key={i} className="border-border flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </div>
          ))
        : null}

      {variant === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="border-border flex flex-col gap-3 rounded-lg border p-4">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          ))}
        </div>
      ) : null}

      {variant === 'detail' ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}
    </div>
  )
}
