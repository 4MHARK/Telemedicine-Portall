import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import { authReducer, initialAuthState } from './reducer'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { useMe } from './queries'

/**
 * Hydrates from the server-side session cookie via GET /auth/me. There is no
 * token in localStorage to read, so an expired or revoked session simply
 * resolves to unauthenticated.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)
  const { data, isPending } = useMe()

  useEffect(() => {
    dispatch({ type: 'HYDRATE', session: data ?? null })
  }, [data])

  const setSession = useCallback((session: AuthContextValue['session']) => {
    dispatch(session ? { type: 'LOGIN', session } : { type: 'LOGOUT' })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      status: isPending ? 'loading' : state.status,
      setSession,
    }),
    [state.session, state.status, isPending, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
