import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { readSession } from '@/lib/session'
import type { ChatMessage } from '@/types'
import { fetchConversations, fetchMessages, sendMessage } from './api'
import { mergeMessages } from './mergeMessages'

// Poll every 10s — this is how the provider's reply shows up.
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: fetchConversations,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

// Merge the poll result into the cache instead of replacing it, otherwise an
// optimistic send disappears until the server echoes it back.
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

// Optimistic send: append as 'sending', swap in the server copy on success,
// mark it 'failed' (and keep the text) on error.
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
