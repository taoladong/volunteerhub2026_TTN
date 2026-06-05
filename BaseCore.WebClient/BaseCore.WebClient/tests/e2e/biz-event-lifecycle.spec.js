// Test nghiệp vụ event lifecycle: Pending → Approved → Cancelled, RBAC, validation.
// Dùng test.describe.serial để giữ state event id giữa các step.
import { test, expect } from '@playwright/test';
import { apiAs, apiAnon } from './helpers/api-client.js';

test.describe.serial('Event lifecycle nghiệp vụ', () => {
  let organizerCtx;
  let adminCtx;
  let volunteerCtx;
  let anonCtx;
  let createdEventId;

  test.beforeAll(async () => {
    organizerCtx = await apiAs('organizer');
    adminCtx = await apiAs('admin');
    volunteerCtx = await apiAs('volunteer');
    anonCtx = await apiAnon();
  });

  test.afterAll(async () => {
    // Cleanup nếu event vẫn còn (ví dụ test cancel fail)
    if (createdEventId && organizerCtx) {
      await organizerCtx.put(`/api/events/${createdEventId}/cancel`, {
        data: { reason: 'E2E cleanup' },
      }).catch(() => {});
    }
    await organizerCtx?.dispose();
    await adminCtx?.dispose();
    await volunteerCtx?.dispose();
    await anonCtx?.dispose();
  });

  test('Organizer tạo event → status = Pending', async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7d
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // +4h
    const dto = {
      title: `[E2E] Test event ${Date.now()}`,
      description: 'Sự kiện test tự động bằng Playwright. Mô tả phải dài hơn 50 ký tự để pass validation.',
      location: 'Hà Nội',
      latitude: 21.0285,
      longitude: 105.8542,
      checkInRadiusKm: 0.5,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      minParticipants: 5,
      maxParticipants: 20,
      requiresKyc: false,
      categoryId: 1,
      requiredSkillIds: '[]',
    };
    const res = await organizerCtx.post('/api/events', { data: dto });
    expect(res.ok(), `Tạo event fail: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    createdEventId = body.id;
    expect(body.status).toBe('Pending');
  });

  test('Volunteer KHÔNG được approve event (RBAC)', async () => {
    const res = await volunteerCtx.put(`/api/events/${createdEventId}/approve`);
    expect([401, 403]).toContain(res.status());
  });

  test('Anon KHÔNG thấy event Pending trong /api/events public', async () => {
    const res = await anonCtx.get('/api/events');
    expect(res.ok()).toBeTruthy();
    const list = await res.json();
    const items = list.items || list;
    const found = items.find((e) => e.id === createdEventId);
    expect(found, 'Event Pending không được leak ra public').toBeFalsy();
  });

  test('Admin approve event → status = Approved', async () => {
    const res = await adminCtx.put(`/api/events/${createdEventId}/approve`);
    expect(res.ok(), `Approve fail: ${res.status()} ${await res.text()}`).toBeTruthy();
    const det = await organizerCtx.get(`/api/events/${createdEventId}`);
    const body = await det.json();
    expect(body.status).toBe('Approved');
  });

  test('Anon thấy event Approved (start trong tương lai)', async () => {
    const res = await anonCtx.get('/api/events');
    const list = await res.json();
    const items = list.items || list;
    const found = items.find((e) => e.id === createdEventId);
    expect(found, 'Event Approved phải hiển thị public').toBeTruthy();
  });

  test('Volunteer đăng ký event → có MyRegistrations', async () => {
    const reg = await volunteerCtx.post(`/api/events/${createdEventId}/register`, {
      data: {},
    });
    // 200/201 OK, 409 nếu đã đăng ký, 400 nếu thiếu KYC/skill
    expect([200, 201, 400, 409]).toContain(reg.status());

    const my = await volunteerCtx.get('/api/my-registrations');
    expect(my.ok()).toBeTruthy();
    const myList = await my.json();
    const items = myList.items || myList;
    if (reg.ok()) {
      const found = items.find((r) => r.eventId === createdEventId);
      expect(found, 'Phải thấy registration sau khi đăng ký').toBeTruthy();
    }
  });

  test('Volunteer KHÔNG được cancel event (chỉ Organizer/Admin)', async () => {
    const res = await volunteerCtx.put(`/api/events/${createdEventId}/cancel`, {
      data: { reason: 'test' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Organizer cancel event → status = Cancelled', async () => {
    const res = await organizerCtx.put(`/api/events/${createdEventId}/cancel`, {
      data: { reason: 'E2E cleanup' },
    });
    expect(res.ok(), `Cancel fail: ${await res.text()}`).toBeTruthy();
    const det = await organizerCtx.get(`/api/events/${createdEventId}`);
    const body = await det.json();
    expect(body.status).toBe('Cancelled');
    // Đã cancel xong → không cần afterAll cleanup
    createdEventId = null;
  });

  test('Approved → Cancelled phải bị ẩn khỏi /api/events', async () => {
    // Tạo và approve event mới rồi cancel để verify
    const start = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const created = await organizerCtx.post('/api/events', {
      data: {
        title: `[E2E-Hide] ${Date.now()}`,
        description: 'Sự kiện test ẩn sau khi cancel. Mô tả đủ dài để pass validation backend.',
        location: 'HN',
        latitude: 21.0285,
        longitude: 105.8542,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        minParticipants: 1,
        maxParticipants: 5,
        categoryId: 1,
        requiredSkillIds: '[]',
      },
    });
    if (!created.ok()) {
      test.skip(true, 'Không tạo được event setup');
      return;
    }
    const id = (await created.json()).id;
    await adminCtx.put(`/api/events/${id}/approve`);
    await organizerCtx.put(`/api/events/${id}/cancel`, { data: { reason: 'test ẩn' } });

    const res = await anonCtx.get('/api/events');
    const list = await res.json();
    const items = list.items || list;
    const found = items.find((e) => e.id === id);
    expect(found, 'Event Cancelled phải bị ẩn khỏi public').toBeFalsy();
  });
});

test.describe('Event validation nghiệp vụ', () => {
  let organizerCtx;

  test.beforeAll(async () => {
    organizerCtx = await apiAs('organizer');
  });

  test.afterAll(async () => {
    await organizerCtx?.dispose();
  });

  test('Reject EndDate trước StartDate', async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() - 60 * 60 * 1000);
    const dto = {
      title: '[E2E] Invalid dates',
      description: 'Test validation EndDate trước StartDate. Mô tả đủ dài để pass minLength.',
      location: 'HN',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      minParticipants: 1,
      maxParticipants: 5,
      categoryId: 1,
      requiredSkillIds: '[]',
    };
    const res = await organizerCtx.post('/api/events', { data: dto });
    expect(res.ok(), 'API phải reject khi EndDate < StartDate').toBeFalsy();
  });

  test('Reject MinParticipants > MaxParticipants', async () => {
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const dto = {
      title: '[E2E] Invalid participants',
      description: 'Test validation min > max. Mô tả đủ dài để pass minLength validation.',
      location: 'HN',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      minParticipants: 100,
      maxParticipants: 5,
      categoryId: 1,
      requiredSkillIds: '[]',
    };
    const res = await organizerCtx.post('/api/events', { data: dto });
    expect(res.ok(), 'API phải reject Min > Max').toBeFalsy();
  });
});
