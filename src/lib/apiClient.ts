// All API calls go through here: base /api, bearer token, typed ApiError.
// A 401 clears the session and redirects to login.
import type { ApiErrorBody } from '@/types'
import { clearSession, readToken } from './session'

export const API_BASE_URL = '/api'

/** Carries the parsed ApiErrorBody alongside the HTTP status. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string[]>

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export const LOGIN_PATH = '/auth/login'

// Clear the session and bounce to login with ?next.
// /auth/* is skipped — a failed login is a 401 too, and should reach the form.
function handleUnauthorized(): void {
  clearSession()

  const { pathname, search } = window.location
  if (pathname === LOGIN_PATH) return

  const next = encodeURIComponent(`${pathname}${search}`)
  window.location.assign(`${LOGIN_PATH}?next=${next}`)
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | null
  try {
    body = (await response.json()) as Partial<ApiErrorBody>
  } catch {
    body = null
  }

  return new ApiError(
    response.status,
    typeof body?.code === 'string' ? body.code : 'INTERNAL',
    typeof body?.message === 'string'
      ? body.message
      : `Request failed with status ${response.status}.`,
    body?.fieldErrors,
  )
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = readToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (response.status === 401 && !path.startsWith('/auth/')) {
    handleUnauthorized()
  }

  if (!response.ok) throw await toApiError(response)

  // 204 has no body to parse (DELETE endpoints, POST /auth/logout).
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit): Promise<T> =>
    apiRequest<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body?: unknown, init?: RequestInit): Promise<T> =>
    apiRequest<T>(path, {
      ...init,
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  patch: <T>(path: string, body?: unknown, init?: RequestInit): Promise<T> =>
    apiRequest<T>(path, {
      ...init,
      method: 'PATCH',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  delete: <T>(path: string, init?: RequestInit): Promise<T> =>
    apiRequest<T>(path, { ...init, method: 'DELETE' }),
}
