import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import { themeReducer, initialThemeState } from './reducer'
import type { Theme } from './reducer'
import { resolveInitialTheme, writeStoredTheme } from './storage'
import { ThemeContext } from './theme-context'
import type { ThemeContextValue } from './theme-context'

// localStorage first, then prefers-color-scheme. Runs through HYDRATE so the
// first paint is already the right theme.
function initTheme() {
  return themeReducer(initialThemeState, { type: 'HYDRATE', theme: resolveInitialTheme() })
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(themeReducer, undefined, initTheme)

  // Token layer keys off this class; see src/index.css (@custom-variant dark).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state.theme])

  // Only explicit choices are persisted. Writing the hydrated value would pin
  // a first-time visitor to whatever the OS happened to be at that moment.
  const setTheme = useCallback((theme: Theme) => {
    writeStoredTheme(theme)
    dispatch({ type: 'SET', theme })
  }, [])

  const toggleTheme = useCallback(() => {
    writeStoredTheme(state.theme === 'dark' ? 'light' : 'dark')
    dispatch({ type: 'TOGGLE' })
  }, [state.theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: state.theme, setTheme, toggleTheme }),
    [state.theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
