import { Router } from 'express'

import { asyncHandler } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { serializeSpecialty } from '../lib/serialize.js'

export const specialtiesRouter = Router()

// Public: the /doctors directory is public, so its supporting data is too.
specialtiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.specialty.findMany({ orderBy: { id: 'asc' } })
    res.json(rows.map(serializeSpecialty))
  }),
)
