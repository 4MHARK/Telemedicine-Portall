import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'

import { AppProviders } from '@/app/providers'
import App from '@/app/App'

import './index.css'

/**
 * Starts the MSW service worker before the first render, so no request can
 * escape to the network on boot. docs/decisions.md scopes the project to
 * mock-only data; the worker is loaded lazily so it stays out of the
 * production bundle.
 */
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return

  const { worker } = await import('@/mocks/browser')
  await worker.start({
    // Warn rather than fail: a mistyped endpoint should be visible in the
    // console without taking the app down.
    onUnhandledRequest: 'warn',
  })
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
})
