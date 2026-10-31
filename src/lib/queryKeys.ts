import type { AppointmentStatus, ProviderFilters } from '@/types'

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  specialties: {
    all: ['specialties'] as const,
  },
  providers: {
    list: (filters: ProviderFilters) => ['providers', 'list', filters] as const,
    detail: (id: string) => ['providers', 'detail', id] as const,
    slots: (providerId: string, from: string, to: string) =>
      ['providers', 'slots', providerId, { from, to }] as const,
  },
  appointments: {
    list: (status?: AppointmentStatus) => ['appointments', 'list', { status }] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
  },
  documents: {
    list: ['documents', 'list'] as const,
  },
  chat: {
    conversations: ['chat', 'conversations'] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  },
}
