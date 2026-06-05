import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for VolunteerHub WebClient.
 * Yêu cầu chạy trước khi test: ApiGateway (5000), AuthService (5002),
 * EventService (5003), FinanceService (5004), Vite dev server (3000).
 *
 * globalSetup login mỗi role 1 lần (qua API) và lưu storageState ở tests/.auth/<role>.json.
 * Test nào cần đăng nhập gọi `test.use({ storageState: 'tests/.auth/<role>.json' })`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1366, height: 820 },
    locale: 'vi-VN',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results',
});
