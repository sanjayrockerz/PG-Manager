import type { UserRole } from '../services/supabaseData';

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
  // Settings and team
  | 'settings:view'
  | 'settings:edit'
  | 'team:manage'
  // Platform admin privileges
  | 'demo-mode:toggle'
  | 'admin:view-all-owners'
  | 'admin:impersonate'
  | 'admin:suspend-owner'
  | 'admin:manage-coupons'
  | 'admin:view-analytics'
  | 'admin:manage-referrals';

type PermissionMatrix = Record<PermissionAction, boolean>;

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
  'team:manage': true,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

const OWNER_MANAGER_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': true,
  'page:properties': true,
  'page:tenants': true,
  'page:payments': true,
  'page:maintenance': true,
  'page:announcements': true,
  'page:settings': false,
  'page:admin-section': false,
  'page:tenant-portal': false,
  'page:support': true,
  'properties:create': false,
  'properties:edit': false,
  'properties:delete': false,
  'tenants:create': true,
  'tenants:edit': true,
  'tenants:delete': false,
  'payments:view': true,
  'payments:update-status': true,
  'payments:add-charge': true,
  'maintenance:create': true,
  'maintenance:update-status': true,
  'maintenance:add-note': true,
  'announcements:create': true,
  'announcements:edit': true,
  'announcements:delete': false,
  'announcements:pin': false,
  'settings:view': false,
  'settings:edit': false,
  'team:manage': false,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

const STAFF_PERMISSIONS: PermissionMatrix = {
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
  'tenants:edit': true,
  'tenants:delete': false,
  'payments:view': false,
  'payments:update-status': false,
  'payments:add-charge': false,
  'maintenance:create': true,
  'maintenance:update-status': true,
  'maintenance:add-note': true,
  'announcements:create': false,
  'announcements:edit': false,
  'announcements:delete': false,
  'announcements:pin': false,
  'settings:view': false,
  'settings:edit': false,
  'team:manage': false,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

const TENANT_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': false,
  'page:properties': false,
  'page:tenants': false,
  'page:payments': false,
  'page:maintenance': false,
  'page:announcements': false,
  'page:settings': false,
  'page:admin-section': false,
  'page:tenant-portal': true,
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
  'team:manage': false,
  'demo-mode:toggle': false,
  'admin:view-all-owners': false,
  'admin:impersonate': false,
  'admin:suspend-owner': false,
  'admin:manage-coupons': false,
  'admin:view-analytics': false,
  'admin:manage-referrals': false,
};

const PLATFORM_ADMIN_PERMISSIONS: PermissionMatrix = {
  'page:dashboard': false,
  'page:properties': false,
  'page:tenants': false,
  'page:payments': false,
  'page:maintenance': false,
  'page:announcements': false,
  'page:settings': true,
  'page:admin-section': true,
  'page:tenant-portal': true,
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
  'team:manage': true,
  'demo-mode:toggle': true,
  'admin:view-all-owners': true,
  'admin:impersonate': true,
  'admin:suspend-owner': true,
  'admin:manage-coupons': true,
  'admin:view-analytics': true,
  'admin:manage-referrals': true,
};

const ROLE_PERMISSION_MAP: Record<UserRole, PermissionMatrix> = {
  owner: OWNER_PERMISSIONS,
  owner_manager: OWNER_MANAGER_PERMISSIONS,
  staff: STAFF_PERMISSIONS,
  tenant: TENANT_PERMISSIONS,
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
  admin: PLATFORM_ADMIN_PERMISSIONS,
  super_admin: PLATFORM_ADMIN_PERMISSIONS,
};

export function hasPermission(role: string | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  const matrix = ROLE_PERMISSION_MAP[role as UserRole];
  if (!matrix) return false;
  return matrix[action] ?? false;
}

// Maps each navigable tab to its required permission action
export const TAB_PERMISSION_MAP: Record<string, PermissionAction> = {
  dashboard: 'page:dashboard',
  properties: 'page:properties',
  'building-view': 'page:properties',
  tenants: 'page:tenants',
  payments: 'page:payments',
  maintenance: 'page:maintenance',
  announcements: 'page:announcements',
  settings: 'page:settings',
  'admin-section': 'page:admin-section',
  'tenant-portal': 'page:tenant-portal',
  support: 'page:support',
};

// Returns the correct landing tab for a given role
export function getDefaultTab(role: string | null | undefined): string {
  if (role === 'tenant') return 'tenant-portal';
  if (role === 'platform_admin' || role === 'admin' || role === 'super_admin') return 'admin-section';
  return 'dashboard';
}
