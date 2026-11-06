import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

test.describe('appointment documents', () => {
  test('a document uploaded from the visit appears on that appointment', async ({ page }) => {
    await signIn(page)
    await page.goto('/appointments/apt_02')
    await expect(page.getByRole('heading', { name: 'Appointment detail' })).toBeVisible()

    const rows = page.locator('[data-slot="appointment-document"]')
    const before = await rows.count()

    await page.setInputFiles(
      'input[aria-label="Upload documents for this appointment"]',
      'e2e/fixtures/sample.pdf',
    )

    // The progress bar is transient: this upload can finish before Playwright
    // observes it. upload.spec.ts owns the progress assertion; this flow owns
    // the appointment association.
    await expect(rows).toHaveCount(before + 1)
    await expect(rows.last()).toContainText('sample.pdf')
    await expect(rows.last()).toContainText('Shared')
  })
})
