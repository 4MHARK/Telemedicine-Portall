import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../src/lib/password.js'
import { hashToken, SESSION_TTL_MS } from '../src/lib/session.js'

describe('session tokens', () => {
  it('hashes tokens deterministically without storing the raw value', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
    expect(hashToken('abc')).not.toBe(hashToken('abcd'))
    expect(hashToken('abc')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('has a positive session lifetime', () => {
    expect(SESSION_TTL_MS).toBeGreaterThan(0)
  })
})

describe('passwords', () => {
  it('verifies the original password and rejects another', async () => {
    const hash = await hashPassword('a-very-long-password-2026')
    await expect(verifyPassword('a-very-long-password-2026', hash)).resolves.toBe(true)
    await expect(verifyPassword('a-different-password-2026', hash)).resolves.toBe(false)
  })
})
