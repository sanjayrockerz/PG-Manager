import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Bed, CreditCard, TrendingUp, TrendingDown, Clock, Search, Wrench, Receipt } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProperty } from '../contexts/PropertyContext';
import type { DashboardSnapshot } from '../services/supabaseData';
import { getDashboardData, isDemoModeEnabled } from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

const emptySnapshot: DashboardSnapshot = {
  totalTenants: 0,
  occupiedRooms: 0,
  totalRooms: 0,
  monthlyRevenue: 0,
  pendingAmount: 0,
  pendingIssues: 0,
  recentPayments: [],
  recentActivity: [],
  revenueChartData: [],
};

const getDashboardCacheKey = (selectedProperty: string | 'all'): string => `pg-manager:dashboard-cache:${isDemoModeEnabled() ? 'demo' : 'live'}:${selectedProperty}`;

const readCachedSnapshot = (selectedProperty: string | 'all'): DashboardSnapshot | null => {
  try {
    const raw = localStorage.getItem(getDashboardCacheKey(selectedProperty));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as DashboardSnapshot;
  } catch {
    return null;
  }
};

const writeCachedSnapshot = (selectedProperty: string | 'all', snapshot: DashboardSnapshot): void => {
  try {
    localStorage.setItem(getDashboardCacheKey(selectedProperty), JSON.stringify(snapshot));
  } catch {
    // Best-effort cache; ignore storage failures.
  }
};

const formatCurrencyINR = (value: number): string => `\u20B9${value.toLocaleString('en-IN')}`;

const formatRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
};

const formatDeltaPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

type StatTone = 'success' | 'warning' | 'error';
type StatTrend = 'up' | 'down';

interface DashboardStat {
  label: string;
  value: string;
  context: string;
  trend: StatTrend;
  status: string;
  statusTone: StatTone;
  icon: typeof Users;
  iconClassName: string;
  iconWrapClassName: string;
  accentClassName: string;
  accentDotClassName: string;
}

const resolveActivityVisual = (action: string, detail: string) => {
  const combined = `${action} ${detail}`.toLowerCase();

  if (combined.includes('payment') || combined.includes('rent')) {
    return {
      icon: Receipt,
      iconClassName: 'text-indigo-600',
      iconWrapClassName: 'bg-indigo-50',
    };
  }

  if (combined.includes('maintenance') || combined.includes('ticket') || combined.includes('issue')) {
    return {
      icon: Wrench,
      iconClassName: 'text-amber-600',
      iconWrapClassName: 'bg-amber-50',
    };
  }

  return {
    icon: Users,
    iconClassName: 'text-green-600',
    iconWrapClassName: 'bg-green-50',
  };
};

export function Dashboard() {
  const { selectedProperty, properties } = useProperty();
  const isDemoMode = isDemoModeEnabled();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightRefresh, setHighlightRefresh] = useState(false);

  const loadSnapshot = useCallback(async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError('');
    try {
      const data = await getDashboardData(selectedProperty);
      setSnapshot(data);
      writeCachedSnapshot(selectedProperty, data);
    } catch {
      setError('Unable to load dashboard data.');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [selectedProperty]);

  useEffect(() => {
    const cached = readCachedSnapshot(selectedProperty);
    if (cached) {
      setSnapshot(cached);
      setIsLoading(false);
      void loadSnapshot(false);
      return;
    }

    void loadSnapshot(true);
  }, [loadSnapshot]);

  const { isSyncing, lastUpdatedAt, refreshCount } = useRealtimeRefresh({
    key: `dashboard-${selectedProperty}`,
    tables: ['properties', 'rooms', 'tenants', 'payments', 'maintenance_tickets', 'announcements', 'notifications'],
    onChange: () => loadSnapshot(false),
    enabled: !isDemoMode,
  });

  useEffect(() => {
    if (refreshCount === 0) {
      return;
    }
    setHighlightRefresh(true);
    const timeout = window.setTimeout(() => setHighlightRefresh(false), 900);
    return () => window.clearTimeout(timeout);
  }, [refreshCount]);

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) {
      return 'All Properties';
    }
    const property = properties.find((entry) => entry.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const occupancyPercent = useMemo(() => {
    if (snapshot.totalRooms === 0) {
      return 0;
    }
    return Math.round((snapshot.occupiedRooms / snapshot.totalRooms) * 100);
  }, [snapshot.totalRooms, snapshot.occupiedRooms]);

  const chartSeries = snapshot.revenueChartData;

  const chartMax = useMemo(() => {
    const values = chartSeries.flatMap((entry) => [entry.revenue, entry.target]);
    const maxValue = Math.max(0, ...values);
    if (maxValue <= 0) {
      return 10000;
    }
    return Math.ceil(maxValue / 5000) * 5000;
  }, [chartSeries]);

  const latestRevenue = chartSeries.at(-1)?.revenue ?? snapshot.monthlyRevenue;
  const previousRevenue = chartSeries.at(-2)?.revenue ?? 0;
  const revenueDeltaPercent = previousRevenue > 0
    ? ((latestRevenue - previousRevenue) / previousRevenue) * 100
    : 0;

  const pendingCount = snapshot.recentPayments.filter((payment) => payment.status !== 'paid').length;
  const overdueCount = snapshot.recentPayments.filter((payment) => payment.status === 'overdue').length;

  const stats: DashboardStat[] = [
    {
      label: 'Monthly Revenue',
      value: formatCurrencyINR(snapshot.monthlyRevenue),
      context: snapshot.monthlyRevenue === 0
        ? '\u20B90 collected this month'
        : previousRevenue > 0
          ? `${formatDeltaPercent(revenueDeltaPercent)} vs last month`
          : 'Baseline month established',
      trend: revenueDeltaPercent >= 0 ? 'up' : 'down',
      status: revenueDeltaPercent >= 0 ? 'Healthy' : 'Watch',
      statusTone: revenueDeltaPercent >= 0 ? 'success' : 'warning',
      icon: CreditCard,
      iconClassName: 'text-indigo-600',
      iconWrapClassName: 'bg-indigo-50 border border-indigo-100',
      accentClassName: 'text-indigo-600',
      accentDotClassName: 'bg-indigo-500',
    },
    {
      label: 'Pending Payments',
      value: formatCurrencyINR(snapshot.pendingAmount),
      context: pendingCount > 0 ? `${pendingCount} invoices open` : 'No pending invoices',
      trend: snapshot.pendingAmount > 0 ? 'down' : 'up',
      status: overdueCount > 0 ? `${overdueCount} overdue` : pendingCount > 0 ? 'Pending only' : 'Cleared',
      statusTone: overdueCount > 0 ? 'error' : pendingCount > 0 ? 'warning' : 'success',
      icon: Clock,
      iconClassName: 'text-rose-600',
      iconWrapClassName: 'bg-rose-50 border border-rose-100',
      accentClassName: 'text-rose-600',
      accentDotClassName: 'bg-rose-500',
    },
    {
      label: 'Total Tenants',
      value: snapshot.totalTenants.toString(),
      context: snapshot.totalTenants > 0 ? 'Across selected properties' : 'No tenants onboarded',
      trend: 'up',
      status: snapshot.totalTenants > 0 ? 'Active' : 'Needs setup',
      statusTone: snapshot.totalTenants > 0 ? 'success' : 'warning',
      icon: Users,
      iconClassName: 'text-emerald-600',
      iconWrapClassName: 'bg-emerald-50 border border-emerald-100',
      accentClassName: 'text-emerald-600',
      accentDotClassName: 'bg-emerald-500',
    },
    {
      label: 'Occupancy Rate',
      value: `${occupancyPercent}%`,
      context: `${snapshot.occupiedRooms}/${snapshot.totalRooms} rooms occupied`,
      trend: occupancyPercent >= 50 ? 'up' : 'down',
      status: occupancyPercent >= 85 ? 'Healthy' : occupancyPercent >= 60 ? 'Watch' : 'Low',
      statusTone: occupancyPercent >= 85 ? 'success' : occupancyPercent >= 60 ? 'warning' : 'error',
      icon: Bed,
      iconClassName: 'text-violet-600',
      iconWrapClassName: 'bg-violet-50 border border-violet-100',
      accentClassName: 'text-violet-600',
      accentDotClassName: 'bg-violet-500',
    },
  ];

  const getStatusClass = (tone: StatTone) => {
    if (tone === 'success') {
      return 'bg-green-50 text-green-700';
    }
    if (tone === 'warning') {
      return 'bg-amber-50 text-amber-700';
    }
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {selectedProperty === 'all'
            ? `Viewing all ${properties.length} properties`
            : `Viewing ${properties.find((property) => property.id === selectedProperty)?.name || 'property'}`}
        </p>
        <div className="mt-3">
          <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label={isDemoMode ? 'Demo data' : 'Live metrics'} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`relative overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow ${highlightRefresh ? 'ring-1 ring-indigo-300' : ''}`}>
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{stat.value}</p>
                    <p className="mt-1 text-sm text-gray-500">{stat.context}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-sm ${stat.iconWrapClassName}`}>
                    <Icon className={`w-5 h-5 ${stat.iconClassName}`} />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(stat.statusTone)}`}>
                    {stat.status}
                  </span>
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
                    <span className={`h-2 w-2 rounded-full ${stat.accentDotClassName}`} />
                    {stat.trend === 'up' ? (
                      <TrendingUp className={`w-4 h-4 ${stat.accentClassName}`} strokeWidth={2.2} />
                    ) : (
                      <TrendingDown className={`w-4 h-4 ${stat.accentClassName}`} strokeWidth={2.2} />
                    )}
                    <span>{stat.trend === 'up' ? 'Improving' : 'Declining'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] gap-6 items-start">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-gray-800">Revenue Trend</h2>
              <p className="text-sm text-gray-500 mt-1">Monthly collections vs target</p>
            </div>
          </div>

          <div className="h-[320px] w-full min-w-0">
            {isLoading ? (
              <div className="h-full w-full rounded-lg bg-gray-50 p-6 animate-pulse space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-[240px] bg-gray-100 rounded" />
              </div>
            ) : (
              chartSeries.length === 0 ? (
                <div className="h-full w-full rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                  No revenue data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `\u20B9${Math.round(value / 1000)}k`}
                      domain={[0, chartMax]}
                      dx={-6}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(17, 24, 39, 0.08)' }}
                      labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                      formatter={(value: number, name: string) => [formatCurrencyINR(value), name === 'revenue' ? 'Revenue' : 'Target']}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="url(#revenueStroke)"
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 0, fill: '#6366F1' }}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#6366F1' }}
                      fill="url(#revenueFill)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 h-fit max-h-[420px] flex flex-col">
          <div className="mb-5">
            <h2 className="text-lg font-medium text-gray-800">Recent Activity</h2>
            <p className="text-sm text-gray-500 mt-1">Latest events across the workspace</p>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1">
            {snapshot.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              snapshot.recentActivity.map((activity) => {
                const visual = resolveActivityVisual(activity.action, activity.detail);
                const Icon = visual.icon;

                return (
                  <div key={activity.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 text-sm">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${visual.iconWrapClassName}`}>
                      <Icon className={`w-4 h-4 ${visual.iconClassName}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 leading-5 break-words">{activity.action}</p>
                      <p className="text-gray-500 mt-0.5 leading-5 break-words">{activity.detail}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                        <span className="min-w-0 truncate max-w-full">{getPropertyName(activity.propertyId)}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(activity.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-800">Recent Payments</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search payments..." className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-52" disabled />
            </div>
            <button className="px-3 py-2 text-sm border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50" disabled>
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant Details</th>
                {selectedProperty === 'all' && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {snapshot.recentPayments.length > 0 ? (
                snapshot.recentPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                          {payment.tenant.split(' ').map((name) => name[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{payment.tenant}</p>
                          <p className="text-xs text-gray-500">{payment.room}</p>
                        </div>
                      </div>
                    </td>
                    {selectedProperty === 'all' && <td className="px-6 py-4 text-sm text-gray-600">{getPropertyName(payment.propertyId)}</td>}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrencyINR(payment.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 4 : 3} className="px-6 py-8 text-center text-gray-500">No payment records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}