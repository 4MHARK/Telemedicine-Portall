import { beforeEach, describe, expect, it } from 'vitest'

import { login, logout, fetchMe } from './auth/api'
import {
  fetchAppointment,
  fetchAppointments,
  cancelAppointment,
  createAppointment,
} from './appointments/api'
import { fetchConversations, fetchMessages, sendMessage } from './chat/api'
import { deleteDocument, fetchDocuments } from './documents/api'
import { fetchProvider, fetchProviders, fetchProviderSlots } from './providers/api'
import { fetchSpecialties } from './specialties/api'
import { mockSignOut } from '@/mocks/session'

/**
 * Exercises the feature API layer directly, independently of the screens.
 * These functions are the contract the mock API and the query hooks both
 * depend on, so they are tested at the transport boundary as well as through
 * the integration tests.
 */
describe('feature api layer', () => {
  beforeEach(async () => {
    mockSignOut()
    await login({ email: 'nadia@example.com', password: 'demo' })
  })

  it('auth: me, then logout', async () => {
    const session = await fetchMe()
    expect(session.patient?.id).toBe('pat_01')
    expect(session.patient?.firstName).toBe('Nadia')

    await logout()
    // The mock clears its module-level session; the server clears the cookie.
    await expect(fetchMe()).rejects.toThrow()
  })

  it('specialties: twelve, stable', async () => {
    const list = await fetchSpecialties()
    expect(list).toHaveLength(12)
    expect(list.map((s) => s.slug)).toContain('cardiology')
  })

  it('providers: list, filters, detail and slots', async () => {
    const page = await fetchProviders()
    expect(page.total).toBe(40)
    expect(page.pageSize).toBe(12)
    expect(page.hasNext).toBe(true)

    const filtered = await fetchProviders({
      q: 'okafor',
      specialty: ['cardiology'],
      availability: 'week',
      consultationType: 'video',
      page: 1,
      pageSize: 5,
    })
    expect(filtered.pageSize).toBe(5)

    const one = await fetchProvider('prv_01')
    expect(one.id).toBe('prv_01')

    const from = new Date().toISOString()
    const to = new Date(Date.now() + 14 * 86_400_000).toISOString()
    const slots = await fetchProviderSlots('prv_01', { from, to })
    expect(Array.isArray(slots)).toBe(true)
  })

  it('appointments: list, filter, detail, create and cancel', async () => {
    const all = await fetchAppointments()
    expect(all).toHaveLength(8)

    const scheduled = await fetchAppointments('scheduled')
    expect(scheduled.every((a) => a.status === 'scheduled')).toBe(true)

    const detail = await fetchAppointment(all[0]?.id ?? '')
    expect(detail.id).toBe(all[0]?.id)

    const from = new Date().toISOString()
    const to = new Date(Date.now() + 20 * 86_400_000).toISOString()
    const slots = await fetchProviderSlots('prv_04', { from, to })
    const free = slots.find((s) => s.status === 'available')
    expect(free).toBeDefined()

    const created = await createAppointment({
      providerId: 'prv_04',
      slotId: free?.id ?? '',
      consultationType: 'video',
      reason: 'API layer test',
    })
    expect(created.status).toBe('scheduled')

    const cancelled = await cancelAppointment(created.id, 'No longer needed')
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancelReason).toBe('No longer needed')
  })

  it('documents: list and delete', async () => {
    const docs = await fetchDocuments()
    expect(docs).toHaveLength(6)

    const target = docs[docs.length - 1]
    expect(target).toBeDefined()
    await deleteDocument(target?.id ?? '')

    await expect(deleteDocument(target?.id ?? '')).rejects.toThrow()
  })

  it('chat: conversations, messages and a persisted send', async () => {
    const conversations = await fetchConversations()
    expect(conversations).toHaveLength(3)

    const id = conversations[0]?.id ?? ''
    const messages = await fetchMessages(id)
    expect(messages).toHaveLength(10)

    const sent = await sendMessage(id, 'Hello from the api test')
    expect(sent.senderRole).toBe('patient')

    const afterSend = await fetchMessages(id)
    expect(afterSend.length).toBe(messages.length + 1)
    expect(afterSend[afterSend.length - 1]?.body).toBe('Hello from the api test')
  })
})
