import { test as base, expect } from '@playwright/test';
import { disableCookiePrompt } from '@redhat-cloud-services/playwright-test-auth';
import { randomUUID } from 'node:crypto';
import { Scheduler } from '../e2e/pages/scheduler';

export const test = base.extend<{ scheduler: Scheduler; reportName: string }>({
  page: async ({ page }, use) => {
    await disableCookiePrompt(page);
    await use(page);
  },
  // Playwright requires a destructured fixture argument even with no dependencies.
  // eslint-disable-next-line no-empty-pattern
  reportName: async ({}, use) => {
    await use(`e2e-scheduler-${randomUUID()}`);
  },
  scheduler: [async ({ page }, use, testInfo) => {
    const scheduler = new Scheduler(page);
    await use(scheduler);
    try {
      await scheduler.cleanup();
    } catch (error) {
      await testInfo.attach('cleanup-required', {
        body: `Delete these test-owned schedules through the UI: ${[...scheduler.ownedNames].join(', ')}`,
        contentType: 'text/plain',
      });
      throw error;
    }
  }, { timeout: 60_000 }],
});

export { expect };
