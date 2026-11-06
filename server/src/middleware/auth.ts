import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../lib/http.js'
import { verifySession } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

export interface AuthenticatedRequest extends Request {
  patient: { id: string }
}

/**
 * Validates the Bearer token, then confirms the subject still exists. A token
 * that was valid when issued but belongs to a deleted patient is a 401, not a
 * request with an empty owner.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.get('authorization')
    if (!header?.startsWith('Bearer ')) throw unauthorized()

    const token = header.slice('Bearer '.length).trim()
    if (!token) throw unauthorized()

    let subject: string
    try {
      subject = verifySession(token).sub
    } catch {
      throw unauthorized()
    }

    const patient = await prisma.patient.findUnique({
      where: { id: subject },
      select: { id: true },
    })
    if (!patient) throw unauthorized('Token subject is unknown.')

    ;(req as AuthenticatedRequest).patient = patient
    next()
  } catch (error) {
    next(error)
  }
}

/** The authenticated patient, or a 401 if the middleware was skipped. */
export function currentPatient(req: Request): { id: string } {
  const patient = (req as AuthenticatedRequest).patient
  if (!patient) throw unauthorized()
  return patient
}
