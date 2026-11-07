import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../render-app'

describe('profile', () => {
  it('shows the signed-in patient from the auth context', async () => {
    renderApp('/profile', { authed: true })
    await screen.findByRole('heading', { name: 'Profile' })

    expect(screen.getByText('Nadia Okafor')).toBeInTheDocument()
    expect(screen.getAllByText('nadia.okafor@example.com').length).toBeGreaterThan(0)
    expect(screen.getByText('Blue Cross')).toBeInTheDocument()
    expect(screen.getByText('BC-4471902')).toBeInTheDocument()
  })

  it('signs out and lands on the login page', async () => {
    const { router } = renderApp('/profile', { authed: true })
    await screen.findByRole('heading', { name: 'Profile' })

    await userEvent.click(screen.getByRole('button', { name: /Sign out/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/auth/login'))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
