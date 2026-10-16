import { useMutation, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { fetchConversations, fetchMessages, sendMessage } from './api'

/**
 * docs/state-matrix.md: conversations poll every 10 s, background off, and the
 * interval is what surfaces a provider's reply, which arrives ~1.5 s after a
 * send (docs/api-contract.md).
 */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: fetchConversations,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

/** docs/state-matrix.md: messages poll every 3 s, background off. */
export function useMessages(conversationId: string, after?: string) {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => fetchMessages(conversationId, after),
    enabled: conversationId.length > 0,
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * docs/state-matrix.md, Invalidation Rules: sending does NOT invalidate — the
 * optimistic append carries the message and the 3 s poll confirms it.
 *
 * The optimistic append itself is Phase 3, so for now a sent message shows up
 * on the next poll rather than immediately.
 */
export function useSendMessage() {
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      sendMessage(conversationId, body),
  })
}
