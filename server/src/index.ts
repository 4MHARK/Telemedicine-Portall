import cors from 'cors'
import express from 'express'

import { prisma } from './lib/prisma.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiRouter } from './routes/index.js'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env.`)
  }
  return value
}

requiredEnv('DATABASE_URL')
const jwtSecret = requiredEnv('JWT_SECRET')
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Generate: openssl rand -hex 32')
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0)

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, health checks and same-origin server calls.
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      // Omit the CORS headers instead of rejecting. A genuine cross-origin
      // browser read is blocked by the browser; a same-origin proxy request
      // (Netlify/Vercel rewrite) still carries the frontend's Origin header,
      // and must not be turned into a 403 by this allowlist.
      callback(null, false)
    },
  }),
)

app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Convenience for a frontend pointed at the API root rather than /api.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', apiRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const port = Number(process.env.PORT) || 3001

const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Closing the server.`)
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0))
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
