import { createApp } from './app.js'
import { releaseExpiredHolds } from './lib/payments.js'
import { prisma } from './lib/prisma.js'
import { deleteExpiredSessions } from './lib/session.js'

const app = createApp()
const port = Number(process.env.PORT) || 3001

const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})

// Expired sessions are unusable at validation time; this just keeps the table
// from growing without bound.
setInterval(() => {
  void deleteExpiredSessions().catch((error: unknown) => {
    console.error('Session cleanup failed.', error)
  })
}, 60 * 60_000).unref()

setInterval(() => {
  void releaseExpiredHolds().catch((error: unknown) => {
    console.error('Expired-hold cleanup failed.', error)
  })
}, 60_000).unref()

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Closing the server.`)
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0))
  })
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
