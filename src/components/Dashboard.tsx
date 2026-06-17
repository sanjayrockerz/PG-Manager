import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense, type CSSProperties } from 'react';

const QuickStartGuide = lazy(() => import('./QuickStartGuide').then((m) => ({ default: m.QuickStartGuide })));
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Bed, Calendar, CheckCircle2,
  Clock, CreditCard, TrendingUp, Users, Wrench,
  UserPlus, AlertCircle, ChevronRight, Building2, Plus, ChevronDown,
  Zap, Activity, Sun, Moon, Sunset,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { KpiCard } from './ui/KpiCard';
import { useProperty } from '../contexts/PropertyContext';
import type { DashboardSnapshot } from '../services/supabaseData';
import { getDashboardData, isDemoModeEnabled, finalizeDueVacates } from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  useDateRange,
  DATE_PRESET_LABELS,
  PRESETS_ORDERED,
  type DatePreset,
} from '../contexts/DateRangeContext';

/* ─── Types ──────────────────────────────── */
const empty: DashboardSnapshot = {
  totalTenants: 0, occupiedRooms: 0, totalRooms: 0,
  monthlyRevenue: 0, pendingAmount: 0, pendingIssues: 0,
  recentPayments: [], recentActivity: [], revenueChartData: [],
};

const cacheKey = (sel: string) =>
  `rc:dash:${isDemoModeEnabled() ? 'd' : 'l'}:${sel}`;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const readCache = (sel: string): DashboardSnapshot | null => {
  try {
    const raw = localStorage.getItem(cacheKey(sel));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { ts: number; data: DashboardSnapshot };
    if (!entry?.ts || Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch { return null; }
};
const writeCache = (sel: string, d: DashboardSnapshot) => {
  try { localStorage.setItem(cacheKey(sel), JSON.stringify({ ts: Date.now(), data: d })); } catch {}
};

const fmt = (n: number) => n.toLocaleString('en-IN');
const fmtK = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(0)}k` : `₹${n}`;
const relTime = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/* ─── Subcomponents ──────────────────────── */

const StatCard = KpiCard;

function SectionHeader({ title, subtitle, action, onAction }: {
  title: string; subtitle?: string;
  action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="ds-section-label" style={{ textTransform: 'none', letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--ds-text-3)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors"
          style={{ fontSize: 12, fontWeight: 500, color: '#6366F1' }}
        >
          {action}
          <ChevronRight style={{ width: 12, height: 12 }} />
        </button>
      )}
    </div>
  );
}

/* ─── Custom recharts tooltip ────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg"
      style={{
        background: '#18181B', border: 'none',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgb(0 0 0 / 0.2)',
      }}
    >
      <p style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.name === 'revenue' ? '#818CF8' : '#A1A1AA' }}>
          {p.name === 'revenue' ? 'Collected' : 'Expected'}: ₹{fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────── */
interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

/* ─── Date Range Picker ─────────────────── */
function DateRangePicker() {
  const { preset, label, setPreset, setCustomRange, customStart, customEnd } = useDateRange();
  const [open, setOpen] = useState(false);
  const [localStart, setLocalStart] = useState(customStart);
  const [localEnd, setLocalEnd] = useState(customEnd);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePreset = (p: Exclude<DatePreset, 'custom'>) => {
    setPreset(p);
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (localStart && localEnd && localStart <= localEnd) {
      setCustomRange(localStart, localEnd);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="ds-btn ds-btn-secondary"
        style={{ fontSize: 12, padding: '6px 10px', gap: 5, minWidth: 140 }}
      >
        <Calendar style={{ width: 12, height: 12, color: '#6366F1' }} />
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{label}</span>
        <ChevronDown style={{ width: 11, height: 11, color: '#A1A1AA', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
            background: '#fff', border: '1px solid #E4E4E7', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '6px 0', minWidth: 200,
          }}
        >
          {PRESETS_ORDERED.filter((p) => p !== 'custom').map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p as Exclude<DatePreset, 'custom'>)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                background: preset === p ? '#EEF2FF' : 'transparent',
                color: preset === p ? '#4F46E5' : '#374151',
                fontWeight: preset === p ? 600 : 400,
                border: 'none',
              }}
            >
              {DATE_PRESET_LABELS[p]}
            </button>
          ))}
          <div style={{ margin: '6px 14px 0', paddingTop: 6, borderTop: '1px solid #F4F4F6' }}>
            <p style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 6 }}>Custom range</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                style={{ fontSize: 12, border: '1px solid #E4E4E7', borderRadius: 6, padding: '4px 8px', width: '100%' }}
              />
              <input
                type="date"
                value={localEnd}
                min={localStart}
                onChange={(e) => setLocalEnd(e.target.value)}
                style={{ fontSize: 12, border: '1px solid #E4E4E7', borderRadius: 6, padding: '4px 8px', width: '100%' }}
              />
              <button
                onClick={handleCustomApply}
                disabled={!localStart || !localEnd || localStart > localEnd}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
                  background: '#6366F1', color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: (!localStart || !localEnd || localStart > localEnd) ? 0.5 : 1,
                  marginTop: 2,
                }}
              >
                Apply
              </button>
            </div>
          </div>
          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  );
}

/* ─── Greeting helper ─────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Sun };
  if (h < 17) return { text: 'Good afternoon', Icon: Sunset };
  return { text: 'Good evening', Icon: Moon };
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { selectedProperty, properties } = useProperty();
  const { user } = useAuth();
  const isDemoMode = isDemoModeEnabled();
  const { range, label: rangeLabel } = useDateRange();
  const [data, setData] = useState<DashboardSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const firstName = (user?.name ?? '').split(' ')[0] || 'there';
  const { text: greetingText, Icon: GreetIcon } = getGreeting();

  const load = useCallback(async (showLoader: boolean) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const d = await getDashboardData(selectedProperty, range);
      setData(d);
      writeCache(selectedProperty, d);
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedProperty, range]);

  useEffect(() => {
    const cached = readCache(selectedProperty);
    if (cached) { setData(cached); setLoading(false); void load(false); return; }
    void load(true);
  }, [load]);

  // Opportunistic reconciliation: there's no server-side cron in this deployment, so
  // a tenant whose notice period has elapsed wouldn't otherwise have their bed/room
  // freed until someone happens to act on it. Run once per dashboard mount.
  useEffect(() => {
    if (isDemoMode) return;
    finalizeDueVacates()
      .then((count) => { if (count > 0) void load(false); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isSyncing, lastUpdatedAt } = useRealtimeRefresh({
    key: `dash-${selectedProperty}`,
    tables: ['properties', 'rooms', 'tenants', 'payments', 'maintenance_tickets', 'announcements', 'notifications'],
    onChange: () => load(false),
    enabled: !isDemoMode,
  });

  const occ = useMemo(() =>
    data.totalRooms ? Math.round((data.occupiedRooms / data.totalRooms) * 100) : 0,
  [data]);

  const chartSeries = data.revenueChartData;
  const latestRev = chartSeries.at(-1)?.revenue ?? data.monthlyRevenue;
  const prevRev   = chartSeries.at(-2)?.revenue ?? 0;
  const revDelta  = prevRev > 0 ? ((latestRev - prevRev) / prevRev) * 100 : 0;
  const pendingCt = data.recentPayments.filter(p => p.status !== 'paid').length;
  const overdueCt = data.recentPayments.filter(p => p.status === 'overdue').length;
  const chartMax  = Math.max(...chartSeries.flatMap(d => [d.revenue, d.target]), 1);

  /* ── Property label ── */
  const propLabel = selectedProperty === 'all'
    ? `All ${properties.length} properties`
    : (properties.find(p => p.id === selectedProperty)?.name ?? 'Property');

  /* ── Activity icons ── */
  const activityIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('payment') || a.includes('rent')) return { icon: CreditCard, bg: '#ECFDF5', color: '#059669' };
    if (a.includes('maintenance') || a.includes('ticket')) return { icon: Wrench, bg: '#FFFBEB', color: '#D97706' };
    if (a.includes('overdue')) return { icon: AlertCircle, bg: '#FEF2F2', color: '#DC2626' };
    return { icon: UserPlus, bg: '#EEF2FF', color: '#6366F1' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="ds-skeleton" style={{ width: 240, height: 26, marginBottom: 8 }} />
            <div className="ds-skeleton" style={{ width: 320, height: 14 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[120, 100, 90].map((w, i) => <div key={i} className="ds-skeleton" style={{ width: w, height: 34, borderRadius: 8 }} />)}
          </div>
        </div>
        {/* Status strip skeleton */}
        <div className="ds-skeleton" style={{ height: 52, borderRadius: 12 }} />
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="ds-skeleton" style={{ height: 130, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Onboarding guide — shown while workspace is empty ─────────────── */}
      {properties.length === 0 && onNavigate && (
        <Suspense fallback={null}>
          <QuickStartGuide onNavigate={onNavigate} onDismiss={() => {}} />
        </Suspense>
      )}

      {/* ── Executive Hero ───────────────────── */}
      <div className="ds-hero">
        <div>
          <h1 className="ds-hero-greeting">
            {greetingText}, {firstName}
            <GreetIcon
              style={{ display: 'inline', verticalAlign: 'middle', width: 22, height: 22, marginLeft: 8, opacity: 0.7 }}
            />
          </h1>
          <p className="ds-hero-summary">
            {isDemoMode
              ? 'Exploring in demo mode — data is simulated'
              : (() => {
                  const items: string[] = [];
                  if (overdueCt > 0) items.push(`${overdueCt} overdue payment${overdueCt > 1 ? 's' : ''}`);
                  if (data.pendingIssues > 0) items.push(`${data.pendingIssues} open maintenance ticket${data.pendingIssues > 1 ? 's' : ''}`);
                  return items.length > 0
                    ? `You have ${items.join(' and ')} requiring attention today`
                    : 'All operations running smoothly today';
                })()
            }
            {isDemoMode && (
              <span style={{ marginLeft: 8, padding: '1px 7px', background: '#EEF2FF', color: '#6366F1', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Demo</span>
            )}
            {!isDemoMode && isSyncing && (
              <span style={{ marginLeft: 8, color: '#A1A1AA', fontSize: 11 }}>· Syncing…</span>
            )}
          </p>
        </div>

        <div className="ds-hero-actions">
          <DateRangePicker />
          <button
            onClick={() => onNavigate?.('building-view')}
            className="ds-btn ds-btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            <Building2 style={{ width: 13, height: 13, color: '#6366F1' }} />
            <span className="hidden sm:inline">Building View</span>
          </button>
          <button
            onClick={() => onNavigate?.('tenants')}
            className="ds-btn ds-btn-primary"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Add Tenant
          </button>
        </div>
      </div>

      {/* ── Status Strip ─────────────────────── */}
      <div className="ds-status-strip">
        <div className="ds-status-item" style={{ minWidth: 0, flex: '0 0 auto' }}>
          <div
            className={`ds-status-dot ${isDemoMode ? 'ds-status-dot-muted' : overdueCt > 0 ? 'ds-status-dot-danger' : data.pendingIssues > 0 ? 'ds-status-dot-warning' : 'ds-status-dot-healthy'}`}
          />
          <div>
            <div className="ds-status-label">Platform</div>
            <div className="ds-status-value" style={{ fontSize: 12 }}>
              {isDemoMode ? 'Demo' : overdueCt > 0 ? 'Action Needed' : data.pendingIssues > 0 ? 'Alerts' : 'Healthy'}
            </div>
          </div>
        </div>
        <div className="ds-status-item">
          <div>
            <div className="ds-status-label">Properties</div>
            <div className="ds-status-value">{properties.length}</div>
          </div>
        </div>
        <div className="ds-status-item">
          <div>
            <div className="ds-status-label">Occupancy</div>
            <div className="ds-status-value">{occ}%</div>
          </div>
        </div>
        <div className="ds-status-item">
          <div>
            <div className="ds-status-label">Collection Rate</div>
            <div className="ds-status-value">
              {data.monthlyRevenue > 0 && (data.monthlyRevenue + data.pendingAmount) > 0
                ? `${Math.round((data.monthlyRevenue / (data.monthlyRevenue + data.pendingAmount)) * 100)}%`
                : '—'}
            </div>
          </div>
        </div>
        <div className="ds-status-item" style={{ borderRight: 'none' }}>
          <div>
            <div className="ds-status-label">Open Tickets</div>
            <div className="ds-status-value" style={{ color: data.pendingIssues > 0 ? 'var(--ds-warning)' : 'var(--ds-text-1)' }}>
              {data.pendingIssues}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#991B1B' }}>
          {error}
        </div>
      )}

      {/* ── Today's Priorities ──────────────── */}
      {(overdueCt > 0 || data.pendingIssues > 0) && (
        <div className="ds-card" style={{ padding: '14px 18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0B', letterSpacing: '-0.01em' }}>Today's Priorities</h2>
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overdueCt > 0 && (
              <button
                onClick={() => onNavigate?.('payments')}
                className="ds-action-card"
                style={{ '--action-1': 'var(--ds-danger)', '--action-wash': 'var(--ds-danger-subtle)' } as CSSProperties}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="ds-action-icon">
                    <AlertCircle style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>{overdueCt} overdue payment{overdueCt > 1 ? 's' : ''} need collection</p>
                    <p style={{ fontSize: 12, color: 'var(--ds-text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {data.recentPayments.filter(p => p.status === 'overdue').slice(0, 2).map(p => p.tenant).join(', ')}
                      {overdueCt > 2 ? ` +${overdueCt - 2} more` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="ds-action-chevron" style={{ width: 16, height: 16 }} />
              </button>
            )}
            {data.pendingIssues > 0 && (
              <button
                onClick={() => onNavigate?.('maintenance')}
                className="ds-action-card"
                style={{ '--action-1': 'var(--ds-warning)', '--action-wash': 'var(--ds-warning-subtle)' } as CSSProperties}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="ds-action-icon">
                    <Wrench style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>{data.pendingIssues} open maintenance ticket{data.pendingIssues > 1 ? 's' : ''}</p>
                    <p style={{ fontSize: 12, color: 'var(--ds-text-3)', marginTop: 1 }}>Click to view and assign tickets</p>
                  </div>
                </div>
                <ChevronRight className="ds-action-chevron" style={{ width: 16, height: 16 }} />
              </button>
            )}
            {data.pendingAmount > 0 && overdueCt === 0 && (
              <button
                onClick={() => onNavigate?.('payments')}
                className="ds-action-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="ds-action-icon">
                    <Clock style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-1)' }}>₹{data.pendingAmount.toLocaleString('en-IN')} pending collection</p>
                    <p style={{ fontSize: 12, color: 'var(--ds-text-3)', marginTop: 1 }}>Review upcoming payments</p>
                  </div>
                </div>
                <ChevronRight className="ds-action-chevron" style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Revenue"
          prefix="₹"
          value={data.monthlyRevenue}
          icon={CreditCard}
          accent="violet"
          trend={prevRev > 0 ? revDelta : undefined}
          trendLabel={prevRev > 0 ? `${rangeLabel} · vs prior period` : rangeLabel}
          meta={`${rangeLabel}`}
          onClick={() => onNavigate?.('payments')}
        />
        <StatCard
          label="Pending Payments"
          prefix="₹"
          value={data.pendingAmount}
          icon={Clock}
          accent="rose"
          meta={pendingCt > 0 ? `${pendingCt} invoices open` : 'All cleared'}
          tag={overdueCt > 0 ? `${overdueCt} Overdue` : undefined}
          onClick={() => onNavigate?.('payments')}
        />
        <StatCard
          label="Total Tenants"
          value={data.totalTenants}
          format={(n) => Math.round(n).toString()}
          icon={Users}
          accent="blue"
          meta={`Across ${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`}
          onClick={() => onNavigate?.('tenants')}
        />
        <StatCard
          label="Occupancy Rate"
          value={occ}
          format={(n) => Math.round(n).toString()}
          suffix="%"
          icon={Bed}
          accent="emerald"
          meta={`${data.occupiedRooms} / ${data.totalRooms} rooms occupied`}
          onClick={() => onNavigate?.('building-view')}
        />
      </div>

      {/* ── Revenue chart + Activity ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">

        {/* Revenue Overview */}
        <div className="ds-card lg:col-span-2 flex flex-col" style={{ padding: '18px 20px', height: '100%' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0B', letterSpacing: '-0.01em' }}>Revenue Overview</h2>
              <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 1 }}>Collections vs Expected · {rangeLabel}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6366F1' }} />
                <span style={{ fontSize: 11, color: '#71717A' }}>Collected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#E4E4E7' }} />
                <span style={{ fontSize: 11, color: '#71717A' }}>Expected</span>
              </div>
            </div>
          </div>

          {/* Collection summary strip */}
          {chartSeries.length > 0 && (
            <div className="ds-chart-summary">
              <div className="ds-chart-summary-item">
                <div className="ds-chart-summary-label">Collected</div>
                <div className="ds-chart-summary-value" style={{ color: '#6366F1' }}>
                  ₹{fmtK(chartSeries.reduce((s, d) => s + (d.revenue ?? 0), 0))}
                </div>
              </div>
              <div className="ds-chart-summary-item">
                <div className="ds-chart-summary-label">Expected</div>
                <div className="ds-chart-summary-value">
                  ₹{fmtK(chartSeries.reduce((s, d) => s + (d.target ?? 0), 0))}
                </div>
              </div>
              <div className="ds-chart-summary-item">
                <div className="ds-chart-summary-label">Gap</div>
                <div className="ds-chart-summary-value" style={{ color: 'var(--ds-danger)' }}>
                  ₹{fmtK(Math.max(0, chartSeries.reduce((s, d) => s + (d.target ?? 0) - (d.revenue ?? 0), 0)))}
                </div>
              </div>
              {revDelta !== 0 && (
                <div className="ds-chart-summary-item">
                  <div className="ds-chart-summary-label">vs Prev Period</div>
                  <div className="ds-chart-summary-value" style={{ color: revDelta >= 0 ? 'var(--ds-success)' : 'var(--ds-danger)' }}>
                    {revDelta >= 0 ? '+' : ''}{revDelta.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {chartSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartSeries}
                barCategoryGap="28%"
                barGap={4}
                margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F3" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#A1A1AA', fontFamily: 'Inter, sans-serif' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#A1A1AA', fontFamily: 'Inter, sans-serif' }}
                  tickFormatter={fmtK}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)', radius: 4 }} />
                <Bar dataKey="target" radius={[5, 5, 0, 0]} maxBarSize={36} name="target">
                  {chartSeries.map((_, i) => <Cell key={i} fill="#E4E4E7" />)}
                </Bar>
                <Bar dataKey="revenue" radius={[5, 5, 0, 0]} maxBarSize={36} name="revenue">
                  {chartSeries.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.revenue >= (entry.target ?? 0) ? '#059669' : '#6366F1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="ds-empty-state" style={{ height: 280 }}>
              <div className="ds-empty-icon">
                <TrendingUp style={{ width: 26, height: 26 }} />
              </div>
              <p className="ds-empty-title">No revenue data yet</p>
              <p className="ds-empty-description">Revenue data will appear here as payments are recorded. Add tenants to generate invoices.</p>
              <button onClick={() => onNavigate?.('tenants')} className="ds-btn ds-btn-secondary" style={{ marginTop: 8 }}>
                Add Tenant
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity — timeline */}
        <div className="ds-card lg:col-span-1 flex flex-col" style={{ padding: '18px 20px', height: '100%' }}>
          <SectionHeader title="Recent Activity" action="View all" onAction={() => onNavigate?.('notifications')} />

          {data.recentActivity.length > 0 ? (
            <div className="ds-timeline">
              {data.recentActivity.slice(0, 6).map((a, i, arr) => {
                const { icon: Icon, bg, color } = activityIcon(a.action);
                const isLast = i === arr.length - 1;
                return (
                  <div key={i} className="ds-timeline-item">
                    <div className="ds-timeline-rail">
                      <div
                        className="ds-event-icon"
                        style={{ background: bg, position: 'relative', zIndex: 1 }}
                      >
                        <Icon style={{ width: 15, height: 15, color, strokeWidth: 2 }} />
                      </div>
                      {!isLast && <div className="ds-timeline-connector" />}
                    </div>
                    <div className="flex-1 min-w-0" style={{ paddingTop: 6 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0A0A0B', lineHeight: 1.35 }}>{a.action}</p>
                      <p style={{ fontSize: 11.5, color: '#71717A', marginTop: 1, lineHeight: 1.4 }}>{a.detail}</p>
                      <p style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 3 }}>{relTime(a.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ds-empty-state" style={{ padding: '32px 16px' }}>
              <div className="ds-empty-icon" style={{ width: 44, height: 44 }}>
                <Activity style={{ width: 20, height: 20 }} />
              </div>
              <p className="ds-empty-title" style={{ fontSize: 13 }}>No recent activity</p>
              <p className="ds-empty-description" style={{ fontSize: 12 }}>Events will appear here as your team works.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom 3-col ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">

        {/* Occupancy by Property */}
        <div className="ds-card" style={{ padding: '18px 20px' }}>
          <SectionHeader title="Occupancy by Property" action="Building View" onAction={() => onNavigate?.('building-view')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {properties.length > 0 ? properties.slice(0, 4).map((prop, i) => {
              const propOccupied = prop.rooms.filter(r => r.status === 'occupied').length;
              const propTotal = prop.rooms.length;
              const propPct = propTotal > 0 ? Math.round((propOccupied / propTotal) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{prop.name}</p>
                    <span className="ds-badge ds-badge-neutral">{propOccupied}/{propTotal}</span>
                  </div>
                  <div className="ds-progress-track">
                    <div
                      style={{
                        height: '100%',
                        width: `${propPct}%`,
                        background: propPct >= 80
                          ? 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                          : propPct >= 50
                          ? 'linear-gradient(90deg, #059669, #10B981)'
                          : 'linear-gradient(90deg, #D97706, #F59E0B)',
                        borderRadius: 99,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>{propPct}% occupied</p>
                </div>
              );
            }) : (
              <div className="ds-empty-state" style={{ padding: '24px 0' }}>
                <div className="ds-empty-icon">
                  <Building2 style={{ width: 22, height: 22 }} />
                </div>
                <p className="ds-empty-title" style={{ fontSize: 14 }}>No properties added</p>
                <p className="ds-empty-description">Add your first property to see occupancy stats.</p>
                <button onClick={() => onNavigate?.('building-view')} className="ds-btn ds-btn-secondary" style={{ marginTop: 8 }}>
                  Building View
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="ds-card" style={{ padding: '18px 20px' }}>
          <SectionHeader title="Recent Payments" action="View all" onAction={() => onNavigate?.('payments')} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.recentPayments.slice(0, 4).map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between"
                style={{
                  padding: '9px 0',
                  borderBottom: i < 3 ? '1px solid #F4F4F6' : 'none',
                  gap: 10,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.tenant}
                  </p>
                  <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>
                    {p.room && `Room ${p.room}`}
                    {p.paidDate && ` · ${new Date(p.paidDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{fmt(p.totalAmount)}
                  </p>
                  {p.status === 'paid'
                    ? <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                    : <Clock style={{ width: 14, height: 14, color: '#D97706' }} />
                  }
                </div>
              </div>
            ))}
            {data.recentPayments.length === 0 && (
              <p style={{ fontSize: 12, color: '#A1A1AA' }}>No payment records</p>
            )}
          </div>
        </div>

        {/* Upcoming Dues */}
        <div className="ds-card" style={{ padding: '18px 20px' }}>
          <SectionHeader title="Upcoming Dues" action="View all" onAction={() => onNavigate?.('payments')} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.recentPayments
              .filter(p => p.status === 'pending' || p.status === 'overdue')
              .slice(0, 4)
              .map((p, i, arr) => {
                const due = p.dueDate ? new Date(p.dueDate) : null;
                const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
                const isOverdue = p.status === 'overdue';
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                    style={{
                      padding: '9px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid #F4F4F6' : 'none',
                      gap: 10,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.tenant}
                      </p>
                      {due && (
                        <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>
                          Due: {due.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{fmt(p.totalAmount)}
                      </p>
                      {daysLeft !== null && (
                        <p style={{
                          fontSize: 11, fontWeight: 500, marginTop: 1,
                          color: isOverdue ? '#991B1B' : daysLeft <= 3 ? '#92400E' : '#A1A1AA',
                        }}>
                          {isOverdue ? 'Overdue' : `Due in ${daysLeft}d`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            {data.recentPayments.filter(p => p.status === 'pending' || p.status === 'overdue').length === 0 && (
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 style={{ width: 16, height: 16, color: '#059669' }} />
                <p style={{ fontSize: 12, color: '#A1A1AA' }}>All payments cleared</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
