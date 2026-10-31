import type { AuthSession } from '@/types'
import type { AuthStatus } from './auth-context'

export interface AuthState {
  session: AuthSession | null
  status: AuthStatus
}

export const initialAuthState: AuthState = { session: null, status: 'idle' }

export type AuthAction =
  | { type: 'HYDRATE'; session: AuthSession | null }
  | { type: 'LOGIN'; session: AuthSession }
  | { type: 'LOGOUT' }
  | { type: 'EXPIRE' }

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'HYDRATE':
      return action.session
        ? { session: action.session, status: 'authenticated' }
        : { session: null, status: 'unauthenticated' }

    case 'LOGIN':
      return { session: action.session, status: 'authenticated' }

    case 'LOGOUT':
    case 'EXPIRE':
      return { ...state, session: null, status: 'unauthenticated' }
  }
}
