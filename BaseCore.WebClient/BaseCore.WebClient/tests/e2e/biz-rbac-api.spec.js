// Test RBAC ở API layer cho các endpoint nhạy cảm.
import { test, expect } from '@playwright/test';
import { apiAs, apiAnon } from './helpers/api-client.js';

let anonCtx;
let volunteerCtx;
let organizerCtx;
let sponsorCtx;
let adminCtx;

test.beforeAll(async () => {
  anonCtx = await apiAnon();
  volunteerCtx = await apiAs('volunteer');
  organizerCtx = await apiAs('organizer');
  sponsorCtx = await apiAs('sponsor');
  adminCtx = await apiAs('admin');
});

test.afterAll(async () => {
  await anonCtx?.dispose();
  await volunteerCtx?.dispose();
  await organizerCtx?.dispose();
  await sponsorCtx?.dispose();
  await adminCtx?.dispose();
});

test.describe('API RBAC · admin endpoints', () => {
  test('Anon GET /api/admin/users → 401', async () => {
    const res = await anonCtx.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });

  test('Volunteer GET /api/admin/users → 403', async () => {
    const res = await volunteerCtx.get('/api/admin/users');
    expect(res.status()).toBe(403);
  });

  test('Organizer GET /api/admin/users → 403', async () => {
    const res = await organizerCtx.get('/api/admin/users');
    expect(res.status()).toBe(403);
  });

  test('Sponsor GET /api/admin/users → 403', async () => {
    const res = await sponsorCtx.get('/api/admin/users');
    expect(res.status()).toBe(403);
  });

  test('Admin GET /api/admin/users → 200', async () => {
    const res = await adminCtx.get('/api/admin/users');
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('API RBAC · organizer endpoints', () => {
  test('Volunteer GET /api/events/my → 403', async () => {
    const res = await volunteerCtx.get('/api/events/my');
    expect([401, 403]).toContain(res.status());
  });

  test('Organizer GET /api/events/my → 200', async () => {
    const res = await organizerCtx.get('/api/events/my');
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('API RBAC · public read', () => {
  test('Anon GET /api/events → 200 (public)', async () => {
    const res = await anonCtx.get('/api/events');
    expect(res.ok()).toBeTruthy();
  });

  test('Anon GET /api/event-categories → 200 (public)', async () => {
    const res = await anonCtx.get('/api/event-categories');
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('API RBAC · auth endpoints', () => {
  test('Anon GET /api/auth/me → 401', async () => {
    const res = await anonCtx.get('/api/auth/me');
    expect(res.status()).toBe(401);
  });

  test('Volunteer GET /api/auth/me → 200 với role Volunteer', async () => {
    const res = await volunteerCtx.get('/api/auth/me');
    expect(res.ok()).toBeTruthy();
    const me = await res.json();
    expect(me.role).toBe('Volunteer');
  });

  test('Admin GET /api/auth/me → role Admin', async () => {
    const res = await adminCtx.get('/api/auth/me');
    expect(res.ok()).toBeTruthy();
    const me = await res.json();
    expect(me.role).toBe('Admin');
  });
});
