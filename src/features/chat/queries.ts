import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { readSession } from '@/lib/session'
import type { ChatMessage } from '@/types'
import { fetchConversations, fetchMessages, sendMessage } from './api'
import { mergeMessages } from './mergeMessages'

/**
 * docs/state-matrix.md: conversations poll every 10 s, background off. The
 * interval is what surfaces a provider's reply, which the mock sends ~1.5 s
 * after a patient message (docs/api-contract.md).
 */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: fetchConversations,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * docs/state-matrix.md: messages poll every 3 s, background off.
 *
 * The poll result is merged with the cached list rather than replacing it, so
 * an optimistic send that the server has not acknowledged yet survives
 * (docs/decisions.md row 10). Reading the cache inside queryFn is what makes
 * that possible — React Query would otherwise swap the whole array.
 */
export function useMessages(conversationId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.chat.messages(conversationId)

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const serverMessages = await fetchMessages(conversationId)
      const cached = queryClient.getQueryData<ChatMessage[]>(key) ?? []
      return mergeMessages(cached, serverMessages)
    },
    enabled: conversationId.length > 0,
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * Optimistic send. The message is appended with status `sending`, the server
 * copy replaces it on success, and a failure flips it to `failed` (retryable)
 * instead of removing it, so the text is never lost.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.chat.messages(conversationId)

  return useMutation({
    mutationFn: (body: string) => sendMessage(conversationId, body),

    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ChatMessage[]>(key)

      const optimistic: ChatMessage = {
        id: `local_${crypto.randomUUID()}`,
        conversationId,
        senderId: readSession()?.patient.id ?? 'pat_01',
        senderRole: 'patient',
        body,
        sentAt: new Date().toISOString(),
        status: 'sending',
      }

      queryClient.setQueryData<ChatMessage[]>(key, (old) => mergeMessages(old ?? [], [optimistic]))

      return { previous, optimisticId: optimistic.id }
    },

    onError: (_error, _body, context) => {
      queryClient.setQueryData<ChatMessage[]>(key, (old) =>
        (old ?? []).map((message) =>
          message.id === context?.optimisticId ? { ...message, status: 'failed' } : message,
        ),
      )
    },

    onSuccess: (serverMessage, _body, context) => {
      queryClient.setQueryData<ChatMessage[]>(key, (old) =>
        mergeMessages(
          (old ?? []).filter((message) => message.id !== context?.optimisticId),
          [serverMessage],
        ),
      )
    },
  })
}
