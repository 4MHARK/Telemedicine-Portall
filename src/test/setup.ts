import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@/mocks/server'

// Every mock response carries 200-600ms of simulated latency
// (docs/api-contract.md), and some pages issue two requests before they can
// render data. Testing Library's 1s default makes those assertions flaky, so
// the async timeout matches the 15s vitest timeout.
configure({ asyncUtilTimeout: 15_000 })

// jsdom does not implement these, and several primitives (dialog, sheet,
// sonner) reach for them on mount.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// The mock API is the only network the app is allowed to touch
// (docs/decisions.md, Project Scope), so an unhandled request is a failure.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  cleanup()
})

afterAll(() => server.close())
