import type { AccountRole, AuthSession } from '@/types'
import { patients, providers } from './db'

// The mock session must survive a full page reload in Playwright; the real app
// uses an HttpOnly cookie instead. Cookies are browser-only; Vitest relies on
// the module state so one test cannot leak a session into the next.
const STORAGE_KEY = 'telemedicine-portal:mock-session'
const IS_TEST = import.meta.env.MODE === 'test'

let current: AuthSession | null = null

function readStored(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

function persist(session: AuthSession | null): void {
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private mode; in-memory still works.
  }
}

function buildSession(role: AccountRole, overrides: Partial<AuthSession> = {}): AuthSession {
  if (role === 'doctor') {
    const provider = providers[0]
    if (!provider) throw new Error('No provider seed data available.')
    const email = `dr.${provider.firstName.toLowerCase()}.${provider.lastName.toLowerCase()}.${provider.id}@doctors.example`
    return {
      account: { id: `acc_${provider.id}`, email, role: 'doctor', isActive: true },
      provider: { ...provider, email, isActive: true },
      ...overrides,
    }
  }

  const patient = patients[0]
  if (!patient) throw new Error('No patient seed data available.')
  return {
    account: { id: `acc_${patient.id}`, email: patient.email, role: 'patient', isActive: true },
    patient,
    ...overrides,
  }
}

function writeCookie(role: AccountRole | null): void {
  if (IS_TEST || typeof document === 'undefined') return
  document.cookie =
    role === null
      ? 'mock_session=; Path=/; Max-Age=0; SameSite=Lax'
      : `mock_session=${role}; Path=/; SameSite=Lax`
}

export function mockSignIn(
  role: AccountRole = 'patient',
  overrides: Partial<AuthSession> = {},
): AuthSession {
  current = buildSession(role, overrides)
  persist(current)
  writeCookie(role)
  return current
}

export function mockSignOut(): void {
  current = null
  persist(null)
  writeCookie(null)
}

export function getMockAuth(): AuthSession | null {
  return current ?? readStored()
}

export function setMockAuth(session: AuthSession | null): void {
  current = session
  persist(session)
  writeCookie(session?.account.role ?? null)
}

/**
 * In a browser the mock session is mirrored into a non-HttpOnly cookie so it
 * survives a full page reload; MSW handlers may run outside the page context,
 * where `document` is unavailable. The request header is authoritative.
 */
export function mockSessionForRequest(request?: Request): AuthSession | null {
  if (IS_TEST) return getMockAuth()

  const cookie = request?.headers.get('cookie') ?? ''
  const match = /(?:^|;\s*)mock_session=(patient|doctor)/.exec(
    typeof document === 'undefined' ? cookie : `${cookie}; ${document.cookie}`,
  )
  if (match?.[1] === 'patient' || match?.[1] === 'doctor') {
    return buildSession(match[1])
  }
  return getMockAuth()
}
