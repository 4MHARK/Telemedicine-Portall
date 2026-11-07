import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'

import { AppProviders } from '@/app/providers'

import './index.css'

const mocksEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true'

/**
 * A service worker registered by an earlier mock-mode session keeps
 * intercepting /api even after the flag is turned off. Unregister it and reload
 * once so the browser really talks to the live backend.
 */
async function clearStaleMockWorker(): Promise<boolean> {
  if (mocksEnabled || !('serviceWorker' in navigator)) return false

  const registrations = await navigator.serviceWorker.getRegistrations()
  const stale = registrations.filter((registration) =>
    [registration.active, registration.waiting, registration.installing].some((worker) =>
      worker?.scriptURL.includes('/mockServiceWorker.js'),
    ),
  )
  if (stale.length === 0) return false

  await Promise.all(stale.map((registration) => registration.unregister()))

  const key = 'telemedicine-portal:mock-worker-cleared'
  if (!window.sessionStorage.getItem(key)) {
    window.sessionStorage.setItem(key, '1')
    window.location.reload()
    return true
  }
  return false
}

/**
 * The live app talks to the real Express API by default. MSW is opt-in in
 * development for isolated UI work and is always used by the Vitest node
 * server. `import.meta.env.DEV` keeps the worker out of production bundles.
 */
async function enableMocking(): Promise<void> {
  if (!mocksEnabled) {
    console.info('[API] Live backend mode — MSW is disabled; /api goes to the Express server.')
    return
  }

  try {
    const { worker } = await import('@/mocks/browser')
    await worker.start({
      // Respect a non-root Vite base (subpath deployments).
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      // Warn rather than fail: a mistyped endpoint should be visible in the
      // console without taking the app down.
      onUnhandledRequest: 'warn',
    })
  } catch (error) {
    // Render anyway: without a worker every request fails visibly, which is
    // easier to diagnose than a blank page.
    console.error('Mock API failed to start.', error)
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')
const root = rootElement

async function boot(): Promise<void> {
  if (await clearStaleMockWorker()) return
  await enableMocking()

  // Import the router only after the mock worker is ready. Creating it earlier
  // lets the first guarded loader fire before MSW can intercept /auth/me.
  const { router } = await import('@/app/router')

  createRoot(root).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

void boot()
