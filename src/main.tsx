import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'

import { AppProviders } from '@/app/providers'

import './index.css'

/**
 * The live app talks to the real Express API by default. MSW is opt-in in
 * development for isolated UI work and is always used by the Vitest node
 * server. `import.meta.env.DEV` keeps the worker out of production bundles.
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS !== 'true') return

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

void enableMocking().then(async () => {
  // Import the router only after the mock worker is ready. Creating it earlier
  // lets the first guarded loader fire before MSW can intercept /auth/me.
  const { router } = await import('@/app/router')

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})
