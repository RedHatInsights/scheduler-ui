import { test, expect } from '@playwright/test';

/**
 * E2E tests for scheduler-ui
 *
 * IMPORTANT:
 * - Use relative URLs (baseURL from playwright.config.ts is automatically prepended)
 * - The dev server is automatically started by Playwright before running tests
 */

test.describe('Scheduler UI - Smoke Test', () => {
  test('should load the application successfully', async ({ page }) => {
    console.log('Navigating to /apps/scheduler-ui');

    // Navigate to the scheduler app
    const response = await page.goto('/apps/scheduler-ui');

    console.log('Response status:', response?.status());
    console.log('Response URL:', response?.url());

    // Verify we get a successful response
    expect(response?.status()).toBe(200);

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Take a screenshot for debugging
    await page.screenshot({
      path: 'playwright/screenshots/scheduler-home.png',
      fullPage: true
    });

    console.log('Page title:', await page.title());

    // Verify the page has some content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);

    console.log('Page loaded successfully with', bodyText!.length, 'characters');
  });

  test('should have a valid page title', async ({ page }) => {
    await page.goto('/apps/scheduler-ui');
    await page.waitForLoadState('domcontentloaded');

    // Check that the page has a title
    const title = await page.title();
    console.log('Page title:', title);

    // This checks the title exists and isn't empty
    expect(title.length).toBeGreaterThan(0);
  });
});
