import { createClient } from '@/lib/supabase/server';
import { UserProfile, UserRole } from './roles';

export async function getUserRole(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user is staff
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, name, role, is_active')
    .eq('user_id', user.id)
    .single();

  if (staffData && staffData.is_active) {
    return {
      userId: user.id,
      email: user.email || '',
      role: staffData.role as UserRole,
      profileId: staffData.id,
      displayName: staffData.name,
      isActive: true,
    };
  }

  // Check if user is customer
  const { data: customerData } = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .single();

  if (customerData) {
    return {
      userId: user.id,
      email: user.email || '',
      role: 'customer',
      profileId: customerData.id,
      displayName: `${customerData.first_name} ${customerData.last_name}`,
      isActive: true,
    };
  }

  // User exists but has no role assigned yet
  return {
    userId: user.id,
    email: user.email || '',
    role: null,
    profileId: null,
    displayName: user.email?.split('@')[0] || null,
    isActive: false,
  };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  const profile = await getUserRole();

  if (!profile || !profile.role || !allowedRoles.includes(profile.role)) {
    throw new Error('Unauthorized');
  }

  return profile;
}

export async function requireAdmin(): Promise<UserProfile> {
  return requireRole(['admin', 'manager']);
}

export async function requireStaff(): Promise<UserProfile> {
  return requireRole(['admin', 'manager', 'captain', 'guide', 'front_desk']);
}

export async function requireCaptain(): Promise<UserProfile> {
  return requireRole(['captain']);
}
