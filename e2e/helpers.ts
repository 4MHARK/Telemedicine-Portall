import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Signs in through the real form. The mock API accepts any non-empty
 * credentials (docs/api-contract.md), so the values only need to be present.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill('nadia@example.com')
  await page.getByLabel('Password').fill('demo')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/doctors$/)
}

export function messageBubbles(page: Page) {
  return page.locator('[data-slot="message-bubble"]')
}
