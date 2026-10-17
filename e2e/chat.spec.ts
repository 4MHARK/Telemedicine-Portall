import { expect, test } from '@playwright/test'

import { messageBubbles, signIn } from './helpers'

test.describe('chat', () => {
  test('sending is optimistic, then the poll confirms it', async ({ page }) => {
    await signIn(page)
    await page.goto('/messages/cnv_01')

    const bubbles = messageBubbles(page)
    await expect(bubbles).toHaveCount(10)

    await page.locator('#composer').fill('Hello from Playwright')
    await page.getByRole('button', { name: 'Send' }).click()

    // Optimistic append: visible with the sending state before the server answers.
    await expect(page.getByText('Hello from Playwright')).toBeVisible()
    await expect(bubbles.locator('[aria-label="Sending"]')).toHaveCount(1)

    // The server copy replaces it, with status sent.
    await expect(bubbles.locator('[aria-label="Sending"]')).toHaveCount(0)
    await expect(bubbles).toHaveCount(11)
    await expect(page.getByText('Hello from Playwright')).toBeVisible()
  })

  test('reloading the thread keeps the conversation', async ({ page }) => {
    await signIn(page)
    await page.goto('/messages/cnv_01')

    const bubbles = messageBubbles(page)
    await expect(bubbles).toHaveCount(10)

    // The mock database is in-memory and reseeds on load, so a message sent
    // before the reload is not expected to survive; the seeded thread must.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible()
    await expect(bubbles).toHaveCount(10)
  })
})
