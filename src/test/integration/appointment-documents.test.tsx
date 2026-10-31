import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../render-app'

function appointmentDocumentRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="appointment-document"]')]
}

function documentRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="document-row"]')]
}

describe('appointment documents', () => {
  it('shows a document already linked to a visit', async () => {
    renderApp('/appointments/apt_06', { authed: true })
    await screen.findByRole('heading', { name: 'Appointment detail' })

    await waitFor(() =>
      expect(
        appointmentDocumentRows().some((row) =>
          row.textContent?.includes('blood-panel-february.pdf'),
        ),
      ).toBe(true),
    )
    // Completed visits keep their documents visible but cannot accept new ones.
    expect(screen.queryByLabelText('Upload documents for this appointment')).not.toBeInTheDocument()
  })

  it('uploads a document for a scheduled visit', async () => {
    renderApp('/appointments/apt_02', { authed: true })
    await screen.findByRole('heading', { name: 'Appointment detail' })

    const before = appointmentDocumentRows().length
    const file = new File([new Uint8Array(2048)], 'visit-scan.pdf', {
      type: 'application/pdf',
    })
    await userEvent.upload(
      await screen.findByLabelText('Upload documents for this appointment'),
      file,
    )

    // jsdom serializes the File cross-realm and the mock stores it as "blob",
    // so assert on the linked-document row rather than the server filename.
    await waitFor(() => expect(appointmentDocumentRows().length).toBe(before + 1), {
      timeout: 15_000,
    })
    expect(appointmentDocumentRows()[0]?.textContent).toContain('Shared')
  })

  it('associates an upload from the Documents tab with the chosen visit', async () => {
    renderApp('/documents', { authed: true })
    await screen.findByRole('heading', { name: 'Documents' })
    await waitFor(() => expect(documentRows().length).toBeGreaterThan(0))

    const select = screen.getByLabelText('Share with') as HTMLSelectElement
    await waitFor(() => {
      const option = [...select.options].find((candidate) => candidate.value === 'apt_02')
      expect(option).toBeDefined()
      // Wait for the provider directory too, so the row can show "For Dr. …".
      expect(option?.textContent).toMatch(/Dr\./)
    })
    await userEvent.selectOptions(select, 'apt_02')

    const before = documentRows().length
    const file = new File([new Uint8Array(1024)], 'shared-from-docs.pdf', {
      type: 'application/pdf',
    })
    await userEvent.upload(screen.getByLabelText('Choose files to upload'), file)

    await waitFor(() => expect(documentRows().length).toBe(before + 1), {
      timeout: 15_000,
    })
    // The newest document sorts first and carries the chosen visit.
    expect(documentRows()[0]?.textContent).toMatch(/For Dr\./)
  })
})
