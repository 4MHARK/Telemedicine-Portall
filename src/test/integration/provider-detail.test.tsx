import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/mocks/server'
import { renderApp } from '../render-app'

describe('provider detail', () => {
  it('shows an availability error instead of claiming there are no slots', async () => {
    server.use(
      http.get('/api/providers/prv_01/slots', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Slots are down' }, { status: 500 }),
      ),
    )

    renderApp('/doctors/prv_01')

    expect(await screen.findByRole('heading', { name: /^Dr\./ })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Slots are down')
    expect(screen.queryByText('No availability in the next 7 days.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
