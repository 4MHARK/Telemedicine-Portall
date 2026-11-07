// The mock persists messages; a doctor sends replies through the same endpoint
// the real API exposes. No simulated reply timer exists in the live contract.
import { http, HttpResponse } from 'msw'

import type { ChatMessage } from '@/types'
import { conversations, messages } from '../db'
import { apiError, authenticate, latency, patientIdOf, providerIdOf, readJson } from './shared'

let createdMessages = 0

function canAccess(
  conversation: { patientId: string; providerId: string },
  session: Parameters<typeof patientIdOf>[0],
): boolean {
  if (session.patient) return conversation.patientId === session.patient.id
  if (session.provider) return conversation.providerId === session.provider.id
  return false
}

export const chatHandlers = [
  // GET /conversations — polled every 10 s by the client
  http.get('/api/conversations', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const result = conversations
      .filter((c) => canAccess(c, auth.session))
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
    if (!canAccess(conversation, auth.session)) {
      return apiError(403, 'FORBIDDEN', 'This conversation belongs to someone else.')
    }

    const result = messages
      .filter((m) => m.conversationId === conversationId)
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
    if (!canAccess(conversation, auth.session)) {
      return apiError(403, 'FORBIDDEN', 'This conversation belongs to someone else.')
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

    const isPatient = Boolean(auth.session.patient)
    createdMessages += 1
    const sentAt = new Date().toISOString()
    const message: ChatMessage = {
      id: `msg_new_${createdMessages}`,
      conversationId,
      senderId: isPatient ? patientIdOf(auth.session) : providerIdOf(auth.session),
      senderRole: isPatient ? 'patient' : 'provider',
      body: text,
      sentAt,
      status: 'sent',
    }

    messages.push(message)
    conversation.lastMessageAt = sentAt
    conversation.lastMessagePreview = text.slice(0, 80)

    return HttpResponse.json(message, { status: 201 })
  }),
]
