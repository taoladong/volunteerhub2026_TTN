// Login mỗi role 1 lần qua API rồi lưu localStorage state vào file.
// Mỗi test sau load file đó qua "storageState", không cần login lại → tránh rate-limit 8 req/min.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, request } from '@playwright/test';
import { ACCOUNTS } from './helpers/auth.js';

const STORAGE_DIR = path.resolve('tests/.auth');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export const storageStatePath = (role) => path.join(STORAGE_DIR, `${role}.json`);

export default async function globalSetup() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

  // Kiểm tra xem tất cả storageState đã tồn tại chưa (từ run trước).
  // Nếu đã có đủ → skip login để tránh rate-limit.
  const allExist = Object.keys(ACCOUNTS).every((role) =>
    fs.existsSync(storageStatePath(role))
  );
  if (allExist) {
    console.log('[globalSetup] Reusing existing storageState files (skip login)');
    return;
  }

  const apiContext = await request.newContext({ baseURL: BASE_URL });

  for (const role of Object.keys(ACCOUNTS)) {
    const acc = ACCOUNTS[role];
    const res = await apiContext.post('/api/auth/login', {
      data: { username: acc.username, password: acc.password },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`Login failed for ${role}: ${res.status()} ${body}`);
    }
    // Response shape: { token, accessToken, refreshToken, expiresIn, user: {...} }
    const data = await res.json();
    const token = data.token || data.accessToken;
    const refreshToken = data.refreshToken;
    const user = data.user;

    if (!token || !user || !user.role) {
      throw new Error(`Login response missing token/user/role for ${role}: ${JSON.stringify(data)}`);
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await page.goto('/');
    await page.evaluate(
      ([t, rt, u]) => {
        localStorage.setItem('token', t);
        if (rt) localStorage.setItem('refreshToken', rt);
        localStorage.setItem('user', JSON.stringify(u));
      },
      [token, refreshToken, user]
    );
    await context.storageState({ path: storageStatePath(role) });
    await browser.close();
    console.log(`[globalSetup] ${role} → token saved (role=${user.role})`);
  }

  await apiContext.dispose();
}
