import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  HeadphonesIcon,
  Shield,
  Users,
  Wrench,
} from 'lucide-react';
import { supabaseAdminDataApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

type AdminView = 'dashboard' | 'users' | 'analytics' | 'support';

type AdminSummary = Awaited<ReturnType<typeof supabaseAdminDataApi.getAdminSummary>>;

function formatAmount(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminSection() {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await supabaseAdminDataApi.getAdminSummary();
      setSummary(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load admin summary.');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'admin-summary',
    tables: ['properties', 'rooms', 'tenants', 'payments', 'payment_charges', 'maintenance_tickets', 'maintenance_notes', 'announcements', 'notifications'],
    onChange: loadSummary,
  });

  const occupancyMetrics = useMemo(() => {
    const total = summary?.tenants.length ?? 0;
    const active = (summary?.tenants ?? []).filter((tenant) => tenant.status === 'active').length;
    const inactive = Math.max(0, total - active);
    const occupancyRate = total === 0 ? 0 : Math.round((active / total) * 100);

    return {
      total,
      active,
      inactive,
      occupancyRate,
    };
  }, [summary]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading admin analytics...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !summary) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6">
        <p className="text-red-700 text-sm">{errorMessage}</p>
        <button
          onClick={() => void loadSummary()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">Live platform metrics sourced from Supabase.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600 uppercase tracking-wide">Properties</p>
            <Building2 className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl text-gray-900">{summary.stats.totalProperties}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600 uppercase tracking-wide">Tenants</p>
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl text-gray-900">{summary.stats.totalTenants}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600 uppercase tracking-wide">Pending Payments</p>
            <CreditCard className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl text-gray-900">{summary.stats.pendingPayments}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600 uppercase tracking-wide">Monthly Revenue</p>
            <DollarSign className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl text-gray-900">{formatAmount(summary.stats.monthlyRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-gray-900">Recent Tenant Entries</h2>
            <button onClick={() => setCurrentView('users')} className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>
          <div className="p-5 space-y-3">
            {summary.tenants.slice(0, 5).map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                  <p className="text-xs text-gray-500">Room {tenant.room} • {tenant.phone || tenant.email || '-'}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tenant.status}
                </span>
              </div>
            ))}
            {summary.tenants.length === 0 && (
              <p className="text-sm text-gray-500">No tenants found for current admin scope.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-gray-900">Open Support Queue</h2>
            <button onClick={() => setCurrentView('support')} className="text-sm text-blue-600 hover:text-blue-700">
              Open Support
            </button>
          </div>
          <div className="p-5 space-y-3">
            {summary.maintenance.slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ticket.issue}</p>
                  <p className="text-xs text-gray-500">{ticket.tenant} • Room {ticket.room}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    ticket.status === 'resolved'
                      ? 'bg-green-100 text-green-700'
                      : ticket.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
            ))}
            {summary.maintenance.length === 0 && (
              <p className="text-sm text-gray-500">No support tickets available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">User Registry</h1>
          <p className="text-gray-600 mt-1">Live tenant records visible to this admin profile.</p>
        </div>
        <div className="px-3 py-2 rounded-lg bg-gray-100 text-sm text-gray-700">
          {summary.tenants.length} records
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Tenant</th>
              <th className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Contact</th>
              <th className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Room</th>
              <th className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Rent</th>
              <th className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {summary.tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 text-sm text-gray-900 font-medium">{tenant.name}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{tenant.phone || tenant.email || '-'}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{tenant.room}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{formatAmount(tenant.rent)}</td>
                <td className="px-5 py-4 text-sm text-gray-600">{formatDate(tenant.joinDate)}</td>
                <td className="px-5 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Platform Analytics</h1>
        <p className="text-gray-600 mt-1">Operational health for the current month.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Occupancy Rate</p>
          </div>
          <p className="text-3xl text-gray-900">{occupancyMetrics.occupancyRate}%</p>
          <p className="text-xs text-gray-500 mt-2">
            {occupancyMetrics.active} active out of {occupancyMetrics.total} visible tenants
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Collections</p>
          </div>
          <p className="text-3xl text-gray-900">{formatAmount(summary.stats.monthlyRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">Current-month paid rent collection</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-gray-600">Open Tickets</p>
          </div>
          <p className="text-3xl text-gray-900">{summary.stats.openTickets}</p>
          <p className="text-xs text-gray-500 mt-2">Maintenance issues still in queue</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-gray-900 mb-4">Status Breakdown</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Tenant Activity</span>
              <span className="text-gray-900">{occupancyMetrics.active}/{occupancyMetrics.total}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${Math.min(100, occupancyMetrics.occupancyRate)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Payment Dues</span>
              <span className="text-gray-900">{summary.stats.pendingPayments} pending</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{
                  width: `${
                    summary.stats.totalTenants === 0
                      ? 0
                      : Math.min(100, Math.round((summary.stats.pendingPayments / summary.stats.totalTenants) * 100))
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Support Queue</h1>
        <p className="text-gray-600 mt-1">Live maintenance issues routed as support tickets.</p>
      </div>

      <div className="space-y-3">
        {summary.maintenance.map((ticket) => (
          <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-gray-900 font-semibold">{ticket.issue}</p>
                <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {ticket.tenant} • Room {ticket.room} • {formatDate(ticket.date)}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  ticket.status === 'resolved'
                    ? 'bg-green-100 text-green-700'
                    : ticket.status === 'in-progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {ticket.status}
              </span>
            </div>
          </div>
        ))}

        {summary.maintenance.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            No support tickets are currently available.
          </div>
        )}
      </div>
    </div>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUsers();
      case 'analytics':
        return renderAnalytics();
      case 'support':
        return renderSupport();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            currentView === 'dashboard' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('users')}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            currentView === 'users' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setCurrentView('analytics')}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            currentView === 'analytics' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
        <button
          onClick={() => setCurrentView('support')}
          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            currentView === 'support' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          <HeadphonesIcon className="w-4 h-4" />
          Support
        </button>
      </div>

      <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Admin telemetry live" />

      {renderView()}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-semibold">Admin data source</p>
          <p className="text-xs text-blue-700 mt-1">
            This panel now reads live property, tenant, payment, and maintenance tables from Supabase.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-600">
        <Wrench className="w-4 h-4 text-gray-500" />
        Signed in as {summary.profile.name} ({summary.profile.role})
      </div>
    </div>
  );
}
