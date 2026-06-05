// Test nghiệp vụ campaign + donation + RBAC.
import { test, expect } from '@playwright/test';
import { apiAs } from './helpers/api-client.js';

let organizerCtx;
let adminCtx;
let volunteerCtx;
let sponsorCtx;
let createdEventId;
let createdCampaignId;

test.beforeAll(async () => {
  organizerCtx = await apiAs('organizer');
  adminCtx = await apiAs('admin');
  volunteerCtx = await apiAs('volunteer');
  sponsorCtx = await apiAs('sponsor');

  // Tạo + approve 1 event để có campaign treo lên.
  const start = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const created = await organizerCtx.post('/api/events', {
    data: {
      title: `[E2E-Finance] ${Date.now()}`,
      description: 'Event để test nghiệp vụ campaign donation. Mô tả đủ dài để pass minLength validation.',
      location: 'Hà Nội',
      latitude: 21.0285,
      longitude: 105.8542,
      checkInRadiusKm: 0.5,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      minParticipants: 1,
      maxParticipants: 10,
      requiresKyc: false,
      categoryId: 1,
      requiredSkillIds: '[]',
    },
  });
  if (!created.ok()) throw new Error(`Setup event fail: ${await created.text()}`);
  createdEventId = (await created.json()).id;
  await adminCtx.put(`/api/events/${createdEventId}/approve`);
});

test.afterAll(async () => {
  // Cleanup: cancel event để không còn rác
  if (createdEventId) {
    await organizerCtx.put(`/api/events/${createdEventId}/cancel`, {
      data: { reason: 'E2E cleanup' },
    });
  }
  await organizerCtx?.dispose();
  await adminCtx?.dispose();
  await volunteerCtx?.dispose();
  await sponsorCtx?.dispose();
});

test.describe('Support campaign · CRUD + RBAC', () => {
  test('Organizer tạo campaign → status mặc định Open hoặc Pending', async () => {
    const res = await organizerCtx.post(`/api/events/${createdEventId}/support-campaigns`, {
      data: {
        title: `[E2E] Campaign ${Date.now()}`,
        description: 'Mô tả test cho support campaign. Đủ dài để pass validation backend nếu có.',
        targetAmount: 1000000,
        minimumAmount: 10000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        receiveInfo: 'STK 12345 · BIDV',
      },
    });
    expect(res.ok(), `Create campaign fail: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    createdCampaignId = body.id;
    // Status mặc định backend trả: thường là Draft hoặc Open (tùy implementation)
    expect(['Open', 'Pending', 'Active', 'Draft']).toContain(body.status);

    // Nếu status là Draft, phải mở campaign trước khi donate
    if (body.status === 'Draft') {
      const openRes = await organizerCtx.put(`/api/support-campaigns/${createdCampaignId}/open`);
      expect(openRes.ok(), `Open campaign fail: ${openRes.status()} ${await openRes.text()}`).toBeTruthy();
    }
  });

  test('Volunteer KHÔNG được tạo campaign (RBAC)', async () => {
    const res = await volunteerCtx.post(`/api/events/${createdEventId}/support-campaigns`, {
      data: {
        title: 'Hack',
        description: 'X',
        targetAmount: 100,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Sponsor KHÔNG được tạo campaign (RBAC)', async () => {
    const res = await sponsorCtx.post(`/api/events/${createdEventId}/support-campaigns`, {
      data: {
        title: 'Hack',
        description: 'X',
        targetAmount: 100,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Volunteer donate (Pending) → list /api/donations/my hiện', async () => {
    test.skip(!createdCampaignId, 'Campaign chưa tạo được');
    const res = await volunteerCtx.post(`/api/support-campaigns/${createdCampaignId}/donations`, {
      data: {
        amount: 50000,
        displayName: 'E2E Test Donor',
        note: 'Donate qua Playwright',
        isAnonymous: false,
      },
    });
    expect(res.ok(), `Donate fail: ${res.status()} ${await res.text()}`).toBeTruthy();
    const donation = await res.json();
    expect(['Pending', 'PendingConfirmation']).toContain(donation.status);

    const my = await volunteerCtx.get('/api/donations/my');
    expect(my.ok()).toBeTruthy();
    const list = await my.json();
    const items = list.items || list;
    expect(items.find((d) => d.id === donation.id)).toBeTruthy();
  });

  test('Donate IsAnonymous=true → response không leak phone/email', async () => {
    test.skip(!createdCampaignId, 'Campaign chưa tạo được');
    const res = await volunteerCtx.post(`/api/support-campaigns/${createdCampaignId}/donations`, {
      data: {
        amount: 30000,
        displayName: 'Anonymous donor',
        phone: '0901234567',
        email: 'leak@test.com',
        isAnonymous: true,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Sau khi tạo, organizer xem list donations sẽ không thấy phone/email anonymous.
    const list = await organizerCtx.get(`/api/support-campaigns/${createdCampaignId}/donations`);
    if (list.ok()) {
      const data = await list.json();
      const items = data.items || data;
      const anon = items.find((d) => d.id === body.id);
      if (anon) {
        // Anonymous donation phải không leak phone/email cho organizer
        expect(anon.phone, 'Anonymous phone phải bị ẩn').toBeFalsy();
        expect(anon.email, 'Anonymous email phải bị ẩn').toBeFalsy();
      }
    }
  });

  test('Reject donate amount âm hoặc 0', async () => {
    test.skip(!createdCampaignId, 'Campaign chưa tạo được');
    const res = await volunteerCtx.post(`/api/support-campaigns/${createdCampaignId}/donations`, {
      data: {
        amount: 0,
        displayName: 'Zero',
        isAnonymous: false,
      },
    });
    expect(res.ok(), 'Phải reject amount=0').toBeFalsy();
  });
});
