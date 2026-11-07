/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" opts into MSW in development; the live API is the default. */
  readonly VITE_ENABLE_MOCKS?: string
  /** Defaults to "/api"; set only for a direct cross-origin API. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string
  /** Test-only simulate-payment button; never enable in a live build. */
  readonly VITE_PAYMENTS_FAKE?: string
  readonly VITE_SHOW_DEMO_ACCOUNTS?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
