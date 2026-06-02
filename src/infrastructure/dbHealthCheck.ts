// Runtime infrastructure health checker.
// Accepts any SupabaseClient so it can be used in both browser (anon key)
// and Node.js scripts (service role key) without coupling to import.meta.env.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  REQUIRED_TABLES,
  REQUIRED_BUCKETS,
  type TableRequirement,
  type BucketRequirement,
} from './migrationRegistry';

export interface TableCheckResult {
  table: string;
  exists: boolean;
  missingColumns: string[];
  introducedBy: string;
}

export interface BucketCheckResult {
  bucket: string;
  exists: boolean;
  introducedBy: string;
}

export interface HealthReport {
  timestamp: string;
  authHealthy: boolean;
  tables: TableCheckResult[];
  buckets: BucketCheckResult[];
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string; introducedBy: string }>;
  missingBuckets: string[];
  overallHealthy: boolean;
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return (
    e['code'] === 'PGRST205' ||
    (typeof e['message'] === 'string' &&
      (e['message'].includes('schema cache') || e['message'].includes('Could not find the table')))
  );
}

function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return (
    e['code'] === 'PGRST204' ||
    (typeof e['message'] === 'string' &&
      (e['message'].includes("Could not find the '") ||
        e['message'].includes('column') ||
        e['message'].includes('schema cache')))
  );
}

function isBucketMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const msg = String(e['message'] ?? '');
  const status = Number((e as Record<string, unknown>)['statusCode'] ?? 0);
  return msg.toLowerCase().includes('bucket not found') || msg.includes('does not exist') || status === 404;
}

async function checkTableExists(
  client: SupabaseClient,
  req: TableRequirement,
): Promise<TableCheckResult> {
  const { error: tableError } = await (client as SupabaseClient)
    .from(req.name)
    .select('id')
    .limit(0);

  if (tableError && isMissingTableError(tableError)) {
    return {
      table: req.name,
      exists: false,
      missingColumns: req.criticalColumns.map((c) => c.column),
      introducedBy: req.introducedBy,
    };
  }

  // Table exists — probe each critical column independently
  const missingColumns: string[] = [];
  await Promise.all(
    req.criticalColumns.map(async (col) => {
      const { error: colError } = await (client as SupabaseClient)
        .from(req.name)
        .select(col.column)
        .limit(0);
      if (colError && isMissingColumnError(colError)) {
        missingColumns.push(col.column);
      }
    }),
  );

  return {
    table: req.name,
    exists: true,
    missingColumns,
    introducedBy: req.introducedBy,
  };
}

async function checkBucketExists(
  client: SupabaseClient,
  req: BucketRequirement,
): Promise<BucketCheckResult> {
  const { error } = await client.storage.from(req.name).list('', { limit: 1 });
  // "Bucket not found" → missing; RLS 403 → bucket exists, access denied
  const missing = error ? isBucketMissingError(error) : false;
  return {
    bucket: req.name,
    exists: !missing,
    introducedBy: req.introducedBy,
  };
}

export async function runHealthChecks(client: SupabaseClient): Promise<HealthReport> {
  const { error: authError } = await client.auth.getSession();
  const authHealthy = !authError;

  const [tableResults, bucketResults] = await Promise.all([
    Promise.all(REQUIRED_TABLES.map((req) => checkTableExists(client, req))),
    Promise.all(REQUIRED_BUCKETS.map((req) => checkBucketExists(client, req))),
  ]);

  const missingTables = tableResults.filter((r) => !r.exists).map((r) => r.table);
  const missingBuckets = bucketResults.filter((r) => !r.exists).map((r) => r.bucket);

  const missingColumns = tableResults.flatMap((r) =>
    r.missingColumns.map((col) => {
      const tableReq = REQUIRED_TABLES.find((t) => t.name === r.table);
      const colReq = tableReq?.criticalColumns.find((c) => c.column === col);
      return { table: r.table, column: col, introducedBy: colReq?.introducedBy ?? 'unknown' };
    }),
  );

  const overallHealthy =
    missingTables.length === 0 && missingColumns.length === 0 && missingBuckets.length === 0;

  return {
    timestamp: new Date().toISOString(),
    authHealthy,
    tables: tableResults,
    buckets: bucketResults,
    missingTables,
    missingColumns,
    missingBuckets,
    overallHealthy,
  };
}
