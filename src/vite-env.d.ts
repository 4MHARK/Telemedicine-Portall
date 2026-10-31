/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" disables MSW and points the app at a real /api backend. */
  readonly VITE_DISABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
