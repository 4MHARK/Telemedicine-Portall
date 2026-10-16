/**
 * docs/api-contract.md § Chat.
 *
 * Simulated condition owned here: "after ~1.5 s the provider replies once, on
 * the next poll". The reply is appended to the store on a timer, so the 3 s
 * poll interval from docs/state-matrix.md is what actually delivers it.
 *
 * Transport note (docs/decisions.md rows 9–11): polling, and the client merges
 * incoming messages by id rather than replacing the array. This handler is
 * unaware of that — it just answers with the current list.
 */

import { http, HttpResponse } from 'msw'

import type { ChatMessage } from '@/types'
import { conversations, messages, providers } from '../db'
import { apiError, authenticate, latency, readJson } from './shared'

const PROVIDER_REPLY_DELAY_MS = 1500

const PROVIDER_REPLIES = [
  'Thanks for the update — that is helpful.',
  'Understood. Keep an eye on it and let me know if anything changes.',
  'That sounds reasonable. We can review it at your next appointment.',
  'Noted. I will add that to your record.',
  'Good question — the short answer is yes, keep doing what you are doing.',
] as const

let replySequence = 0
let createdMessages = 0

function appendProviderReply(conversationId: string, providerId: string): void {
  const conversation = conversations.find((c) => c.id === conversationId)
  if (!conversation) return

  const reply = PROVIDER_REPLIES[replySequence % PROVIDER_REPLIES.length] ?? 'Noted.'
  replySequence += 1
  createdMessages += 1

  const sentAt = new Date().toISOString()
  messages.push({
    id: `msg_new_${createdMessages}`,
    conversationId,
    senderId: providerId,
    senderRole: 'provider',
    body: reply,
    sentAt,
    status: 'delivered',
  })

  conversation.lastMessageAt = sentAt
  conversation.lastMessagePreview = reply.slice(0, 80)
}

export const chatHandlers = [
  // GET /conversations — polled every 10 s by the client
  http.get('/api/conversations', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const result = conversations
      .filter((c) => c.patientId === auth.patientId)
      .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))

    return HttpResponse.json(result)
  }),

  // GET /conversations/:id/messages?after= — polled every 3 s
  http.get('/api/conversations/:id/messages', async ({ params, request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const conversationId = String(params.id)
    const conversation = conversations.find((c) => c.id === conversationId)
    if (!conversation) return apiError(404, 'NOT_FOUND', 'Conversation not found.')
    if (conversation.patientId !== auth.patientId) {
      return apiError(403, 'FORBIDDEN', 'This conversation belongs to another patient.')
    }

    const after = new URL(request.url).searchParams.get('after')
    const afterMs = after ? Date.parse(after) : Number.NaN

    const result = messages
      .filter((m) => m.conversationId === conversationId)
      .filter((m) => (Number.isNaN(afterMs) ? true : Date.parse(m.sentAt) > afterMs))
      .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))

    return HttpResponse.json(result)
  }),

  // POST /conversations/:id/messages — { body }
  http.post('/api/conversations/:id/messages', async ({ params, request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const conversationId = String(params.id)
    const conversation = conversations.find((c) => c.id === conversationId)
    if (!conversation) return apiError(404, 'NOT_FOUND', 'Conversation not found.')
    if (conversation.patientId !== auth.patientId) {
      return apiError(403, 'FORBIDDEN', 'This conversation belongs to another patient.')
    }

    const parsed = await readJson<{ body?: unknown }>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const text = typeof body.body === 'string' ? body.body.trim() : ''
    if (!text) {
      return apiError(422, 'VALIDATION', 'Request body failed schema validation.', {
        body: ['A message body is required.'],
      })
    }

    createdMessages += 1
    const sentAt = new Date().toISOString()
    const message: ChatMessage = {
      id: `msg_new_${createdMessages}`,
      conversationId,
      senderId: auth.patientId,
      senderRole: 'patient',
      body: text,
      sentAt,
      status: 'sent',
    }

    messages.push(message)
    conversation.lastMessageAt = sentAt
    conversation.lastMessagePreview = text.slice(0, 80)

    // The provider's reply lands after the client has already returned; the
    // next poll is what surfaces it.
    if (providers.some((p) => p.id === conversation.providerId)) {
      setTimeout(
        () => appendProviderReply(conversationId, conversation.providerId),
        PROVIDER_REPLY_DELAY_MS,
      )
    }

    return HttpResponse.json(message, { status: 201 })
  }),
]
