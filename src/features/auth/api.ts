import { apiClient } from '@/lib/apiClient'
import { clearSession, writeSession } from '@/lib/session'
import type { AuthSession, Patient } from '@/types'

export interface LoginCredentials {
  email: string
  password: string
}

/** docs/api-contract.md: any non-empty credentials succeed. */
export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const session = await apiClient.post<AuthSession>('/auth/login', credentials)
  writeSession(session)
  return session
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>('/auth/logout')
  } finally {
    // The local session goes regardless of whether the server call succeeded.
    clearSession()
  }
}

export function fetchMe(): Promise<Patient> {
  return apiClient.get<Patient>('/auth/me')
}
