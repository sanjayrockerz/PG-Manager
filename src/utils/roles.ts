import type { UserRole } from '../services/supabaseData';

// ─── Role Model ───────────────────────────────────────────────────────────────
//
// profiles.role has TWO distinct values for non-admin, non-tenant users:
//
//   'owner'
//     Independent PG owner. Queries are always scoped to their own data
//     (ownerId = profiles.id). They can create/delete properties, manage
//     subscriptions, and invite team members. A person with role='owner' can
//     ALSO be assigned to manage another owner's properties via
//     owner_user_property_scopes — in that case their workspace shows two
//     groups: "My Properties" (owned) and "Managing for Others" (scoped).
//
//   'owner_manager'
//     A property manager who has NO properties of their own. Their entire
//     data context is scoped to the owner who invited them
//     (ownerId = profiles.owner_scope_id). They cannot create properties or
//     manage billing. This role is ONLY used for people who are purely
//     operational staff for a single owner.
//
// IMPORTANT: When creating a team invite (inviteService.createInvite), we
// always store role:'owner' in owner_invites so that accepting the invite
// never downgrades an existing PG owner. The property-level access level
// (viewer / editor / manager) is captured in owner_user_property_scopes via
// display_role + capabilities — NOT in profiles.role.
//
// ─────────────────────────────────────────────────────────────────────────────

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

// Returns true for roles whose data context is scoped to another owner's ID
// (i.e. ownerId comes from owner_scope_id, not profile.id).
// Pure staff and legacy owner_manager accounts both qualify.
export function isScopedOwnerRole(role: string | null | undefined): role is 'owner_manager' | 'staff' {
  return role === 'owner_manager' || role === 'staff';
}

// Maps a UI-level display role to the profiles.role value written to the DB.
// NOT used for team invites any more (those always use 'owner' — see inviteService).
// Kept for backward-compatibility with any admin tooling that still calls it.
export function displayRoleToProfileRole(displayRole: 'viewer' | 'editor' | 'manager'): 'owner_manager' | 'staff' {
  return displayRole === 'manager' ? 'owner_manager' : 'staff';
}
