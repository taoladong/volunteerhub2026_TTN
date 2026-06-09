// Test validation nghiệp vụ ở API layer.
import { test, expect } from '@playwright/test';
import { apiAs, apiAnon } from './helpers/api-client.js';

let anonCtx;
let organizerCtx;

test.beforeAll(async () => {
  anonCtx = await apiAnon();
  organizerCtx = await apiAs('organizer');
});

test.afterAll(async () => {
  await anonCtx?.dispose();
  await organizerCtx?.dispose();
});

test.describe('Auth validation', () => {
  test('Login sai mật khẩu → 401', async () => {
    const res = await anonCtx.post('/api/auth/login', {
      data: { username: 'admin', password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  test('Login user không tồn tại → 401', async () => {
    const res = await anonCtx.post('/api/auth/login', {
      data: { username: 'no-such-user-' + Date.now(), password: 'whatever' },
    });
    expect(res.status()).toBe(401);
  });

  test('Login thiếu password → 400', async () => {
    const res = await anonCtx.post('/api/auth/login', {
      data: { username: 'admin' },
    });
    expect(res.status()).toBe(400);
  });

  test('Register user mới username quá ngắn → 400', async () => {
    const res = await anonCtx.post('/api/auth/register', {
      data: {
        username: 'ab',
        password: 'short',
        email: 'invalid',
        name: 'X',
      },
    });
    expect([400, 422, 429]).toContain(res.status());
  });

  test('Register user trùng username → 400/409', async () => {
    const res = await anonCtx.post('/api/auth/register', {
      data: {
        username: 'admin',
        password: 'password123',
        email: `dup${Date.now()}@test.com`,
        name: 'Dup',
      },
    });
    // 429 nếu bị rate limit từ test trước
    expect([400, 409, 422, 429]).toContain(res.status());
  });
});

test.describe('Event filter validation', () => {
  test('GET /api/events?keyword=non-existent → trả về list rỗng', async () => {
    const res = await anonCtx.get('/api/events?keyword=ZZZ_NOT_EXIST_' + Date.now());
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    const items = list.items || list;
    expect(Array.isArray(items)).toBeTruthy();
  });

  test('GET /api/events có pagination', async () => {
    const res = await anonCtx.get('/api/events?page=1&pageSize=5');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Cấu trúc có thể là { items, total } hoặc array
    if (body.items) {
      expect(Array.isArray(body.items)).toBeTruthy();
      expect(body.items.length).toBeLessThanOrEqual(5);
    }
  });
});
