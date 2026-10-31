import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderApp } from '../render-app'

const NAV_LABELS = ['Doctors', 'Appointments', 'Documents', 'Messages', 'Profile']

function navLinks(slot: string): HTMLElement[] {
  const nav = document.querySelector(`[data-slot="${slot}"]`)
  if (!nav) throw new Error(`missing ${slot}`)
  return within(nav as HTMLElement).getAllByRole('link')
}

describe('app shell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders five items in every navigation variant', async () => {
    renderApp('/doctors')
    await screen.findByRole('heading', { name: 'Find a doctor' })

    for (const slot of ['bottom-nav', 'icon-rail', 'side-nav']) {
      const links = navLinks(slot)
      expect(links, slot).toHaveLength(5)
      // the icon rail has no visible text, so read the accessible name
      const names = links.map((l) => l.getAttribute('aria-label') ?? l.textContent?.trim() ?? '')
      expect(names, slot).toEqual(NAV_LABELS)
    }
  })

  it('marks the current route with aria-current', async () => {
    renderApp('/messages', { authed: true })
    await screen.findByRole('heading', { name: 'Messages' })

    for (const slot of ['bottom-nav', 'icon-rail', 'side-nav']) {
      const current = navLinks(slot).filter((l) => l.getAttribute('aria-current') === 'page')
      expect(current, slot).toHaveLength(1)
    }
  })

  it('theme toggle flips the dark class on <html>', async () => {
    renderApp('/doctors')
    await screen.findByRole('heading', { name: 'Find a doctor' })

    expect(document.documentElement).not.toHaveClass('dark')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveClass('dark')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('offers a skip link to the main content', async () => {
    renderApp('/doctors')
    await screen.findByRole('heading', { name: 'Find a doctor' })
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    // The target must be focusable, or the skip link only scrolls.
    expect(document.getElementById('main-content')).toHaveAttribute('tabindex', '-1')
  })
})
