# Scheduler UI - Agent Guide

## Project Overview

Scheduler UI is a Hybrid Cloud Console (HCC) micro-frontend that lets users schedule reports to be delivered to their email on a recurring basis. It runs as a federated module inside [insights-chrome](https://github.com/RedHatInsights/insights-chrome) at the route `/apps/scheduler-ui`.

The project is in **early development** — currently a single-page scaffold with an empty state. The scheduling functionality is being built incrementally.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| PatternFly 5 | Red Hat design system (react-core, react-icons, react-table) |
| @redhat-cloud-services/frontend-components | Shared HCC component library |
| @redhat-cloud-services/frontend-components-config | Build tooling (`fec` CLI) for webpack + module federation |
| TypeScript | Type checking (configured, source files currently in JS) |
| Jest + React Testing Library | Unit/component tests |
| Playwright | End-to-end tests |
| Caddy | Static file server for E2E tests and production |
| Tekton (Konflux) | CI/CD pipelines |

## Project Structure

```text
scheduler-ui/
  src/
    App.js              # Root component with React Router routes
    App.scss            # Global styles (PF5 spacing variables)
    AppEntry.js         # Module federation entry point (wraps App in BrowserRouter)
    Components/
      SchedulerPage.js       # Main page component (empty state scaffold)
      SchedulerPage.test.js  # Unit tests for SchedulerPage
  config/
    jest.setup.js       # Jest setup (imports @testing-library/jest-dom)
  deploy/
    frontend.yaml       # Frontend CRD for OpenShift deployment
  playwright/
    example.spec.ts     # E2E smoke tests
  public/
    index.html          # HTML template
  .tekton/
    scheduler-ui-pull-request.yaml  # Konflux PR pipeline
    scheduler-ui-push.yaml          # Konflux push pipeline
  Caddyfile             # Caddy config for serving built assets
  Caddyfile.local       # Local dev Caddy config
  fec.config.js         # Frontend components config (webpack, module federation)
  jest.config.js        # Jest configuration
  playwright.config.ts  # Playwright configuration
```

## Architecture

### Module Federation

This app is a **federated module** consumed by insights-chrome (the HCC shell). Key config in `fec.config.js`:

- **App URL**: `/apps/scheduler-ui`
- **Entry point**: `./src/AppEntry.js`
- **Exposed module**: `./RootApp` (maps to `./src/AppEntry`)
- **Shared**: `react-router-dom` is a singleton (excluded from bundle, provided by the shell)

### Deployment

The `deploy/frontend.yaml` defines a `Frontend` CRD (Custom Resource Definition) processed by the [frontend-operator](https://github.com/RedHatInsights/frontend-operator):

- Image served by Caddy on port 8000
- Assets at `/apps/scheduler-ui`
- Module manifest at `/apps/scheduler-ui/fed-mods.json`
- FEO (Frontend Experience Orchestrator) config enabled

### Build & Serve Flow

1. `fec build` compiles the app via webpack + module federation
2. `cp public/index.html dist/index.html` copies the HTML template to dist
3. Caddy serves the `dist/` directory, stripping the `/apps/scheduler-ui` prefix
4. The shell (insights-chrome) loads the federated module at runtime

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (with HCC proxy)
npm start           # or: npm run start:proxy (explicit PROXY=true)

# Build for production
npm run build

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:headed  # Headed browser
npm run test:e2e:debug   # Debug mode

# Install Playwright browsers
npm run playwright:install

# Lint
npm run lint
npm run lint:fix

# Full verification (build + lint + test)
npm run verify
```

## Coding Conventions

1. **Component files**: One component per file in `src/Components/`. File name matches component name (PascalCase).
2. **Test co-location**: Tests live next to their source files as `ComponentName.test.js`.
3. **PatternFly components**: Always import from `@patternfly/react-core`, `@patternfly/react-icons`, or `@patternfly/react-table`. Use PF5 CSS variables (e.g., `--pf-v5-global--spacer--md`).
4. **SCSS scoping**: All custom styles must be scoped under `.scheduler-ui` or `.schedulerUi` (configured via `sassPrefix` in `fec.config.js`).
5. **No direct CLI calls**: Always use npm scripts (`npm test`, `npm run lint`), never call jest/eslint/playwright directly.
6. **ESLint**: Uses `eslint:recommended` + `plugin:react/recommended`. `react-in-jsx-scope` is disabled (React 18 JSX transform).
7. **Module exports**: Use `export default` for page components. AppEntry is the federation entry point.
8. **Routing**: All routes defined in `App.js` using React Router v6 `<Routes>` / `<Route>`.

## Common Pitfalls

1. **SCSS prefix required**: Custom styles without the `.scheduler-ui` wrapper class will leak into other HCC apps. Always wrap in the sass prefix.
2. **react-router-dom singleton**: This dep is excluded from the bundle and provided by insights-chrome at runtime. Don't import router internals that may not be available in the shared version.
3. **Build postbuild step**: `npm run build` runs `fec build` AND copies `index.html` to `dist/`. If you modify the build script, keep both steps.
4. **E2E base URL**: Playwright defaults to `http://localhost:8000` (Caddy). Override with `PLAYWRIGHT_BASE_URL` for local dev. Never use `HCC_ENV_URL` — that's for pipeline infrastructure only.
5. **Caddy path stripping**: The Caddyfile strips `/apps/scheduler-ui` prefix before serving files from `dist/`. If adding new static assets, they must be relative to `dist/`.
6. **Frontend CRD**: Changes to `deploy/frontend.yaml` affect how the app is discovered and mounted by the frontend-operator in OpenShift. Test CRD changes in ephemeral environments.
7. **TypeScript configured but JS used**: The repo has `tsconfig.json` and `ts-jest` configured, but source files are currently `.js`. New files can be `.ts`/`.tsx` — the build pipeline supports both.

## Documentation Index

- [Testing Guidelines](docs/testing-guidelines.md) - Unit test patterns with Jest + RTL, E2E patterns with Playwright
- [Architecture Guidelines](docs/architecture-guidelines.md) - HCC micro-frontend architecture, module federation, deployment
