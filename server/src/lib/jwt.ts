import jwt from 'jsonwebtoken'

export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

export interface SessionToken {
  token: string
  expiresAt: string
}

interface VerifiedPayload {
  sub: string
  role: 'patient'
}

function secret(): string {
  const value = process.env.JWT_SECRET
  if (!value) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env.')
  }
  return value
}

/**
 * Signs the same payload shape the frontend already decodes:
 * `{ sub, role: 'patient', iat, exp }`. HS256 is pinned on both sign and
 * verify so a token cannot select a weaker algorithm.
 */
export function signSession(patientId: string): SessionToken {
  const token = jwt.sign({ role: 'patient' }, secret(), {
    algorithm: 'HS256',
    subject: patientId,
    expiresIn: TOKEN_TTL_SECONDS,
  })

  const decoded = jwt.decode(token)
  if (typeof decoded !== 'object' || decoded === null || typeof decoded.exp !== 'number') {
    throw new Error('Signed token did not contain an expiry.')
  }

  return {
    token,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
  }
}

/** Returns the subject when the signature, expiry and role are all valid. */
export function verifySession(token: string): VerifiedPayload {
  const decoded = jwt.verify(token, secret(), { algorithms: ['HS256'] })

  if (typeof decoded !== 'object' || decoded === null) {
    throw new jwt.JsonWebTokenError('Token payload is not an object.')
  }

  const { sub, role } = decoded as jwt.JwtPayload & { role?: unknown }
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new jwt.JsonWebTokenError('Token subject is missing.')
  }
  if (role !== 'patient') {
    throw new jwt.JsonWebTokenError('Token role is not supported.')
  }

  return { sub, role }
}
