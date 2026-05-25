import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CreditCard,
  DollarSign,
  HeadphonesIcon,
  Package,
  Shield,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { SupportTicketStatus, supabaseAdminDataApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';
import { useLocalization } from '../contexts/LocalizationContext';

type AdminView = 'dashboard' | 'owners' | 'subscriptions' | 'support' | 'activity';
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
  const { t } = useLocalization();
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
    key: 'platform-admin-summary',
    tables: [
      'profiles',
      'properties',
      'tenants',
      'payments',
      'owner_subscriptions',
      'support_tickets',
      'support_ticket_comments',
    ],
    onChange: loadSummary,
  });

  const handleSubscriptionStatusChange = async (ownerId: string, status: 'trialing' | 'active' | 'past_due' | 'cancelled') => {
    try {
      await supabaseAdminDataApi.updateOwnerSubscription(ownerId, { status });
      toast.success('Subscription status updated');
      await loadSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subscription.');
    }
  };

  const handleSupportStatusChange = async (ticketId: string, status: SupportTicketStatus) => {
    try {
      await supabaseAdminDataApi.updateSupportTicketStatus(ticketId, status);
      toast.success('Support ticket updated');
      await loadSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update support ticket.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading platform control center...</p>
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
        <h1 className="text-gray-900">{t('admin.title', 'Platform Admin')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.subtitle', 'SaaS control center for owners, plans, support, and operations.')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Owners</p>
          <p className="text-2xl text-gray-900 mt-2">{summary.stats.totalOwners}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Properties</p>
          <p className="text-2xl text-gray-900 mt-2">{summary.stats.totalProperties}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tenants</p>
          <p className="text-2xl text-gray-900 mt-2">{summary.stats.totalTenants}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Plans</p>
          <p className="text-2xl text-gray-900 mt-2">{summary.stats.activeSubscriptions}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Open Support</p>
          <p className="text-2xl text-gray-900 mt-2">{summary.stats.openSupportTickets}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Monthly Revenue</p>
          <p className="text-xl text-gray-900 mt-2">{formatAmount(summary.stats.monthlyRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Top Owner Accounts</h2>
            <button onClick={() => setCurrentView('owners')} className="text-sm text-blue-600 hover:text-blue-700">View all</button>
          </div>
          <div className="space-y-3">
            {summary.owners.slice(0, 6).map((owner) => (
              <div key={owner.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900 font-semibold">{owner.name}</p>
                  <p className="text-xs text-gray-500">{owner.propertyCount} properties • {owner.tenantCount} tenants</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{owner.planCode}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Support Queue</h2>
            <button onClick={() => setCurrentView('support')} className="text-sm text-blue-600 hover:text-blue-700">Open queue</button>
          </div>
          <div className="space-y-3">
            {summary.support.slice(0, 6).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-900 font-semibold">{ticket.subject}</p>
                  <p className="text-xs text-gray-500">{ticket.category} • {formatDate(ticket.createdAt)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${ticket.status === 'open' ? 'bg-red-100 text-red-700' : ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {ticket.status}
                </span>
              </div>
            ))}
            {summary.support.length === 0 && (
              <p className="text-sm text-gray-500">No support tickets in the queue.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOwners = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Owner Accounts</h1>
        <p className="text-gray-600 mt-1">Tenant and property footprint by owner organization.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Owner</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">PG</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">City</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Properties</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Tenants</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {summary.owners.map((owner) => (
              <tr key={owner.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900 font-semibold">{owner.name}</p>
                  <p className="text-xs text-gray-500">{owner.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{owner.pgName || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{owner.city || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{owner.propertyCount}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{owner.tenantCount}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{owner.planCode}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSubscriptions = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Subscriptions</h1>
        <p className="text-gray-600 mt-1">Manage plan lifecycle and billing status for each owner.</p>
      </div>
      <div className="space-y-3">
        {summary.owners.map((owner) => (
          <div key={owner.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div>
              <p className="text-sm text-gray-900 font-semibold">{owner.name}</p>
              <p className="text-xs text-gray-500">{owner.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Plan: {owner.planCode}</span>
              <select
                value={owner.subscriptionStatus === 'not_configured' ? 'trialing' : owner.subscriptionStatus}
                onChange={(event) => void handleSubscriptionStatusChange(owner.id, event.target.value as 'trialing' | 'active' | 'past_due' | 'cancelled')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}
        {summary.owners.length === 0 && <p className="text-sm text-gray-500">No owner accounts found.</p>}
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Support</h1>
        <p className="text-gray-600 mt-1">Platform-level support queue across all owners.</p>
      </div>
      <div className="space-y-3">
        {summary.support.map((ticket) => (
          <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-900 font-semibold">{ticket.subject}</p>
                <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                <p className="text-xs text-gray-500 mt-2">{ticket.category} • {ticket.priority} • {formatDate(ticket.createdAt)}</p>
              </div>
              <select
                value={ticket.status}
                onChange={(event) => void handleSupportStatusChange(ticket.id, event.target.value as SupportTicketStatus)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        ))}
        {summary.support.length === 0 && <p className="text-sm text-gray-500">No support tickets available.</p>}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Activity</h1>
        <p className="text-gray-600 mt-1">Recent platform events and ticket activity.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {summary.activity.map((entry) => (
          <div key={entry.id} className="px-4 py-3">
            <p className="text-sm text-gray-900 font-semibold">{entry.label}</p>
            <p className="text-sm text-gray-600 mt-0.5">{entry.detail}</p>
            <p className="text-xs text-gray-500 mt-1">{formatDate(entry.createdAt)}</p>
          </div>
        ))}
        {summary.activity.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No recent activity.</p>}
      </div>
    </div>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'owners':
        return renderOwners();
      case 'subscriptions':
        return renderSubscriptions();
      case 'support':
        return renderSupport();
      case 'activity':
        return renderActivity();
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
        <button onClick={() => setCurrentView('dashboard')} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentView === 'dashboard' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}><Shield className="w-4 h-4" />Dashboard</button>
        <button onClick={() => setCurrentView('owners')} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentView === 'owners' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}><Users className="w-4 h-4" />Owners</button>
        <button onClick={() => setCurrentView('subscriptions')} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentView === 'subscriptions' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}><Package className="w-4 h-4" />Subscriptions</button>
        <button onClick={() => setCurrentView('support')} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentView === 'support' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}><HeadphonesIcon className="w-4 h-4" />Support</button>
        <button onClick={() => setCurrentView('activity')} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currentView === 'activity' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}><Activity className="w-4 h-4" />Activity</button>
      </div>

      <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Platform telemetry live" />

      {renderView()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-semibold">SaaS administration mode</p>
            <p className="text-xs text-blue-700 mt-1">Owners, subscriptions, and support tickets are now managed from one control plane.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-sm text-gray-600">
          <Building2 className="w-4 h-4 text-gray-500" />
          Signed in as {summary.profile.name} ({summary.profile.role})
          <span className="mx-2 text-gray-300">|</span>
          <CreditCard className="w-4 h-4 text-gray-500" />
          {summary.stats.activeSubscriptions} active plans
          <span className="mx-2 text-gray-300">|</span>
          <DollarSign className="w-4 h-4 text-gray-500" />
          {formatAmount(summary.stats.monthlyRevenue)}
        </div>
      </div>
    </div>
  );
}
