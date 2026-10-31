// fail-* files 500 once per session; >10MB is 413; wrong mime type is 415.
import { http, HttpResponse } from 'msw'

import type { Document } from '@/types'
import { appointments, documents } from '../db'
import { apiError, authenticate, latency } from './shared'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const

/** "once per session" — module scope is the session in a SPA. */
let failUploadAlreadyServed = false

/**
 * `instanceof File` is unreliable here: the File the test/browser constructs
 * and the one the interceptor parses the multipart body with can come from
 * different realms (jsdom vs undici), and the identity check fails. Duck-type
 * on the three fields the contract cares about.
 */
function isFileLike(value: unknown): value is File {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<File>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.type === 'string'
  )
}

let created = 0

export const documentHandlers = [
  // GET /documents — current patient only
  http.get('/api/documents', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const result = documents
      .filter((d) => d.patientId === auth.patientId)
      .sort((a, b) => Date.parse(b.uploadedAt ?? '') - Date.parse(a.uploadedAt ?? ''))

    return HttpResponse.json(result)
  }),

  // POST /documents — multipart/form-data: file (required), appointmentId?
  http.post('/api/documents', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return apiError(422, 'VALIDATION', 'Request must be multipart/form-data.', {
        file: ['Expected a multipart body.'],
      })
    }

    const file = form.get('file')
    if (!isFileLike(file)) {
      return apiError(422, 'VALIDATION', 'Request body failed schema validation.', {
        file: ['A file is required.'],
      })
    }

    if (file.size > MAX_BYTES) {
      return apiError(413, 'FILE_TOO_LARGE', 'Files must be 10 MB or smaller.')
    }

    if (!ALLOWED_MIME_TYPES.some((t) => t === file.type)) {
      return apiError(415, 'UNSUPPORTED_TYPE', `Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}.`)
    }

    // The optional appointmentId must name a visit this patient owns.
    const appointmentId = form.get('appointmentId')
    if (typeof appointmentId === 'string' && appointmentId) {
      const appointment = appointments.find((a) => a.id === appointmentId)
      if (!appointment) return apiError(404, 'NOT_FOUND', 'Appointment not found.')
      if (appointment.patientId !== auth.patientId) {
        return apiError(403, 'FORBIDDEN', 'This appointment belongs to another patient.')
      }
    }

    if (file.name.startsWith('fail-')) {
      if (!failUploadAlreadyServed) {
        failUploadAlreadyServed = true
        return apiError(500, 'INTERNAL', 'Simulated upload failure. Retry to continue.')
      }
    }

    created += 1

    const document: Document = {
      id: `doc_new_${created}`,
      patientId: auth.patientId,
      ...(typeof appointmentId === 'string' && appointmentId ? { appointmentId } : {}),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
    }

    documents.push(document)
    return HttpResponse.json(document, { status: 201 })
  }),

  // DELETE /documents/:id
  http.delete('/api/documents/:id', async ({ params, request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const index = documents.findIndex((d) => d.id === String(params.id))
    if (index === -1) return apiError(404, 'NOT_FOUND', 'Document not found.')
    if (documents[index]?.patientId !== auth.patientId) {
      return apiError(403, 'FORBIDDEN', 'This document belongs to another patient.')
    }

    documents.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
