import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from './auth-context'
import { fetchMe, login, logout } from './api'
import type { LoginCredentials } from './api'

/**
 * Rehydrates the session on boot. docs/api-contract.md: GET /auth/me is the
 * boot call, and its 401 is caught by the global handler in apiClient.
 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    enabled,
    retry: false,
  })
}

/** Writes the session to storage as part of the mutation, not in the caller. */
export function useLogin() {
  const queryClient = useQueryClient()
  const { setSession } = useAuth()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.me, session.patient)
      // Keep the Context in step with storage, or the provider would serve a
      // stale session for the rest of the page's life.
      setSession(session)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const { setSession } = useAuth()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.me })
      setSession(null)
    },
  })
}
