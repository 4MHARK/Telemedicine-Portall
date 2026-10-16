// ─────────────────────────────────────────────────────────────
// Domain model · chat
// ─────────────────────────────────────────────────────────────

import type { ISODateString, UUID } from './common'

// Message lifecycle (from docs/domain.ts):
//
//     sending ──► sent ──► delivered ──► read
//                    │
//                    └──► failed   (retryable)
//
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Conversation {
  id: UUID
  patientId: UUID
  providerId: UUID
  lastMessageAt: ISODateString
  lastMessagePreview: string
  unreadCount: number
}

export interface ChatMessage {
  id: UUID
  conversationId: UUID
  senderId: UUID // patientId or providerId
  senderRole: 'patient' | 'provider'
  body: string
  sentAt: ISODateString
  status: MessageStatus
}
