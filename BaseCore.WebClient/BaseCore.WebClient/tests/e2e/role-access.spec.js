// Test phân quyền: role X không vào được route của role Y.
import { test, expect } from '@playwright/test';
import { storageStateFor } from './helpers/auth.js';

test.describe('RBAC · volunteer', () => {
  test.use({ storageState: storageStateFor('volunteer') });

  test('Volunteer không vào được /admin/users', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/admin\/users/);
  });

  test('Volunteer không vào được /my-events (organizer)', async ({ page }) => {
    await page.goto('/my-events');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/my-events$/);
  });
});

test.describe('RBAC · organizer', () => {
  test.use({ storageState: storageStateFor('organizer') });

  test('Organizer không vào được /admin/events', async ({ page }) => {
    await page.goto('/admin/events');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/admin\/events$/);
  });

  test('Organizer vào được /events/create', async ({ page }) => {
    await page.goto('/events/create');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/events\/create/);
  });
});

test.describe('RBAC · sponsor', () => {
  test.use({ storageState: storageStateFor('sponsor') });

  test('Sponsor không vào được /profile (volunteer-only)', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/profile$/);
  });
});

test.describe('RBAC · admin', () => {
  test.use({ storageState: storageStateFor('admin') });

  test('Admin vào được /admin/users', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/users/);
  });
});
