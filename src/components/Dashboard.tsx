import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';

const QuickStartGuide = lazy(() => import('./QuickStartGuide').then((m) => ({ default: m.QuickStartGuide })));
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, Bed, Calendar, CheckCircle2,
  Clock, CreditCard, IndianRupee, TrendingUp, Users, Wrench,
  UserPlus, AlertCircle, ChevronRight, Building2, Plus,
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import type { DashboardSnapshot } from '../services/supabaseData';
import { getDashboardData, isDemoModeEnabled } from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

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

function StatCard({
  label, value, prefix, suffix,
  trend, trendLabel, meta, icon: Icon, iconBg, iconColor,
  tag, tagColor,
}: {
  label: string; value: string; prefix?: string; suffix?: string;
  trend?: number; trendLabel?: string; meta?: string;
  icon: typeof CreditCard; iconBg: string; iconColor: string;
  tag?: string; tagColor?: 'warning' | 'danger';
}) {
  const up = trend !== undefined && trend >= 0;
  return (
    <div
      className="ds-card flex items-start justify-between"
      style={{ padding: '16px 18px', gap: 12 }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </p>
        <p style={{ fontSize: 26, fontWeight: 700, color: '#0A0A0B', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {prefix && <span style={{ fontSize: 16, fontWeight: 600, color: '#71717A', marginRight: 1 }}>{prefix}</span>}
          {value}
          {suffix && <span style={{ fontSize: 16, fontWeight: 600, color: '#71717A', marginLeft: 1 }}>{suffix}</span>}
        </p>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          {trend !== undefined && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                fontSize: 11, fontWeight: 500, padding: '2px 7px',
                borderRadius: 99,
                background: up ? '#ECFDF5' : '#FEF2F2',
                color: up ? '#065F46' : '#991B1B',
                border: `1px solid ${up ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              {up
                ? <ArrowUpRight style={{ width: 11, height: 11 }} />
                : <ArrowDownRight style={{ width: 11, height: 11 }} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {trendLabel && (
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>{trendLabel}</span>
          )}
          {tag && (
            <span
              style={{
                fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 99,
                background: tagColor === 'danger' ? '#FEF2F2' : '#FFFBEB',
                color: tagColor === 'danger' ? '#991B1B' : '#92400E',
                border: `1px solid ${tagColor === 'danger' ? '#FECACA' : '#FDE68A'}`,
              }}
            >
              {tag}
            </span>
          )}
        </div>

        {meta && (
          <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 6 }}>{meta}</p>
        )}
      </div>

      <div
        className="flex-shrink-0 flex items-center justify-center rounded-xl"
        style={{ width: 40, height: 40, background: iconBg }}
      >
        <Icon style={{ width: 18, height: 18, color: iconColor, strokeWidth: 1.75 }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action, onAction }: {
  title: string; subtitle?: string;
  action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0B', letterSpacing: '-0.01em' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 1 }}>{subtitle}</p>}
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
      <p style={{ fontSize: 11, color: '#71717A', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: 13, fontWeight: 600, color: p.name === 'revenue' ? '#818CF8' : '#52525B' }}>
          {p.name === 'revenue' ? 'Collected' : 'Expected'}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── Main component ─────────────────────── */
interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { selectedProperty, properties } = useProperty();
  const isDemoMode = isDemoModeEnabled();
  const [data, setData] = useState<DashboardSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoader: boolean) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const d = await getDashboardData(selectedProperty);
      setData(d);
      writeCache(selectedProperty, d);
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    const cached = readCache(selectedProperty);
    if (cached) { setData(cached); setLoading(false); void load(false); return; }
    void load(true);
  }, [load]);

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
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="ds-card" style={{ height: 120 }}>
              <div style={{ padding: 16 }}>
                <div style={{ height: 10, background: '#F4F4F6', borderRadius: 4, width: '50%', marginBottom: 10 }} />
                <div style={{ height: 26, background: '#F4F4F6', borderRadius: 4, width: '70%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Onboarding guide — shown while workspace is empty ─────────────── */}
      {properties.length === 0 && onNavigate && (
        <Suspense fallback={null}>
          <QuickStartGuide onNavigate={onNavigate} onDismiss={() => {}} />
        </Suspense>
      )}

      {/* ── Page header ─────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Dashboard</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            Overview of your properties and operations
            {isDemoMode
              ? <span style={{ marginLeft: 8, padding: '1px 7px', background: '#EEF2FF', color: '#6366F1', borderRadius: 99, fontSize: 11, fontWeight: 500 }}>Demo</span>
              : isSyncing ? <span style={{ marginLeft: 8, color: '#A1A1AA', fontSize: 11 }}>Syncing…</span>
              : lastUpdatedAt ? <span style={{ marginLeft: 8, color: '#A1A1AA', fontSize: 11 }}>Live</span> : null
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range hint */}
          <button
            className="ds-btn ds-btn-secondary hidden sm:flex"
            style={{ fontSize: 12, padding: '6px 10px', gap: 6 }}
          >
            <Calendar style={{ width: 13, height: 13, color: '#A1A1AA' }} />
            <span style={{ color: '#52525B' }}>
              {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              {' – '}
              {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </button>

          {/* Quick action */}
          <button
            onClick={() => onNavigate?.('tenants')}
            className="ds-btn ds-btn-primary"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Quick Action
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#991B1B' }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <StatCard
          label="Total Revenue"
          prefix="₹"
          value={fmt(data.monthlyRevenue)}
          icon={CreditCard}
          iconBg="#EEF2FF"
          iconColor="#6366F1"
          trend={prevRev > 0 ? revDelta : undefined}
          trendLabel={prevRev > 0 ? 'vs last month' : undefined}
          meta={prevRev > 0 ? undefined : 'First month recorded'}
        />
        <StatCard
          label="Pending Payments"
          prefix="₹"
          value={fmt(data.pendingAmount)}
          icon={Clock}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          meta={pendingCt > 0 ? `${pendingCt} invoices open` : 'All cleared'}
          tag={overdueCt > 0 ? `${overdueCt} Overdue` : undefined}
          tagColor="danger"
        />
        <StatCard
          label="Total Tenants"
          value={data.totalTenants.toString()}
          icon={Users}
          iconBg="#ECFDF5"
          iconColor="#059669"
          meta={`Across ${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`}
          trend={data.totalTenants > 0 ? 0 : undefined}
        />
        <StatCard
          label="Occupancy Rate"
          value={occ.toString()}
          suffix="%"
          icon={Bed}
          iconBg="#EFF6FF"
          iconColor="#3B82F6"
          meta={`${data.occupiedRooms} / ${data.totalRooms} rooms occupied`}
          trend={occ > 50 ? occ - 50 : -(50 - occ)}
          trendLabel="vs 50% baseline"
        />
      </div>

      {/* ── Revenue chart + Activity ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>

        {/* Revenue Overview */}
        <div className="ds-card" style={{ padding: '18px 20px' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0B', letterSpacing: '-0.01em' }}>Revenue Overview</h2>
              <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 1 }}>Collections vs Expected</p>
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
              <button className="ds-btn ds-btn-secondary" style={{ fontSize: 11, padding: '4px 9px', gap: 4 }}>
                <Calendar style={{ width: 11, height: 11 }} />
                Last {chartSeries.length || 6} months
              </button>
            </div>
          </div>

          {chartSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartSeries}
                barCategoryGap="28%"
                barGap={4}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F1F3"
                  vertical={false}
                />
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
                <Bar dataKey="target" radius={[5, 5, 0, 0]} maxBarSize={36} fill="#E4E4E7" name="target" />
                <Bar dataKey="revenue" radius={[5, 5, 0, 0]} maxBarSize={36} fill="#6366F1" name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-lg"
              style={{ height: 300, background: '#FAFAFA', border: '1px dashed #E4E4E7' }}
            >
              <TrendingUp style={{ width: 24, height: 24, color: '#D4D4D8', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#A1A1AA' }}>No revenue data yet</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="ds-card" style={{ padding: '18px 20px', height: '100%' }}>
          <SectionHeader title="Recent Activity" action="View all" onAction={() => onNavigate?.('notifications')} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {data.recentActivity.length > 0 ? (
              data.recentActivity.slice(0, 6).map((a, i) => {
                const { icon: Icon, bg, color } = activityIcon(a.action);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3"
                    style={{
                      padding: '10px 0',
                      borderBottom: i < Math.min(data.recentActivity.length, 6) - 1 ? '1px solid #F4F4F6' : 'none',
                    }}
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-lg"
                      style={{ width: 30, height: 30, background: bg, marginTop: 1 }}
                    >
                      <Icon style={{ width: 13, height: 13, color, strokeWidth: 2 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12.5, fontWeight: 500, color: '#0A0A0B', lineHeight: 1.35 }}>{a.action}</p>
                      <p style={{ fontSize: 11.5, color: '#A1A1AA', marginTop: 1 }}>{a.detail}</p>
                    </div>
                    <p style={{ fontSize: 11, color: '#A1A1AA', flexShrink: 0, marginTop: 2 }}>
                      {relTime(a.createdAt)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center" style={{ height: 120 }}>
                <p style={{ fontSize: 12, color: '#A1A1AA' }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom 3-col ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' }}>

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
                    <p style={{ fontSize: 12, color: '#A1A1AA' }}>
                      {propOccupied}/{propTotal}
                    </p>
                  </div>
                  <div className="ds-progress-track">
                    <div
                      className="ds-progress-fill-success"
                      style={{
                        height: 4,
                        width: `${propPct}%`,
                        background: 'linear-gradient(90deg, #059669, #10B981)',
                        borderRadius: 99,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>{propPct}% occupied</p>
                </div>
              );
            }) : (
              <div className="flex items-center gap-2.5">
                <Building2 style={{ width: 28, height: 28, color: '#E4E4E7' }} />
                <p style={{ fontSize: 12, color: '#A1A1AA' }}>No properties added yet</p>
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

      {/* ── Maintenance alert banner ─────────── */}
      {data.pendingIssues > 0 && (
        <div
          className="flex items-center justify-between rounded-xl"
          style={{
            padding: '12px 18px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            gap: 12,
          }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
                {data.pendingIssues} active maintenance {data.pendingIssues === 1 ? 'ticket' : 'tickets'}
              </p>
              <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 1 }}>
                Unresolved requests need your attention
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('maintenance')}
            className="ds-btn ds-btn-secondary flex-shrink-0"
            style={{ fontSize: 12, padding: '6px 12px', borderColor: '#FECACA', color: '#991B1B' }}
          >
            View Tickets
          </button>
        </div>
      )}
    </div>
  );
}
