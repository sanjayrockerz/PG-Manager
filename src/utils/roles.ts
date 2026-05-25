import type { UserRole } from '../services/supabaseData';

export const SUPPORTED_USER_ROLES: readonly UserRole[] = [
  'owner',
  'owner_manager',
  'staff',
  'tenant',
  'platform_admin',
  'admin',
  'super_admin',
] as const;

const PLATFORM_ADMIN_ROLES: readonly UserRole[] = ['platform_admin', 'admin', 'super_admin'];

export function isSupportedUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (SUPPORTED_USER_ROLES as readonly string[]).includes(value);
}

export function isPlatformAdminRole(role: string | null | undefined): boolean {
  return typeof role === 'string' && (PLATFORM_ADMIN_ROLES as readonly string[]).includes(role);
}

export function isScopedOwnerRole(role: string | null | undefined): role is 'owner_manager' | 'staff' {
  return role === 'owner_manager' || role === 'staff';
}

export function displayRoleToProfileRole(displayRole: 'viewer' | 'editor' | 'manager'): 'owner_manager' | 'staff' {
  return displayRole === 'manager' ? 'owner_manager' : 'staff';
}
