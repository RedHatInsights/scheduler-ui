import { test, expect } from '@playwright/test';

/**
 * E2E tests for the SchedulerDownloadButton component
 *
 * Verifies the export dropdown with the "Schedule export" option
 * works end-to-end on the SchedulerPage dev harness.
 */

test.describe('SchedulerDownloadButton', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/apps/scheduler-ui');
    await page.waitForLoadState('domcontentloaded');
  });

  test('renders the Export toggle button on the page', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible();
  });

  test('shows CSV, JSON, and Schedule export options when opened', async ({ page }) => {
    // Open the dropdown
    await page.getByRole('button', { name: /export/i }).click();

    // Verify standard download options
    await expect(page.getByRole('menuitem', { name: 'Export to CSV' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export to JSON' })).toBeVisible();

    // Verify the Schedule export option is present
    await expect(page.getByRole('menuitem', { name: 'Schedule export' })).toBeVisible();
  });

  test('opens the scheduling wizard when Schedule export is clicked', async ({ page }) => {
    // Open the dropdown
    await page.getByRole('button', { name: /export/i }).click();

    // Click Schedule export
    await page.getByRole('menuitem', { name: 'Schedule export' }).click();

    // Wizard modal should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Wizard navigation should be present
    await expect(page.getByRole('navigation', { name: /wizard/i })).toBeVisible();
  });

  test('closes the dropdown after selecting Schedule export', async ({ page }) => {
    // Open the dropdown
    await page.getByRole('button', { name: /export/i }).click();

    // Verify dropdown is open
    await expect(page.getByRole('menuitem', { name: 'Schedule export' })).toBeVisible();

    // Click Schedule export
    await page.getByRole('menuitem', { name: 'Schedule export' }).click();

    // Dropdown should close (menu items no longer visible)
    await expect(page.getByRole('menuitem', { name: 'Export to CSV' })).not.toBeVisible();
  });
});
