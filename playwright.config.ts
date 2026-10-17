import { defineConfig, devices } from '@playwright/test'

/**
 * Runs against the real dev server, so the MSW service worker is in play —
 * these tests exercise the browser path, including the `fail-*` upload rule
 * that jsdom cannot reach.
 *
 * `channel: 'chrome'` uses the installed Google Chrome rather than downloading
 * a Playwright browser. Change it to remove the channel and run
 * `npx playwright install chromium` if that is preferred on CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
