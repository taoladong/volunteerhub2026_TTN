// Test layout: footer, header, navigation.
import { test, expect } from '@playwright/test';
import { storageStateFor } from './helpers/auth.js';
import { detectMojibake } from './helpers/page-utils.js';

test.describe('Public layout · footer & branding', () => {
  test('Public footer thống nhất ở landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    const footerText = (await footer.innerText()).toLowerCase();
    expect(footerText).toMatch(/volunteerhub|tình nguyện|kỹ thuật quân sự/i);
  });

  test('Public footer thống nhất ở events page', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('Tên trường đúng "Học viện Kỹ thuật Quân sự"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    if (/học viện/i.test(body)) {
      expect(body).toMatch(/Học viện Kỹ thuật Quân sự/i);
      expect(body).not.toMatch(/Mật mã/i);
    }
  });

  test('Không có mojibake trên landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const { hasMojibake, samples } = await detectMojibake(page);
    expect(hasMojibake, samples.join(' | ')).toBeFalsy();
  });
});

test.describe('Auth layout · MainLayout', () => {
  test.use({ storageState: storageStateFor('volunteer') });

  test('MainLayout có sidebar/nav links', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const navLinks = page.locator('a[href="/events"], a[href="/notifications"], a[href="/dashboard"]');
    expect(await navLinks.count()).toBeGreaterThan(0);
  });
});
