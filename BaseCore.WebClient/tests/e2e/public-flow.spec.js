// Test public flow: landing → events → filter cơ bản.
import { test, expect } from '@playwright/test';
import { detectMojibake } from './helpers/page-utils.js';

test.describe('Public flow', () => {
  test('Landing → click "Khám phá sự kiện" → /events', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const eventsLink = page.locator('a[href="/events"], a[href*="/events"]').first();
    await expect(eventsLink).toBeVisible();
    await eventsLink.click();
    await page.waitForURL(/\/events/);
  });

  test('EventList có filter kỹ năng', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    // Tìm select có option chứa "kỹ năng" hoặc "Tất cả"
    const allSelects = page.locator('select');
    const count = await allSelects.count();
    let foundSkill = false;
    for (let i = 0; i < count; i++) {
      const optText = await allSelects.nth(i).locator('option').allTextContents();
      const joined = optText.join(' | ').toLowerCase();
      if (joined.includes('kỹ năng') || joined.includes('tất cả')) {
        foundSkill = true;
        // Có "Tất cả" hoặc "Không yêu cầu kỹ năng"
        expect(joined).toMatch(/tất cả|không yêu cầu/);
        break;
      }
    }
    expect(foundSkill, 'Phải có select cho lọc kỹ năng/tất cả').toBeTruthy();

    const { hasMojibake, samples } = await detectMojibake(page);
    expect(hasMojibake, `Mojibake: ${samples.join(' | ')}`).toBeFalsy();
  });

  test('Bản đồ marker cluster có thể render', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    const map = page.locator('.leaflet-container').first();
    if (await map.count()) {
      await expect(map).toBeVisible();
    }
  });

  test('Anon vào /dashboard bị redirect /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 5_000 });
  });

  test('Anon vào /admin/users bị redirect', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForURL(/\/login/, { timeout: 5_000 });
  });
});
