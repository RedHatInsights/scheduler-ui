import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for scheduler-ui E2E tests
 *
 * IMPORTANT:
 * - In Konflux CI: baseURL defaults to http://localhost:8000 (Caddy server)
 * - Locally: Can override with PLAYWRIGHT_BASE_URL environment variable
 * - DO NOT use HCC_ENV_URL - that's for pipeline infrastructure only
 */
export default defineConfig({
  // Test directory
  testDir: './playwright',

  // Timeout per test
  timeout: 60 * 1000,

  // CRITICAL: Sequential execution prevents flaky tests in CI
  workers: 1,
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: process.env.CI ? 'html' : 'list',

  // Shared settings for all projects
  use: {
    // Base URL for tests
    // - In Konflux CI: defaults to http://localhost:8000 (Caddy serves the built app)
    // - Locally: can be overridden with PLAYWRIGHT_BASE_URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
