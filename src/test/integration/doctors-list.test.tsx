import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { renderApp } from '../render-app'

const cardCount = () => document.querySelectorAll('[data-slot="doctor-card"]').length

describe('doctors list', () => {
  it('shows the loading skeleton first, then the providers', async () => {
    renderApp('/doctors')

    // The mock API adds 200-600ms of latency, so the pending state is real.
    expect(document.querySelector('[data-slot="loading-skeleton"]')).not.toBeNull()
    expect(cardCount()).toBe(0)

    expect(await screen.findByText(/Showing 12 of 40 providers/)).toBeInTheDocument()
    expect(cardCount()).toBe(12)
  })

  it('renders each card with a name, a specialty and a rating', async () => {
    renderApp('/doctors')
    await screen.findByText(/Showing 12 of 40 providers/)

    const first = document.querySelector('[data-slot="doctor-card"]') as HTMLElement
    expect(within(first).getByRole('link')).toHaveTextContent(/^Dr\. /)
    expect(first.textContent).toMatch(/reviews/)
    // availability badge: either a next slot or the explicit empty state
    expect(first.textContent).toMatch(/Next:|No availability/)
  })

  it('links every card to its provider detail route', async () => {
    renderApp('/doctors')
    await screen.findByText(/Showing 12 of 40 providers/)

    const links = [...document.querySelectorAll('[data-slot="doctor-card"] a')]
    expect(links).toHaveLength(12)
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\/providers\/|^\/doctors\//)
    }
  })

  it('shows ErrorState when the fetch fails, then recovers on retry', async () => {
    server.use(
      http.get('/api/providers', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Mock outage' }, { status: 500 }),
      ),
    )

    renderApp('/doctors')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Mock outage')
    expect(cardCount()).toBe(0)

    // Clear the override, then retry through the UI.
    server.resetHandlers()
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(cardCount()).toBe(12))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
