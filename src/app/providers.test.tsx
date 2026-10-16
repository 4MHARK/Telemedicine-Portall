import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'
import { AppProviders } from './providers'

describe('<AppProviders />', () => {
  it('mounts the full provider tree and renders the app shell', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: 'Proof of life' })).toBeInTheDocument()
  })
})
