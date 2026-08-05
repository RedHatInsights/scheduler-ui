import { test, expect, Page } from '@playwright/test';
import { disableCookiePrompt } from '@redhat-cloud-services/playwright-test-auth';

/**
 * E2E tests for the ScheduleReportWizard component.
 *
 * Authentication is handled by @redhat-cloud-services/playwright-test-auth
 * via global setup. Cookie consent prompts are blocked using disableCookiePrompt.
 *
 * Required env vars:
 *   E2E_USER      — Test user credentials
 *   E2E_PASSWORD  — Test user password
 */

async function openSidebar(page: Page) {
  // Open settings menu in Chrome shell - try multiple possible names
  const settingsButton = page.getByRole('button', { name: /settings/i }).or(
    page.getByRole('button', { name: /cog|gear/i })
  ).first();
  await settingsButton.waitFor({ state: 'visible', timeout: 30000 });
  await settingsButton.click();

  // Select "Scheduler" from the menu
  const schedulerMenuItem = page.getByRole('menuitem', { name: /scheduler/i });
  await schedulerMenuItem.waitFor({ state: 'visible', timeout: 10000 });
  await schedulerMenuItem.click();

  // Wait for the sidebar panel content to appear
  await expect(page.getByRole('heading', { name: 'Global scheduler' })).toBeVisible({ timeout: 10000 });
}

async function openWizard(page: Page) {
  await openSidebar(page);

  // Wait for create button to be visible (toolbar rendered)
  const createButton = page.getByTestId('create-new-report-button');
  await createButton.waitFor({ state: 'visible', timeout: 10000 });
  await createButton.click();

  await expect(page.getByTestId('schedule-report-wizard-modal')).toBeVisible({ timeout: 10000 });
}

function nextButton(page: Page) {
  return page.getByTestId('schedule-report-wizard-modal').getByRole('button', { name: 'Next' });
}

async function selectOption(page: Page, testId: string, optionName?: string) {
  // PF6 Select: click MenuToggle by testid, then menu item by name or first item
  const toggle = page.getByTestId(testId);
  await toggle.waitFor({ state: 'visible', timeout: 10000 });
  await toggle.click();

  // Use CSS selector for PF menu items - wait for them to appear
  if (optionName) {
    const menuItem = page.locator('.pf-v6-c-menu__list-item').filter({ hasText: optionName });
    await menuItem.waitFor({ state: 'visible', timeout: 10000 });
    await menuItem.click();
  } else {
    const menuItem = page.locator('.pf-v6-c-menu__list-item').first();
    await menuItem.waitFor({ state: 'visible', timeout: 10000 });
    await menuItem.click();
  }
}

async function fillStep1(page: Page, name: string) {
  await page.getByPlaceholder('Enter a report name').fill(name);
  await nextButton(page).click();
}

async function fillStep2(page: Page, jobId = '1', serviceName?: string, taskName?: string) {
  await selectOption(page, `service-select-${jobId}`, serviceName);
  await selectOption(page, `task-select-${jobId}`, taskName);
  await nextButton(page).click();
}

async function fillStep3(page: Page, fileType = 'CSV', expectFormatConflict = false) {
  if (expectFormatConflict) {
    await expect(page.getByTestId('format-conflict-alert')).toBeVisible();
    // Next button should be disabled when file type can't be selected
    await expect(nextButton(page)).toBeDisabled();
  } else {
    await selectOption(page, 'file-type-select', fileType);
    await nextButton(page).click();
  }
}

async function fillStep4(page: Page, cron = '0 9 * * 1') {
  const cronInput = page.getByPlaceholder('0 0 * * 0');
  await cronInput.clear();
  await cronInput.fill(cron);
  await nextButton(page).click();
}

async function verifyReviewStep(
  page: Page,
  expected: {
    name: string;
    fileType: string;
    jobs: Array<{ service: string; task: string }>;
    cron: string;
    cronDesc?: string;
  }
) {
  // Verify report name and file type
  await expect(page.getByTestId('review-name')).toHaveText(expected.name);
  await expect(page.getByTestId('review-file-type')).toHaveText(expected.fileType);

  // Verify each job
  for (let i = 0; i < expected.jobs.length; i++) {
    const job = expected.jobs[i];
    await expect(page.getByTestId(`review-job-${i}-service`)).toContainText(job.service);
    await expect(page.getByTestId(`review-job-${i}-task`)).toContainText(job.task);
  }

  // Verify cron expression
  const cronElement = page.getByTestId('review-cron');
  await expect(cronElement).toContainText(expected.cron);
  if (expected.cronDesc) {
    await expect(cronElement).toContainText(expected.cronDesc);
  }
}

test.describe('Schedule Report Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await disableCookiePrompt(page);
    await page.goto('/');
  });

  test('opens wizard', async ({ page }) => {
    await openWizard(page);

    // Verify wizard opened
    await expect(page.getByTestId('schedule-report-wizard-modal')).toBeVisible();
    await expect(page.getByPlaceholder('Enter a report name')).toBeVisible();
  });

  test('selects single job', async ({ page }) => {
    await openWizard(page);
    await fillStep1(page, 'Single job report');

    // Wait for step 2 to render
    await expect(page.getByTestId('job-1-label')).toBeVisible();

    // Job 1: select service and task
    await selectOption(page, 'service-select-1');
    await selectOption(page, 'task-select-1');

    // Verify selections stuck
    await expect(page.getByTestId('service-select-1')).toBeVisible();
    await expect(page.getByTestId('task-select-1')).toBeVisible();
  });

  test('adds 3 jobs and removes one', async ({ page }) => {
    await openWizard(page);
    await fillStep1(page, 'Three jobs report');

    // Wait for step 2 to render
    await expect(page.getByTestId('job-1-label')).toBeVisible();

    // Job 1
    await selectOption(page, 'service-select-1');
    await selectOption(page, 'task-select-1');

    // Add Job 2
    await page.getByTestId('add-instance-button').click();
    await expect(page.getByTestId('job-2-label')).toBeVisible();
    await selectOption(page, 'service-select-2');
    await selectOption(page, 'task-select-2');

    // Add Job 3
    await page.getByTestId('add-instance-button').click();
    await expect(page.getByTestId('job-3-label')).toBeVisible();
    await selectOption(page, 'service-select-3');
    await selectOption(page, 'task-select-3');

    // Remove Job 2
    await page.getByTestId('remove-job-2-button').click();
    await expect(page.getByTestId('job-2-label')).toBeVisible(); // Job 3 becomes Job 2
    await expect(page.getByTestId('job-3-label')).not.toBeVisible();
  });

  test('creates report with 2 job instances', async ({ page }) => {
    await openWizard(page);
    await fillStep1(page, 'Multi-job report');

    // Wait for step 2 to render
    await expect(page.getByTestId('job-1-label')).toBeVisible();

    // Job 1: select service and task
    await selectOption(page, 'service-select-1');
    await selectOption(page, 'task-select-1');

    // Add Job 2
    await page.getByTestId('add-instance-button').click();
    await selectOption(page, 'service-select-2');
    await selectOption(page, 'task-select-2');

    await nextButton(page).click();

    // File type
    await fillStep3(page, 'CSV');

    // Frequency
    await fillStep4(page, '0 9 * * 1');

    // Review step - verify both jobs are shown
    await verifyReviewStep(page, {
      name: 'Multi-job report',
      fileType: 'CSV',
      jobs: [
        { service: '', task: '' },
        { service: '', task: '' },
      ],
      cron: '0 9 * * 1',
      cronDesc: 'At 09:00 AM, only on Monday',
    });

    // Submit
    await page.getByTestId('schedule-report-wizard-modal').getByRole('button', { name: 'Add report' }).click();
    await expect(page.getByTestId('schedule-report-wizard-modal')).not.toBeVisible({ timeout: 10000 });
  });
});
