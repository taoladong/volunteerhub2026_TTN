// Test toàn bộ routes của frontend: load được, không lỗi runtime, không mojibake.
// Dùng storageState (login sẵn từ globalSetup) để tránh rate-limit login.
import { test, expect } from '@playwright/test';
import { storageStateFor } from './helpers/auth.js';
import { PUBLIC_ROUTES, ROUTES_BY_ROLE } from './helpers/routes.js';
import { detectMojibake, collectConsoleErrors, filterIgnorableErrors } from './helpers/page-utils.js';

test.describe('Public routes · load + mojibake', () => {
  for (const r of PUBLIC_ROUTES) {
    test(`Public · ${r.name} (${r.path})`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      expect(response, 'Phản hồi HTTP phải tồn tại').toBeTruthy();
      expect(response.ok(), `HTTP status không OK: ${response.status()}`).toBeTruthy();

      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

      const { hasMojibake, samples } = await detectMojibake(page);
      if (hasMojibake) console.log(`MOJIBAKE on ${r.path}:`, samples);
      expect(hasMojibake, `Mojibake trên ${r.path}: ${samples.join(' | ')}`).toBeFalsy();

      const fatal = filterIgnorableErrors(errors);
      expect(fatal, `Console errors trên ${r.path}: ${fatal.join(' || ')}`).toEqual([]);
    });
  }
});

for (const role of Object.keys(ROUTES_BY_ROLE)) {
  test.describe(`${role} routes · load + mojibake`, () => {
    test.use({ storageState: storageStateFor(role) });

    for (const r of ROUTES_BY_ROLE[role]) {
      test(`${role} · ${r.name} (${r.path})`, async ({ page }) => {
        const errors = collectConsoleErrors(page);
        await page.goto(r.path, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});

        // Không bị redirect về login (route được phép cho role này).
        await expect(page).not.toHaveURL(/\/login/);

        const { hasMojibake, samples } = await detectMojibake(page);
        if (hasMojibake) console.log(`MOJIBAKE [${role}] ${r.path}:`, samples);
        expect(hasMojibake, `Mojibake trên ${r.path}: ${samples.join(' | ')}`).toBeFalsy();

        const fatal = filterIgnorableErrors(errors);
        expect(fatal, `Console errors trên ${r.path}: ${fatal.join(' || ')}`).toEqual([]);
      });
    }
  });
}
