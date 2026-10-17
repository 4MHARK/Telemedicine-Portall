import { describe, expect, it } from 'vitest'

import { STEP_FIELDS, STEP_LABELS, wizardSchema } from './schemas'

const valid = {
  slotId: 'slot_1',
  consultationType: 'video' as const,
  reason: 'Persistent headaches for two weeks.',
}

describe('wizardSchema', () => {
  it('accepts a complete wizard', () => {
    expect(wizardSchema.safeParse(valid).success).toBe(true)
  })

  it.each(['video', 'phone', 'async'] as const)('accepts consultation type %s', (type) => {
    expect(wizardSchema.safeParse({ ...valid, consultationType: type }).success).toBe(true)
  })

  it('rejects a missing slot', () => {
    const result = wizardSchema.safeParse({ ...valid, slotId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Choose a time slot.')
    }
  })

  it('rejects an unknown consultation type', () => {
    expect(wizardSchema.safeParse({ ...valid, consultationType: 'carrier-pigeon' }).success).toBe(
      false,
    )
  })

  it('rejects an empty reason', () => {
    const result = wizardSchema.safeParse({ ...valid, reason: '   ' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Tell the provider why you are booking.')
    }
  })

  it('rejects a reason over 500 characters', () => {
    const result = wizardSchema.safeParse({ ...valid, reason: 'x'.repeat(501) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Keep the reason under 500 characters.')
    }
  })

  it('trims the reason', () => {
    const parsed = wizardSchema.parse({ ...valid, reason: '  Headache  ' })
    expect(parsed.reason).toBe('Headache')
  })

  it('reports every missing field at once, so step 5 can submit the whole form', () => {
    const result = wizardSchema.safeParse({ slotId: '', consultationType: undefined, reason: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path[0]).sort()).toEqual([
        'consultationType',
        'reason',
        'slotId',
      ])
    }
  })

  it('has one label per step and one gated field list per step', () => {
    expect(STEP_LABELS).toHaveLength(5)
    expect(STEP_FIELDS).toHaveLength(5)
    expect(STEP_FIELDS.flat()).toEqual(['slotId', 'consultationType', 'reason'])
  })
})
