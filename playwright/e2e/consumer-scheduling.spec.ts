import { test, expect } from '../setup/test-setup';

test('schedule from a consumer export menu and find it in Chrome Scheduler', async ({ page, scheduler, reportName }) => {
  const path = process.env.E2E_CONSUMER_PATH;
  const navigation = process.env.E2E_CONSUMER_NAVIGATION;
  test.skip(!path && !navigation, 'Set E2E_CONSUMER_PATH and E2E_CONSUMER_NAVIGATION for a deployed consumer integration.');
  if (!path || !navigation) throw new Error('Set both E2E_CONSUMER_PATH and E2E_CONSUMER_NAVIGATION.');
  if (!path!.startsWith('/') || path!.startsWith('//')) throw new Error('E2E_CONSUMER_PATH must be a relative application path.');
  const steps: unknown = JSON.parse(navigation);
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('E2E_CONSUMER_NAVIGATION must be a nonempty JSON array of { role, name } steps.');
  await scheduler.startDashboard();
  const destination = new URL(path, page.url()).href;
  for (const step of steps) {
    if (!step || !['button', 'link', 'menuitem'].includes(step.role) || typeof step.name !== 'string' || !step.name) {
      throw new Error('Each navigation step needs role (button/link/menuitem) and an exact accessible name.');
    }
    await page.getByRole(step.role, { name: step.name, exact: true }).click();
  }
  await expect(page).toHaveURL(destination);
  await page.getByRole('button', { name: process.env.E2E_EXPORT_BUTTON || 'Export', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Schedule export', exact: true }).click();
  await expect(scheduler.dialog).toBeVisible();
  await scheduler.dialog.getByRole('textbox', { name: 'Report name' }).fill(reportName);
  // Consumer supplies valid service/task/format defaults. Failing to proceed
  // exposes a broken integration instead of silently replacing its defaults.
  await scheduler.next();
  await scheduler.next();
  await scheduler.next();
  await scheduler.setCron('0 0 1 1 *');
  await scheduler.next();
  scheduler.ownedNames.add(reportName);
  await scheduler.dialog.getByRole('button', { name: 'Add report', exact: true }).click();
  await expect(scheduler.dialog).not.toBeVisible();
  await scheduler.open();
  await scheduler.find(reportName);
  await scheduler.panel.getByRole('button', { name: 'Close drawer panel' }).click();
  await expect(page.getByRole('button', { name: process.env.E2E_EXPORT_BUTTON || 'Export', exact: true })).toBeVisible();
  await page.reload();
  await scheduler.open();
  await scheduler.find(reportName);
});
