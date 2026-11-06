import { PrismaClient } from '@prisma/client'

/**
 * One client per process. In development, `tsx watch` restarts the process on
 * change, so the global singleton is only needed to survive hot reloads within
 * a single process; it is harmless in production.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
