import { ErrorBoundary } from 'react-error-boundary'
import type { FallbackProps } from 'react-error-boundary'
import { isRouteErrorResponse, Outlet, useRouteError } from 'react-router'

import { ErrorState, PageHeader } from '@/components/shared'
import { usePageTitle } from '@/hooks/use-page-title'

function describe(error: unknown): { title: string; message: string } {
  if (isRouteErrorResponse(error)) {
    const detail =
      typeof error.data === 'string'
        ? error.data
        : typeof (error.data as { message?: unknown } | null)?.message === 'string'
          ? String((error.data as { message: string }).message)
          : error.statusText

    if (error.status === 404) {
      return { title: 'Page not found', message: 'That page does not exist.' }
    }
    return { title: `${error.status} ${error.statusText}`.trim(), message: detail }
  }

  if (error instanceof Error) {
    return { title: 'Something went wrong', message: error.message }
  }

  return { title: 'Something went wrong', message: 'An unexpected error occurred.' }
}

function Fallback({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry?: () => void
}) {
  usePageTitle(title)
  return (
    <>
      <PageHeader title={title} />
      <ErrorState title={title} message={message} onRetry={onRetry} />
    </>
  )
}

// Render errors inside a page.
function RenderErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { title, message } = describe(error)
  return <Fallback title={title} message={message} onRetry={resetErrorBoundary} />
}

// Keeps the shell around a page that throws.
export function RouteBoundary() {
  return (
    <ErrorBoundary FallbackComponent={RenderErrorFallback}>
      <Outlet />
    </ErrorBoundary>
  )
}

// Loader errors land here, in the Outlet slot, not over the whole shell.
export function RouteErrorPage() {
  const error = useRouteError()
  const { title, message } = describe(error)

  return (
    <Fallback
      title={title}
      message={message}
      onRetry={() => {
        window.location.reload()
      }}
    />
  )
}
