import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { UserRole, ADMIN_ROLES, STAFF_ROLES } from './roles';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: UserRole;
  staffId?: string;
  customerId?: string;
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
    .select('id, role, is_active')
    .eq('user_id', user.id)
    .single();

  if (staffData && staffData.is_active) {
    return {
      authenticated: true,
      userId: user.id,
      role: staffData.role as UserRole,
      staffId: staffData.id,
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

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
