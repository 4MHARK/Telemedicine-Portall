import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { readSession, SESSION_STORAGE_KEY } from '@/lib/session'
import { renderApp } from '../render-app'

describe('auth', () => {
  beforeEach(() => window.localStorage.clear())

  it('signing in stores the session and lands on the doctors list', async () => {
    const { router } = renderApp('/auth/login')

    await userEvent.type(await screen.findByLabelText('Email'), 'nadia@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'demo')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(readSession()).not.toBeNull())
    expect(readSession()?.patient.firstName).toBe('Nadia')

    await waitFor(() => expect(router.state.location.pathname).toBe('/doctors'))
    expect(await screen.findByRole('heading', { name: 'Find a doctor' })).toBeInTheDocument()
  })

  it('empty credentials are rejected before any request is sent', async () => {
    renderApp('/auth/login')

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('unauthenticated /documents redirects to login carrying ?next', async () => {
    const { router } = renderApp('/documents')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/auth/login')
    expect(router.state.location.search).toBe('?next=%2Fdocuments')
  })

  it('signing in from that redirect returns to the original page', async () => {
    const { router } = renderApp('/documents')

    await userEvent.type(await screen.findByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/documents'))
    expect(await screen.findByRole('heading', { name: 'Documents' })).toBeInTheDocument()
  })

  it('does not follow a backslash ?next as an open redirect', async () => {
    const { router } = renderApp('/auth/login?next=%2F%5Cevil.example')

    await userEvent.type(await screen.findByLabelText('Email'), 'nadia@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'demo')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/doctors'))
    expect(router.state.location.pathname).not.toContain('evil')
  })

  it('an expired session is treated as anonymous', async () => {
    const { router } = renderApp('/profile', { authed: false })
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/auth/login')
  })

  it('a signed-in visitor at /auth/login is sent to /doctors', async () => {
    const { router } = renderApp('/auth/login', { authed: true })

    await waitFor(() => expect(router.state.location.pathname).toBe('/doctors'))
    expect(await screen.findByRole('heading', { name: 'Find a doctor' })).toBeInTheDocument()
  })
})
