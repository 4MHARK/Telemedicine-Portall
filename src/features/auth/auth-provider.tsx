import { useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import { isTokenUsable } from '@/lib/jwt'
import { readSession } from '@/lib/session'
import { authReducer, initialAuthState } from './reducer'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'

/**
 * Hydrates once on boot from localStorage, the way docs/state-matrix.md
 * describes auth persistence. An expired token counts as no session, so the
 * guard and the shell agree about who is signed in.
 *
 * Session writes go through useLogin/useLogout, which also update this context
 * — otherwise the provider would keep serving stale state for the life of the
 * page.
 */
function initAuth() {
  const stored = readSession()
  return authReducer(initialAuthState, {
    type: 'HYDRATE',
    session: stored && isTokenUsable(stored.token) ? stored : null,
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState, initAuth)

  const setSession = useCallback((session: AuthContextValue['session']) => {
    dispatch(session ? { type: 'LOGIN', session } : { type: 'LOGOUT' })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session: state.session, status: state.status, setSession }),
    [state.session, state.status, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
