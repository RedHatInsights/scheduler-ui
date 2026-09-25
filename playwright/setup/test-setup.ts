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
  // Teardown has its own budget for shell navigation, data loading and deletion.
  scheduler: [async ({ page }, use, testInfo) => {
    const scheduler = new Scheduler(page);
    await use(scheduler);
    // Dump before cleanup so a teardown/navigation failure cannot lose the
    // schedule payload or the sequence of status observations.
    if (scheduler.diagnostics.length) {
      await testInfo.attach('scheduler-request-diagnostics.json', {
        body: JSON.stringify(scheduler.diagnostics, null, 2),
        contentType: 'application/json',
      });
    }
    try {
      await scheduler.cleanup();
    } catch (error) {
      await testInfo.attach('cleanup-required', {
        body: `Delete these test-owned schedules through the UI: ${[...scheduler.ownedNames].join(', ')}`,
        contentType: 'text/plain',
      });
      throw error;
    }
  }, { timeout: 180_000 }],
});

export { expect };
