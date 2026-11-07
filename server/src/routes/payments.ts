import { Router } from 'express'
import type { Request } from 'express'
import { z } from 'zod'

import { asyncHandler, forbidden, notFound, routeParam } from '../lib/http.js'
import { createOrReusePayment, markRefundFromWebhook, settlePayment } from '../lib/payments.js'
import { createPaystackProvider } from '../lib/paystack.js'
import { prisma } from '../lib/prisma.js'
import { serializeAppointment, serializePayment } from '../lib/serialize.js'
import { currentAccount, currentPatient, requirePatient } from '../middleware/auth.js'
import { parseBody } from '../middleware/validate.js'

interface RawBodyRequest extends Request {
  rawBody?: Buffer
}

const initializeSchema = z.object({
  appointmentId: z.string().min(1, '`appointmentId` is required.'),
})

const verifySchema = z.object({
  reference: z.string().min(1, '`reference` is required.'),
})

function rawBodyOf(req: Request): Buffer | string | null {
  const raw = (req as RawBodyRequest).rawBody
  if (raw && raw.length > 0) return raw
  if (typeof req.body === 'object' && req.body !== null) return JSON.stringify(req.body)
  return null
}

export const paymentsRouter = Router()

paymentsRouter.post(
  '/initialize',
  requirePatient,
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const body = parseBody(initializeSchema, req)
    const provider = createPaystackProvider()

    const payment = await createOrReusePayment(
      body.appointmentId,
      patient.id,
      currentAccount(req).email,
      provider,
    )
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: payment.appointmentId },
    })

    res.json({
      payment: serializePayment(payment),
      appointment: serializeAppointment(appointment),
    })
  }),
)

paymentsRouter.post(
  '/verify',
  requirePatient,
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const body = parseBody(verifySchema, req)
    const payment = await prisma.payment.findUnique({
      where: { reference: body.reference },
      select: { patientId: true },
    })

    if (!payment) throw notFound('Payment not found.')
    if (payment.patientId !== patient.id) {
      throw forbidden('This payment belongs to another patient.')
    }

    const provider = createPaystackProvider()
    const result = await settlePayment(body.reference, provider, 'verify')

    res.json({
      payment: serializePayment(result.payment),
      appointment: serializeAppointment(result.appointment),
    })
  }),
)

paymentsRouter.get(
  '/:reference',
  requirePatient,
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const payment = await prisma.payment.findUnique({
      where: { reference: routeParam(req, 'reference') },
    })

    if (!payment) throw notFound('Payment not found.')
    if (payment.patientId !== patient.id) {
      throw forbidden('This payment belongs to another patient.')
    }

    res.json(serializePayment(payment))
  }),
)

/**
 * Paystack webhooks are unauthenticated by design; the HMAC over the exact raw
 * body is the authentication. The route returns 200 for verified events so
 * Paystack stops retrying, and settlement itself is idempotent.
 */
paymentsRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const provider = createPaystackProvider()
    const rawBody = rawBodyOf(req)
    const signature = req.get('x-paystack-signature')

    if (!rawBody || !provider.verifyWebhook(rawBody, signature)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid webhook signature.' })
      return
    }

    let payload: {
      event?: unknown
      data?: { reference?: unknown; transaction_reference?: unknown }
    }
    try {
      payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody)
    } catch {
      res.status(400).json({ code: 'VALIDATION', message: 'Invalid webhook payload.' })
      return
    }

    try {
      if (payload.event === 'charge.success') {
        const reference = payload.data?.reference
        if (typeof reference === 'string') {
          await settlePayment(reference, provider, 'webhook')
        }
      } else if (payload.event === 'refund.processed' || payload.event === 'refund.failed') {
        const reference =
          typeof payload.data?.transaction_reference === 'string'
            ? payload.data.transaction_reference
            : payload.data?.reference
        if (typeof reference === 'string') {
          await markRefundFromWebhook(
            reference,
            payload.event === 'refund.processed' ? 'processed' : 'failed',
          )
        }
      }
    } catch (error) {
      // The verify-on-return path can reconcile anything that fails here; do
      // not make Paystack retry a permanently failing business outcome.
      console.error('Paystack webhook processing failed.', error)
    }

    res.status(200).json({ received: true })
  }),
)
