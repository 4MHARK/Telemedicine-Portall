import { apiClient } from '@/lib/apiClient'
import type { AuthSession } from '@/types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string
}

export function login(credentials: LoginCredentials): Promise<AuthSession> {
  return apiClient.post<AuthSession>('/auth/login', credentials)
}

export function register(input: RegisterInput): Promise<AuthSession> {
  return apiClient.post<AuthSession>('/auth/register', input)
}

export function logout(): Promise<void> {
  return apiClient.post<void>('/auth/logout')
}

export function fetchMe(): Promise<AuthSession> {
  return apiClient.get<AuthSession>('/auth/me')
}
