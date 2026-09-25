import { defineConfig, devices } from '@playwright/test';
import { resolveEnvironment } from './playwright/setup/environment';

const environment = resolveEnvironment();

// Authenticated HCC tests work against deployed environments and CI's proxy.
// The default config retains the existing authenticated panel/wizard tests.
// Real SSO and API; explicitly tagged recovery
// tests replace only the failed response, then retry against the real backend.
export default defineConfig({
  testDir: './playwright/e2e',
  globalSetup: require.resolve('./playwright/setup/global-setup'),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: `test-results/authenticated/${environment.target}`,
  use: {
    baseURL: environment.baseURL,
    storageState: environment.storageState,
    ignoreHTTPSErrors: environment.ignoreHTTPSErrors,
    proxy: environment.proxy,
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
