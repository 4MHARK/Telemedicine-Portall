import { QueryClientProvider } from '@tanstack/react-query'
import { UnheadProvider, createHead } from '@unhead/react/client'
import { render } from '@testing-library/react'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { routes } from '@/app/router'
import { AuthProvider } from '@/features/auth'
// Direct path, not the barrel: the barrel re-exports DocumentsPage, and
// importing it here would pull the page into the main chunk and defeat the
// router's lazy import.
import { UploadProvider } from '@/features/documents/UploadProvider'
import { ThemeProvider } from '@/features/theme'
import { queryClient } from '@/lib/queryClient'
import { mockSignIn } from '@/mocks/session'
import type { AccountRole, AuthSession } from '@/types'

export function testSession(role: AccountRole = 'patient'): AuthSession {
  return mockSignIn(role)
}

export function signInForTest(role: AccountRole = 'patient'): AuthSession {
  return mockSignIn(role)
}

export interface RenderAppOptions {
  /** Establish a mock session before mounting. */
  authed?: boolean
  role?: AccountRole
}

/**
 * Mounts the real route table behind the real provider stack, on a memory
 * router. The whole app is exercised: guards, lazy pages, and the mock API.
 */
export function renderApp(
  initialPath = '/',
  { authed = false, role = 'patient' }: RenderAppOptions = {},
) {
  if (authed) signInForTest(role)
  queryClient.clear()

  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  const utils = render(
    <ErrorBoundary
      FallbackComponent={({ error }) => (
        <pre data-testid="harness-error">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
    >
      <UnheadProvider head={createHead()}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <UploadProvider>
              <ThemeProvider>
                <RouterProvider router={router} />
              </ThemeProvider>
            </UploadProvider>
          </AuthProvider>
        </QueryClientProvider>
      </UnheadProvider>
    </ErrorBoundary>,
  )

  return { router, queryClient, ...utils }
}
