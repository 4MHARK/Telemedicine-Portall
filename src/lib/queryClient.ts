import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './apiClient'

/**
 * One cache for the app. Router loaders use it for auth guards, and
 * AppProviders hands the same instance to TanStack Query, so a login updates
 * both the header and the next guard without a second request.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
        failureCount < 2,
    },
  },
})
