import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

const fileInput = 'input[type="file"]'

test.describe('uploads', () => {
  test('a normal file uploads with progress and appears in the list', async ({ page }) => {
    await signIn(page)
    await page.goto('/documents')

    const rows = page.locator('[data-slot="document-row"]')
    await expect(rows.first()).toBeVisible()
    const before = await rows.count()

    await page.setInputFiles(fileInput, 'e2e/fixtures/sample.pdf')

    // DEV emits synthetic ticks while MSW holds the response.
    await expect(page.getByRole('progressbar')).toBeVisible()
    // Scoped to the queue row: the document badges below also read "uploaded".
    await expect(page.locator('[data-slot="upload-item"]').last()).toContainText(/Uploaded/)
    await expect(rows).toHaveCount(before + 1)
  })

  test('a fail-* file errors, and retry succeeds', async ({ page }) => {
    await signIn(page)
    await page.goto('/documents')
    await expect(page.locator('[data-slot="document-row"]').first()).toBeVisible()

    await page.setInputFiles(fileInput, 'e2e/fixtures/fail-report.pdf')

    await expect(page.getByText(/Simulated upload failure/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()

    // The handler fails once per session, so the retry goes through.
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('[data-slot="upload-item"]').last()).toContainText(/Uploaded/)
    await expect(page.getByText(/Simulated upload failure/)).toHaveCount(0)
  })
})
