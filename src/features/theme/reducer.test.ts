import { describe, expect, it } from 'vitest'

import { initialThemeState, themeReducer } from './reducer'

describe('themeReducer', () => {
  it('hydrates to the resolved theme', () => {
    expect(themeReducer(initialThemeState, { type: 'HYDRATE', theme: 'dark' })).toEqual({
      theme: 'dark',
    })
  })

  it('sets an explicit theme', () => {
    expect(themeReducer({ theme: 'light' }, { type: 'SET', theme: 'dark' })).toEqual({
      theme: 'dark',
    })
  })

  it('toggles light to dark', () => {
    expect(themeReducer({ theme: 'light' }, { type: 'TOGGLE' })).toEqual({ theme: 'dark' })
  })

  it('toggles dark back to light', () => {
    expect(themeReducer({ theme: 'dark' }, { type: 'TOGGLE' })).toEqual({ theme: 'light' })
  })

  it('does not mutate the previous state', () => {
    const previous = { theme: 'light' } as const
    themeReducer(previous, { type: 'TOGGLE' })
    expect(previous.theme).toBe('light')
  })
})
