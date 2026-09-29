import { defineConfig } from '@playwright/test';

// Pure configuration checks: no browser, credentials, or network needed.
export default defineConfig({
  testDir: './playwright/config',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/config',
});
