import { expect, test } from '@playwright/test'

import { signIn } from './helpers'

test.describe('auth', () => {
  test('login → protected route → logout → redirected', async ({ page }) => {
    await signIn(page)

    await expect(page.getByRole('heading', { name: 'Find a doctor' })).toBeVisible()

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    await expect(page.getByText('Nadia Okafor')).toBeVisible()

    await page.getByRole('button', { name: /Sign out/ }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('anonymous /documents is redirected to login with ?next', async ({ page }) => {
    await page.goto('/documents')

    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fdocuments/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('signing in from that redirect returns to the original page', async ({ page }) => {
    await page.goto('/documents')
    await expect(page).toHaveURL(/\/auth\/login\?next=/)

    await page.getByLabel('Email').fill('nadia@example.com')
    await page.getByLabel('Password').fill('demo')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/documents$/)
    await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()
  })
})
