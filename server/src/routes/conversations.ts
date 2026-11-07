import { Router } from 'express'
import { z } from 'zod'

import { asyncHandler, forbidden, notFound, routeParam } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { serializeChatMessage, serializeConversation } from '../lib/serialize.js'
import { currentAuthContext, requireAuth } from '../middleware/auth.js'
import type { AuthContext } from '../middleware/auth.js'
import { parseBody, parseQuery } from '../middleware/validate.js'

const messageSchema = z.object({
  body: z.string().trim().min(1, 'A message body is required.').max(4000),
})

const messagesQuerySchema = z.object({
  after: z.union([z.string(), z.array(z.string())]).optional(),
})

function firstParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

interface Viewer {
  role: 'patient' | 'provider'
  senderId: string
}

function viewerOf(auth: AuthContext): Viewer {
  if (auth.patient) return { role: 'patient', senderId: auth.patient.id }
  if (auth.provider) return { role: 'provider', senderId: auth.provider.id }
  throw forbidden('This account has no messaging profile.')
}

function assertParticipant(
  conversation: { patientId: string; providerId: string },
  auth: AuthContext,
): void {
  if (auth.patient && conversation.patientId === auth.patient.id) return
  if (auth.provider && conversation.providerId === auth.provider.id) return
  throw forbidden('This conversation belongs to someone else.')
}

export const conversationsRouter = Router()

conversationsRouter.use(requireAuth)

conversationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = currentAuthContext(req)
    const viewer = viewerOf(auth)
    const where = auth.patient
      ? { patientId: auth.patient.id }
      : { providerId: auth.provider?.id ?? '' }
    const rows = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        provider: { select: { title: true, firstName: true, lastName: true } },
      },
    })

    res.json(rows.map((row) => serializeConversation(row, viewer.role)))
  }),
)

conversationsRouter.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const auth = currentAuthContext(req)
    const viewer = viewerOf(auth)
    const conversation = await prisma.conversation.findUnique({
      where: { id: routeParam(req, 'id') },
    })

    if (!conversation) throw notFound('Conversation not found.')
    assertParticipant(conversation, auth)

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

    // Reading a thread clears this viewer's badge, not the other side's.
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: viewer.role === 'patient' ? { patientUnreadCount: 0 } : { providerUnreadCount: 0 },
    })

    res.json(rows.map(serializeChatMessage))
  }),
)

conversationsRouter.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const auth = currentAuthContext(req)
    const viewer = viewerOf(auth)
    const body = parseBody(messageSchema, req)

    const conversation = await prisma.conversation.findUnique({
      where: { id: routeParam(req, 'id') },
    })

    if (!conversation) throw notFound('Conversation not found.')
    assertParticipant(conversation, auth)

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: viewer.senderId,
          senderRole: viewer.role === 'patient' ? 'PATIENT' : 'PROVIDER',
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
          ...(viewer.role === 'patient'
            ? { providerUnreadCount: { increment: 1 } }
            : { patientUnreadCount: { increment: 1 } }),
        },
      })

      return created
    })

    res.status(201).json(serializeChatMessage(message))
  }),
)
