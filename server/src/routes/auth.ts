import { randomUUID } from 'node:crypto'

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'

import { AppError, asyncHandler, badRequest } from '../lib/http.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { prisma } from '../lib/prisma.js'
import { serializeAuth } from '../lib/serialize.js'
import {
  capSessions,
  clearSessionCookie,
  createSession,
  readSessionToken,
  revokeIncomingSession,
  revokeSession,
  setSessionCookie,
} from '../lib/session.js'
import { currentAuthContext, requireAuth } from '../middleware/auth.js'
import { parseBody } from '../middleware/validate.js'

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, 'Enter your email address.')
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'),
  password: z
    .string()
    .min(12, 'Use at least 12 characters.')
    .max(128, 'Keep your password under 128 characters.'),
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80),
  phone: z.string().trim().min(1, 'Enter your phone number.').max(30),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.'),
})

const COMMON_PASSWORDS = new Set([
  'password1234',
  'password12345',
  'qwertyuiop12',
  'letmein12345',
  'demopassword',
  'demo-password',
  '123456789012',
])

// A valid hash for a value no one should submit; comparing against it keeps
// the unknown-account path roughly as expensive as the known-account path.
const DUMMY_PASSWORD_HASH = '$2b$12$9uRLBbKcnDyQ4TzwSNOeaumaaT2IM.NLwEGZUnK28qiGswYwbLCva'

function accountInclude() {
  return {
    patient: true,
    provider: {
      include: {
        fees: true,
        specialties: { select: { specialtyId: true } },
      },
    },
  } as const
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function passwordProblem(password: string, email: string): string | null {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Choose a less common password.'
  }

  const localPart = email.split('@')[0]?.toLowerCase() ?? ''
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    return 'Do not use your email address inside your password.'
  }

  return null
}

function parseDateOfBirth(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date >= new Date()) {
    throw badRequest('Request body failed schema validation.', {
      dateOfBirth: ['Enter a date of birth in the past.'],
    })
  }
  return date
}

export const authRouter = Router()

const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

authRouter.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const body = parseBody(registerSchema, req)
    const email = normalizeEmail(body.email)
    const problem = passwordProblem(body.password, email)
    if (problem) {
      throw badRequest('Request body failed schema validation.', { password: [problem] })
    }

    const existing = await prisma.account.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with that email already exists.')
    }

    const dateOfBirth = parseDateOfBirth(body.dateOfBirth)
    const passwordHash = await hashPassword(body.password)

    const account = await prisma.account.create({
      data: {
        email,
        passwordHash,
        role: 'PATIENT',
        patient: {
          create: {
            id: `pat_${randomUUID()}`,
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            dateOfBirth,
          },
        },
      },
      include: accountInclude(),
    })

    await revokeIncomingSession(req)
    const session = await createSession(account.id, req)
    await capSessions(account.id)
    setSessionCookie(res, session.token)

    res.status(201).json(serializeAuth(account))
  }),
)

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req)
    const email = normalizeEmail(body.email)

    const account = await prisma.account.findUnique({
      where: { email },
      include: accountInclude(),
    })

    if (!account) {
      // Equalise the timing of the unknown-account path.
      await verifyPassword(body.password, DUMMY_PASSWORD_HASH)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }

    const passwordMatches = await verifyPassword(body.password, account.passwordHash)
    if (!passwordMatches || !account.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    })

    await revokeIncomingSession(req)
    const session = await createSession(account.id, req)
    await capSessions(account.id)
    setSessionCookie(res, session.token)

    res.json(serializeAuth(account))
  }),
)

// Idempotent: clearing the cookie and revoking the row is safe even when the
// session has already expired.
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = readSessionToken(req)
    if (token) await revokeSession(token)
    clearSessionCookie(res)
    res.status(204).end()
  }),
)

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = currentAuthContext(req)
    res.json(
      serializeAuth({
        ...auth.account,
        patient: auth.patient,
        provider: auth.provider,
      }),
    )
  }),
)
