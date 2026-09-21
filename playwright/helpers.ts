import { Page, expect } from '@playwright/test';

/**
 * Shared Playwright helpers for the Scheduler micro-frontend.
 *
 * Navigation mirrors the pattern in schedule-report-wizard.spec.ts: open the
 * Chrome shell settings menu, pick "Scheduler", wait for the drawer panel.
 * Auth is handled by @redhat-cloud-services/playwright-test-auth global setup.
 */

export async function openSidebar(page: Page) {
  // Chrome shell loads dynamically in the SPA — give the settings button a long
  // first wait.
  const settingsButton = page
    .getByRole('button', { name: /settings/i })
    .or(page.getByRole('button', { name: /cog|gear/i }))
    .first();
  await settingsButton.waitFor({ state: 'visible', timeout: 45000 });
  await settingsButton.click();

  const schedulerMenuItem = page.getByRole('menuitem', { name: /scheduler/i });
  await schedulerMenuItem.waitFor({ state: 'visible', timeout: 10000 });
  await schedulerMenuItem.click();

  await expect(page.getByRole('heading', { name: 'Scheduler', exact: true })).toBeVisible({ timeout: 10000 });
}

/**
 * PF6 Select: click the MenuToggle by testid, then a menu item by text (or the
 * first item when no name is given).
 */
export async function selectOption(page: Page, testId: string, optionName?: string) {
  const toggle = page.getByTestId(testId);
  await toggle.waitFor({ state: 'visible', timeout: 10000 });
  await toggle.click();
  await page.waitForSelector('.pf-v6-c-menu__list-item', { state: 'visible', timeout: 5000 }).catch(() => {});

  const menuItem = optionName
    ? page.locator('.pf-v6-c-menu__list-item').filter({ hasText: optionName }).first()
    : page.locator('.pf-v6-c-menu__list-item').first();
  await menuItem.waitFor({ state: 'visible', timeout: 10000 });
  await menuItem.click();
}

function wizardNext(page: Page) {
  return page.getByTestId('schedule-report-wizard-modal').getByRole('button', { name: 'Next' });
}

/**
 * Drive the create wizard end-to-end with a single job, CSV, and a weekly cron,
 * then submit. Leaves the drawer panel showing the refreshed reports list.
 *
 * NOTE: this creates a REAL job on the target environment. Callers MUST delete
 * it afterwards (see deleteReportByName) so nothing leaks on shared stage.
 */
export async function createReportViaWizard(page: Page, name: string) {
  await openSidebar(page);

  const createButton = page.getByTestId('create-new-report-button');
  await createButton.waitFor({ state: 'visible', timeout: 10000 });
  await createButton.click();
  await expect(page.getByTestId('schedule-report-wizard-modal')).toBeVisible({ timeout: 10000 });

  // Step 1 — name
  await page.getByPlaceholder('Enter a report name').fill(name);
  await wizardNext(page).click();

  // Step 2 — first available service + task
  await expect(page.getByTestId('job-1-label')).toBeVisible();
  await selectOption(page, 'service-select-1');
  await selectOption(page, 'task-select-1');
  await wizardNext(page).click();

  // Step 3 — file type
  await selectOption(page, 'file-type-select', 'CSV');
  await wizardNext(page).click();

  // Step 4 — cron mode, weekly Monday 09:00
  await page.getByTestId('cron-mode-switch').click({ force: true });
  await page.locator('#cron-minute').fill('0');
  await page.locator('#cron-hour').fill('9');
  await page.locator('#cron-day').fill('*');
  await page.locator('#cron-month').fill('*');
  await page.locator('#cron-dow').fill('1');
  await wizardNext(page).click();

  // Review — submit
  await page.getByTestId('schedule-report-wizard-modal').getByRole('button', { name: 'Add report' }).click();
  await expect(page.getByTestId('schedule-report-wizard-modal')).not.toBeVisible({ timeout: 15000 });
}

/** Ensure the Scheduled reports tab is active. */
export async function openScheduledReportsTab(page: Page) {
  await page.getByRole('tab', { name: 'Scheduled reports' }).click();
}

/**
 * Filter the Scheduled reports table by name (server-side, debounced). The
 * Reports-history tab also has a "Filter by name" input, but it renders after
 * the scheduled-reports one, so .first() is the scheduled-reports filter.
 */
export async function filterReportsByName(page: Page, name: string) {
  const input = page.getByPlaceholder('Filter by name').first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(name);
}

/**
 * Locate a Scheduled-reports table row by the report name it contains. PF6
 * renders the sortable/expandable table with role="grid" (not "table").
 */
export function reportRow(page: Page, name: string) {
  return page
    .getByRole('grid', { name: 'Scheduled reports' })
    .getByRole('row')
    .filter({ hasText: name })
    .first();
}

/**
 * Delete a report by name via the panel kebab -> Delete -> confirm. Tolerant:
 * if the report can't be found (already deleted), it returns quietly. Use as a
 * self-cleaning teardown so destructive tests never leak data on shared stage.
 */
export async function deleteReportByName(page: Page, name: string) {
  await openScheduledReportsTab(page);
  await filterReportsByName(page, name);

  const row = reportRow(page, name);
  try {
    await row.waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    return; // nothing to clean up
  }

  await row.getByRole('button', { name: /kebab toggle/i }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByTestId('delete-confirm-button').click();
  await expect(page.getByText('Recurring report deleted successfully.')).toBeVisible({ timeout: 15000 });
}
