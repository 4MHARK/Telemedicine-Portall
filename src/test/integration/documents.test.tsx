import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '../render-app'

// The fail-* retry isn't tested here: jsdom's File is cross-realm from undici's
// Blob, so the filename arrives as "blob" and the mock's rule can't match.
// It's covered in e2e/upload.spec.ts instead.

function docRows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="document-row"]')]
}

function fileInput(): HTMLInputElement {
  return screen.getByLabelText('Choose files to upload') as HTMLInputElement
}

describe('upload picker', () => {
  it('keeps the hidden input out of the tab order', async () => {
    await openDocuments()
    // The visible "Choose files" button is the keyboard affordance.
    expect(fileInput().tabIndex).toBe(-1)
  })
})

/**
 * The mock DB is module state shared by the whole file, so an upload in one
 * test persists into the next. Every assertion here is relative to the count
 * captured at the start of that test.
 */
async function openDocuments(): Promise<number> {
  renderApp('/documents', { authed: true })
  await screen.findByRole('heading', { name: 'Documents' })
  await waitFor(() => expect(docRows().length).toBeGreaterThan(0))
  return docRows().length
}

describe('documents', () => {
  it('uploads a file with progress and adds it to the list', async () => {
    const before = await openDocuments()

    const file = new File([new Uint8Array(2048)], 'scan.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput(), file)

    // the queue row carries the original filename, from the File object
    expect(await screen.findByText('scan.pdf')).toBeInTheDocument()
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(), {
      timeout: 15_000,
    })
    // The queue row and the saved-document badge both read "Uploaded".
    expect((await screen.findAllByText('Uploaded')).length).toBeGreaterThan(0)

    // the documents query is invalidated, so the list grows by one
    await waitFor(() => expect(docRows()).toHaveLength(before + 1))
  })

  it('rejects a disallowed type before any request', async () => {
    const before = await openDocuments()

    const bad = new File([new Uint8Array(16)], 'notes.txt', { type: 'text/plain' })
    // applyAccept: false — a drop bypasses the picker's accept filter, which is
    // exactly the case the client-side type check exists for.
    await userEvent.upload(fileInput(), bad, { applyAccept: false })

    expect(
      await screen.findByText('Only PDF, PNG and JPEG files are supported.'),
    ).toBeInTheDocument()
    expect(docRows()).toHaveLength(before)
  })

  it('rejects a file over 10 MB before any request', async () => {
    await openDocuments()

    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    })
    await userEvent.upload(fileInput(), big)

    expect(await screen.findByText('Files must be 10 MB or smaller.')).toBeInTheDocument()
  })

  it('deletes a document through the confirmation dialog', async () => {
    const before = await openDocuments()

    const first = docRows()[0] as HTMLElement
    // Read the filename off the delete button, not the row text: an upload made
    // in a previous test is stored server-side as "blob" because jsdom's File is
    // cross-realm from undici's Blob and loses its filename in multipart.
    const deleteButton = within(first).getByRole('button', { name: /Delete/ })
    const name = (deleteButton.getAttribute('aria-label') ?? '').replace(/^Delete /, '')
    await userEvent.click(deleteButton)

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(docRows()).toHaveLength(before - 1))
    expect(screen.queryByText(name)).not.toBeInTheDocument()
  })
})
