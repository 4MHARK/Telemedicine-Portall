import { useMemo } from 'react'
import type { ReactNode } from 'react'

import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'

/**
 * Placeholder provider.
 *
 * docs/state-matrix.md gives auth its own reducer (HYDRATE / LOGIN / LOGOUT /
 * EXPIRE) in its own Context, hydrated on boot through GET /auth/me and
 * cleared by the global 401 handler. None of that exists yet — this step only
 * reserves the provider slot in the tree and fixes the context shape, so
 * features can depend on useAuth() from the start.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({ session: null, status: 'unauthenticated' }), [])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
