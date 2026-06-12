import type { UserRole } from '../services/supabaseData';

// ─── Workspace Role Hierarchy ────────────────────────────────────────────────
//
//   workspace_owner  Full control — creates/edits properties, sees billing, manages team
//   manager          Operational control + workspace settings + scoped team management
//                    (no billing, no property creation)
//   editor           Operational access — tenants, maintenance, announcements
//                    (no settings, no team management)
//   viewer           Read-only across their assigned properties
//
// This type is used for UI/navigation decisions via WorkspaceContext.navWorkspaceRole.
// It is SEPARATE from profiles.role which is used for auth routing.
// ─────────────────────────────────────────────────────────────────────────────
export type WorkspaceRole = 'workspace_owner' | 'manager' | 'editor' | 'viewer';

// ─── Property-level access role (from property_access view) ─────────────────
// Kept for backward compatibility — per-property access still uses owner|manager|staff.
export type PropertyAccessRole = 'owner' | 'manager' | 'staff' | 'editor' | 'viewer';

// Every discrete action that requires a permission check
export type PermissionAction =
  // Page-level access
  | 'page:dashboard'
  | 'page:properties'
  | 'page:tenants'
  | 'page:payments'
  | 'page:maintenance'
  | 'page:announcements'
  | 'page:settings'
  | 'page:admin-section'
  | 'page:tenant-portal'
  | 'page:support'
  // Property management
  | 'properties:create'
  | 'properties:edit'
  | 'properties:delete'
  // Tenant management
  | 'tenants:create'
  | 'tenants:edit'
  | 'tenants:delete'
  // Payment management
  | 'payments:view'
  | 'payments:update-status'
  | 'payments:add-charge'
  // Maintenance
  | 'maintenance:create'
  | 'maintenance:update-status'
  | 'maintenance:add-note'
  // Announcements
  | 'announcements:create'
  | 'announcements:edit'
  | 'announcements:delete'
  | 'announcements:pin'
  // Settings — split into workspace (manager-accessible) vs billing (owner-only)
  | 'settings:view'
  | 'settings:edit'
  | 'settings:workspace'   // Profile + Legal tabs — accessible to managers
  | 'settings:billing'     // Payment, WhatsApp, Subscription — owner-only
  // Team management
  | 'team:view'            // Can see the Team Members page
  | 'team:manage'          // Full team management (owner only)
  | 'team:invite-scoped'   // Can invite editor/viewer (not manager) — for managers
  // Platform admin privileges
  | 'demo-mode:toggle'
  | 'admin:view-all-owners'
  | 'admin:impersonate'
  | 'admin:suspend-owner'
  | 'admin:manage-coupons'
  | 'admin:view-analytics'
  | 'admin:manage-referrals';

type PermissionMatrix = Partial<Record<PermissionAction, boolean>>;

const OWNER_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': true,
  'page:properties': true,
  'page:tenants': true,
  'page:payments': true,
  'page:maintenance': true,
  'page:announcements': true,
  'page:settings': true,
  'page:admin-section': false,
  'page:tenant-portal': false,
  'page:support': true,
  'properties:create': true,
  'properties:edit': true,
  'properties:delete': true,
  'tenants:create': true,
  'tenants:edit': true,
  'tenants:delete': true,
  'payments:view': true,
  'payments:update-status': true,
  'payments:add-charge': true,
  'maintenance:create': true,
  'maintenance:update-status': true,
  'maintenance:add-note': true,
  'announcements:create': true,
  'announcements:edit': true,
  'announcements:delete': true,
  'announcements:pin': true,
  'settings:view': true,
  'settings:edit': true,
  'settings:workspace': true,
  'settings:billing': true,
  'team:view': true,
  'team:manage': true,
  'team:invite-scoped': true,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

// Elevated manager — operational peer + workspace settings + scoped team management.
// Maps to workspace_role = 'manager'. Used both as profiles.role = 'owner_manager'
// and as the workspace-level matrix for hasWorkspacePermission('manager', ...).
const MANAGER_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': true,
  'page:properties': true,
  'page:tenants': true,
  'page:payments': true,
  'page:maintenance': true,
  'page:announcements': true,
  'page:settings': true,    // Settings page is visible; Settings.tsx restricts tabs
  'page:admin-section': false,
  'page:tenant-portal': false,
  'page:support': true,
  'properties:create': false,  // Managers manage assigned properties, not create new ones
  'properties:edit': false,
  'properties:delete': false,
  'tenants:create': true,
  'tenants:edit': true,
  'tenants:delete': true,
  'payments:view': true,
  'payments:update-status': true,
  'payments:add-charge': true,
  'maintenance:create': true,
  'maintenance:update-status': true,
  'maintenance:add-note': true,
  'announcements:create': true,
  'announcements:edit': true,
  'announcements:delete': true,
  'announcements:pin': false,
  'settings:view': false,
  'settings:edit': false,
  'settings:workspace': true,  // Profile + Legal
  'settings:billing': false,   // No billing access
  'team:view': true,           // Can see team page
  'team:manage': false,        // Cannot manage the full team
  'team:invite-scoped': true,  // Can invite editor/viewer within their property scope
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

// Legacy alias — owner_manager profile role maps to manager permissions
const OWNER_MANAGER_PERMISSIONS = MANAGER_PERMISSIONS;

// Editor — operational access without settings or team management
const EDITOR_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': true,
  'page:properties': true,
  'page:tenants': true,
  'page:payments': true,
  'page:maintenance': true,
  'page:announcements': true,
  'page:settings': false,
  'page:admin-section': false,
  'page:tenant-portal': false,
  'page:support': false,
  'properties:create': false,
  'properties:edit': false,
  'properties:delete': false,
  'tenants:create': true,
  'tenants:edit': true,
  'tenants:delete': false,
  'payments:view': true,
  'payments:update-status': false,
  'payments:add-charge': false,
  'maintenance:create': true,
  'maintenance:update-status': true,
  'maintenance:add-note': true,
  'announcements:create': true,
  'announcements:edit': false,
  'announcements:delete': false,
  'announcements:pin': false,
  'settings:view': false,
  'settings:edit': false,
  'settings:workspace': false,
  'settings:billing': false,
  'team:view': false,
  'team:manage': false,
  'team:invite-scoped': false,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

// Viewer — read-only across assigned properties
const VIEWER_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': true,
  'page:properties': true,
  'page:tenants': true,
  'page:payments': false,
  'page:maintenance': true,
  'page:announcements': true,
  'page:settings': false,
  'page:admin-section': false,
  'page:tenant-portal': false,
  'page:support': false,
  'properties:create': false,
  'properties:edit': false,
  'properties:delete': false,
  'tenants:create': false,
  'tenants:edit': false,
  'tenants:delete': false,
  'payments:view': false,
  'payments:update-status': false,
  'payments:add-charge': false,
  'maintenance:create': false,
  'maintenance:update-status': false,
  'maintenance:add-note': false,
  'announcements:create': false,
  'announcements:edit': false,
  'announcements:delete': false,
  'announcements:pin': false,
  'settings:view': false,
  'settings:edit': false,
  'settings:workspace': false,
  'settings:billing': false,
  'team:view': false,
  'team:manage': false,
  'team:invite-scoped': false,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

// Staff — legacy profile role (maps to editor capabilities)
const STAFF_PERMISSIONS: PermissionMatrix = EDITOR_PERMISSIONS;

const TENANT_PERMISSIONS: PermissionMatrix = {
  'page:tenant-portal': true,
};

const PLATFORM_ADMIN_PERMISSIONS: PermissionMatrix = {
  'page:settings': true,
  'page:admin-section': true,
  'page:support': true,
  'settings:view': true,
  'settings:edit': true,
  'settings:workspace': true,
  'settings:billing': true,
  'team:view': true,
  'team:manage': true,
  'team:invite-scoped': true,
  'demo-mode:toggle': true,
  'admin:view-all-owners': true,
  'admin:impersonate': true,
  'admin:suspend-owner': true,
  'admin:manage-coupons': true,
  'admin:view-analytics': true,
  'admin:manage-referrals': true,
};

// ─── Role → Matrix maps ───────────────────────────────────────────────────────

const ROLE_PERMISSION_MAP: Record<UserRole, PermissionMatrix> = {
  owner:          OWNER_PERMISSIONS,
  owner_manager:  OWNER_MANAGER_PERMISSIONS,
  staff:          STAFF_PERMISSIONS,
  tenant:         TENANT_PERMISSIONS,
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
  admin:          PLATFORM_ADMIN_PERMISSIONS,
  super_admin:    PLATFORM_ADMIN_PERMISSIONS,
};

const WORKSPACE_ROLE_TO_MATRIX: Record<WorkspaceRole, PermissionMatrix> = {
  workspace_owner: OWNER_PERMISSIONS,
  manager:         MANAGER_PERMISSIONS,
  editor:          EDITOR_PERMISSIONS,
  viewer:          VIEWER_PERMISSIONS,
};

// ─── Query functions ─────────────────────────────────────────────────────────

// Global permission check by profiles.role
export function hasPermission(role: string | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  const matrix = ROLE_PERMISSION_MAP[role as UserRole];
  if (!matrix) return false;
  return matrix[action] ?? false;
}

// Workspace-level permission check by WorkspaceRole
// Use this for navigation gating (sidebar, page guards) alongside hasPermission.
export function hasWorkspacePermission(
  workspaceRole: WorkspaceRole | null | undefined,
  action: PermissionAction,
): boolean {
  if (!workspaceRole) return false;
  return WORKSPACE_ROLE_TO_MATRIX[workspaceRole]?.[action] ?? false;
}

// Property-scoped permission check (per-property access role from property_access view)
export function hasPropertyPermission(
  accessRole: PropertyAccessRole | null | undefined,
  action: PermissionAction,
): boolean {
  if (!accessRole) return false;
  // Map property access roles to their permission matrices
  const matrix: PermissionMatrix | undefined = accessRole === 'owner'
    ? OWNER_PERMISSIONS
    : accessRole === 'manager'
      ? MANAGER_PERMISSIONS
      : accessRole === 'editor'
        ? EDITOR_PERMISSIONS
        : accessRole === 'viewer'
          ? VIEWER_PERMISSIONS
          : STAFF_PERMISSIONS; // 'staff'
  return matrix[action] ?? false;
}

// Maps each navigable tab to its required permission action
export const TAB_PERMISSION_MAP: Record<string, PermissionAction> = {
  dashboard:        'page:dashboard',
  properties:       'page:properties',
  'building-view':  'page:properties',
  tenants:          'page:tenants',
  payments:         'page:payments',
  maintenance:      'page:maintenance',
  announcements:    'page:announcements',
  settings:         'page:settings',
  'admin-section':  'page:admin-section',
  'tenant-portal':  'page:tenant-portal',
  support:          'page:support',
  team:             'team:view',
};

// Returns the correct landing tab for a given role
export function getDefaultTab(role: string | null | undefined): string {
  if (role === 'tenant') return 'tenant-portal';
  if (role === 'platform_admin' || role === 'admin' || role === 'super_admin') return 'admin-section';
  return 'dashboard';
}
