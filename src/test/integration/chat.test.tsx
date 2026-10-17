import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../render-app'

function bubbles(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="message-bubble"]')]
}

describe('chat', () => {
  it('lists the seeded conversations', async () => {
    renderApp('/messages', { authed: true })
    await screen.findByRole('heading', { name: 'Messages' })

    await waitFor(() =>
      expect(document.querySelectorAll('a[href^="/messages/"]').length).toBeGreaterThan(0),
    )
    // Names arrive once the provider directory resolves.
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Dr\. / }).length).toBe(3))
  })

  it('sends optimistically, then the server copy confirms it', async () => {
    renderApp('/messages/cnv_01', { authed: true })
    await screen.findByRole('heading', { name: 'Conversation' })

    await waitFor(() => expect(bubbles().length).toBe(10))
    const before = bubbles().length

    const composer = screen.getByLabelText('Message')
    await userEvent.type(composer, 'Hello from the test')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    // Optimistic: the bubble is present before the request resolves.
    expect(await screen.findByText('Hello from the test')).toBeInTheDocument()
    expect(screen.getByLabelText('Sending')).toBeInTheDocument()
    // The composer clears immediately.
    expect(composer).toHaveValue('')

    // The server copy replaces the optimistic one, so the pending state clears
    // without the message count changing.
    await waitFor(() => expect(screen.queryByLabelText('Sending')).not.toBeInTheDocument(), {
      timeout: 15_000,
    })
    expect(bubbles().length).toBe(before + 1)
    expect(screen.getByText('Hello from the test')).toBeInTheDocument()
  })

  it('keeps the seeded thread after a poll', async () => {
    renderApp('/messages/cnv_02', { authed: true })
    await screen.findByRole('heading', { name: 'Conversation' })

    await waitFor(() => expect(bubbles().length).toBe(10))
    // A second poll cycle must not drop anything (merge by id, never replace).
    await new Promise((resolve) => setTimeout(resolve, 4000))
    expect(bubbles().length).toBeGreaterThanOrEqual(10)
  })

  it('shows a not-found state for an unknown conversation', async () => {
    renderApp('/messages/cnv_missing', { authed: true })
    await screen.findByRole('heading', { name: 'Conversation' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i)
  })
})
