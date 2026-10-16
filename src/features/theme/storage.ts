// Persistence + environment for the theme reducer.
//
// Precedence on boot (docs/state-matrix.md: Theme persists to localStorage):
// a stored choice wins, otherwise fall back to the OS preference.

import type { Theme } from './reducer'

// Not specified in docs/ — recorded here for review.
export const THEME_STORAGE_KEY = 'telemedicine-portal:theme'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(raw) ? raw : null
  } catch {
    // localStorage can throw in private mode / with storage disabled.
    return null
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Persisting is best-effort; the in-memory state still applies.
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}
