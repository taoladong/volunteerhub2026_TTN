import { test, expect } from '@playwright/test';
import { storageStateFor, ACCOUNTS } from './helpers/auth.js';

// Smoke tests cơ bản — public pages + verify login state qua storageState.
test.describe('Smoke · public', () => {
  test('Landing page render được', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/volunteerhub/i);
    await page.screenshot({ path: 'test-results/landing.png', fullPage: true });
  });

  test('Public events page render', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Smoke · auth state cached', () => {
  for (const role of Object.keys(ACCOUNTS)) {
    test.describe(`role ${role}`, () => {
      test.use({ storageState: storageStateFor(role) });

      test(`${role} có token đã lưu`, async ({ page }) => {
        await page.goto('/');
        const token = await page.evaluate(() => localStorage.getItem('token'));
        expect(token).toBeTruthy();
      });
    });
  }
});
