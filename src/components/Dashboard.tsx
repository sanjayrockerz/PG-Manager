import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Bed, CreditCard, TrendingUp, TrendingDown, Clock, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProperty } from '../contexts/PropertyContext';
import { DashboardSnapshot, supabaseOwnerDataApi } from '../services/supabaseData';
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

export function Dashboard() {
  const { selectedProperty, properties } = useProperty();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightRefresh, setHighlightRefresh] = useState(false);

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await supabaseOwnerDataApi.getDashboardSnapshot(selectedProperty);
      setSnapshot(data);
    } catch {
      setError('Unable to load dashboard data. Please check Supabase setup.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const { isSyncing, lastUpdatedAt, refreshCount } = useRealtimeRefresh({
    key: `dashboard-${selectedProperty}`,
    tables: ['properties', 'rooms', 'tenants', 'payments', 'maintenance_tickets', 'announcements', 'notifications'],
    onChange: loadSnapshot,
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

  const stats = [
    {
      label: 'Monthly Revenue',
      value: `Rs ${snapshot.monthlyRevenue.toLocaleString()}`,
      change: snapshot.monthlyRevenue > 0 ? 'Live' : 'No payments yet',
      trend: 'up',
      icon: CreditCard,
    },
    {
      label: 'Pending Payments',
      value: `Rs ${snapshot.pendingAmount.toLocaleString()}`,
      change: `${snapshot.recentPayments.filter((payment) => payment.status !== 'paid').length} dues`,
      trend: 'down',
      icon: Clock,
    },
    {
      label: 'Total Tenants',
      value: snapshot.totalTenants.toString(),
      change: snapshot.totalTenants > 0 ? 'Active tenants' : 'Add first tenant',
      trend: 'up',
      icon: Users,
    },
    {
      label: 'Occupancy Rate',
      value: `${occupancyPercent}%`,
      change: `${snapshot.occupiedRooms}/${snapshot.totalRooms} rooms`,
      trend: occupancyPercent >= 50 ? 'up' : 'down',
      icon: Bed,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {selectedProperty === 'all'
            ? `Viewing all ${properties.length} properties`
            : `Viewing ${properties.find((property) => property.id === selectedProperty)?.name || 'property'}`}
        </p>
        <div className="mt-3">
          <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Live metrics" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-white rounded-xl p-6 border border-gray-200 flex flex-col justify-between hover:shadow-md transition-all ${highlightRefresh ? 'ring-2 ring-emerald-200' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">{stat.label}</p>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-gray-900 text-3xl font-bold tracking-tight">{stat.value}</p>
                <div className="flex items-center gap-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" strokeWidth={2.5} />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                  )}
                  <span className={`text-sm font-bold ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-gray-900 text-lg font-bold tracking-tight">Revenue Trend</h2>
              <p className="text-sm text-gray-500 mt-1 font-medium">Live collections for recent months</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600 font-semibold">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 font-semibold">Target</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[320px] w-full">
            {isLoading ? (
              <div className="h-full w-full p-6 space-y-3 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-44 bg-gray-100 rounded" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshot.revenueChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: 600 }}
                    labelStyle={{ color: '#6B7280', marginBottom: '8px' }}
                    formatter={(value: number) => [`Rs ${value.toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="target" stroke="#22C55E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTarget)" activeDot={{ r: 6, strokeWidth: 0, fill: '#22C55E' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            {snapshot.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              snapshot.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{activity.detail}</p>
                    <p className="text-xs text-gray-400 mt-1">{getPropertyName(activity.propertyId)}</p>
                    <p className="text-xs font-medium text-gray-400 mt-1">{new Date(activity.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-gray-900">Recent Payments</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search payments..." className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48" disabled />
            </div>
            <button className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium" disabled>
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
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Rs {payment.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
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