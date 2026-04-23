@AGENTS.md

## Commands

```bash
# Development
npm install          # Install dependencies
npm start            # Start dev server with HCC proxy
npm run build        # Production build

# Testing
npm test             # Run unit tests (Jest + RTL)
npm run test:e2e     # Run E2E tests (Playwright)

# Quality
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run verify       # Full check: build + lint + test
```

## Git Conventions

- Branch naming: `bot/<JIRA-KEY>` (e.g., `bot/RHCLOUD-46961`)
- Commit format: `type(scope): short description` (conventional commits)
- Scopes: `scheduler`, `build`, `test`, `docs`, `ci`
- Default branch: `master`

## Key Files

- `fec.config.js` - Webpack + module federation config
- `deploy/frontend.yaml` - Frontend CRD for OpenShift
- `jest.config.js` - Jest test configuration
- `playwright.config.ts` - E2E test configuration
- `Caddyfile` - Static file server for E2E/production
- `src/AppEntry.js` - Federation entry point
- `src/App.js` - Root component with routes
