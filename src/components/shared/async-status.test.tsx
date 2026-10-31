import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/apiClient'
import { AsyncStatus } from './async-status'
import type { AsyncQuery } from './async-status'

function query<T>(overrides: Partial<AsyncQuery<T>> = {}): AsyncQuery<T> {
  return { isPending: false, isError: false, error: null, data: undefined, ...overrides }
}

describe('<AsyncStatus />', () => {
  it('renders the skeleton while pending', () => {
    render(
      <AsyncStatus query={query<string[]>({ isPending: true })}>
        {(d) => <p>{d.length}</p>}
      </AsyncStatus>,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders a custom skeleton when given one', () => {
    render(
      <AsyncStatus query={query<string[]>({ isPending: true })} skeleton={<p>custom</p>}>
        {(d) => <p>{d.length}</p>}
      </AsyncStatus>,
    )
    expect(screen.getByText('custom')).toBeInTheDocument()
  })

  it('renders the ApiError message and retries', async () => {
    const refetch = vi.fn()
    const error = new ApiError(500, 'INTERNAL', 'Server is down')
    render(
      <AsyncStatus query={query<string[]>({ isError: true, error, refetch })} errorTitle="Nope">
        {(d) => <p>{d.length}</p>}
      </AsyncStatus>,
    )

    expect(screen.getByText('Nope')).toBeInTheDocument()
    expect(screen.getByText('Server is down')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to a generic message for non-ApiError failures', () => {
    render(
      <AsyncStatus
        query={query<string[]>({ isError: true, error: new Error('boom') })}
        errorFallback="Fell over"
      >
        {(d) => <p>{d.length}</p>}
      </AsyncStatus>,
    )
    expect(screen.getByText('Fell over')).toBeInTheDocument()
  })

  it('renders the empty slot when isEmpty matches', () => {
    render(
      <AsyncStatus
        query={query<string[]>({ data: [] })}
        isEmpty={(d) => d.length === 0}
        empty={<p>nothing</p>}
      >
        {(d) => <p>{d.length}</p>}
      </AsyncStatus>,
    )
    expect(screen.getByText('nothing')).toBeInTheDocument()
  })

  it('renders children with the data when ready', () => {
    render(
      <AsyncStatus query={query<string[]>({ data: ['a', 'b'] })} isEmpty={(d) => d.length === 0}>
        {(d) => <p>count {d.length}</p>}
      </AsyncStatus>,
    )
    expect(screen.getByText('count 2')).toBeInTheDocument()
  })

  it('treats undefined data as still loading', () => {
    render(<AsyncStatus query={query<string[]>()}>{(d) => <p>{d.length}</p>}</AsyncStatus>)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
