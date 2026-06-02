#!/usr/bin/env node
/**
 * Production Readiness Report Generator
 *
 * Probes Supabase and writes two output files:
 *   - readiness-report.txt  (human-readable)
 *   - readiness-report.json (machine-readable, for CI or dashboards)
 *
 * Exits with code 0 if all portals are PASS, 1 otherwise.
 *
 * Usage:
 *   npm run report
 *   npm run build:prod   (runs build then report)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './_supabase.ts';
import { runHealthChecks } from '../src/infrastructure/dbHealthCheck.ts';
import {
  computePortalReadiness,
  formatTextReport,
  type PortalReadiness,
} from '../src/infrastructure/productionReadiness.ts';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

interface ReadinessJsonReport {
  generatedAt: string;
  overallStatus: 'PASS' | 'PARTIAL' | 'FAIL';
  portals: Array<{
    portal: string;
    label: string;
    status: string;
    modules: Array<{
      name: string;
      status: string;
      failingChecks: string[];
    }>;
  }>;
  infrastructure: {
    authHealthy: boolean;
    missingTables: string[];
    missingColumns: Array<{ table: string; column: string; introducedBy: string }>;
    missingBuckets: string[];
    tablesTotal: number;
    tablesMissing: number;
    bucketsTotal: number;
    bucketsMissing: number;
  };
}

function computeOverallStatus(portals: PortalReadiness[]): 'PASS' | 'PARTIAL' | 'FAIL' {
  if (portals.every((p) => p.status === 'PASS')) return 'PASS';
  if (portals.every((p) => p.status === 'FAIL')) return 'FAIL';
  return 'PARTIAL';
}

async function main(): Promise<void> {
  console.log('\nGenerating production readiness report...\n');

  let healthReport;
  try {
    healthReport = await runHealthChecks(supabase);
  } catch (err) {
    console.error('Failed to connect to Supabase:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const portals = computePortalReadiness(healthReport);
  const textReport = formatTextReport(portals, healthReport);
  const overallStatus = computeOverallStatus(portals);

  // Write text report
  const txtPath = resolve(ROOT, 'readiness-report.txt');
  writeFileSync(txtPath, textReport, 'utf8');
  console.log(`Text report   → ${txtPath}`);

  // Write JSON report
  const jsonReport: ReadinessJsonReport = {
    generatedAt: healthReport.timestamp,
    overallStatus,
    portals: portals.map((p) => ({
      portal: p.portal,
      label: p.label,
      status: p.status,
      modules: p.modules.map((m) => ({
        name: m.name,
        status: m.status,
        failingChecks: m.checks.filter((c) => c.status === 'FAIL').map((c) => c.name),
      })),
    })),
    infrastructure: {
      authHealthy: healthReport.authHealthy,
      missingTables: healthReport.missingTables,
      missingColumns: healthReport.missingColumns,
      missingBuckets: healthReport.missingBuckets,
      tablesTotal: healthReport.tables.length,
      tablesMissing: healthReport.missingTables.length,
      bucketsTotal: healthReport.buckets.length,
      bucketsMissing: healthReport.missingBuckets.length,
    },
  };

  const jsonPath = resolve(ROOT, 'readiness-report.json');
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');
  console.log(`JSON report   → ${jsonPath}`);

  // Print summary
  console.log(`\nOverall status: ${overallStatus}`);
  for (const p of portals) {
    const icon = p.status === 'PASS' ? '✓' : p.status === 'PARTIAL' ? '~' : '✗';
    console.log(`  ${icon} ${p.label.padEnd(18)} ${p.status}`);
  }
  console.log('');

  // Exit 1 on failure so CI pipelines can catch it
  if (overallStatus === 'FAIL') {
    console.error('Platform has critical infrastructure gaps. Review the report above.\n');
    process.exit(1);
  }
  if (overallStatus === 'PARTIAL') {
    console.warn('Platform has partial infrastructure gaps. Some features may not work.\n');
    process.exit(1);
  }

  console.log('All infrastructure checks passed.\n');
}

main().catch((err) => {
  console.error('Report generation failed:', err);
  process.exit(1);
});
