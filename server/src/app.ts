import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiRouter } from './routes/index.js'

/**
 * Builds the Express app without binding a port, so Supertest can exercise the
 * exact middleware stack used in production.
 */
export function createApp(): express.Express {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.')
  }

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
  const appOrigin = process.env.APP_ORIGIN?.trim()
  if (appOrigin && !allowedOrigins.includes(appOrigin)) allowedOrigins.push(appOrigin)

  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }

        // Omit the CORS headers instead of rejecting. A same-origin proxy
        // request (Netlify/Vercel rewrite) still carries the frontend's Origin.
        callback(null, false)
      },
    }),
  )

  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(cookieParser())
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buffer) => {
        // The Paystack webhook must be verified over the exact bytes.
        ;(req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer)
      },
    }),
  )

  // Cookie-authenticated writes need an origin check as a CSRF backstop.
  // SameSite=Lax already blocks cross-site POSTs; this rejects an explicitly
  // foreign Origin before a route can act on it.
  function trustedOrigin(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next()
      return
    }

    if (req.path === '/api/payments/webhook' || req.path === '/api/seed') {
      next()
      return
    }

    const origin = req.get('origin')
    if (!origin) {
      next()
      return
    }

    const sameOrigin = `${req.protocol}://${req.get('host')}`
    if (
      origin === sameOrigin ||
      origin === appOrigin ||
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin)
    ) {
      next()
      return
    }

    res.status(403).json({ code: 'FORBIDDEN', message: 'Origin not allowed.' })
  }

  app.use(trustedOrigin)

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', apiLimiter, apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
