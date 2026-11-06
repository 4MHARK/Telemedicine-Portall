import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'

import { AppError, asyncHandler, badRequest, forbidden, notFound, routeParam } from '../lib/http.js'
import { prisma } from '../lib/prisma.js'
import { serializeDocument } from '../lib/serialize.js'
import { currentPatient, requireAuth } from '../middleware/auth.js'
import { parseBody } from '../middleware/validate.js'

const uploadFieldsSchema = z.object({
  appointmentId: z.string().optional(),
})

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
})

function sortDocuments<T extends { uploadedAt: Date | null; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = a.uploadedAt?.getTime() ?? Number.NEGATIVE_INFINITY
    const bTime = b.uploadedAt?.getTime() ?? Number.NEGATIVE_INFINITY
    if (aTime !== bTime) return bTime - aTime
    return a.id.localeCompare(b.id)
  })
}

export const documentsRouter = Router()

documentsRouter.use(requireAuth)

documentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const rows = await prisma.document.findMany({ where: { patientId: patient.id } })
    res.json(sortDocuments(rows).map(serializeDocument))
  }),
)

documentsRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const file = req.file

    if (!file) {
      throw badRequest('Request body failed schema validation.', {
        file: ['A file is required.'],
      })
    }

    if (file.size > MAX_BYTES) {
      throw new AppError(413, 'FILE_TOO_LARGE', 'Files must be 10 MB or smaller.')
    }

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new AppError(
        415,
        'UNSUPPORTED_TYPE',
        `Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}.`,
      )
    }

    const fields = parseBody(uploadFieldsSchema, req)
    const rawAppointmentId = fields.appointmentId?.trim() ?? ''

    if (rawAppointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: rawAppointmentId },
        select: { id: true, patientId: true },
      })
      if (!appointment) throw notFound('Appointment not found.')
      if (appointment.patientId !== patient.id) {
        throw forbidden('This appointment belongs to another patient.')
      }
    }

    const document = await prisma.document.create({
      data: {
        patientId: patient.id,
        appointmentId: rawAppointmentId || null,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: 'UPLOADED',
        uploadedAt: new Date(),
        data: new Uint8Array(file.buffer),
      },
    })

    res.status(201).json(serializeDocument(document))
  }),
)

documentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = currentPatient(req)
    const document = await prisma.document.findUnique({
      where: { id: routeParam(req, 'id') },
      select: { id: true, patientId: true },
    })

    if (!document) throw notFound('Document not found.')
    if (document.patientId !== patient.id) {
      throw forbidden('This document belongs to another patient.')
    }

    await prisma.document.delete({ where: { id: document.id } })
    res.status(204).end()
  }),
)
