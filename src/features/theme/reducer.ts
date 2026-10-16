// Theme state — Context + Reducer (docs/state-matrix.md).
//
// Pure: no localStorage, no DOM. Side effects live in storage.ts and the
// provider, so this reducer stays testable in isolation the way
// docs/state-matrix.md requires.

export type Theme = 'light' | 'dark'

export interface ThemeState {
  theme: Theme
}

export type ThemeAction =
  { type: 'TOGGLE' } | { type: 'SET'; theme: Theme } | { type: 'HYDRATE'; theme: Theme }

export const initialThemeState: ThemeState = { theme: 'light' }

export function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'TOGGLE':
      return { theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'SET':
      return { theme: action.theme }
    case 'HYDRATE':
      return { theme: action.theme }
  }
}
