# Testing Guidelines

## Overview

Scheduler UI uses two testing layers:

1. **Unit/Component tests** - Jest + React Testing Library (RTL) for component behavior
2. **End-to-end tests** - Playwright for full application smoke tests

## Unit Tests (Jest + RTL)

### Configuration

- **Config**: `jest.config.js` uses `ts-jest/presets/js-with-babel-esm` preset
- **Environment**: `jsdom` for browser API simulation
- **Setup**: `config/jest.setup.js` imports `@testing-library/jest-dom` for DOM matchers
- **CSS mocking**: `identity-obj-proxy` maps CSS/SCSS imports to identity objects
- **Coverage**: Collected from `src/**/*.js`, excluding stories

### Test Pattern

Tests are co-located with their components as `ComponentName.test.js`:

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders expected content', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Key Practices

- Use `screen` queries over destructured `render()` return values
- Prefer `getByText`, `getByRole`, `getByLabelText` over `getByTestId`
- Test user-visible behavior, not implementation details
- Wrap components needing routing context in `<MemoryRouter>` from `react-router-dom`
- PatternFly components render complex DOM — query by role or accessible name, not internal class names

### Running Tests

```bash
npm test                    # Run all tests with coverage
npm test -- --watch         # Watch mode
npm test -- --testPathPattern=SchedulerPage  # Run specific test file
```

## End-to-End Tests (Playwright)

### Configuration

- **Config**: `playwright.config.ts`
- **Test directory**: `playwright/`
- **Base URL**: `http://localhost:8000` (Caddy server) or override with `PLAYWRIGHT_BASE_URL`
- **Browser**: Chromium only
- **Workers**: 1 (sequential execution to prevent flaky tests)
- **Timeout**: 60 seconds per test
- **Retries**: 2 on CI, 0 locally

### Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/apps/scheduler-ui');
    await page.waitForLoadState('domcontentloaded');
    // assertions...
  });
});
```

### Key Practices

- Always use relative URLs — `baseURL` from config is prepended automatically
- Use `page.waitForLoadState('domcontentloaded')` before assertions
- Take screenshots on failure (configured automatically)
- In Konflux CI, the built app is served by Caddy on port 8000
- Never reference `HCC_ENV_URL` in tests — that's for pipeline infrastructure only

### Running E2E Tests

```bash
npm run playwright:install   # Install browsers (first time)
npm run test:e2e             # Run all E2E tests
npm run test:e2e:ui          # Interactive UI mode
npm run test:e2e:headed      # See the browser
npm run test:e2e:debug       # Debug mode with inspector
```

## Checklist for New Tests

### Unit Tests

- [ ] Test file co-located with component: `ComponentName.test.js`
- [ ] Renders without crashing
- [ ] Key text content is visible
- [ ] User interactions trigger expected behavior (use `@testing-library/user-event`)
- [ ] Edge cases: loading states, empty states, error states
- [ ] Components needing router context wrapped in `<MemoryRouter>`

### E2E Tests

- [ ] Test file in `playwright/` directory
- [ ] Uses relative URLs with `/apps/scheduler-ui` prefix
- [ ] Waits for page load before assertions
- [ ] No hardcoded timeouts — use Playwright's built-in waiting mechanisms
- [ ] Screenshots for debugging (via `page.screenshot()`)
