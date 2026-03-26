export type UserRole = 'admin' | 'location_manager' | 'captain' | 'front_desk' | 'affiliate' | 'customer';

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole | null;
  profileId: string | null;
  displayName: string | null;
  isActive: boolean;
}

export const ADMIN_ROLES: UserRole[] = ['admin'];
export const MANAGER_ROLES: UserRole[] = ['admin', 'location_manager'];
export const STAFF_ROLES: UserRole[] = ['admin', 'location_manager', 'captain', 'front_desk'];
export const AFFILIATE_ROLES: UserRole[] = ['affiliate'];

export function isAdminRole(role: UserRole | null): boolean {
  return role === 'admin';
}

export function isManagerRole(role: UserRole | null): boolean {
  return role !== null && MANAGER_ROLES.includes(role);
}

export function isLocationManager(role: UserRole | null): boolean {
  return role === 'location_manager';
}

export function isStaffRole(role: UserRole | null): boolean {
  return role !== null && STAFF_ROLES.includes(role);
}

export function isCaptainRole(role: UserRole | null): boolean {
  return role === 'captain';
}

export function isAffiliateRole(role: UserRole | null): boolean {
  return role === 'affiliate';
}

export function isCustomerRole(role: UserRole | null): boolean {
  return role === 'customer';
}

// Route access configuration
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  // Admin-only routes
  '/dashboard/settings': ['admin'],

  // Admin and Location Manager routes (front_desk cannot access these)
  '/dashboard/tours': ['admin', 'location_manager'],
  '/dashboard/staff': ['admin', 'location_manager'],
  '/dashboard/communications': ['admin', 'location_manager'],
  '/dashboard/customers': ['admin', 'location_manager'],
  '/dashboard/reviews': ['admin', 'location_manager'],
  '/dashboard/availability': ['admin', 'location_manager'],
  '/dashboard/pricing': ['admin', 'location_manager'],
  '/dashboard/waivers': ['admin', 'location_manager'],
  '/dashboard/fleet': ['admin', 'location_manager'],
  '/dashboard/locations': ['admin'],
  '/dashboard/checklists': ['admin', 'location_manager'],
  '/dashboard/compliance': ['admin', 'location_manager'],
  '/dashboard/widgets': ['admin', 'location_manager'],
  '/dashboard/analytics': ['admin', 'location_manager'],
  '/dashboard/inbox': ['admin', 'location_manager'],

  // Front desk routes (booking management and availability viewing only)
  '/dashboard': ['admin', 'location_manager', 'front_desk'],
  '/dashboard/calendar': ['admin', 'location_manager', 'front_desk'],
  '/dashboard/bookings': ['admin', 'location_manager', 'front_desk'],
  '/dashboard/manifest': ['admin', 'location_manager', 'front_desk'],

  // Captain-specific routes
  '/captain': ['captain'],
  '/captain/tours': ['captain'],
  '/captain/manifest': ['captain'],

  // Affiliate-specific routes
  '/dashboard/affiliate': ['affiliate'],
  '/dashboard/affiliate/qr-code': ['affiliate'],
  '/dashboard/affiliate/referrals': ['affiliate'],
  '/dashboard/affiliate/earnings': ['affiliate'],

  // Affiliate management routes (for admins and location managers)
  '/dashboard/affiliates': ['admin', 'location_manager'],

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
    case 'location_manager':
    case 'front_desk':
      return '/dashboard';
    case 'captain':
      return '/captain';
    case 'affiliate':
      return '/dashboard/affiliate';
    case 'customer':
      return '/account';
    default:
      return '/';
  }
}
