// Single owner of the localStorage session key.
import type { AuthSession } from '@/types'

// Not specified in docs/ — recorded here for review.
export const SESSION_STORAGE_KEY = 'telemedicine-portal:session'

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<AuthSession>
  return (
    typeof candidate.token === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    typeof candidate.patient === 'object' &&
    candidate.patient !== null
  )
}

export function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAuthSession(parsed) ? parsed : null
  } catch {
    // localStorage can throw in private mode / with storage disabled, and the
    // stored value can be corrupt. Either way, no session.
    return null
  }
}

export function writeSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Best-effort: the in-memory auth state still applies for this page life.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Nothing to do — the caller is already treating the session as gone.
  }
}

export function readToken(): string | null {
  return readSession()?.token ?? null
}
