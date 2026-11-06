import { Router } from 'express'
import { z } from 'zod'

import { AppError, asyncHandler, unauthorized } from '../lib/http.js'
import { signSession } from '../lib/jwt.js'
import { verifyPassword } from '../lib/password.js'
import { prisma } from '../lib/prisma.js'
import { serializePatient } from '../lib/serialize.js'
import { currentPatient, requireAuth } from '../middleware/auth.js'
import { parseBody } from '../middleware/validate.js'

const loginSchema = z.object({
  // Presence only, matching the frontend's loginSchema. The API decides
  // whether the pair is correct; an email-format rule would reject input the
  // form accepts.
  email: z.string().min(1, 'Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const authRouter = Router()

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req)
    const email = body.email.trim()

    const patient = await prisma.patient.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (!patient) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }

    const passwordMatches = await verifyPassword(body.password, patient.passwordHash)
    if (!passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }

    const session = signSession(patient.id)
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      patient: serializePatient(patient),
    })
  }),
)

// Stateless JWT: there is nothing to revoke server-side. The client drops the
// token; this endpoint exists because the frontend calls it.
authRouter.post('/logout', (_req, res) => {
  res.status(204).end()
})

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = currentPatient(req)
    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) throw unauthorized('Token subject is unknown.')
    res.json(serializePatient(patient))
  }),
)
