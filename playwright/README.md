# Authenticated scheduler journeys

These tests use the real HCC shell, Red Hat SSO, scheduler API, and export API.
They follow insights-chrome's `playwright/setup/global-setup.ts`,
`playwright/setup/test-setup.ts`, and page-object conventions, using
`@redhat-cloud-services/playwright-test-auth` for login and cookie-prompt handling.

All schedule creation, editing, pausing, resuming, deletion, and downloads happen
through UI interactions. Tests observe the UI's requests to wait for loading;
they do not create or delete data with API calls. Each test gets a fresh browser
context using the authenticated storage state. Unique test-owned schedules are
cleaned up through the UI, including after failures. Cleanup failures attach the
names needing manual deletion to the report.

Each journey starts at Console home (`/`) and opens Scheduler through
Settings → Scheduler. Consumer pages are reached by configured UI clicks from
Console home, not direct URL navigation. Persistence checks reload the current
page and reopen Scheduler through the UI.

The page object scopes dropdown options to their popup and includes visually
visible options even when a modal portal hides them from the accessibility tree.
These pointer journeys do not establish screen-reader accessibility.

## Run with 1Password

1. Use a test account in the target HCC environment with scheduler and
   export permissions. Chrome's `console.chrome-scheduler_drawer` flag must be
   enabled, and Settings → Scheduler must load this version of scheduler-ui.
   The standalone Caddy page does not provide this integration.
2. Install dependencies with `npm ci` and browsers with
   `npm run playwright:install` if needed.
3. Copy `.env.e2e.example` to `.env.e2e`. Replace the 1Password references and
   choose `E2E_TARGET=stage`, `production`, or `proxy`. By default, the tests
   select the first available service/task and required variant through the UI,
   then select a supported file type on the next wizard step. Optional `E2E_SERVICE`,
   `E2E_TASK`, and `E2E_FILE_TYPE` pin exact visible labels for a particular account.
4. Run:

   ```bash
   op run --env-file=.env.e2e -- npm run test:e2e:auth
   ```

For a visible browser, add `-- --headed`. To inspect failures locally, use
`npm run test:e2e:report`. Storage state is in the ignored `playwright/.auth/`
directory; failure artifacts can contain authenticated account data and should
be reviewed before sharing. Credential entry itself is not recorded.

## Stage, production, and the frontend proxy

| `E2E_TARGET` | Default browser origin | Certificate validation |
| --- | --- | --- |
| `stage` (default) | `https://console.stage.redhat.com` | Enabled |
| `production` | `https://console.redhat.com` | Enabled |
| `proxy` | `https://stage.foo.redhat.com:1337` | Accepts the proxy's internal certificate |

`PLAYWRIGHT_BASE_URL` overrides the origin in any target. All page navigation,
SSO storage state, and UI requests stay tied to that browser-facing origin.
Each target/origin gets a separate auth-state file. Login and test contexts use
the same TLS and optional forward-proxy configuration. If stage access requires
a corporate forward proxy, set `PLAYWRIGHT_PROXY_SERVER` and optionally
`PLAYWRIGHT_PROXY_BYPASS`; this is separate from the frontend-development-proxy,
which is a reverse proxy and belongs in the browser URL.

Use separate 1Password env files per account/environment, for example:

```bash
op run --env-file=.env.stage.local -- npm run test:e2e:auth
op run --env-file=.env.production.local -- npm run test:e2e:auth
```

Each file sets its own `E2E_TARGET` and credentials. The same journeys run in
production, modifying only uniquely named test-owned schedules. Existing
download fixtures remain read-only. Scheduler availability and account
permissions must be enabled in each environment; tests do not override flags.

## CI: V2 pipeline and sidecars

The PR PipelineRun uses
[`docker-build-run-all-tests-v2.yaml`](https://github.com/RedHatInsights/konflux-pipelines/blob/main/pipelines/platform-ui/docker-build-run-all-tests-v2.yaml),
following virtual-assistant-frontend's V2 example. It installs dependencies in
the `run-unit-tests/workspace-setup` step, waits up to 120 seconds for the frontend
proxy, then runs both `npm run test:e2e` and `npm run test:e2e:auth`
with `E2E_TARGET=proxy`. It maps
`stage.foo.redhat.com` to IPv4 loopback so browser traffic reaches the sidecar.

The existing `scheduler-ui-dev-proxy-caddyfile` ConfigMap must supply a `routes`
key that sends scheduler assets (`/apps/scheduler-ui/*`, including the federated
manifest and chunks) to the application sidecar on port 8000. The console HTML,
Chrome, SSO, and APIs must continue through the frontend proxy's upstream routes;
do not replace the console document with the standalone scheduler HTML. These
cluster resources are maintained outside this repository and were not changed.

V2 injects `scheduler-ui-credentials-secret` into the test container. It supports
`E2E_USER`/`E2E_PASSWORD` environment keys and the compatibility keys
`e2e-user`/`e2e-password`. Optional `E2E_SERVICE`, `E2E_TASK`, `E2E_FILE_TYPE`,
`E2E_CONSUMER_PATH`, `E2E_CONSUMER_NAVIGATION`, and `E2E_DOWNLOAD_REPORT` can be supplied there as well.
CI does not need `op run`. `HCC_ENV_URL` configures the proxy upstream, never
Playwright's browser URL. V2's `e2e-hcc-env` and `e2e-hcc-env-url` parameters
default to stage; the checked-in PR configuration targets stage through the proxy.
For a production-backed proxy workflow, set those V2 parameters to `prod` and
the production upstream, override `PLAYWRIGHT_BASE_URL` to the configured proxy
origin, and provide its matching hostname alias and test credentials.

Keep the exact `@playwright/test` version aligned with `e2e-playwright-image`.
The `playwright` override also keeps the shared authentication package on that
browser version.

## What the five tests cover

| Journey | What is verified |
| --- | --- |
| Schedule lifecycle | Settings → Scheduler → create → reload → edit and verify saved values → pause/resume across reloads → cancel deletion → delete and verify absence after reload |
| Input recovery | Required fields block progression; invalid cron shows feedback; correction enables Next; Back preserves values; Cancel/reopen resets the form; saving still works |
| Completed download | Create a near-future schedule → refresh history until the run finishes → download a nonempty ZIP-named file → reopen schedule management → delete the test schedule |
| Consumer integration | Consumer Export → Schedule export → save → locate in Chrome Scheduler → return to consumer → reload and locate again |
| Save recovery (`@fault-injection`) | First save receives an immediate injected 503; values remain; retry saves through the real API; reload shows one report; Pause still works |

The save-recovery test is an authenticated browser fault-injection check, not a
claim of a real backend outage. Only the first POST is intercepted. To run only
unmodified backend journeys:

```bash
op run --env-file=.env.e2e -- npm run test:e2e:auth -- --grep-invert @fault-injection
```

By default, the download journey creates a uniquely named schedule through the
wizard, due three to four minutes after reaching the frequency step. It uses the
browser's timezone and a cron expression specifying the minute, hour, day and
month. This is an annual schedule, not a true one-off: the wizard has no one-off
option. The test deletes its schedule after downloading, with fixture cleanup
also attempting deletion after failures.

Each poll reloads the whole page, reopens Scheduler, and restores the report
filters. It then clicks Refresh list to capture a paired jobs/history diagnostic
snapshot and waits for terminal results to render. Polls have a 15-second delay
between checks, with up to ten minutes to finish. Failed exports fail the test and expose the error popover;
a completed run must produce an actual nonempty ZIP-named download. Only this
journey has a 13-minute timeout. Its chosen schedule/timezone and report name
are attached to the result. The account needs permission to create schedules
and generate exports for the selected service/task/format; the usual `E2E_SERVICE`,
`E2E_TASK`, and `E2E_FILE_TYPE` settings apply.

For diagnostics, `scheduler-request-diagnostics.json` is attached before cleanup
on both passing and failing near-future download runs. It contains the schedule
creation POST payload and each status refresh's timestamp, request method, path,
query parameters, HTTP status, and response data for the test-owned report.
GET request payloads are `null`. Authentication headers, cookies, and other
reports' response records are excluded. Open the attachment with
`npm run test:e2e:report` after the run.

Optional configuration:

- `E2E_DOWNLOAD_REPORT`: pin selection to an exact report name in the account's
  existing history, with a completed run and an unexpired downloadable export.
  This bypasses schedule creation and waiting. The existing report is never
  modified or deleted. Missing completed runs or expired downloads fail the test.
  The test does not claim to verify ZIP contents or email delivery.
- `E2E_CONSUMER_PATH`: expected relative path of a deployed consumer page with the
  SchedulerDownloadButton integration and valid prefilled service/task/format.
  `E2E_EXPORT_BUTTON` optionally changes the export button's accessible name.
  This must be a real consumer integration; the scheduler development harness's
  console-only save callback is not a substitute.
  Also set `E2E_CONSUMER_NAVIGATION` to an ordered JSON array of UI clicks from
  Console home. Each entry has a `role` (`button`, `link`, or `menuitem`) and an
  exact accessible `name`. For example, replace the labels below with the actual
  service/navigation controls for the consumer:

  ```dotenv
  E2E_CONSUMER_NAVIGATION='[{"role":"button","name":"Your service menu"},{"role":"link","name":"Your reports page"}]'
  ```

  The test clicks these controls, then asserts `E2E_CONSUMER_PATH`; it never
  navigates directly to that path. Supplying only one of these two variables
  fails with configuration guidance instead of silently skipping the test.
  The consumer journey remains skipped when both variables are unset because
  the feature-flagged tenant integration has not yet been validated.

The management tests use annual or monthly cron expressions to avoid frequent
report runs. A reload retries once only for Chromium's `ERR_TOO_MANY_RETRIES`;
whole tests are not retried. There are no hanging-request tests, backend setup
scripts, or feature-flag overrides. Missing authentication fails setup with configuration
guidance; a missing Scheduler entry point fails the journey.

## Local checks without credentials

```bash
npm run test:e2e:check
npm run test:e2e:config
npm run test:e2e:auth -- --list
npm run test:e2e -- --list
```

The default `npm run test:e2e` retains the existing authenticated panel and wizard
suite, which also requires `E2E_USER` and `E2E_PASSWORD` and defaults to the frontend
proxy. The PR pipeline runs both suites. The additional journeys use
`playwright.auth.config.ts`. Type checking, linting, and test
discovery do not confirm live behavior; run the authenticated suite against your
target environment before turning failures into developer issues.
