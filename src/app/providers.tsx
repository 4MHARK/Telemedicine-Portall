import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UnheadProvider, createHead } from '@unhead/react/client'
import { ErrorBoundary } from 'react-error-boundary'
import type { FallbackProps } from 'react-error-boundary'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { AuthProvider } from '@/features/auth'
import { ThemeProvider } from '@/features/theme'

// Module-scope singletons: one cache and one head per app instance.
// Query defaults are deliberately left at the library defaults — every
// staleTime / refetchInterval in docs/state-matrix.md is set per query.
const queryClient = new QueryClient()
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

/**
 * The provider tree. ErrorBoundary sits outermost so a failure anywhere below
 * — including in another provider — still renders a usable screen; the token
 * classes in the fallback resolve against :root, so it is themed either way.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <UnheadProvider head={head}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </UnheadProvider>
    </ErrorBoundary>
  )
}
