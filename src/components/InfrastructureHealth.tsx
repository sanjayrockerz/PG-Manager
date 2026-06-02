import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { runHealthChecks, type HealthReport } from '../infrastructure/dbHealthCheck';
import {
  computePortalReadiness,
  type PortalReadiness,
  type ReadinessStatus,
} from '../infrastructure/productionReadiness';

function StatusBadge({ status }: { status: ReadinessStatus }) {
  if (status === 'PASS')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
        PASS
      </span>
    );
  if (status === 'PARTIAL')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
        PARTIAL
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
      FAIL
    </span>
  );
}

function StatusIcon({ status }: { status: ReadinessStatus | 'unknown' }) {
  if (status === 'PASS') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === 'PARTIAL') return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (status === 'FAIL') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Activity className="w-4 h-4 text-gray-400 shrink-0" />;
}

function PortalSection({ portal }: { portal: PortalReadiness }) {
  const [expanded, setExpanded] = useState(portal.status !== 'PASS');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={portal.status} />
          <span className="text-sm text-gray-900">{portal.label}</span>
          <span className="text-xs text-gray-400">
            {portal.modules.filter((m) => m.status === 'PASS').length}/{portal.modules.length} modules
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={portal.status} />
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {portal.modules.map((mod) => (
            <div key={mod.name} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={mod.status} />
                  <span className="text-sm text-gray-700">{mod.name}</span>
                </div>
                <StatusBadge status={mod.status} />
              </div>
              {mod.status !== 'PASS' && (
                <div className="mt-2 ml-6 space-y-1.5">
                  {mod.checks
                    .filter((c) => c.status === 'FAIL')
                    .map((check) => (
                      <div key={check.name} className="flex items-start gap-2">
                        <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-700">{check.name}</p>
                          <p className="text-xs text-gray-500">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InfrastructureHealth() {
  const [isChecking, setIsChecking] = useState(false);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [portals, setPortals] = useState<PortalReadiness[] | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);

  const runChecks = useCallback(async () => {
    setIsChecking(true);
    try {
      const healthReport = await runHealthChecks(supabase);
      const portalReadiness = computePortalReadiness(healthReport);
      setReport(healthReport);
      setPortals(portalReadiness);
      if (!healthReport.overallHealthy) setShowInstructions(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const overallStatus: ReadinessStatus = !portals
    ? 'FAIL'
    : portals.every((p) => p.status === 'PASS')
    ? 'PASS'
    : portals.every((p) => p.status === 'FAIL')
    ? 'FAIL'
    : 'PARTIAL';

  const totalIssues = report
    ? report.missingTables.length + report.missingColumns.length + report.missingBuckets.length
    : 0;

  const bootstrapCommand =
    'supabase/migrations/20260530_production_bootstrap.sql\nsupabase/migrations/20260530_admin_portal_v2.sql';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bootstrapCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            Infrastructure Health
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Database tables, storage buckets, and service readiness.
          </p>
        </div>
        <button
          onClick={() => void runChecks()}
          disabled={isChecking}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Re-check'}
        </button>
      </div>

      {/* Summary banner */}
      {report && (
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            overallStatus === 'PASS'
              ? 'bg-green-50 border-green-200'
              : overallStatus === 'PARTIAL'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <StatusIcon status={overallStatus} />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium ${
                overallStatus === 'PASS'
                  ? 'text-green-800'
                  : overallStatus === 'PARTIAL'
                  ? 'text-amber-800'
                  : 'text-red-800'
              }`}
            >
              {overallStatus === 'PASS'
                ? 'All infrastructure checks passed. Platform is production-ready.'
                : totalIssues === 1
                ? `1 infrastructure gap detected.`
                : `${totalIssues} infrastructure gaps detected.`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Last checked: {new Date(report.timestamp).toLocaleTimeString()}
            </p>
          </div>
          {overallStatus !== 'PASS' && (
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
            >
              {showInstructions ? 'Hide steps' : 'Show fix steps'}
            </button>
          )}
        </div>
      )}

      {/* Bootstrap instructions */}
      {showInstructions && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm text-gray-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            How to resolve missing infrastructure
          </h2>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside leading-relaxed">
            <li>
              Open <strong>Supabase Dashboard</strong> → your project → <strong>SQL Editor</strong>
            </li>
            <li>
              Run{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                supabase/migrations/20260530_production_bootstrap.sql
              </code>
            </li>
            <li>
              Run{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                supabase/migrations/20260530_admin_portal_v2.sql
              </code>
            </li>
            <li>
              In Authentication → Hooks, attach{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                handle_new_auth_user
              </code>{' '}
              to the signup hook
            </li>
            <li>
              Click <strong>Re-check</strong> above to verify all gaps are resolved
            </li>
          </ol>
          <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
            <button
              onClick={() => void handleCopy()}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {copied ? 'Copied!' : 'Copy migration file names'}
            </button>
            <span className="text-xs text-gray-400">
              Both files are idempotent — safe to run multiple times.
            </span>
          </div>
        </div>
      )}

      {/* Summary KPI cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Tables',
              Icon: Database,
              pass: report.tables.filter((t) => t.exists).length,
              total: report.tables.length,
            },
            {
              label: 'Columns',
              Icon: Database,
              pass: report.tables.filter((t) => t.exists && t.missingColumns.length === 0).length,
              total: report.tables.filter((t) => t.exists).length,
            },
            {
              label: 'Buckets',
              Icon: HardDrive,
              pass: report.buckets.filter((b) => b.exists).length,
              total: report.buckets.length,
            },
            {
              label: 'Auth',
              Icon: Shield,
              pass: report.authHealthy ? 1 : 0,
              total: 1,
            },
          ].map(({ label, Icon, pass, total }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              </div>
              <p
                className={`text-xl font-medium ${
                  pass === total ? 'text-green-600' : pass === 0 ? 'text-red-600' : 'text-amber-600'
                }`}
              >
                {pass}/{total}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isChecking && !report && (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Running infrastructure checks...
        </div>
      )}

      {/* Portal readiness sections */}
      {portals && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Portal Readiness</p>
          {portals.map((portal) => (
            <PortalSection key={portal.portal} portal={portal} />
          ))}
        </div>
      )}

      {/* Realtime tables info */}
      {report && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            Realtime Subscriptions
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            The following tables must be added to the Supabase Realtime publication. Verify in
            Database → Replication → supabase_realtime.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
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
            ].map((table) => (
              <code
                key={table}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {table}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
