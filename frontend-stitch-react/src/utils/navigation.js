export const normalizeRole = (roleOrUser) => {
  const rawRole = typeof roleOrUser === 'object' && roleOrUser !== null
    ? roleOrUser.role
    : roleOrUser;
  const userType = typeof roleOrUser === 'object' && roleOrUser !== null
    ? roleOrUser.userType
    : undefined;

  if (typeof rawRole === 'string') {
    const normalized = rawRole.trim().toLowerCase();
    if (normalized === 'admin') return 'Admin';
    if (normalized === 'organizer') return 'Organizer';
    if (normalized === 'sponsor') return 'Sponsor';
    if (normalized === 'volunteer' || normalized === 'user') return 'Volunteer';
  }

  if (userType === 3) return 'Admin';
  if (userType === 1) return 'Organizer';
  if (userType === 2) return 'Sponsor';
  if (userType === 0) return 'Volunteer';

  return 'Volunteer';
};

export const getDefaultRouteByRole = (roleOrUser) => {
  switch (normalizeRole(roleOrUser)) {
    case 'Admin':
      return '/quan-tri';
    case 'Organizer':
      return '/to-chuc';
    case 'Sponsor':
      return '/tai-tro';
    case 'Volunteer':
    default:
      return '/tinh-nguyen';
  }
};

export const getDefaultPathForRole = getDefaultRouteByRole;

export const hasAllowedRole = (user, roles) => {
  if (!roles || roles.length === 0) return true;
  return roles.includes(normalizeRole(user));
};

export const ROLE_LABELS = {
  Admin: 'Quản trị viên',
  Organizer: 'Nhà tổ chức',
  Sponsor: 'Nhà tài trợ',
  Volunteer: 'Tình nguyện viên',
};
