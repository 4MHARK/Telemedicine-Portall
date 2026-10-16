import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from './providers'

describe('<AppProviders />', () => {
  it('mounts the full provider tree', () => {
    render(
      <AppProviders>
        <p>provider tree probe</p>
      </AppProviders>,
    )

    expect(screen.getByText('provider tree probe')).toBeInTheDocument()
  })
})
