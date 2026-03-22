import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { UserRole, ADMIN_ROLES, MANAGER_ROLES, STAFF_ROLES } from './roles';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: UserRole;
  staffId?: string;
  customerId?: string;
  locationId?: string;
  error?: string;
}

export async function getAuthUser(): Promise<AuthResult> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { authenticated: false, error: 'Not authenticated' };
  }

  // Check if user is staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, role, is_active, location_id')
    .eq('user_id', user.id)
    .single();

  if (staffData && staffData.is_active) {
    return {
      authenticated: true,
      userId: user.id,
      role: staffData.role as UserRole,
      staffId: staffData.id,
      locationId: staffData.location_id,
    };
  }

  // Check if user is customer
  const { data: customerData } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (customerData) {
    return {
      authenticated: true,
      userId: user.id,
      role: 'customer',
      customerId: customerData.id,
    };
  }

  // User exists but has no role
  return {
    authenticated: true,
    userId: user.id,
  };
}

export async function requireAuth(): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  return auth;
}

export async function requireAdmin(): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  if (!auth.role || !ADMIN_ROLES.includes(auth.role)) {
    throw new Error('Forbidden: Admin access required');
  }

  return auth;
}

export async function requireStaff(): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  if (!auth.role || !STAFF_ROLES.includes(auth.role)) {
    throw new Error('Forbidden: Staff access required');
  }

  return auth;
}

export async function requireCaptain(): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  if (auth.role !== 'captain') {
    throw new Error('Forbidden: Captain access required');
  }

  return auth;
}

export async function requireManager(): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  if (!auth.role || !MANAGER_ROLES.includes(auth.role)) {
    throw new Error('Forbidden: Manager access required');
  }

  return auth;
}

export async function requireFrontDesk(): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  const frontDeskRoles: UserRole[] = ['admin', 'location_manager', 'front_desk'];
  if (!auth.role || !frontDeskRoles.includes(auth.role)) {
    throw new Error('Forbidden: Front desk access required');
  }

  return auth;
}

// Check if user can manage a specific role (role hierarchy)
export function canManageRole(managerRole: UserRole | undefined, targetRole: UserRole): boolean {
  if (!managerRole) return false;

  // Admin can manage anyone
  if (managerRole === 'admin') return true;

  // Location manager can manage front_desk, captain, affiliate
  if (managerRole === 'location_manager') {
    return ['front_desk', 'captain', 'affiliate'].includes(targetRole);
  }

  // No one else can manage staff
  return false;
}

// Check if user can access a specific location's data
export async function requireLocationAccess(locationId: string): Promise<AuthResult> {
  const auth = await getAuthUser();

  if (!auth.authenticated) {
    throw new Error('Unauthorized');
  }

  // Admins can access all locations
  if (auth.role === 'admin') {
    return auth;
  }

  // Other staff can only access their assigned location
  if (auth.locationId !== locationId) {
    throw new Error('Forbidden: No access to this location');
  }

  return auth;
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
