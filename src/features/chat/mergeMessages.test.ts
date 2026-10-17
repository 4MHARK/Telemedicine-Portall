import { describe, expect, it } from 'vitest'

import type { ChatMessage } from '@/types'
import { mergeMessages } from './mergeMessages'

function message(overrides: Partial<ChatMessage> & Pick<ChatMessage, 'id'>): ChatMessage {
  return {
    conversationId: 'cnv_01',
    senderId: 'pat_01',
    senderRole: 'patient',
    body: 'hello',
    sentAt: '2026-01-01T10:00:00.000Z',
    status: 'sent',
    ...overrides,
  }
}

describe('mergeMessages', () => {
  it('keeps local messages that the server has not seen yet', () => {
    const local = message({ id: 'local_1', status: 'sending' })
    const merged = mergeMessages([local], [message({ id: 'server_1' })])

    expect(merged.map((m) => m.id)).toEqual(['local_1', 'server_1'])
    expect(merged[0]?.status).toBe('sending')
  })

  it('lets the server version win for the same id', () => {
    const local = message({ id: 'msg_1', status: 'sending', body: 'optimistic' })
    const server = message({ id: 'msg_1', status: 'read', body: 'server' })

    const merged = mergeMessages([local], [server])

    expect(merged).toHaveLength(1)
    expect(merged[0]?.status).toBe('read')
    expect(merged[0]?.body).toBe('server')
  })

  it('never drops an existing message when the server returns a subset', () => {
    const existing = [message({ id: 'a' }), message({ id: 'b' })]
    const merged = mergeMessages(existing, [])

    expect(merged.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('does not duplicate messages present on both sides', () => {
    const existing = [message({ id: 'a' }), message({ id: 'b' })]
    const incoming = [message({ id: 'b' }), message({ id: 'c' })]

    const merged = mergeMessages(existing, incoming)

    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('orders by sentAt regardless of arrival order', () => {
    const merged = mergeMessages(
      [message({ id: 'late', sentAt: '2026-01-01T12:00:00.000Z' })],
      [
        message({ id: 'early', sentAt: '2026-01-01T09:00:00.000Z' }),
        message({ id: 'mid', sentAt: '2026-01-01T10:00:00.000Z' }),
      ],
    )

    expect(merged.map((m) => m.id)).toEqual(['early', 'mid', 'late'])
  })

  it('is stable for equal timestamps, ordering by id', () => {
    const at = '2026-01-01T10:00:00.000Z'
    const merged = mergeMessages(
      [message({ id: 'b', sentAt: at })],
      [message({ id: 'a', sentAt: at })],
    )

    expect(merged.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('handles empty inputs', () => {
    expect(mergeMessages([], [])).toEqual([])
    expect(mergeMessages([], [message({ id: 'x' })])).toHaveLength(1)
    expect(mergeMessages([message({ id: 'x' })], [])).toHaveLength(1)
  })

  it('does not mutate its inputs', () => {
    const current = [message({ id: 'a' })]
    const incoming = [message({ id: 'a', body: 'updated' })]
    mergeMessages(current, incoming)

    expect(current[0]?.body).toBe('hello')
    expect(incoming).toHaveLength(1)
  })
})
