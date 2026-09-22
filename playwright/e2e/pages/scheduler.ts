import { expect, type Locator, type Page } from '@playwright/test';

export class Scheduler {
  readonly panel: Locator;
  readonly dialog: Locator;
  readonly ownedNames = new Set<string>();
  selection = { service: '', task: '', format: '' };

  constructor(readonly page: Page) {
    this.panel = page.locator('.scheduler-panel-content');
    this.dialog = page.getByRole('dialog');
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
    await this.panel.getByRole('tab', { name: 'Scheduled reports', exact: true }).click();
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
    await this.panel.getByRole('tab', { name: 'Scheduled reports', exact: true }).click();
    await this.filter(name);
    await expect(this.report(name)).toBeVisible();
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

  async delete(name: string) {
    await this.action(name, 'Delete');
    await this.dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(this.dialog).not.toBeVisible();
    await expect(this.report(name)).toHaveCount(0);
  }

  async cleanup() {
    if (!this.ownedNames.size) return;
    // Reload closes any failed/cancelled modal and fetches server state. Only
    // exact unique names registered by this test are eligible for deletion.
    await this.reload();
    for (const name of this.ownedNames) {
      await this.filter(name);
      if (await this.report(name).count()) await this.delete(name);
    }
  }
}
