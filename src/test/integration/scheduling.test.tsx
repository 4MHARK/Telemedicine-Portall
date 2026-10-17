import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../render-app'

function slotButtons(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('form button[aria-pressed]')]
}

describe('scheduling wizard', () => {
  it('books an appointment end to end', async () => {
    const { router } = renderApp('/schedule/prv_01', { authed: true })

    expect(
      await screen.findByRole('heading', { name: 'Schedule an appointment' }),
    ).toBeInTheDocument()

    // 1 — slot
    await waitFor(() => expect(slotButtons().length).toBeGreaterThan(0))
    await userEvent.click(slotButtons()[0] as HTMLButtonElement)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // 2 — consultation type
    const radios = await screen.findAllByRole('radio')
    expect(radios.length).toBeGreaterThan(0)
    await userEvent.click(radios[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // 3 — reason
    await userEvent.type(
      await screen.findByLabelText('What would you like to discuss?'),
      'Persistent headaches for two weeks',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // 4 — review shows what was chosen
    expect(await screen.findByText('Persistent headaches for two weeks')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    // 5 — confirm
    const confirm = await screen.findByRole('button', { name: 'Confirm booking' })
    await userEvent.click(confirm)

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/appointments\/apt_new_\d+$/),
    )
  })

  it('blocks advancing past the slot step until a slot is chosen', async () => {
    renderApp('/schedule/prv_01', { authed: true })
    await screen.findByRole('heading', { name: 'Schedule an appointment' })
    await waitFor(() => expect(slotButtons().length).toBeGreaterThan(0))

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Choose a time slot.')).toBeInTheDocument()
    // still on step 1
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Slot')
  })

  it('keeps earlier answers when going back', async () => {
    renderApp('/schedule/prv_01', { authed: true })
    await screen.findByRole('heading', { name: 'Schedule an appointment' })
    await waitFor(() => expect(slotButtons().length).toBeGreaterThan(0))

    await userEvent.click(slotButtons()[1] as HTMLButtonElement)
    const chosen = slotButtons()[1]?.textContent
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findAllByRole('radio')
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    await waitFor(() => expect(slotButtons().length).toBeGreaterThan(0))
    const stillChosen = slotButtons().find((b) => b.getAttribute('aria-pressed') === 'true')
    expect(stillChosen?.textContent).toBe(chosen)
  })
})
