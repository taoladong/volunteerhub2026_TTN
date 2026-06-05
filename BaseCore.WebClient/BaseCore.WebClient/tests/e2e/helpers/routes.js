// Tổng hợp tất cả route trong App.jsx + role được phép truy cập.
// Dùng cho test "smoke load all pages".

export const PUBLIC_ROUTES = [
  { path: '/', name: 'Landing' },
  { path: '/events', name: 'Public events' },
  { path: '/events/1', name: 'Public event detail #1' },
  { path: '/verify/check', name: 'Verify certificate' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
];

export const SHARED_AUTH_ROUTES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/notifications', name: 'Notifications' },
];

export const VOLUNTEER_ROUTES = [
  { path: '/profile', name: 'Volunteer · MyProfile' },
  { path: '/profile/passport', name: 'Volunteer · Passport' },
  { path: '/my-registrations', name: 'Volunteer · MyRegistrations' },
  { path: '/my-donations', name: 'Volunteer · MyDonations' },
  { path: '/my-badges', name: 'Volunteer · MyBadges' },
  { path: '/my-certificates', name: 'Volunteer · MyCertificates' },
];

export const ORGANIZER_ROUTES = [
  { path: '/my-events', name: 'Organizer · MyEvents' },
  { path: '/events/create', name: 'Organizer · EventForm create' },
  { path: '/organizer/verification', name: 'Organizer · Verification' },
  { path: '/organizer/insights', name: 'Organizer · Insights' },
];

export const SPONSOR_ROUTES = [
  { path: '/my-sponsorships', name: 'Sponsor · MySponsorships' },
  { path: '/sponsor/profile', name: 'Sponsor · SponsorProfile' },
];

export const ADMIN_ROUTES = [
  { path: '/admin/events', name: 'Admin · Events' },
  { path: '/admin/organizer-verifications', name: 'Admin · Organizer verifications' },
  { path: '/admin/volunteer-verifications', name: 'Admin · Volunteer verifications' },
  { path: '/admin/users', name: 'Admin · Users' },
  { path: '/admin/categories', name: 'Admin · Categories' },
  { path: '/admin/skills', name: 'Admin · Skills' },
  { path: '/admin/ratings', name: 'Admin · Ratings' },
  { path: '/admin/monitoring', name: 'Admin · Monitoring' },
  { path: '/admin/export', name: 'Admin · Export' },
];

export const ROUTES_BY_ROLE = {
  volunteer: [...SHARED_AUTH_ROUTES, ...VOLUNTEER_ROUTES],
  organizer: [...SHARED_AUTH_ROUTES, ...ORGANIZER_ROUTES],
  sponsor: [...SHARED_AUTH_ROUTES, ...SPONSOR_ROUTES],
  admin: [...SHARED_AUTH_ROUTES, ...ADMIN_ROUTES],
};
