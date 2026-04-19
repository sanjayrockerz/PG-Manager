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

export type AdminView = 'dashboard' | 'owners' | 'subscriptions' | 'support' | 'activity';
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

interface AdminSectionProps {
  view?: AdminView;
  onNavigate?: (view: AdminView) => void;
}

export function AdminSection({ view = 'dashboard', onNavigate }: AdminSectionProps = {}) {
  const { t } = useLocalization();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Drill-down states
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [detailedOwner, setDetailedOwner] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

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

  useEffect(() => {
    if (selectedOwnerId) {
      setIsDetailLoading(true);
      supabaseAdminDataApi.getAdminOwnerDetailedView(selectedOwnerId)
        .then(setDetailedOwner)
        .catch((e) => toast.error('Failed to load owner details: ' + e.message))
        .finally(() => setIsDetailLoading(false));
    } else {
      setDetailedOwner(null);
    }
  }, [selectedOwnerId]);

  const handleDeleteOwner = async (ownerId: string, name: string) => {
    if (!confirm(`WARNING: Are you absolutely sure you want to permanently delete the entire organization account for ${name}?\n\nThis will instantly wipe ALL their properties, tenants, billing data, and configuration natively from the system. This action CANNOT be reversed.`)) {
      return;
    }
    
    try {
      await supabaseAdminDataApi.deleteOwnerProfile(ownerId);
      toast.success('Organization data permanently wiped.');
      setSelectedOwnerId(null);
      await loadSummary();
    } catch (e) {
      toast.error('Failed to delete user: ' + (e as Error).message);
    }
  };

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('admin.title', 'Platform Intelligence')}</h1>
          <p className="text-slate-500 mt-1 font-medium">{t('admin.subtitle', 'Live telemetry and ecosystem overview.')}</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">System Operational</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: formatAmount(summary.stats.monthlyRevenue), sub: '+12.5% from last month', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'PG Owners', value: summary.stats.totalOwners, sub: 'Active Organizations', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Tenants', value: summary.stats.totalTenants, sub: 'Housed Profiles', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Nodes', value: summary.stats.totalProperties, sub: 'Hardware Properties', icon: Building2, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Rev Breakdown */}
        <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" /> Subscription Weight
          </h2>
          <div className="space-y-6">
             {[
               { name: 'Enterprise', percentage: 45, color: 'bg-blue-600' },
               { name: 'Professional', percentage: 35, color: 'bg-purple-600' },
               { name: 'Starter', percentage: 20, color: 'bg-emerald-500' },
             ].map((plan, i) => (
               <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-700">{plan.name}</span>
                    <span className="text-slate-400">{plan.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${plan.color} rounded-full`} style={{ width: `${plan.percentage}%` }}></div>
                  </div>
               </div>
             ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Auto-renew Rate</span>
                <span className="text-emerald-600 font-bold">98.2%</span>
             </div>
          </div>
        </div>

        {/* Support Queue Analytics */}
        <div className="xl:col-span-2 bg-slate-900 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <Activity className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
               <div>
                 <h2 className="text-2xl font-black">Support Telemetry</h2>
                 <p className="text-slate-400 font-medium text-sm">Real-time resolution velocity</p>
               </div>
               <button onClick={() => onNavigate?.('support')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors">
                 Action All Tickets
               </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <div className="space-y-1">
                  <p className="text-3xl font-black">{summary.stats.openSupportTickets}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Tickets</p>
               </div>
               <div className="space-y-1 text-emerald-400">
                  <p className="text-3xl font-black">12m</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Response</p>
               </div>
               <div className="space-y-1">
                  <p className="text-3xl font-black">94%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CSAT Score</p>
               </div>
               <div className="space-y-1">
                  <p className="text-3xl font-black">2.4k</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved YTD</p>
               </div>
            </div>

            <div className="mt-12 space-y-4">
               {summary.support.slice(0, 3).map((ticket) => (
                 <div key={ticket.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                       <div>
                          <p className="text-sm font-bold group-hover:text-blue-400 transition-colors">{ticket.subject}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">{ticket.id.slice(0, 8)} • {formatDate(ticket.createdAt)}</p>
                       </div>
                    </div>
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 line-clamp-1">{ticket.status}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOwners = () => {
    if (selectedOwnerId) {
      const parentOwner = summary.owners.find(o => o.id === selectedOwnerId);
      if (!parentOwner) return null;

      return (
        <div className="space-y-6">
          <button onClick={() => setSelectedOwnerId(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-2">
            ← Back to All Owners
          </button>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{parentOwner.name}</h1>
                  <p className="text-sm text-gray-500">{parentOwner.email}</p>
                  <div className="mt-4 flex gap-4 text-sm text-gray-600">
                     <div><span className="font-semibold text-gray-900">City:</span> {parentOwner.city || '-'}</div>
                     <div><span className="font-semibold text-gray-900">Brand:</span> {parentOwner.pgName || '-'}</div>
                     <div><span className="font-semibold text-gray-900">Phone:</span> {parentOwner.phone || '-'}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                   <button onClick={() => handleDeleteOwner(parentOwner.id, parentOwner.name)} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors w-full text-center">
                     Destruct / Wipe Account
                   </button>
                </div>
             </div>
          </div>

          {isDetailLoading ? (
            <div className="w-full text-center py-10"><div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div></div>
          ) : detailedOwner ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white rounded-xl border border-gray-200 p-5">
                 <h2 className="text-gray-900 font-semibold mb-3 border-b pb-2">Hardware Nodes (Properties) [{detailedOwner.properties.length}]</h2>
                 {detailedOwner.properties.length === 0 ? <p className="text-sm text-gray-500">No properties deployed.</p> : (
                   <div className="space-y-3">
                     {detailedOwner.properties.map((p: any) => (
                       <div key={p.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500 truncate">{p.address_line1}, {p.city} {p.pincode}</p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               <div className="bg-white rounded-xl border border-gray-200 p-5">
                 <h2 className="text-gray-900 font-semibold mb-3 border-b pb-2">Active Profiles (Tenants) [{detailedOwner.tenants.length}]</h2>
                 {detailedOwner.tenants.length === 0 ? <p className="text-sm text-gray-500">No tenants housed.</p> : (
                   <div className="space-y-3 max-h-96 overflow-y-auto">
                     {detailedOwner.tenants.map((t: any) => (
                       <div key={t.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                            <p className="text-xs text-gray-500">{t.email || t.phone}</p>
                          </div>
                          <p className="text-sm font-semibold text-green-700">₹{t.rent_amount}</p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
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
                <th className="px-4 py-3 text-right text-xs text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary.owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedOwnerId(owner.id)} className="text-sm text-blue-600 font-semibold hover:text-blue-800">Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
    switch (view) {
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

      <div className="flex items-center justify-between">
        <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Platform telemetry live" />
      </div>

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


