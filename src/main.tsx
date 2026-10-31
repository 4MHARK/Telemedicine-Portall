import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'

import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'

import './index.css'

/**
 * Starts the MSW service worker before the first render so no request can
 * escape to the network on boot. docs/decisions.md scopes the project to
 * mock-only data, which is true in the deployed demo as well as in dev — a
 * production build with the worker off has no backend to talk to. Set
 * VITE_DISABLE_MOCKS=true only when pointing the app at a real API.
 *
 * The worker module is imported lazily so it stays out of the main chunk.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_DISABLE_MOCKS === 'true') return

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

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})
