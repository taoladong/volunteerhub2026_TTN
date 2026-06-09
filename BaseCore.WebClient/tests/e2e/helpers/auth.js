// Helper login dùng chung cho Playwright tests.
// Demo accounts (theo conventions của repo):
//   admin/admin123, organizer/organizer123, volunteer/volunteer123, sponsor/sponsor123
import { expect } from '@playwright/test';

export const ACCOUNTS = {
  admin: { username: 'admin', password: 'admin123' },
  organizer: { username: 'organizer', password: 'organizer123' },
  volunteer: { username: 'volunteer', password: 'volunteer123' },
  sponsor: { username: 'sponsor', password: 'sponsor123' },
};

/**
 * Đường dẫn storageState đã được globalSetup tạo sẵn.
 * Test có thể dùng:
 *   test.use({ storageState: storageStateFor('organizer') });
 */
export function storageStateFor(role) {
  return `tests/.auth/${role}.json`;
}

/**
 * Đăng nhập qua UI (chỉ dùng khi cần test luồng login UI cụ thể).
 * Form login dùng input "identifier" (email hoặc username) + password.
 * Mặc định các test nên dùng storageState (đã login sẵn) thay vì hàm này.
 */
export async function login(page, role = 'organizer') {
  const acc = ACCOUNTS[role];
  if (!acc) throw new Error(`Unknown role: ${role}`);

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.locator('input[type="text"]').first().fill(acc.username);
  await page.locator('input[type="password"]').first().fill(acc.password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
    page.locator('button[type="submit"]').first().click(),
  ]);

  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token, 'token phải được lưu sau khi login').toBeTruthy();
}
