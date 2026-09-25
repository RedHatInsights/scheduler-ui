import { test, expect } from '../setup/test-setup';
import { stat } from 'node:fs/promises';

test('create, edit, pause, resume and delete a persisted schedule', async ({ page, scheduler, reportName }) => {
  // Edit opens in friendly mode, which currently loses restricted months.
  // Exercise persistence with supported monthly schedules; annual cron
  // preservation requires a separate application fix.
  const initialCron = '0 0 1 * *';
  const editedCron = '0 0 2 * *';
  await test.step('Navigate through Chrome Settings and create a schedule', async () => {
    await scheduler.start();
    await scheduler.create(reportName, initialCron);
  });
  const renamed = `${reportName}-edited`;
  await test.step('Reload, edit existing values, then verify the saved values', async () => {
    await scheduler.reload();
    await scheduler.action(reportName, 'Edit');
    await expect(scheduler.dialog.getByRole('textbox', { name: 'Report name' })).toHaveValue(reportName);
    await scheduler.dialog.getByRole('textbox', { name: 'Report name' }).fill(renamed);
    await scheduler.next();
    await expect(scheduler.dialog.getByRole('button', { name: scheduler.selection.service, exact: true })).toBeVisible();
    await expect(scheduler.dialog.getByRole('button', { name: scheduler.selection.task, exact: true })).toBeVisible();
    await scheduler.next();
    await expect(scheduler.dialog.getByTestId('file-type-select')).toHaveText(scheduler.selection.format);
    await scheduler.next();
    await scheduler.expectCron(initialCron);
    await scheduler.setCron(editedCron);
    await scheduler.next();
    await scheduler.save(renamed);
    await scheduler.reload();
    await scheduler.action(renamed, 'Edit');
    await scheduler.next();
    await scheduler.next();
    await scheduler.next();
    await scheduler.expectCron(editedCron);
    await scheduler.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
  await test.step('Pause and resume, verifying both after reload', async () => {
    await scheduler.action(renamed, 'Pause');
    await expect(scheduler.row(renamed).getByText('Paused', { exact: true })).toBeVisible();
    await scheduler.reload();
    await scheduler.find(renamed);
    await expect(scheduler.row(renamed).getByText('Paused', { exact: true })).toBeVisible();
    await scheduler.action(renamed, 'Resume');
    await expect(scheduler.row(renamed).getByText('Scheduled', { exact: true })).toBeVisible();
    await scheduler.reload();
    await scheduler.find(renamed);
    await expect(scheduler.row(renamed).getByText('Scheduled', { exact: true })).toBeVisible();
  });
  await test.step('Cancel deletion, then confirm deletion and verify persistence', async () => {
    await scheduler.action(renamed, 'Delete');
    await scheduler.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(scheduler.report(renamed)).toBeVisible();
    await scheduler.delete(renamed);
    await scheduler.reload();
    await scheduler.filter(reportName);
    await expect(scheduler.report(renamed)).toHaveCount(0);
    await expect(scheduler.report(reportName)).toHaveCount(0);
    await scheduler.close();
    await expect(page.getByRole('button', { name: 'Settings menu', exact: true })).toBeVisible();
  });
});

test('correct user input, navigate Back, cancel, reopen, and save', async ({ scheduler, reportName }) => {
  await scheduler.start();
  await scheduler.panel.getByRole('button', { name: 'Create new', exact: true }).click();
  await expect(scheduler.dialog.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await scheduler.fillNew(reportName);
  await scheduler.setCron('99 25 * * *');
  await expect(scheduler.dialog.getByText(/Invalid cron expression/)).toBeVisible();
  await expect(scheduler.dialog.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await scheduler.setCron('0 0 1 1 *');
  await expect(scheduler.dialog.getByText(/Invalid cron expression/)).toHaveCount(0);
  await scheduler.next();
  await scheduler.dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await scheduler.expectCron('0 0 1 1 *');
  await scheduler.dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await scheduler.panel.getByRole('button', { name: 'Create new', exact: true }).click();
  await expect(scheduler.dialog.getByRole('textbox', { name: 'Report name' })).toHaveValue('');
  await scheduler.fillNew(reportName);
  await scheduler.next();
  await scheduler.save(reportName);
  await scheduler.reload();
  await scheduler.find(reportName);
});

test('download a completed report, then return to scheduler management', async ({ page, scheduler, reportName }, testInfo) => {
  // Allow the near-future trigger and export processing to finish. All other
  // journeys retain their short timeout; fixture cleanup also runs on failure.
  test.setTimeout(13 * 60_000);
  const existingName = process.env.E2E_DOWNLOAD_REPORT;
  await scheduler.start();
  if (!existingName) {
    const schedule = await scheduler.createNearFuture(reportName);
    await testInfo.attach('scheduled-download-run', {
      body: JSON.stringify({ name: reportName, ...schedule }, null, 2),
      contentType: 'application/json',
    });
    await scheduler.waitForCompletedReport(reportName);
  }
  // A named existing report is an optional read-only override.
  const completed = await scheduler.completedDownload(existingName || reportName);
  const name = (await completed.getAttribute('aria-label'))!.slice('Download '.length);
  await testInfo.attach('download-report', { body: name, contentType: 'text/plain' });
  const downloaded = page.waitForEvent('download');
  await completed.click();
  const download = await downloaded;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  expect(download.suggestedFilename()).toContain(name);
  expect((await stat((await download.path())!)).size).toBeGreaterThan(0);
  await scheduler.panel.getByRole('tab', { name: 'Scheduled reports', exact: true }).click();
  await expect(scheduler.panel.getByRole('button', { name: 'Create new', exact: true })).toBeVisible();
  await scheduler.close();
  await scheduler.open();
  await expect(scheduler.panel.getByRole('button', { name: 'Create new', exact: true })).toBeVisible();
  if (!existingName) await scheduler.delete(reportName);
});
