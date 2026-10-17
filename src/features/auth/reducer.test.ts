import { describe, expect, it } from 'vitest'

import type { AuthSession } from '@/types'
import { authReducer, initialAuthState } from './reducer'

const session: AuthSession = {
  token: 'a.b.c',
  expiresAt: '2026-01-01T11:00:00.000Z',
  patient: {
    id: 'pat_01',
    firstName: 'Nadia',
    lastName: 'Okafor',
    email: 'nadia@example.com',
    phone: '+1-555-0100',
    dateOfBirth: '1990-01-01T00:00:00.000Z',
  },
}

describe('authReducer', () => {
  it('hydrates to authenticated when a session exists', () => {
    expect(authReducer(initialAuthState, { type: 'HYDRATE', session })).toEqual({
      session,
      status: 'authenticated',
    })
  })

  it('hydrates to unauthenticated when storage was empty or expired', () => {
    expect(authReducer(initialAuthState, { type: 'HYDRATE', session: null })).toEqual({
      session: null,
      status: 'unauthenticated',
    })
  })

  it('logs in', () => {
    expect(authReducer(initialAuthState, { type: 'LOGIN', session })).toEqual({
      session,
      status: 'authenticated',
    })
  })

  it('logs out', () => {
    expect(authReducer({ session, status: 'authenticated' }, { type: 'LOGOUT' })).toEqual({
      session: null,
      status: 'unauthenticated',
    })
  })

  it('expires the session the same way logout does', () => {
    expect(authReducer({ session, status: 'authenticated' }, { type: 'EXPIRE' })).toEqual({
      session: null,
      status: 'unauthenticated',
    })
  })

  it('never mutates the previous state', () => {
    const previous = { session, status: 'authenticated' as const }
    authReducer(previous, { type: 'LOGOUT' })
    expect(previous.session).toBe(session)
  })
})
