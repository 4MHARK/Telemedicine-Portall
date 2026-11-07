import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from './auth-context'
import { fetchMe, login, logout, register } from './api'
import type { LoginCredentials, RegisterInput } from './api'

/**
 * The boot call. The server owns the session cookie, so the client learns who
 * is signed in from GET /auth/me rather than from localStorage.
 */
export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    enabled,
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const { setSession } = useAuth()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.me, session)
      setSession(session)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const { setSession } = useAuth()

  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.me, session)
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
