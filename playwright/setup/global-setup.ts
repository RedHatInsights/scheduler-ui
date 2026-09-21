import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';
import { disableCookiePrompt, login } from '@redhat-cloud-services/playwright-test-auth';
import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

// Matches insights-chrome's global setup: shared SSO, analytics disabled, and
// saved storage state. No traces/videos are recorded during credential entry.
export default async function globalSetup(config: FullConfig) {
  const { baseURL, storageState, ignoreHTTPSErrors, proxy, headless, launchOptions } = config.projects[0].use;
  if (typeof storageState !== 'string') throw new Error('An auth storageState path is required.');
  await rm(storageState, { force: true });
  const user = process.env.E2E_USER;
  const password = process.env.E2E_PASSWORD;
  if (!baseURL || !user || !password) {
    throw new Error('Set E2E_USER and E2E_PASSWORD (for example with op run or CI secret injection).');
  }
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('PLAYWRIGHT_BASE_URL must be an HTTP(S) URL without embedded credentials.');
  }
  // Global setup launches its own browser, so forward Playwright's resolved
  // --headed setting explicitly instead of using Chromium's headless default.
  const browser = await chromium.launch({ ...launchOptions, headless: headless ?? launchOptions?.headless });
  try {
    const context = await browser.newContext({ baseURL, ignoreHTTPSErrors, proxy });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    await disableCookiePrompt(page);
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await login(page, user, password);
    await page.getByRole('button', { name: /User Avatar/ }).waitFor({ state: 'visible' });
    await page.evaluate(() => {
      localStorage.setItem('chrome:analytics:disable', 'true');
      localStorage.setItem('chrome:segment:disable', 'true');
    });
    await mkdir(dirname(storageState), { recursive: true });
    await context.storageState({ path: storageState });
  } finally {
    await browser.close();
  }
}
