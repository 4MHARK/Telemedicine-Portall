import { Router } from 'express'
import { z } from 'zod'

import { asyncHandler, forbidden, notFound, routeParam } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { serializeChatMessage, serializeConversation } from '../lib/serialize.js'
import { currentPatient, requireAuth } from '../middleware/auth.js'
import { parseBody, parseQuery } from '../middleware/validate.js'

const PROVIDER_REPLY_DELAY_MS = 1500

const PROVIDER_REPLIES = [
  'Thanks for the update — that is helpful.',
  'Understood. Keep an eye on it and let me know if anything changes.',
  'That sounds reasonable. We can review it at your next appointment.',
  'Noted. I will add that to your record.',
  'Good question — the short answer is yes, keep doing what you are doing.',
] as const

let replySequence = 0

const messageSchema = z.object({
  body: z.string().trim().min(1, 'A message body is required.'),
})

const messagesQuerySchema = z.object({
  after: z.union([z.string(), z.array(z.string())]).optional(),
})

/**
 * The mock has a provider reply appear on the next 3s poll. There is no doctor
 * session in this product, so the server writes the reply itself, persisted,
 * so it survives a refresh and behaves like a real message.
 */
function scheduleProviderReply(conversationId: string, providerId: string): void {
  const timer = setTimeout(() => {
    const reply = PROVIDER_REPLIES[replySequence % PROVIDER_REPLIES.length] ?? 'Noted.'
    replySequence += 1

    void (async () => {
      try {
        const sentAt = new Date()
        await prisma.$transaction(async (tx) => {
          await tx.chatMessage.create({
            data: {
              conversationId,
              senderId: providerId,
              senderRole: 'PROVIDER',
              body: reply,
              sentAt,
              status: 'DELIVERED',
            },
          })
          await tx.conversation.update({
            where: { id: conversationId },
            data: {
              lastMessageAt: sentAt,
              lastMessagePreview: reply.slice(0, 80),
            },
          })
        })
      } catch (error) {
        // A reply whose conversation disappeared is not a request failure.
        console.error('Provider auto-reply failed.', error)
      }
    })()
  }, PROVIDER_REPLY_DELAY_MS)

  // Do not keep the process alive purely for a pending demo reply.
  timer.unref()
}

function firstParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

export const conversationsRouter = Router()

conversationsRouter.use(requireAuth)

conversationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const rows = await prisma.conversation.findMany({
      where: { patientId: patient.id },
      orderBy: { lastMessageAt: 'desc' },
    })
    res.json(rows.map(serializeConversation))
  }),
)

conversationsRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const conversation = await prisma.conversation.findUnique({
      where: { id: routeParam(req, 'id') },
    })

    if (!conversation) throw notFound('Conversation not found.')
    if (conversation.patientId !== patient.id) {
      throw forbidden('This conversation belongs to another patient.')
    }

    const query = parseQuery(messagesQuerySchema, req)
    const after = firstParam(query.after) ?? ''
    const afterMs = after ? Date.parse(after) : Number.NaN

    const rows = await prisma.chatMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(Number.isNaN(afterMs) ? {} : { sentAt: { gt: new Date(afterMs) } }),
      },
      orderBy: { sentAt: 'asc' },
    })

    res.json(rows.map(serializeChatMessage))
  }),
)

conversationsRouter.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const body = parseBody(messageSchema, req)

    const conversation = await prisma.conversation.findUnique({
      where: { id: routeParam(req, 'id') },
    })

    if (!conversation) throw notFound('Conversation not found.')
    if (conversation.patientId !== patient.id) {
      throw forbidden('This conversation belongs to another patient.')
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: patient.id,
          senderRole: 'PATIENT',
          body: body.body,
          sentAt: new Date(),
          status: 'SENT',
        },
      })

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: created.sentAt,
          lastMessagePreview: created.body.slice(0, 80),
        },
      })

      return created
    })

    scheduleProviderReply(conversation.id, conversation.providerId)
    res.status(201).json(serializeChatMessage(message))
  }),
)
