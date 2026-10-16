import { apiClient } from '@/lib/apiClient'
import type { ChatMessage, Conversation } from '@/types'

export function fetchConversations(): Promise<Conversation[]> {
  return apiClient.get<Conversation[]>('/conversations')
}

export function fetchMessages(conversationId: string, after?: string): Promise<ChatMessage[]> {
  const query = after ? `?after=${encodeURIComponent(after)}` : ''
  return apiClient.get<ChatMessage[]>(`/conversations/${conversationId}/messages${query}`)
}

export function sendMessage(conversationId: string, body: string): Promise<ChatMessage> {
  return apiClient.post<ChatMessage>(`/conversations/${conversationId}/messages`, { body })
}
