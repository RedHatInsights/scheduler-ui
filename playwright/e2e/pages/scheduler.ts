import { expect, type Locator, type Page, type Request } from '@playwright/test';

export class Scheduler {
  readonly panel: Locator;
  readonly dialog: Locator;
  readonly ownedNames = new Set<string>();
  readonly diagnostics: unknown[] = [];
  selection = { service: '', task: '', format: '' };

  constructor(readonly page: Page) {
    this.panel = page.locator('.scheduler-panel-content');
    this.dialog = page.getByRole('dialog');
  }

  private requestDetails(request: Request) {
    const url = new URL(request.url());
    return {
      method: request.method(),
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      // GET requests have no payload. Never include auth headers or cookies.
      payload: request.postData() ? request.postDataJSON() : null,
    };
  }

  async startDashboard() {
    // The only initial navigation: all destination apps are reached via UI.
    await this.page.goto('/');
    await expect(this.page.getByRole('button', { name: /User Avatar/ })).toBeVisible();
  }

  async start() {
    await this.startDashboard();
    await this.open();
  }

  async reload() {
    // Persistence check on the current page; do not deep-link to another app.
    try {
      await this.page.reload();
    } catch (error) {
      // Chromium can transiently fail navigation through the frontend proxy.
      // Retry only this transport failure once, without replaying any saves.
      if (!(error instanceof Error) || !error.message.includes('net::ERR_TOO_MANY_RETRIES')) throw error;
      await this.page.reload();
    }
    await expect(this.page.getByRole('button', { name: /User Avatar/ })).toBeVisible();
    await this.open();
  }

  async close() {
    await this.panel.getByRole('button', { name: 'Close drawer panel' }).click();
    // The shell keeps the panel visible during its closing animation. Wait
    // for closure so open() cannot mistake that outgoing panel for an open one.
    await expect(this.panel).toBeHidden();
  }

  async open() {
    if (!(await this.panel.isVisible())) {
      await this.page.getByRole('button', { name: 'Settings menu', exact: true }).click();
      const entry = this.page.getByRole('menuitem', { name: 'Scheduler', exact: true });
      await expect(entry, 'Chrome Settings should expose Scheduler').toBeVisible({ timeout: 60_000 });
      // Observe the UI's load, never issue an API request from the test.
      // Start these waits only once the navigation entry is ready, so shell
      // startup cannot consume the response timeout or mask a missing entry.
      const initialPaths = [
        '/api/scheduler/v1/jobs',
        '/api/scheduler/v1/runs',
        '/api/chrome-service/v1/static/exports-generated.json',
      ];
      const loaded = (await this.panel.count()) === 0 ? Promise.all(initialPaths.map(path =>
        this.page.waitForResponse(response =>
          new URL(response.url()).pathname.replace(/\/$/, '') === path && response.request().method() === 'GET',
          { timeout: 60_000 }
        ).then(async response => {
          await response.finished();
          expect(response.ok(), `Scheduler data should load: ${path}`).toBeTruthy();
        }).catch(error => {
          throw new Error(`Scheduler failed to load ${path}: ${error.message}`);
        })
      )) : Promise.resolve();
      await Promise.all([loaded, entry.click()]);
    }
    await expect(this.panel.getByRole('heading', { name: 'Scheduler', exact: true })).toBeVisible();
    await this.showScheduledReports();
  }

  private async showScheduledReports() {
    const tab = this.panel.getByRole('tab', { name: 'Scheduled reports', exact: true });
    await expect(tab).toBeVisible();
    // Opening the drawer preserves the active tab. Avoid clicking an already
    // selected tab while the shell is laying out the reopened drawer.
    if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(this.panel.getByRole('button', { name: 'Create new', exact: true })).toBeVisible();
  }

  report(name: string) {
    return this.panel.locator('button[id^="simple-node"]').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
  }

  row(name: string) {
    // `has` resolves inside each row, so its locator must not include the panel.
    return this.panel.getByRole('row').filter({
      has: this.page.getByRole('button', { name, exact: true }),
    });
  }

  async filter(name: string) {
    const input = this.panel.getByRole('textbox', { name: 'Filter by name' });
    if (await input.inputValue() === name) return;
    const response = this.page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.replace(/\/$/, '') === '/api/scheduler/v1/jobs' &&
        url.searchParams.get('name') === name && response.request().method() === 'GET';
    });
    await input.fill(name);
    const loaded = await response;
    expect(loaded.ok(), 'Filtered schedules should load').toBeTruthy();
    await loaded.finished();
    const body = await loaded.json();
    // Wait for React to commit this response, including an empty result.
    await expect(this.panel.locator('button[id^="simple-node"]'))
      .toHaveText(body.data.map((job: { name: string }) => job.name));
  }

  async find(name: string) {
    await this.showScheduledReports();
    await this.filter(name);
    await expect(this.report(name)).toBeVisible();
  }

  async completedDownload(name?: string) {
    await this.panel.getByRole('tab', { name: 'Reports history' }).click();
    if (name) await this.panel.getByRole('textbox', { name: 'Filter by name' }).fill(name);
    const history = this.panel.locator('table[aria-label="Reports history"]');
    await expect(history.or(this.panel.getByRole('heading', { name: 'No report history found' }))).toBeVisible();
    const download = name
      ? history.getByRole('button', { name: `Download ${name}`, exact: true }).first()
      : history.getByRole('button', { name: /^Download / }).first();
    const next = this.panel.getByRole('button', { name: 'Go to next page', exact: true });
    const range = this.panel.getByRole('button', { name: /^\d+\s*-\s*\d+\s+of\s+\d+/ });
    while (!(await download.count())) {
      if (await next.isDisabled()) {
        throw new Error(`No completed report found${name ? ` for "${name}"` : ' for this account'}. ` +
          'The download journey requires existing report history with an unexpired export. ' +
          'Optionally set E2E_DOWNLOAD_REPORT to an exact report name.');
      }
      const previousRange = await range.innerText();
      await next.click();
      await expect(range).not.toHaveText(previousRange);
    }
    await expect(download).toBeVisible();
    return download;
  }

  async waitForCompletedReport(name: string) {
    const download = this.panel.getByRole('button', { name: `Download ${name}`, exact: true });
    const failed = this.panel.getByRole('button', { name: 'Export failed', exact: true });
    let status = 'pending';
    let lastObservation = 'No refresh completed.';
    try {
      await expect.poll(async () => {
        // Rebuild the shell and drawer on every check to rule out stale page
        // state. Reload resets both tabs' filters, so restore them through UI.
        await this.reload();
        await this.find(name);
        await this.panel.getByRole('tab', { name: 'Reports history' }).click();
        await this.panel.getByRole('textbox', { name: 'Filter by name' }).fill(name);
        // Capture a paired jobs/history snapshot after restoring the filters.
        await this.panel.getByRole('button', { name: 'Scheduler menu', exact: true }).click();
        const refreshed = Promise.all(['jobs', 'runs'].map(resource => this.page.waitForResponse(response =>
          new URL(response.url()).pathname.replace(/\/$/, '') === `/api/scheduler/v1/${resource}` &&
          response.request().method() === 'GET'
        )));
        const [[jobs, runs]] = await Promise.all([
          refreshed,
          this.page.getByRole('menuitem', { name: 'Refresh list', exact: true }).click(),
        ]);
        const observation = {
          observedAt: new Date().toISOString(),
          jobs: { request: this.requestDetails(jobs.request()), status: jobs.status() },
          runs: { request: this.requestDetails(runs.request()), status: runs.status() },
        };
        this.diagnostics.push(observation);
        for (const response of [jobs, runs]) {
          expect(response.ok(), 'Schedules and report history should refresh successfully').toBeTruthy();
          await response.finished();
        }
        // Observe only requests made by the UI, and retain only this test's job.
        const jobsBody = await jobs.json();
        const runsBody = await runs.json();
        const job = jobsBody.data.find((job: { name: string }) => job.name === name);
        const matchingRuns = runsBody.data.filter((run: { job_id: string }) => run.job_id === job?.id);
        // Keep full payloads for this report, excluding other account reports.
        Object.assign(observation.jobs, { response: { meta: jobsBody.meta, data: job ? [job] : [] } });
        Object.assign(observation.runs, { response: { meta: runsBody.meta, data: matchingRuns } });
        lastObservation = JSON.stringify({
          observedAt: new Date().toISOString(),
          job: job && { id: job.id, status: job.status, next_run_at: job.next_run_at, last_run_at: job.last_run_at ?? null },
          runs: matchingRuns.map((run: { id: string; status: string; error_message?: string | null }) => ({
            id: run.id,
            status: run.status,
            error_message: run.error_message ?? null,
          })),
        });
        // The response can arrive before React renders the refreshed history.
        // Require the terminal status to appear in the UI before proceeding.
        if (matchingRuns.some((run: { status: string }) => run.status === 'failed')) {
          await expect(failed.first(), 'Refreshed history should show the failed run').toBeVisible();
          status = 'failed';
        } else if (matchingRuns.some((run: { status: string }) => run.status === 'completed')) {
          await expect(download.first(), 'Refreshed history should offer the completed download').toBeVisible();
          status = 'completed';
        } else {
          status = 'pending';
        }
        return status;
      }, {
        message: `Waiting for the scheduled run of ${name} to finish`,
        timeout: 10 * 60_000,
        intervals: [15_000],
      }).not.toBe('pending');
    } catch (error) {
      throw new Error(`Waiting for ${name} failed. Last UI refresh: ${lastObservation}\n${error instanceof Error ? error.message : error}`);
    }
    if (status === 'failed') {
      let detail: string;
      try {
        await failed.first().click();
        const popover = this.page.getByRole('dialog', { name: 'Export failed', exact: true });
        await expect(popover).toBeVisible();
        detail = await popover.innerText();
      } catch (error) {
        // Preserve the API failure even if the error popover cannot be opened.
        detail = `Could not read the Export failed popover: ${error instanceof Error ? error.message : error}`;
      }
      throw new Error(`The scheduled export for ${name} failed.\n` +
        `Selection: ${JSON.stringify(this.selection)}\n` +
        `Last UI refresh: ${lastObservation}\nExport failure details: ${detail}`);
    }
    await expect(download.first()).toBeVisible();
  }

  async action(name: string, action: 'Edit' | 'Pause' | 'Resume' | 'Delete') {
    await this.find(name);
    await this.row(name).getByRole('button', { name: 'Kebab toggle' }).click();
    await this.page.getByRole('menuitem', { name: action, exact: true }).click();
  }

  async next() {
    await this.dialog.getByRole('button', { name: 'Next', exact: true }).click();
  }

  private option(selectId: string, label?: string) {
    // Include visually interactive portal options even when Modal hides them
    // from the accessibility tree.
    // Scope to the intended popup, include ARIA-hidden items, then require
    // visual visibility. This supports pointer journeys, not accessibility.
    const options = this.page.locator(`#${selectId}`)
      .getByRole('option', { includeHidden: true }).filter({ visible: true });
    if (!label) return options.first();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // ARIA-hidden items have no accessible name, so match their displayed text.
    return options.filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
  }

  private async select(selectId: string, label?: string) {
    await this.dialog.getByTestId(selectId).click();
    const option = this.option(selectId, label);
    const text = (await option.innerText()).trim();
    await option.click();
    return text;
  }

  async cronMode() {
    await expect(this.dialog.getByTestId('cron-mode-switch')).toBeVisible();
    if (!(await this.dialog.getByTestId('cron-mode-switch').isChecked())) {
      await this.dialog.locator('label[for="cron-mode-switch"]').click();
    }
  }

  async setCron(expression: string) {
    await this.cronMode();
    const values = expression.split(' ');
    for (const [index, field] of ['minute', 'hour', 'day', 'month', 'dow'].entries()) {
      await this.dialog.getByTestId(`cron-${field}`).fill(values[index]);
    }
  }

  async expectCron(expression: string) {
    await this.cronMode();
    const values = expression.split(' ');
    for (const [index, field] of ['minute', 'hour', 'day', 'month', 'dow'].entries()) {
      await expect(this.dialog.getByTestId(`cron-${field}`)).toHaveValue(values[index]);
    }
  }

  async fillNew(name: string, cronExpression = '0 0 1 1 *') {
    await this.dialog.getByRole('textbox', { name: 'Report name' }).fill(name);
    await this.next();
    this.selection.service = await this.select('service-select-1', process.env.E2E_SERVICE);
    this.selection.task = await this.select('task-select-1', process.env.E2E_TASK);
    if (await this.dialog.getByTestId('variant-select-1').isVisible()) {
      await this.select('variant-select-1');
    }
    await this.next();
    this.selection.format = await this.select('file-type-select', process.env.E2E_FILE_TYPE);
    await this.next();
    // Default to annual runs; callers can choose a schedule for their journey.
    await this.setCron(cronExpression);
  }

  async save(name: string) {
    // Register before clicking: cleanup must also handle a persisted save whose
    // UI assertion failed. Rename callers register the new name before saving.
    this.ownedNames.add(name);
    await this.dialog.getByRole('button', { name: /^(Add|Update) report$/ }).click();
    await expect(this.dialog).not.toBeVisible();
    await this.find(name);
    await expect(this.report(name)).toHaveCount(1);
  }

  async create(name: string, cronExpression = '0 0 1 1 *') {
    await this.panel.getByRole('button', { name: 'Create new', exact: true }).click();
    await this.fillNew(name, cronExpression);
    await this.next();
    await this.save(name);
  }

  async createNearFuture(name: string) {
    await this.panel.getByRole('button', { name: 'Create new', exact: true }).click();
    await this.fillNew(name);
    // Compute only after the wizard is ready. Browser-local fields match the
    // wizard's default timezone, including when the runner uses another zone.
    const schedule = await this.page.evaluate(() => {
      const date = new Date((Math.ceil(Date.now() / 60_000) + 3) * 60_000);
      return {
        at: date.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cron: `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`,
      };
    });
    await expect(this.dialog.getByTestId('timezone-select')).toContainText(schedule.timezone);
    await this.setCron(schedule.cron);
    await this.next();
    await expect(this.dialog.getByTestId('review-timezone')).toHaveText(schedule.timezone);
    await expect(this.dialog.getByText(schedule.cron, { exact: false })).toBeVisible();
    expect(Date.parse(schedule.at) - Date.now(), 'The scheduled time must still be in the future before saving')
      .toBeGreaterThan(60_000);
    const captureCreation = (request: Request) => {
      if (request.method() !== 'POST' || new URL(request.url()).pathname.replace(/\/$/, '') !== '/api/scheduler/v1/jobs') return;
      if (request.postDataJSON()?.name !== name) return;
      this.diagnostics.push({ observedAt: new Date().toISOString(), creation: this.requestDetails(request) });
    };
    this.page.on('request', captureCreation);
    try {
      await this.save(name);
    } finally {
      this.page.off('request', captureCreation);
    }
    return schedule;
  }

  async delete(name: string) {
    await this.action(name, 'Delete');
    await this.dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(this.dialog).not.toBeVisible();
    await expect(this.report(name)).toHaveCount(0);
  }

  async cleanup() {
    if (!this.ownedNames.size) return;
    // Keep a working drawer after long-running tests. A full shell reload can
    // fail independently and prevent deletion of an otherwise accessible job.
    // Reload only when a modal or missing panel prevents normal navigation.
    if (await this.dialog.isVisible() || !(await this.panel.isVisible())) {
      await this.reload();
    } else {
      await this.open();
      const refreshed = this.page.waitForResponse(response =>
        new URL(response.url()).pathname.replace(/\/$/, '') === '/api/scheduler/v1/jobs' &&
        response.request().method() === 'GET'
      );
      await this.panel.getByRole('button', { name: 'Scheduler menu', exact: true }).click();
      const [response] = await Promise.all([
        refreshed,
        this.page.getByRole('menuitem', { name: 'Refresh list', exact: true }).click(),
      ]);
      expect(response.ok(), 'Schedules should refresh before cleanup').toBeTruthy();
      const body = await response.json();
      await expect(this.panel.locator('button[id^="simple-node"]'))
        .toHaveText(body.data.map((job: { name: string }) => job.name));
    }
    // Only exact unique names registered by this test are eligible for deletion.
    for (const name of this.ownedNames) {
      await this.filter(name);
      if (await this.report(name).count()) await this.delete(name);
      this.ownedNames.delete(name);
    }
  }
}
