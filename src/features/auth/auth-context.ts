import { createContext, useContext } from 'react'

import type { AuthSession } from '@/types'

/**
 * Mirrors the authReducer state in docs/state-matrix.md:
 * `{ session: AuthSession | null, status: ... }`.
 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  session: AuthSession | null
  status: AuthStatus
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}
