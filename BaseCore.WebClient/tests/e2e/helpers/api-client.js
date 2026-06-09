// API client wrapper cho test nghiệp vụ.
// Đọc token từ storageState đã được globalSetup tạo sẵn → KHÔNG login thêm,
// tránh đụng rate-limit auth-sensitive (8 req/min/IP).
import fs from 'node:fs';
import path from 'node:path';
import { request } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const STORAGE_DIR = path.resolve('tests/.auth');

function readTokenFromStorageState(role) {
  const file = path.join(STORAGE_DIR, `${role}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Storage state for ${role} không tồn tại tại ${file}. globalSetup phải chạy trước.`
    );
  }
  const state = JSON.parse(fs.readFileSync(file, 'utf-8'));
  // storageState shape: { cookies: [], origins: [{ origin, localStorage: [{name, value}] }] }
  for (const o of state.origins || []) {
    const t = (o.localStorage || []).find((kv) => kv.name === 'token');
    if (t?.value) return t.value;
  }
  throw new Error(`Không tìm thấy token trong storage state của ${role}`);
}

/**
 * Tạo APIRequestContext có sẵn Authorization header cho role.
 * Caller chịu trách nhiệm dispose() khi xong.
 */
export async function apiAs(role) {
  const token = readTokenFromStorageState(role);
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Anonymous request context (chưa đăng nhập).
 */
export async function apiAnon() {
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  });
}
