export type UserRole = 'admin' | 'manager' | 'captain' | 'guide' | 'front_desk' | 'customer';

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole | null;
  profileId: string | null;
  displayName: string | null;
  isActive: boolean;
}

export const ADMIN_ROLES: UserRole[] = ['admin', 'manager'];
export const STAFF_ROLES: UserRole[] = ['admin', 'manager', 'captain', 'guide', 'front_desk'];

export function isAdminRole(role: UserRole | null): boolean {
  return role !== null && ADMIN_ROLES.includes(role);
}

export function isStaffRole(role: UserRole | null): boolean {
  return role !== null && STAFF_ROLES.includes(role);
}

export function isCaptainRole(role: UserRole | null): boolean {
  return role === 'captain';
}

export function isCustomerRole(role: UserRole | null): boolean {
  return role === 'customer';
}

// Route access configuration
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  // Admin-only routes
  '/dashboard/tours': ['admin', 'manager'],
  '/dashboard/staff': ['admin', 'manager'],
  '/dashboard/settings': ['admin', 'manager'],
  '/dashboard/reports': ['admin', 'manager'],
  '/dashboard/communications': ['admin', 'manager'],
  '/dashboard/customers': ['admin', 'manager', 'front_desk'],

  // Staff routes (all staff can access)
  '/dashboard': ['admin', 'manager', 'captain', 'guide', 'front_desk'],
  '/dashboard/calendar': ['admin', 'manager', 'captain', 'guide', 'front_desk'],
  '/dashboard/bookings': ['admin', 'manager', 'captain', 'guide', 'front_desk'],
  '/dashboard/manifest': ['admin', 'manager', 'captain', 'guide'],

  // Captain-specific routes
  '/captain': ['captain'],
  '/captain/tours': ['captain'],
  '/captain/manifest': ['captain'],

  // Customer routes
  '/account': ['customer'],
  '/account/bookings': ['customer'],
  '/account/profile': ['customer'],
};

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;

  // Find the most specific matching route
  const matchingRoutes = Object.keys(ROUTE_ACCESS)
    .filter(route => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) {
    // If no specific route config, allow staff to access dashboard routes
    if (pathname.startsWith('/dashboard')) {
      return isStaffRole(role);
    }
    // Allow customers to access account routes
    if (pathname.startsWith('/account')) {
      return role === 'customer';
    }
    // Allow captain routes for captains
    if (pathname.startsWith('/captain')) {
      return role === 'captain';
    }
    return true;
  }

  const allowedRoles = ROUTE_ACCESS[matchingRoutes[0]];
  return allowedRoles.includes(role);
}

export function getDefaultRedirect(role: UserRole | null): string {
  if (!role) return '/login';

  switch (role) {
    case 'admin':
    case 'manager':
    case 'guide':
    case 'front_desk':
      return '/dashboard';
    case 'captain':
      return '/captain';
    case 'customer':
      return '/account';
    default:
      return '/';
  }
}
