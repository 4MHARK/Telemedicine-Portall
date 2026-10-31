import type { ReactNode } from 'react'

import { ApiError } from '@/lib/apiClient'
import { ErrorState } from './error-state'
import { LoadingSkeleton } from './loading-skeleton'

/**
 * The part of a TanStack Query result this component needs. Structural rather
 * than `UseQueryResult<T>` so it can be used without React Query in tests.
 */
export interface AsyncQuery<T> {
  isPending: boolean
  isError: boolean
  error: unknown
  data: T | undefined
  refetch?: () => unknown
}

export interface AsyncStatusProps<T> {
  query: AsyncQuery<T>
  /** Defaults to a list skeleton. */
  skeleton?: ReactNode
  /** Treat loaded data as empty, e.g. `(d) => d.items.length === 0`. */
  isEmpty?: (data: T) => boolean
  /** Rendered when the data is empty. */
  empty?: ReactNode
  errorTitle?: string
  /** Used when the error isn't an ApiError. */
  errorFallback?: string
  children: (data: T) => ReactNode
}

export function AsyncStatus<T>({
  query,
  skeleton,
  isEmpty,
  empty,
  errorTitle = 'Could not load this',
  errorFallback = 'Something went wrong.',
  children,
}: AsyncStatusProps<T>) {
  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        message={query.error instanceof ApiError ? query.error.message : errorFallback}
        onRetry={query.refetch ? () => void query.refetch?.() : undefined}
      />
    )
  }

  if (query.isPending || query.data === undefined) {
    return <>{skeleton ?? <LoadingSkeleton />}</>
  }

  if (isEmpty?.(query.data)) {
    return <>{empty ?? null}</>
  }

  return <>{children(query.data)}</>
}
