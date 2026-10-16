/**
 * docs/api-contract.md § Appointments.
 *
 * Simulated conditions owned here:
 *   - POST returns 409 SLOT_TAKEN when the slot is already booked
 *   - PATCH returns 409 when the status transition is not allowed
 */

import { http, HttpResponse } from 'msw'

import type { Appointment, AppointmentStatus, ConsultationType, UUID } from '@/types'
import { appointments, providers, slots } from '../db'
import { apiError, authenticate, latency, readJson } from './shared'

const CONSULTATION_TYPES: readonly ConsultationType[] = ['video', 'phone', 'async']

/** Only one transition is documented: scheduled -> cancelled. */
const CANCELLABLE_FROM: readonly AppointmentStatus[] = ['scheduled']

let created = 0

interface CreateBody {
  providerId?: unknown
  slotId?: unknown
  consultationType?: unknown
  reason?: unknown
}

export const appointmentHandlers = [
  // POST /appointments
  http.post('/api/appointments', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const parsed = await readJson<CreateBody>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    const fieldErrors: Record<string, string[]> = {}
    const providerId = typeof body.providerId === 'string' ? body.providerId : ''
    const slotId = typeof body.slotId === 'string' ? body.slotId : ''
    const consultationType = typeof body.consultationType === 'string' ? body.consultationType : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!providerId) fieldErrors.providerId = ['`providerId` is required.']
    if (!slotId) fieldErrors.slotId = ['`slotId` is required.']
    if (!reason) fieldErrors.reason = ['A reason is required.']
    if (!CONSULTATION_TYPES.some((t) => t === consultationType)) {
      fieldErrors.consultationType = [
        `\`consultationType\` must be one of ${CONSULTATION_TYPES.join(', ')}.`,
      ]
    }
    if (Object.keys(fieldErrors).length > 0) {
      return apiError(422, 'VALIDATION', 'Request body failed schema validation.', fieldErrors)
    }

    const provider = providers.find((p) => p.id === providerId)
    if (!provider) return apiError(404, 'NOT_FOUND', 'Provider not found.')

    const slot = slots.find((s) => s.id === slotId)
    if (!slot) return apiError(404, 'NOT_FOUND', 'Slot not found.')
    if (slot.status !== 'available') {
      return apiError(409, 'SLOT_TAKEN', 'That slot has already been booked.')
    }

    slot.status = 'booked'
    created += 1

    const appointment: Appointment = {
      id: `apt_new_${created}`,
      patientId: auth.patientId as UUID,
      providerId: provider.id,
      slotId: slot.id,
      consultationType: consultationType as ConsultationType,
      status: 'scheduled',
      reason,
      scheduledAt: slot.start,
      durationMinutes: Math.round((Date.parse(slot.end) - Date.parse(slot.start)) / 60_000),
      createdAt: new Date().toISOString(),
    }

    appointments.push(appointment)
    return HttpResponse.json(appointment, { status: 201 })
  }),

  // GET /appointments?status=
  http.get('/api/appointments', async ({ request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const status = new URL(request.url).searchParams.get('status')
    const result = appointments
      .filter((a) => a.patientId === auth.patientId)
      .filter((a) => (status ? a.status === status : true))
      .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))

    return HttpResponse.json(result)
  }),

  // GET /appointments/:id — 404 when absent, 403 when owned by someone else
  http.get('/api/appointments/:id', async ({ params, request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const appointment = appointments.find((a) => a.id === String(params.id))
    if (!appointment) return apiError(404, 'NOT_FOUND', 'Appointment not found.')
    if (appointment.patientId !== auth.patientId) {
      return apiError(403, 'FORBIDDEN', 'This appointment belongs to another patient.')
    }

    return HttpResponse.json(appointment)
  }),

  // PATCH /appointments/:id — { status: "cancelled", cancelReason? }
  http.patch('/api/appointments/:id', async ({ params, request }) => {
    await latency()

    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const appointment = appointments.find((a) => a.id === String(params.id))
    if (!appointment) return apiError(404, 'NOT_FOUND', 'Appointment not found.')
    if (appointment.patientId !== auth.patientId) {
      return apiError(403, 'FORBIDDEN', 'This appointment belongs to another patient.')
    }

    const parsed = await readJson<{ status?: unknown; cancelReason?: unknown }>(request)
    if (!parsed.ok) return parsed.response
    const body = parsed.data

    if (body.status !== 'cancelled') {
      return apiError(422, 'VALIDATION', 'Request body failed schema validation.', {
        status: ['Only `cancelled` is a supported transition.'],
      })
    }

    if (!CANCELLABLE_FROM.includes(appointment.status)) {
      return apiError(
        409,
        'VALIDATION',
        `Cannot cancel an appointment with status "${appointment.status}".`,
      )
    }

    appointment.status = 'cancelled'
    appointment.cancelledAt = new Date().toISOString()
    if (typeof body.cancelReason === 'string' && body.cancelReason.trim()) {
      appointment.cancelReason = body.cancelReason.trim()
    }

    // Cancelling frees the slot, matching how the seed models past cancellations.
    const slot = slots.find((s) => s.id === appointment.slotId)
    if (slot) slot.status = 'available'

    return HttpResponse.json(appointment)
  }),
]
