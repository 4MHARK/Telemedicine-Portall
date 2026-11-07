import { createHash, randomBytes } from 'node:crypto'
import type { CookieOptions, Request, Response } from 'express'

import { prisma } from './prisma.js'

const DEFAULT_TTL_DAYS = 7
const DEFAULT_IDLE_DAYS = 7
const LAST_USED_WRITE_MS = 5 * 60_000

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const SESSION_TTL_MS =
  positiveNumber(process.env.SESSION_TTL_DAYS, DEFAULT_TTL_DAYS) * 86_400_000
const SESSION_IDLE_MS =
  positiveNumber(process.env.SESSION_IDLE_DAYS, DEFAULT_IDLE_DAYS) * 86_400_000

export function sessionCookieName(): string {
  return process.env.NODE_ENV === 'production' ? '__Host-tm_session' : 'tm_session'
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(sessionCookieName(), token, cookieOptions())
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName(), { ...cookieOptions(), maxAge: undefined })
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface CreatedSession {
  token: string
  expiresAt: Date
}

export async function createSession(accountId: string, req: Request): Promise<CreatedSession> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      accountId,
      expiresAt,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
    },
  })

  return { token, expiresAt }
}

export async function findValidSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      account: {
        include: {
          patient: true,
          provider: {
            include: {
              fees: true,
              specialties: { select: { specialtyId: true } },
            },
          },
        },
      },
    },
  })

  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null
  if (!session.account.isActive) return null
  if (Date.now() - session.lastUsedAt.getTime() > SESSION_IDLE_MS) return null

  // Session validation is on every request; only touch the row occasionally so
  // a read-heavy page does not turn into a write-heavy one.
  if (Date.now() - session.lastUsedAt.getTime() > LAST_USED_WRITE_MS) {
    void prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined)
  }

  return session
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeIncomingSession(req: Request): Promise<void> {
  const token = req.cookies?.[sessionCookieName()]
  if (typeof token === 'string' && token.length > 0) await revokeSession(token)
}

export async function capSessions(accountId: string, keep = 10): Promise<void> {
  const stale = await prisma.session.findMany({
    where: {
      accountId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    skip: keep,
    select: { id: true },
  })

  if (stale.length > 0) {
    await prisma.session.updateMany({
      where: { id: { in: stale.map((session) => session.id) } },
      data: { revokedAt: new Date() },
    })
  }
}

export async function deleteExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}

export function readSessionToken(req: Request): string | null {
  const token = req.cookies?.[sessionCookieName()]
  return typeof token === 'string' && token.length > 0 ? token : null
}
