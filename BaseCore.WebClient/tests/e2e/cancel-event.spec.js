import { test, expect } from '@playwright/test';
import { storageStateFor } from './helpers/auth.js';

// Test reproduction của lỗi "không bấm được nút Hủy sự kiện" trên trang ManageEvent.
// File: BaseCore.WebClient/src/pages/organizer/ManageEvent.jsx
test.describe('Organizer · Hủy sự kiện', () => {
  test.use({ storageState: storageStateFor('organizer') });

  test('Modal mở khi bấm nút Hủy sự kiện', async ({ page }) => {
    // Phải vào 1 trang same-origin trước khi truy cập localStorage.
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Lấy danh sách event của organizer qua API.
    const events = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/events/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    });

    expect(events).toBeTruthy();
    const list = Array.isArray(events) ? events : events?.items ?? events?.data ?? [];
    const target = list.find((e) => e.status === 'Pending' || e.status === 'Approved');

    test.skip(!target, 'Không có event Pending/Approved để test hủy');

    await page.goto(`/events/${target.id}/manage`);
    await page.waitForLoadState('networkidle');

    const cancelBtn = page.getByRole('button', { name: /hủy sự kiện/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 10_000 });
    await expect(cancelBtn).toBeEnabled();

    await cancelBtn.click();

    const modalTitle = page.getByRole('heading', { name: /hủy sự kiện/i });
    await expect(modalTitle, 'Modal phải mở sau khi click').toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: 'test-results/cancel-event-modal.png', fullPage: true });
  });
});
