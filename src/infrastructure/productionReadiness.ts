// Scores infrastructure health reports into PASS / PARTIAL / FAIL per portal.
// Pure logic — no external imports, no browser dependencies.

import type { HealthReport } from './dbHealthCheck';

export type ReadinessStatus = 'PASS' | 'PARTIAL' | 'FAIL';

export interface CheckResult {
  name: string;
  status: ReadinessStatus;
  detail: string;
}

export interface ModuleReadiness {
  name: string;
  status: ReadinessStatus;
  checks: CheckResult[];
}

export interface PortalReadiness {
  portal: 'owner' | 'tenant' | 'admin';
  label: string;
  status: ReadinessStatus;
  modules: ModuleReadiness[];
}

interface ModuleDefinition {
  name: string;
  portal: 'owner' | 'tenant' | 'admin';
  requiredTables: string[];
  criticalColumns: Array<{ table: string; column: string }>;
  requiredBuckets: string[];
}

// Every application module and the infrastructure it depends on.
// Add a new entry here when building a new module.
const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // ── Owner Portal ───────────────────────────────────────────────────────────
  {
    name: 'Authentication & Profiles',
    portal: 'owner',
    requiredTables: ['profiles'],
    criticalColumns: [{ table: 'profiles', column: 'photo_url' }],
    requiredBuckets: ['profile-photos'],
  },
  {
    name: 'Properties & Rooms',
    portal: 'owner',
    requiredTables: ['properties', 'rooms'],
    criticalColumns: [{ table: 'properties', column: 'occupancy_mode' }],
    requiredBuckets: [],
  },
  {
    name: 'Tenant Management',
    portal: 'owner',
    requiredTables: ['tenants'],
    criticalColumns: [
      { table: 'tenants', column: 'vacate_date' },
      { table: 'tenants', column: 'updated_at' },
    ],
    requiredBuckets: [],
  },
  {
    name: 'Payments',
    portal: 'owner',
    requiredTables: ['payments', 'payment_charges', 'vacate_requests'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Maintenance',
    portal: 'owner',
    requiredTables: ['maintenance_tickets', 'maintenance_threads', 'maintenance_notes'],
    criticalColumns: [
      { table: 'maintenance_tickets', column: 'image_url' },
      { table: 'maintenance_tickets', column: 'updated_at' },
    ],
    requiredBuckets: [],
  },
  {
    name: 'Announcements & Notifications',
    portal: 'owner',
    requiredTables: ['announcements', 'notifications'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Settings',
    portal: 'owner',
    requiredTables: ['owner_settings', 'owner_subscriptions'],
    criticalColumns: [],
    requiredBuckets: ['profile-photos'],
  },
  {
    name: 'Team & Audit',
    portal: 'owner',
    requiredTables: ['owner_user_property_scopes', 'activity_logs'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Support',
    portal: 'owner',
    requiredTables: ['support_tickets', 'support_ticket_comments'],
    criticalColumns: [],
    requiredBuckets: [],
  },

  // ── Tenant Portal ──────────────────────────────────────────────────────────
  {
    name: 'Tenant Room & Payments',
    portal: 'tenant',
    requiredTables: ['tenants', 'payments'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Tenant Maintenance',
    portal: 'tenant',
    requiredTables: ['maintenance_tickets', 'maintenance_threads'],
    criticalColumns: [{ table: 'maintenance_tickets', column: 'image_url' }],
    requiredBuckets: ['tenant-files'],
  },
  {
    name: 'Tenant Announcements',
    portal: 'tenant',
    requiredTables: ['announcements'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Vacate Notice',
    portal: 'tenant',
    requiredTables: ['vacate_requests'],
    criticalColumns: [],
    requiredBuckets: [],
  },

  // ── Admin Portal ───────────────────────────────────────────────────────────
  {
    name: 'Owner Management',
    portal: 'admin',
    requiredTables: ['profiles'],
    criticalColumns: [{ table: 'profiles', column: 'is_suspended' }],
    requiredBuckets: [],
  },
  {
    name: 'Platform Analytics',
    portal: 'admin',
    requiredTables: ['owner_subscriptions', 'properties', 'tenants'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Coupons & Referrals',
    portal: 'admin',
    requiredTables: ['admin_coupons', 'referrals', 'lead_sources'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Admin Support',
    portal: 'admin',
    requiredTables: ['support_tickets', 'support_ticket_comments'],
    criticalColumns: [],
    requiredBuckets: [],
  },
  {
    name: 'Platform Activity',
    portal: 'admin',
    requiredTables: ['activity_logs'],
    criticalColumns: [],
    requiredBuckets: [],
  },
];

function scoreModule(def: ModuleDefinition, report: HealthReport): ModuleReadiness {
  const checks: CheckResult[] = [];

  for (const table of def.requiredTables) {
    const result = report.tables.find((t) => t.table === table);
    checks.push({
      name: `Table: ${table}`,
      status: result?.exists ? 'PASS' : 'FAIL',
      detail: result?.exists
        ? 'Present'
        : `Missing — apply migration: ${result?.introducedBy ?? 'production_bootstrap'}`,
    });
  }

  for (const { table, column } of def.criticalColumns) {
    const tableResult = report.tables.find((t) => t.table === table);
    if (!tableResult?.exists) continue; // covered by the table check above

    const colMissing = tableResult.missingColumns.includes(column);
    const colMeta = report.missingColumns.find(
      (mc) => mc.table === table && mc.column === column,
    );
    checks.push({
      name: `Column: ${table}.${column}`,
      status: colMissing ? 'FAIL' : 'PASS',
      detail: colMissing
        ? `Missing — apply migration: ${colMeta?.introducedBy ?? 'production_bootstrap'}`
        : 'Present',
    });
  }

  for (const bucket of def.requiredBuckets) {
    const result = report.buckets.find((b) => b.bucket === bucket);
    checks.push({
      name: `Bucket: ${bucket}`,
      status: result?.exists ? 'PASS' : 'FAIL',
      detail: result?.exists
        ? 'Exists'
        : `Missing — apply migration: ${result?.introducedBy ?? 'profile_photo_and_settings'}`,
    });
  }

  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const total = checks.length;

  let status: ReadinessStatus;
  if (total === 0 || passCount === total) {
    status = 'PASS';
  } else if (passCount === 0) {
    status = 'FAIL';
  } else {
    status = 'PARTIAL';
  }

  return { name: def.name, status, checks };
}

function aggregateStatus(statuses: ReadinessStatus[]): ReadinessStatus {
  if (statuses.length === 0 || statuses.every((s) => s === 'PASS')) return 'PASS';
  if (statuses.every((s) => s === 'FAIL')) return 'FAIL';
  return 'PARTIAL';
}

export function computePortalReadiness(report: HealthReport): PortalReadiness[] {
  const portals: Array<{ portal: 'owner' | 'tenant' | 'admin'; label: string }> = [
    { portal: 'owner', label: 'Owner Portal' },
    { portal: 'tenant', label: 'Tenant Portal' },
    { portal: 'admin', label: 'Admin Portal' },
  ];

  return portals.map(({ portal, label }) => {
    const defs = MODULE_DEFINITIONS.filter((d) => d.portal === portal);
    const modules = defs.map((def) => scoreModule(def, report));
    const status = aggregateStatus(modules.map((m) => m.status));
    return { portal, label, status, modules };
  });
}

export function formatTextReport(portals: PortalReadiness[], report: HealthReport): string {
  const lines: string[] = [
    '╔══════════════════════════════════════════╗',
    '║   PRODUCTION READINESS REPORT            ║',
    '╚══════════════════════════════════════════╝',
    `Generated : ${report.timestamp}`,
    `Auth      : ${report.authHealthy ? 'HEALTHY' : 'DEGRADED'}`,
    '',
  ];

  for (const portal of portals) {
    const badge = portal.status.padEnd(7);
    lines.push(`${badge}  ${portal.label}`);
    for (const mod of portal.modules) {
      const icon = mod.status === 'PASS' ? '✓' : mod.status === 'PARTIAL' ? '~' : '✗';
      lines.push(`  ${icon} ${mod.name}`);
      if (mod.status !== 'PASS') {
        for (const check of mod.checks.filter((c) => c.status === 'FAIL')) {
          lines.push(`      [FAIL] ${check.name}`);
          lines.push(`             ${check.detail}`);
        }
      }
    }
    lines.push('');
  }

  if (report.missingTables.length > 0) {
    lines.push('MISSING TABLES:');
    for (const t of report.missingTables) lines.push(`  - ${t}`);
    lines.push('');
  }
  if (report.missingColumns.length > 0) {
    lines.push('MISSING COLUMNS:');
    for (const c of report.missingColumns)
      lines.push(`  - ${c.table}.${c.column}  [${c.introducedBy}]`);
    lines.push('');
  }
  if (report.missingBuckets.length > 0) {
    lines.push('MISSING BUCKETS:');
    for (const b of report.missingBuckets) lines.push(`  - ${b}`);
    lines.push('');
  }

  if (report.overallHealthy) {
    lines.push('All infrastructure checks passed. Platform is production-ready.');
  } else {
    lines.push('ACTION REQUIRED — apply these files in Supabase Dashboard > SQL Editor:');
    lines.push('  1. supabase/migrations/20260530_production_bootstrap.sql');
    lines.push('  2. supabase/migrations/20260530_admin_portal_v2.sql');
    lines.push('  3. Attach handle_new_auth_user trigger on auth.users');
    lines.push('');
    lines.push('Both migration files are idempotent — safe to run multiple times.');
  }

  return lines.join('\n');
}
