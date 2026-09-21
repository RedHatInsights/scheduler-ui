import { test, expect } from '@playwright/test';
import { disableCookiePrompt } from '@redhat-cloud-services/playwright-test-auth';
import {
  openSidebar,
  createReportViaWizard,
  deleteReportByName,
  filterReportsByName,
  reportRow,
} from './helpers';

/**
 * E2E tests for the Scheduler drawer panel (everything OUTSIDE the create
 * wizard, which is covered by schedule-report-wizard.spec.ts).
 *
 * Two groups:
 *  - Read-only: list / filter / sort / view-detail / history tab / CSV export.
 *    These never mutate data on the target environment.
 *  - Self-cleaning destructive: create a uniquely-named report, pause/resume it,
 *    then delete it. An afterEach safety net removes it even if the test fails,
 *    so nothing leaks on shared stage.
 *
 * Required env vars: E2E_USER, E2E_PASSWORD.
 */

test.describe('Scheduler panel — read-only', () => {
  test.beforeEach(async ({ page }) => {
    await disableCookiePrompt(page);
    await page.goto('/');
    await openSidebar(page);
  });

  test('renders the scheduled reports table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scheduler', exact: true })).toBeVisible();
    await expect(page.getByRole('grid', { name: 'Scheduled reports' })).toBeVisible();
    await expect(page.getByTestId('create-new-report-button')).toBeVisible();
  });

  test('sorts by the Reports and Status columns', async ({ page }) => {
    const table = page.getByRole('grid', { name: 'Scheduled reports' });
    // Sorting is server-side; assert the control responds and the table survives.
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(table).toBeVisible();
    await page.getByRole('button', { name: 'Status', exact: true }).click();
    await expect(table).toBeVisible();
  });

  test('filters by name and by status', async ({ page }) => {
    const table = page.getByRole('grid', { name: 'Scheduled reports' });

    // The filter-type and status controls are PF Select MenuToggles labeled by
    // their current value. PF puts the Select `id` on the popup (only in the DOM
    // while open), not the toggle, so scope to the panel toolbar (anchored on the
    // unique "Create new" button) and target the toggle by its visible label.
    const toolbar = page
      .locator('.pf-v6-c-toolbar')
      .filter({ has: page.getByTestId('create-new-report-button') });
    const toggle = (label: string) => toolbar.locator('.pf-v6-c-menu-toggle').filter({ hasText: label });

    // Name filter (default filter type).
    const nameFilter = page.getByPlaceholder('Filter by name').first();
    await nameFilter.fill('nonexistent-report-xyz');
    await expect(table).toBeVisible();
    await nameFilter.fill('');

    // Switch filter type to Status, choose Scheduled, then switch back to Name.
    await toggle('Name').click();
    await page.getByRole('option', { name: 'Status' }).click();
    await toggle('All').click(); // status Select defaults to "All"
    await page.getByRole('option', { name: 'Scheduled' }).click();
    await expect(table).toBeVisible();

    await toggle('Status').click(); // filter-type toggle now shows "Status"
    await page.getByRole('option', { name: 'Name' }).click();
    await expect(page.getByPlaceholder('Filter by name').first()).toBeVisible();
  });

  test('opens a report detail modal from the name link', async ({ page }) => {
    // Rows load async after the panel opens; wait for the first name link before
    // deciding whether there is anything to open.
    const nameLink = page.locator('#simple-node0');
    try {
      await nameLink.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      test.skip(true, 'No reports on this environment to open');
    }
    await nameLink.click();
    // ReportDetailModal marks itself with a "History" heading.
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'History' })).not.toBeVisible();
  });

  test('switches to the Reports history tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Reports history' }).click();
    await expect(page.getByRole('grid', { name: 'Reports history' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: 'Scheduled reports' }).click();
    await expect(page.getByRole('grid', { name: 'Scheduled reports' })).toBeVisible();
  });

  test('exports the reports list as CSV', async ({ page }) => {
    const exportItem = page.getByRole('menuitem', { name: 'Export' });

    await page.getByRole('button', { name: 'Scheduler menu' }).click();
    if (await exportItem.isDisabled()) {
      test.skip(true, 'No reports on this environment to export');
    }

    const downloadPromise = page.waitForEvent('download');
    await exportItem.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('scheduled-reports.csv');
  });
});

test.describe('Scheduler panel — self-cleaning destructive', () => {
  // Tracks the report a test created so the afterEach net can remove it even
  // when the body throws before its own cleanup runs.
  let createdReportName: string | null = null;

  test.beforeEach(async ({ page }) => {
    await disableCookiePrompt(page);
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    if (!createdReportName) return;
    await deleteReportByName(page, createdReportName).catch(() => {
      /* best-effort teardown */
    });
    createdReportName = null;
  });

  test('creates, pauses, resumes, then deletes a report', async ({ page }) => {
    const name = `E2E panel test ${Date.now()}`;
    createdReportName = name;

    await createReportViaWizard(page, name);

    await filterReportsByName(page, name);
    const row = reportRow(page, name);
    await row.waitFor({ state: 'visible', timeout: 15000 });

    // Pause
    await row.getByRole('button', { name: /kebab toggle/i }).click();
    await page.getByRole('menuitem', { name: 'Pause' }).click();
    await expect(page.getByText('Report paused successfully.')).toBeVisible({ timeout: 15000 });
    await expect(reportRow(page, name).getByText('Paused')).toBeVisible({ timeout: 15000 });

    // Resume
    await reportRow(page, name).getByRole('button', { name: /kebab toggle/i }).click();
    await page.getByRole('menuitem', { name: 'Resume' }).click();
    await expect(page.getByText('Report resumed successfully.')).toBeVisible({ timeout: 15000 });

    // Delete (explicit assertion here; afterEach is only a safety net)
    await reportRow(page, name).getByRole('button', { name: /kebab toggle/i }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByTestId('delete-confirm-button').click();
    await expect(page.getByText('Recurring report deleted successfully.')).toBeVisible({ timeout: 15000 });

    createdReportName = null; // deleted cleanly; nothing for afterEach to do
  });
});
