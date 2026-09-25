import { test, expect } from '../setup/test-setup';

// An immediate one-shot error makes recovery reproducible without causing an
// outage. Auth, metadata, reads, the successful retry, and cleanup remain real.
test('retry a rejected save without losing values or creating duplicates @fault-injection', async ({ page, scheduler, reportName }) => {
  await scheduler.start();
  await scheduler.panel.getByRole('button', { name: 'Create new', exact: true }).click();
  await scheduler.fillNew(reportName);
  await scheduler.next();
  let injected = false;
  await page.route('**/api/scheduler/v1/jobs', async route => {
    if (!injected && route.request().method() === 'POST') {
      injected = true;
      await route.fulfill({ status: 503, json: { errors: [{ status: '503', detail: 'Temporary E2E failure' }] } });
    } else {
      await route.fallback();
    }
  });
  scheduler.ownedNames.add(reportName);
  await scheduler.dialog.getByRole('button', { name: 'Add report', exact: true }).click();
  // Check visible feedback even if the modal hides the toast from the
  // accessibility tree. Screen-reader announcement needs separate coverage.
  await expect(page.getByRole('heading', { includeHidden: true }).filter({ hasText: 'Failed to create report' })).toBeVisible();
  expect(injected).toBeTruthy();
  await expect(scheduler.dialog).toBeVisible();
  await expect(scheduler.dialog.getByText(reportName, { exact: false })).toBeVisible();
  await expect(scheduler.dialog.getByText('0 0 1 1 *', { exact: false })).toBeVisible();
  await scheduler.save(reportName);
  await expect(scheduler.panel.getByRole('heading', { name: /API Error/ })).toHaveCount(0);
  await scheduler.reload();
  await scheduler.find(reportName);
  await expect(scheduler.report(reportName)).toHaveCount(1);
  await scheduler.action(reportName, 'Pause');
  await expect(scheduler.row(reportName).getByText('Paused', { exact: true })).toBeVisible();
});
