// Canonical registry of every infrastructure artifact this application requires.
// Referenced by the health checker, bootstrap script, and readiness reporter.
// Add an entry here whenever a new table, column, or bucket is introduced.

export interface ColumnCheck {
  column: string;
  introducedBy: string;
}

export interface TableRequirement {
  name: string;
  criticalColumns: ColumnCheck[];
  introducedBy: string;
}

export interface BucketRequirement {
  name: string;
  isPublic: boolean;
  introducedBy: string;
}

export const REQUIRED_TABLES: TableRequirement[] = [
  {
    name: 'profiles',
    criticalColumns: [
      { column: 'photo_url', introducedBy: '20260528_profile_photo_and_settings' },
      { column: 'is_suspended', introducedBy: '20260530_admin_portal_v2' },
    ],
    introducedBy: '20260414_multi_owner_saas_expansion',
  },
  {
    name: 'properties',
    criticalColumns: [
      { column: 'occupancy_mode', introducedBy: '20260530_production_bootstrap' },
    ],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'rooms',
    criticalColumns: [],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'tenants',
    criticalColumns: [
      { column: 'vacate_date', introducedBy: '20260530_production_bootstrap' },
      { column: 'updated_at', introducedBy: '20260530_production_bootstrap' },
    ],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'payments',
    criticalColumns: [],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'payment_charges',
    criticalColumns: [],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'maintenance_tickets',
    criticalColumns: [
      { column: 'image_url', introducedBy: '20260530_production_bootstrap' },
      { column: 'updated_at', introducedBy: '20260530_production_bootstrap' },
    ],
    introducedBy: '20260524_operations_comms',
  },
  {
    name: 'maintenance_threads',
    criticalColumns: [],
    introducedBy: '20260530_production_bootstrap',
  },
  {
    name: 'maintenance_notes',
    criticalColumns: [],
    introducedBy: '20260524_operations_comms',
  },
  {
    name: 'announcements',
    criticalColumns: [],
    introducedBy: '20260524_operations_comms',
  },
  {
    name: 'notifications',
    criticalColumns: [],
    introducedBy: '20260524_operations_comms',
  },
  {
    name: 'owner_user_property_scopes',
    criticalColumns: [],
    introducedBy: '20260416_invite_system_and_fixes',
  },
  {
    name: 'owner_subscriptions',
    criticalColumns: [],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'owner_settings',
    criticalColumns: [],
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'support_tickets',
    criticalColumns: [],
    introducedBy: '20260526_daily_ops_workflow',
  },
  {
    name: 'support_ticket_comments',
    criticalColumns: [],
    introducedBy: '20260526_daily_ops_workflow',
  },
  {
    name: 'activity_logs',
    criticalColumns: [],
    introducedBy: '20260530_production_bootstrap',
  },
  {
    name: 'vacate_requests',
    criticalColumns: [],
    introducedBy: '20260530_production_bootstrap',
  },
  {
    name: 'admin_coupons',
    criticalColumns: [],
    introducedBy: '20260530_admin_portal_v2',
  },
  {
    name: 'referrals',
    criticalColumns: [],
    introducedBy: '20260530_admin_portal_v2',
  },
  {
    name: 'lead_sources',
    criticalColumns: [],
    introducedBy: '20260530_admin_portal_v2',
  },
  {
    name: 'owner_invites',
    criticalColumns: [],
    introducedBy: '20260416_complete_setup',
  },
];

export const REQUIRED_BUCKETS: BucketRequirement[] = [
  {
    name: 'profile-photos',
    isPublic: true,
    introducedBy: '20260528_profile_photo_and_settings',
  },
  {
    name: 'tenant-files',
    isPublic: false,
    introducedBy: '20260523_core_management_domain',
  },
  {
    name: 'maintenance-images',
    isPublic: true,
    introducedBy: '20260530_production_bootstrap',
  },
];

export const REALTIME_TABLES: string[] = [
  'profiles',
  'properties',
  'tenants',
  'payments',
  'maintenance_tickets',
  'maintenance_threads',
  'announcements',
  'notifications',
  'owner_user_property_scopes',
  'vacate_requests',
  'activity_logs',
];

// Ordered list of all migration files. Every new migration must be appended here.
export const MIGRATION_APPLY_ORDER: string[] = [
  '20260412_sync_tenant_payment_updates.sql',
  '20260414_multi_owner_saas_expansion.sql',
  '20260416_invite_system_and_fixes.sql',
  '20260416_complete_setup.sql',
  '20260419_fix_properties_rls_scoped_roles.sql',
  '20260523_core_management_domain.sql',
  '20260524_operations_comms.sql',
  '20260526_daily_ops_workflow.sql',
  '20260526_invite_token_acceptance_and_audit.sql',
  '20260528_profile_photo_and_settings.sql',
  '20260528_property_scope_management.sql',
  '20260528_tenant_portal_rls_and_rpc.sql',
  '20260529_maintenance_image_url.sql',
  '20260530_production_bootstrap.sql',
  '20260530_admin_portal_v2.sql',
];
