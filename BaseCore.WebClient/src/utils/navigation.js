export function getDefaultRouteByRole(role) {
  switch (role) {
    case 'Organizer':
      return '/my-events';
    case 'Sponsor':
      return '/my-sponsorships';
    case 'Admin':
      return '/admin/events';
    case 'Volunteer':
    default:
      return '/dashboard';
  }
}
