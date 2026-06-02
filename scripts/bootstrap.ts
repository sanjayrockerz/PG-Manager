#!/usr/bin/env node
/**
 * Production Bootstrap Checker
 *
 * Probes the Supabase project and reports exactly what infrastructure is
 * missing. Outputs a tailored action plan so operators know which migration
 * files to apply and in what order.
 *
 * Usage:
 *   npm run bootstrap
 *
 * With service role key (recommended for full visibility):
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npm run bootstrap
 */

import { supabase } from './_supabase.ts';
import { runHealthChecks } from '../src/infrastructure/dbHealthCheck.ts';
import {
  computePortalReadiness,
  formatTextReport,
} from '../src/infrastructure/productionReadiness.ts';
import { MIGRATION_APPLY_ORDER } from '../src/infrastructure/migrationRegistry.ts';

async function main(): Promise<void> {
  console.log('\nPG Manager — Production Bootstrap Checker');
  console.log('==========================================\n');
  console.log('Probing Supabase infrastructure...\n');

  let report;
  try {
    report = await runHealthChecks(supabase);
  } catch (err) {
    console.error('Failed to connect to Supabase:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const portals = computePortalReadiness(report);
  const textReport = formatTextReport(portals, report);

  console.log(textReport);

  // Determine which migrations address the missing infrastructure
  const needsBootstrap =
    report.missingTables.some((t) =>
      ['vacate_requests', 'activity_logs', 'maintenance_threads'].includes(t),
    ) ||
    report.missingColumns.some((c) =>
      ['vacate_date', 'updated_at', 'image_url', 'occupancy_mode'].includes(c.column),
    );

  const needsAdminV2 =
    report.missingTables.some((t) =>
      ['admin_coupons', 'referrals', 'lead_sources'].includes(t),
    ) ||
    report.missingColumns.some((c) => c.column === 'is_suspended');

  if (!report.overallHealthy) {
    console.log('\n──────────────────────────────────────────');
    console.log('MIGRATIONS TO APPLY IN SUPABASE DASHBOARD');
    console.log('──────────────────────────────────────────');
    console.log('\nGo to: Supabase Dashboard → SQL Editor → New query\n');

    let step = 1;
    if (needsBootstrap) {
      console.log(`Step ${step++}: Run supabase/migrations/20260530_production_bootstrap.sql`);
    }
    if (needsAdminV2) {
      console.log(`Step ${step++}: Run supabase/migrations/20260530_admin_portal_v2.sql`);
    }
    console.log(`Step ${step++}: Attach handle_new_auth_user trigger on auth.users`);
    console.log('\nBoth files are idempotent — safe to run multiple times.\n');
    console.log('After applying, re-run: npm run bootstrap\n');
  } else {
    console.log('\nNo action required. Infrastructure is complete.\n');
  }

  console.log('Migration registry contains', MIGRATION_APPLY_ORDER.length, 'tracked migrations.\n');
}

main().catch((err) => {
  console.error('Bootstrap check failed:', err);
  process.exit(1);
});
