import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UnheadProvider, createHead } from '@unhead/react/client'
import { render } from '@testing-library/react'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider, createMemoryRouter } from 'react-router'

import { routes } from '@/app/router'
import { AuthProvider } from '@/features/auth'
import { UploadProvider } from '@/features/documents'
import { ThemeProvider } from '@/features/theme'
import { encodeJwt } from '@/lib/jwt'
import { writeSession } from '@/lib/session'
import type { AuthSession } from '@/types'

/** Mints a session the same way the mock API does, without a network round trip. */
export function testSession(ttlSeconds = 3600): AuthSession {
  const iat = Math.floor(Date.now() / 1000)
  const payload = { sub: 'pat_01', role: 'patient' as const, iat, exp: iat + ttlSeconds }

  return {
    token: encodeJwt(payload),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    patient: {
      id: 'pat_01',
      firstName: 'Nadia',
      lastName: 'Okafor',
      email: 'nadia.okafor@example.com',
      phone: '+1-555-0100',
      dateOfBirth: '1990-01-01T00:00:00.000Z',
    },
  }
}

export function signInForTest(ttlSeconds = 3600): AuthSession {
  const session = testSession(ttlSeconds)
  writeSession(session)
  return session
}

export interface RenderAppOptions {
  /** Write a valid session before mounting. */
  authed?: boolean
}

/**
 * Mounts the real route table behind the real provider stack, on a memory
 * router. The whole app is exercised: guards, lazy pages, and the mock API.
 */
export function renderApp(initialPath = '/', { authed = false }: RenderAppOptions = {}) {
  if (authed) signInForTest()

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
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
