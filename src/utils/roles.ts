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

/** Returns true for the main owner (not scoped members) */
export function isOwnerRole(role: string | null | undefined): role is 'owner' {
  return role === 'owner';
}

/** Returns true for any user who operates within an owner scope */
export function isOwnerOrScoped(role: string | null | undefined): boolean {
  return role === 'owner' || isScopedOwnerRole(role);
}

/** Returns true if the user can manage team members (owner only) */
export function canManageTeam(role: string | null | undefined): boolean {
  return role === 'owner';
}

/** Returns true if the user can create/edit properties (owner only) */
export function canManageProperties(role: string | null | undefined): boolean {
  return role === 'owner';
}

/**
 * Map a display role label to the internal profile role.
 * Viewer → staff (read-only RLS)
 * Editor/Manager → owner_manager (write RLS based on capabilities)
 */
export function displayRoleToProfileRole(displayRole: 'viewer' | 'editor' | 'manager'): 'owner_manager' | 'staff' {
  return displayRole === 'viewer' ? 'staff' : 'owner_manager';
}

/**
 * Friendly label for a UserRole.
 */
export function roleLabel(role: UserRole | string | null | undefined): string {
  switch (role) {
    case 'owner': return 'Owner';
    case 'owner_manager': return 'Manager';
    case 'staff': return 'Viewer';
    case 'tenant': return 'Tenant';
    case 'platform_admin': return 'Platform Admin';
    case 'admin': return 'Admin';
    case 'super_admin': return 'Super Admin';
    default: return 'Unknown';
  }
}
