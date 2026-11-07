import { QueryClientProvider } from '@tanstack/react-query'
import { UnheadProvider, createHead } from '@unhead/react/client'
import { ErrorBoundary } from 'react-error-boundary'
import type { FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { AuthProvider } from '@/features/auth'
// Direct import: the barrel re-exports DocumentsPage, which would break splitting.
import { UploadProvider } from '@/features/documents/UploadProvider'
import { ThemeProvider } from '@/features/theme'
import { queryClient } from '@/lib/queryClient'

const head = createHead()

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    <div className="bg-surface text-text flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-text-muted max-w-prose text-center text-sm">{message}</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  )
}

// ErrorBoundary outermost so a provider crash still renders something.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <UnheadProvider head={head}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* Above the page so leaving /documents does not drop the queue. */}
            <UploadProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </UploadProvider>
          </AuthProvider>
        </QueryClientProvider>
      </UnheadProvider>
    </ErrorBoundary>
  )
}
