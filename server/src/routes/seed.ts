import { timingSafeEqual } from 'node:crypto'

import { Router } from 'express'

import { AppError, asyncHandler, unauthorized } from '../lib/http.js'
import { seedDatabase } from '../lib/seed.js'

function secretMatches(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  if (providedBytes.length !== expectedBytes.length) return false
  return timingSafeEqual(providedBytes, expectedBytes)
}

export const seedRouter = Router()

seedRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      throw new AppError(404, 'NOT_FOUND', 'Route not found.')
    }

    const expected = process.env.SEED_SECRET
    if (!expected) {
      throw new AppError(500, 'INTERNAL', 'SEED_SECRET is not configured.')
    }

    const provided = req.get('x-seed-secret') ?? ''
    if (!secretMatches(provided, expected)) {
      throw unauthorized('Invalid seed secret.')
    }

    const summary = await seedDatabase()
    res.json({ status: 'seeded', ...summary })
  }),
)
