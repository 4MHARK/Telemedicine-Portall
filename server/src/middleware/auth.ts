import type { ConsultationFee, Account, Patient, Provider, Session } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'

import { forbidden, unauthorized } from '../lib/http.js'
import { findValidSession, readSessionToken } from '../lib/session.js'

export type ProviderWithFees = Provider & {
  fees: ConsultationFee[]
  specialties: { specialtyId: string }[]
}

export interface AuthContext {
  account: Account
  patient: Patient | null
  provider: ProviderWithFees | null
  session: Session
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext
}

/**
 * Resolves the session cookie into an account and its patient/provider
 * profile. The session row is checked against expiry, revocation and the
 * account's active flag on every request.
 */
async function authenticate(req: Request): Promise<AuthContext> {
  const token = readSessionToken(req)
  if (!token) throw unauthorized()

  const session = await findValidSession(token)
  if (!session) throw unauthorized()

  const context: AuthContext = {
    account: session.account,
    patient: session.account.patient,
    provider: session.account.provider,
    session,
  }

  ;(req as AuthenticatedRequest).auth = context
  return context
}

function currentAuth(req: Request): AuthContext {
  const auth = (req as AuthenticatedRequest).auth
  if (!auth) throw unauthorized()
  return auth
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    await authenticate(req)
    next()
  } catch (error) {
    next(error)
  }
}

export async function requirePatient(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = await authenticate(req)
    if (!auth.patient) throw forbidden('This account is not a patient account.')
    next()
  } catch (error) {
    next(error)
  }
}

export async function requireDoctor(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = await authenticate(req)
    if (!auth.provider) throw forbidden('This account is not a doctor account.')
    next()
  } catch (error) {
    next(error)
  }
}

export function currentAuthContext(req: Request): AuthContext {
  return currentAuth(req)
}

export function currentAccount(req: Request): Account {
  return currentAuth(req).account
}

/** The authenticated patient, or a 403 if this is a doctor-only account. */
export function currentPatient(req: Request): Patient {
  const patient = currentAuth(req).patient
  if (!patient) throw forbidden('This account is not a patient account.')
  return patient
}

/** The authenticated doctor's provider profile, including fees. */
export function currentProvider(req: Request): ProviderWithFees {
  const provider = currentAuth(req).provider
  if (!provider) throw forbidden('This account is not a doctor account.')
  return provider
}
