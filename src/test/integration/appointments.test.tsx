import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { renderApp } from '../render-app'

describe('appointments', () => {
  it('still renders the list when the provider directory fails', async () => {
    // The list and the name lookup are separate queries. A directory outage
    // must not hold the whole page in a skeleton.
    server.use(
      http.get('/api/providers', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Directory down' }, { status: 500 }),
      ),
    )

    renderApp('/appointments', { authed: true })
    await screen.findByRole('heading', { name: 'Appointments' })

    await waitFor(() =>
      expect(document.querySelectorAll('a[href^="/appointments/"]').length).toBeGreaterThan(0),
    )
    // Rows keep the fallback label while names are unavailable.
    expect(screen.getAllByText('Provider').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a scheduled appointment and cancels it', async () => {
    renderApp('/appointments/apt_02', { authed: true })

    expect(await screen.findByRole('heading', { name: 'Appointment detail' })).toBeInTheDocument()
    expect(await screen.findByText('Scheduled')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel appointment' }))

    expect((await screen.findAllByText('Cancelled')).length).toBeGreaterThan(0)
    expect(
      await screen.findByText('Only scheduled appointments can be cancelled.'),
    ).toBeInTheDocument()
  })
})
