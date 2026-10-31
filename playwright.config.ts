import { defineConfig, devices } from '@playwright/test'

/**
 * Runs against the real dev server, so the MSW service worker is in play —
 * these tests exercise the browser path, including the `fail-*` upload rule
 * that jsdom cannot reach.
 *
 * Local runs use the installed Google Chrome; CI installs the bundled Chromium
 * (`npx playwright install chromium`), so the channel is dropped there.
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
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
