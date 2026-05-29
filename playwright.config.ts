import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['line']],

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to also test mobile viewport:
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 14'] },
    // },
  ],

  // Starts astro dev before running tests. Pages that use Astro.locals.runtime.env
  // (dashboard, API routes) won't work in this mode — they need wrangler.
  // For full integration testing: build first, then run with:
  //   npx wrangler pages dev ./dist --compatibility-date=2025-01-01
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
