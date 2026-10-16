import { render, screen, within } from '@testing-library/react'
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RootLayout } from '@/app/layout'
import { AppProviders } from '@/app/providers'
import NotFoundPage from '@/pages/not-found-page'
import { RouteBoundary, RouteErrorPage } from './route-error'

function Boom(): never {
  throw new Error('kaboom from a page')
}

function TestRoot() {
  return (
    <RootLayout currentPath="/boom">
      <Outlet />
    </RootLayout>
  )
}

/**
 * A miniature route set, so both failure modes are reachable — the app's real
 * routes have no failing loaders.
 */
const routes = [
  {
    path: '/',
    element: <TestRoot />,
    children: [
      {
        element: <RouteBoundary />,
        errorElement: <RouteErrorPage />,
        children: [
          { path: 'boom', element: <Boom /> },
          {
            path: 'missing',
            loader: () => {
              throw new Response('No such record', { status: 404, statusText: 'Not Found' })
            },
            element: <p>should not render</p>,
          },
          {
            path: 'forbidden',
            loader: () => {
              throw new Response('Not yours', { status: 403, statusText: 'Forbidden' })
            },
            element: <p>should not render</p>,
          },
          { path: 'fine', element: <h1>All good</h1> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return {
    router,
    ...render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  }
}

describe('route error handling', () => {
  beforeEach(() => {
    // React logs caught render errors; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('a render error shows its message with the shell intact', async () => {
    const { container } = renderAt('/boom')

    expect(await screen.findByRole('alert')).toHaveTextContent('kaboom from a page')

    // the shell survives: exactly one banner, and every nav variant present
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    for (const slot of ['side-nav', 'icon-rail', 'bottom-nav']) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
    }
  })

  it('a thrown 404 response renders the router error page', async () => {
    renderAt('/missing')

    expect(await screen.findByRole('alert')).toHaveTextContent('That page does not exist.')
    expect(screen.queryByText('should not render')).not.toBeInTheDocument()
  })

  it('a thrown 403 response keeps its status and detail', async () => {
    renderAt('/forbidden')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('403')
    expect(alert).toHaveTextContent('Not yours')
  })

  it('an unmatched route renders the 404 page with a way out', async () => {
    const { container } = renderAt('/nope')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That page does not exist')
    expect(within(alert).getByRole('button', { name: 'Browse doctors' })).toBeInTheDocument()
    expect(container.querySelector('[data-slot="side-nav"]')).not.toBeNull()
  })

  it('a healthy route renders normally, with no alert', async () => {
    renderAt('/fine')

    expect(await screen.findByRole('heading', { name: 'All good' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
