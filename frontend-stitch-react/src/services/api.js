import axios from 'axios';

const authStorage = {
  getToken: () => localStorage.getItem('token'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  getUser: () => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },
  setAuth: ({ token, refreshToken, user }) => {
    if (token) localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (config.skipAuth) {
    if (config.headers?.Authorization) delete config.headers.Authorization;
    return config;
  }

  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

const shouldSkipRefresh = (config = {}) => {
  const url = String(config.url || '');
  return config.skipAuthRefresh || url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
};

const refreshAccessToken = async () => {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', { refreshToken }, { skipAuth: true, skipAuthRefresh: true })
      .then((res) => {
        const payload = res.data;
        const nextToken = payload?.token || payload?.accessToken;
        if (!nextToken) throw new Error('Refresh failed');
        authStorage.setAuth({ token: nextToken, refreshToken: payload?.refreshToken, user: payload?.user });
        return nextToken;
      })
      .catch((err) => {
        const status = err?.response?.status;
        const currentRefreshToken = authStorage.getRefreshToken();

        // Chỉ clear session nếu lần refresh thất bại này vẫn đang dùng refresh token hiện tại.
        // Tránh request cũ dùng refresh token cũ đăng xuất nhầm session mới sau khi user vừa login lại.
        if ((status === 400 || status === 401 || status === 403) && currentRefreshToken === refreshToken) {
          authStorage.clear();
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
        throw err;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (status === 401 && message === 'Account is deactivated') {
      const failedAuthorization = originalRequest?.headers?.Authorization;
      const currentToken = authStorage.getToken();

      // Chỉ clear session nếu response lỗi thuộc đúng token hiện tại.
      // Tránh trường hợp request cũ của tài khoản đã khóa trả về sau khi user vừa đăng nhập bằng tài khoản khác.
      if (!currentToken || failedAuthorization === `Bearer ${currentToken}`) {
        authStorage.clear();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }

      return Promise.reject(error);
    }

    if (status !== 401 || !originalRequest || originalRequest._retry || shouldSkipRefresh(originalRequest)) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;
    try {
      const nextToken = await refreshAccessToken();
      originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${nextToken}` };
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export { authStorage };

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { email: identifier, password }, { skipAuth: true, skipAuthRefresh: true }),
  register: (data) => api.post('/auth/register', data, { skipAuth: true, skipAuthRefresh: true }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }, { skipAuth: true, skipAuthRefresh: true }),
  logout: (refreshToken) => api.post('/auth/logout', refreshToken ? { refreshToken } : undefined, { skipAuthRefresh: true }),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const eventApi = {
  getAll: (params, config = {}) => api.get('/events', { ...config, params }),
  getMine: () => api.get('/events/my'),
  getById: (id, config = {}) => api.get(`/events/${id}`, config),
  getRecommended: (config = {}) => api.get('/events/recommended', { skipAuthRefresh: true, ...config }),
  getImpact: (id) => api.get(`/events/${id}/impact`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  approve: (id) => api.put(`/events/${id}/approve`),
  reject: (id, data = {}) => api.put(`/events/${id}/reject`, data),
  complete: (id) => api.put(`/events/${id}/complete`),
  cancel: (id, reason) => api.put(`/events/${id}/cancel`, { reason }),
  resubmit: (id) => api.post(`/events/${id}/resubmit`),
  uncomplete: (id) => api.post(`/events/${id}/uncomplete`),
  rotateQr: (id) => api.post(`/events/${id}/qr/rotate`),
  getRegistrations: (id) => api.get(`/events/${id}/registrations`),
  getEventHistory: (id) => api.get(`/events/${id}/history`),
  getShifts: (id) => api.get(`/events/${id}/shifts`),
  createShift: (id, data) => api.post(`/events/${id}/shifts`, data),
  getShiftById: (eventId, shiftId) => api.get(`/events/${eventId}/shifts/${shiftId}`),
  updateShift: (eventId, shiftId, data) => api.put(`/events/${eventId}/shifts/${shiftId}`, data),
  deleteShift: (eventId, shiftId) => api.delete(`/events/${eventId}/shifts/${shiftId}`),
  transfer: (id, data) => api.put(`/events/${id}/transfer`, data),
  getOverduePreview: () => api.get('/events/overdue-preview'),
  autoCompleteOverdue: () => api.post('/events/auto-complete-overdue'),
};

export const registrationApi = {
  register: (eventId, data) => api.post(`/events/${eventId}/register`, data),
  withdraw: (eventId) => api.delete(`/events/${eventId}/register`),
  getMyRegistration: (eventId) => api.get(`/events/${eventId}/my-registration`),
  confirm: (eventId, regId) => api.put(`/events/${eventId}/registrations/${regId}/confirm`),
  cancel: (eventId, regId) => api.put(`/events/${eventId}/registrations/${regId}/cancel`),
  requestCancelRegistration: (eventId, reason) => api.post(`/events/${eventId}/register/cancel-request`, { reason }),
  walkIn: (eventId, data) => api.post(`/events/${eventId}/walk-in`, data),
  manualAttend: (eventId, regId, hours) => api.post(`/events/${eventId}/registrations/${regId}/manual-attend`, { hours }),
  checkOut: (eventId, regId) => api.post(`/events/${eventId}/registrations/${regId}/checkout`),
  adjustHours: (eventId, regId, hours) => api.put(`/events/${eventId}/registrations/${regId}/hours`, { hours }),
  checkin: (eventId, regId, data) => api.post(`/events/${eventId}/registrations/${regId}/checkin`, data),
  selfCheckin: (eventId, data) => api.post(`/events/${eventId}/self-checkin`, data),
  getMyRegistrations: () => api.get('/my-registrations'),
};

export const eventCategoryApi = {
  getAll: (config = {}) => api.get('/event-categories', config),
  create: (data) => api.post('/event-categories', data),
  update: (id, data) => api.put(`/event-categories/${id}`, data),
  delete: (id) => api.delete(`/event-categories/${id}`),
};

export const channelApi = {
  getAll: () => api.get('/channels'),
  getById: (id) => api.get(`/channels/${id}`),
  getPosts: (id, params) => api.get(`/channels/${id}/posts`, { params }),
  createPost: (id, data) => api.post(`/channels/${id}/posts`, data),
  updatePost: (id, postId, data) => api.put(`/channels/${id}/posts/${postId}`, data),
  deletePost: (id, postId) => api.delete(`/channels/${id}/posts/${postId}`),
  toggleLike: (id, postId) => api.post(`/channels/${id}/posts/${postId}/like`),
  togglePin: (id, postId) => api.post(`/channels/${id}/posts/${postId}/toggle-pin`),
  getMembers: (id, query) => api.get(`/channels/${id}/members`, { params: { query } }),
  getComments: (id, postId) => api.get(`/channels/${id}/posts/${postId}/comments`),
  addComment: (id, postId, data) => api.post(`/channels/${id}/posts/${postId}/comments`, data),
  deleteComment: (id, postId, commentId) => api.delete(`/channels/${id}/posts/${postId}/comments/${commentId}`),
  createPoll: (id, postId, data) => api.post(`/channels/${id}/posts/${postId}/poll`, data),
  votePoll: (id, pollId, optionId) => api.post(`/channels/${id}/polls/${pollId}/vote`, { optionId }),
  getPollResults: (id, pollId) => api.get(`/channels/${id}/polls/${pollId}/results`),
};

export const notificationApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const profileApi = {
  getMyProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  submitKyc: (data) => api.post('/profile/kyc', data),
  getPassport: () => api.get('/profile/passport'),
  getUserProfile: (userId) => api.get(`/profile/${userId}`),
};

export const skillApi = {
  getAll: () => api.get('/skills'),
  create: (data) => api.post('/skills', data),
  update: (id, data) => api.put(`/skills/${id}`, data),
  delete: (id) => api.delete(`/skills/${id}`),
};

export const profileSkillApi = {
  add: (data) => api.post('/profile/skills', data),
  submitVerification: (skillId, data) => api.put(`/profile/skills/${skillId}/verification`, data),
  remove: (skillId) => api.delete(`/profile/skills/${skillId}`),
};

export const certificateApi = {
  getMyCertificates: () => api.get('/certificates'),
  verify: (code) => api.get(`/certificates/${code}`),
  getPdfUrl: (code) => `/api/certificates/${encodeURIComponent(code)}/pdf`,
};

export const badgeApi = {
  getAll: () => api.get('/badges'),
  getMyBadges: () => api.get('/my-badges'),
};

export const ratingApi = {
  create: (eventId, data) => api.post(`/events/${eventId}/ratings`, data),
  getUserRatings: (userId) => api.get(`/users/${userId}/ratings`),
  getAdminRatings: (params = {}) => api.get('/admin/ratings', { params }),
  update: (id, data) => api.put(`/ratings/${id}`, data),
  hide: (id, reason) => api.put(`/ratings/${id}/hide`, { reason }),
  unhide: (id) => api.put(`/ratings/${id}/unhide`),
  delete: (id) => api.delete(`/ratings/${id}`),
};

export const sponsorApi = {
  getByEvent: (eventId) => api.get(`/events/${eventId}/sponsors`),
  addSponsor: (eventId, data) => api.post(`/events/${eventId}/sponsors`, data),
  getMySponsorships: () => api.get('/sponsors/my'),
  getMySponsorshipTracking: (id) => api.get(`/sponsors/my/${id}/tracking`),
};

export const sponsorProfileApi = {
  get: () => api.get('/sponsor/profile'),
  update: (data) => api.put('/sponsor/profile', data),
};

export const supportCampaignApi = {
  getAll: (params = {}) => api.get('/support-campaigns', { params }),
  getMine: () => api.get('/support-campaigns', { params: { mine: true } }),
  getByEvent: (eventId) => api.get('/support-campaigns', { params: { eventId } }),
  getById: (campaignId) => api.get(`/support-campaigns/${campaignId}`),
  create: (eventIdOrData, maybeData) => {
    if (maybeData === undefined) return api.post('/support-campaigns', eventIdOrData);
    return api.post('/support-campaigns', { ...maybeData, eventId: eventIdOrData });
  },
  update: (campaignId, data) => api.put(`/support-campaigns/${campaignId}`, data),
  open: (campaignId) => api.put(`/support-campaigns/${campaignId}/open`),
  close: (campaignId) => api.put(`/support-campaigns/${campaignId}/close`),
  cancel: (campaignId) => api.put(`/support-campaigns/${campaignId}/cancel`),
  report: (campaignId, data) => api.post(`/support-campaigns/${campaignId}/report`, data),
  getDonations: (campaignId) => api.get(`/support-campaigns/${campaignId}/donations`),
  donate: (campaignId, data) => api.post(`/support-campaigns/${campaignId}/donations`, data),
  getMyDonations: () => api.get('/donations/my'),
  confirmDonation: (donationId) => api.put(`/donations/${donationId}/confirm`),
  rejectDonation: (donationId, data = {}) => api.put(`/donations/${donationId}/reject`, data),
  cancelDonation: (donationId) => api.put(`/donations/${donationId}/cancel`),
};

export const sponsorshipProposalApi = {
  getSponsorUsers: () => api.get('/sponsors/users'),
  getByEvent: (eventId) => api.get(`/events/${eventId}/sponsorship-proposals`),
  getMy: () => api.get('/sponsorship-proposals/my'),
  organizerRequest: (eventId, data) => api.post(`/events/${eventId}/sponsorship-proposals/organizer-request`, data),
  sponsorOffer: (eventId, data) => api.post(`/events/${eventId}/sponsorship-proposals/sponsor-offer`, data),
  accept: (proposalId, data = {}) => api.put(`/sponsorship-proposals/${proposalId}/accept`, data),
  reject: (proposalId, data = {}) => api.put(`/sponsorship-proposals/${proposalId}/reject`, data),
  received: (proposalId, data) => api.put(`/sponsorship-proposals/${proposalId}/received`, data),
  cancel: (proposalId) => api.put(`/sponsorship-proposals/${proposalId}/cancel`),
  report: (proposalId, data) => api.post(`/sponsorship-proposals/${proposalId}/report`, data),
  adminRevertToPending: (id) => api.put(`/sponsorship-proposals/${id}/revert`),
};

export const uploadApi = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/file', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const organizerVerificationApi = {
  getMine: () => api.get('/organizer/verification'),
  submit: (data) => api.post('/organizer/verification', data),
};

export const userApi = {
  getVolunteerLookup: (params = {}) => api.get('/users/volunteers', { params }),
  getAll: (params = {}) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const categoryApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const rolesApi = {
  getAll: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`),
  getByUserType: (userType) => api.get(`/roles/by-user-type/${userType}`),
  getPermissions: (id) => api.get(`/roles/${id}/permissions`),
};

export const dashboardApi = {
  get: (config = {}) => api.get('/dashboard', { skipAuthRefresh: true, ...config }),
  getOrganizerInsights: (params = {}, config = {}) => api.get('/dashboard/organizer-insights', { params, ...config }),
};

export const adminApi = {
  getUsers: (params = {}) => {
    const { search, ...rest } = params;
    return api.get('/admin/users', { params: { ...rest, keyword: search } });
  },
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getOrganizerVerifications: (params = {}) => api.get('/admin/organizer-verifications', { params }),
  approveOrganizerVerification: (id, data = {}) => api.put(`/admin/organizer-verifications/${id}/approve`, data),
  rejectOrganizerVerification: (id, data = {}) => api.put(`/admin/organizer-verifications/${id}/reject`, data),
  requestOrganizerVerificationChanges: (id, data = {}) => api.put(`/admin/organizer-verifications/${id}/request-changes`, data),
  getVolunteerKycRequests: (params = {}) => api.get('/admin/volunteer-kyc', { params }),
  approveVolunteerKyc: (id, data = {}) => api.put(`/admin/volunteer-kyc/${id}/approve`, data),
  rejectVolunteerKyc: (id, data = {}) => api.put(`/admin/volunteer-kyc/${id}/reject`, data),
  getVolunteerSkillVerifications: (params = {}) => api.get('/admin/volunteer-skill-verifications', { params }),
  approveVolunteerSkill: (id, data = {}) => api.put(`/admin/volunteer-skill-verifications/${id}/approve`, data),
  rejectVolunteerSkill: (id, data = {}) => api.put(`/admin/volunteer-skill-verifications/${id}/reject`, data),
  getMonitoringHealth: () => api.get('/monitoring/health'),
  getMonitoringSummary: () => api.get('/admin/monitoring/summary'),
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
  getFinanceOverview: () => api.get('/admin/finance/overview'),
  createUser: (data) => api.post('/users', data),
  getStaleDonations: () => api.get('/admin/finance/stale-donations'),
  getUnreportedCampaigns: () => api.get('/admin/finance/unreported-campaigns'),
  getOpenProposalsPastEvent: () => api.get('/admin/finance/open-proposals-past-event'),
  cleanupAuditLogs: () => api.delete('/monitoring/audit-logs/cleanup'),
  exportEvents: (format) => api.get('/admin/export/events', { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' }),
  exportUsers: (format) => api.get('/admin/export/users', { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' }),
  exportFinance: (format) => api.get('/admin/export/finance', { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' }),
};

export default api;