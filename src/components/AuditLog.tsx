import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Bell, Calendar, CheckCircle2, CreditCard,
  Download, Filter, Home, IndianRupee, Loader2, LogOut,
  Megaphone, MessageCircle, RefreshCw, Search, Shield, User, Users,
  Wrench, X, FileText, Settings, UserPlus,
} from 'lucide-react';
import { Button } from './ui/button';
import { useProperty } from '../contexts/PropertyContext';
import { getActivityLog, isDemoModeEnabled } from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import type { ActivityLogEntry } from '../services/supabaseData';

interface AuditLogProps {
  onBack?: () => void;
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TENANT_ASSIGNED: Users,
  TENANT_VACATED: LogOut,
  TENANT_ARCHIVED: Shield,
  TENANT_STATUS_CHANGED: User,
  ROOM_VACATED: Home,
  ROOM_OCCUPIED: Home,
  PAYMENT_RECEIVED: CreditCard,
  PAYMENT_OVERDUE: IndianRupee,
  DEPOSIT_SETTLED: IndianRupee,
  MAINTENANCE_CREATED: Wrench,
  MAINTENANCE_RESOLVED: CheckCircle2,
  MAINTENANCE_UPDATED: Wrench,
  ANNOUNCEMENT_CREATED: Megaphone,
  PROPERTY_UPDATED: Settings,
  CSV_IMPORT_COMPLETED: FileText,
  TEAM_INVITE_SENT: UserPlus,
  TEAM_INVITE_REVOKED: UserPlus,
  TEAM_INVITE_REFRESHED: UserPlus,
  TEAM_INVITE_ACCEPTED: Users,
  TEAM_MEMBER_REMOVED: Users,
  PROPERTY_SCOPE_ADDED: Shield,
  PROPERTY_SCOPE_UPDATED: Shield,
  PROPERTY_SCOPE_REMOVED: Shield,
  PROFILE_UPDATED: User,
  PROFILE_PHOTO_UPDATED: User,
  PAYMENT_SETTINGS_UPDATED: CreditCard,
  NOTIFICATION_SETTINGS_UPDATED: Bell,
  WHATSAPP_SETTINGS_UPDATED: MessageCircle,
  SUBSCRIPTION_CHANGE_REQUESTED: Shield,
  COUPON_APPLIED: Shield,
  PASSWORD_RESET_REQUESTED: Shield,
  ACCOUNT_DATA_EXPORTED: Download,
  ACCOUNT_DATA_CLEARED: AlertTriangle,
  DEFAULT: Activity,
};

const EVENT_COLORS: Record<string, string> = {
  TENANT_ASSIGNED: 'bg-green-100 text-green-700',
  TENANT_VACATED: 'bg-red-100 text-red-700',
  TENANT_ARCHIVED: 'bg-gray-100 text-gray-600',
  TENANT_STATUS_CHANGED: 'bg-blue-100 text-blue-700',
  ROOM_VACATED: 'bg-amber-100 text-amber-700',
  ROOM_OCCUPIED: 'bg-green-100 text-green-600',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700',
  PAYMENT_OVERDUE: 'bg-red-100 text-red-700',
  DEPOSIT_SETTLED: 'bg-indigo-100 text-indigo-700',
  MAINTENANCE_CREATED: 'bg-orange-100 text-orange-700',
  MAINTENANCE_RESOLVED: 'bg-teal-100 text-teal-700',
  MAINTENANCE_UPDATED: 'bg-orange-100 text-orange-600',
  ANNOUNCEMENT_CREATED: 'bg-violet-100 text-violet-700',
  CSV_IMPORT_COMPLETED: 'bg-blue-100 text-blue-600',
  TEAM_INVITE_SENT: 'bg-indigo-100 text-indigo-700',
  TEAM_INVITE_REVOKED: 'bg-red-100 text-red-700',
  TEAM_INVITE_REFRESHED: 'bg-amber-100 text-amber-700',
  TEAM_INVITE_ACCEPTED: 'bg-green-100 text-green-700',
  TEAM_MEMBER_REMOVED: 'bg-red-100 text-red-700',
  PROPERTY_SCOPE_ADDED: 'bg-blue-100 text-blue-700',
  PROPERTY_SCOPE_UPDATED: 'bg-amber-100 text-amber-700',
  PROPERTY_SCOPE_REMOVED: 'bg-red-100 text-red-700',
  PROFILE_UPDATED: 'bg-slate-100 text-slate-700',
  PROFILE_PHOTO_UPDATED: 'bg-slate-100 text-slate-700',
  PAYMENT_SETTINGS_UPDATED: 'bg-emerald-100 text-emerald-700',
  NOTIFICATION_SETTINGS_UPDATED: 'bg-blue-100 text-blue-700',
  WHATSAPP_SETTINGS_UPDATED: 'bg-green-100 text-green-700',
  SUBSCRIPTION_CHANGE_REQUESTED: 'bg-indigo-100 text-indigo-700',
  COUPON_APPLIED: 'bg-green-100 text-green-700',
  PASSWORD_RESET_REQUESTED: 'bg-amber-100 text-amber-700',
  ACCOUNT_DATA_EXPORTED: 'bg-gray-100 text-gray-600',
  ACCOUNT_DATA_CLEARED: 'bg-red-100 text-red-700',
  DEFAULT: 'bg-gray-100 text-gray-600',
};

const EVENT_LABELS: Record<string, string> = {
  TENANT_ASSIGNED: 'Tenant Onboarded',
  TENANT_VACATED: 'Tenant Vacated',
  TENANT_ARCHIVED: 'Tenant Archived',
  TENANT_STATUS_CHANGED: 'Status Changed',
  ROOM_VACATED: 'Room Vacated',
  ROOM_OCCUPIED: 'Room Occupied',
  PAYMENT_RECEIVED: 'Payment Received',
  PAYMENT_OVERDUE: 'Payment Overdue',
  DEPOSIT_SETTLED: 'Deposit Settled',
  MAINTENANCE_CREATED: 'Ticket Created',
  MAINTENANCE_RESOLVED: 'Ticket Resolved',
  MAINTENANCE_UPDATED: 'Ticket Updated',
  ANNOUNCEMENT_CREATED: 'Announcement Posted',
  CSV_IMPORT_COMPLETED: 'CSV Import Done',
  PROPERTY_UPDATED: 'Property Updated',
  TEAM_INVITE_SENT: 'Team Invite Sent',
  TEAM_INVITE_REVOKED: 'Team Invite Revoked',
  TEAM_INVITE_REFRESHED: 'Team Invite Renewed',
  TEAM_INVITE_ACCEPTED: 'Team Invite Accepted',
  TEAM_MEMBER_REMOVED: 'Team Member Removed',
  PROPERTY_SCOPE_ADDED: 'Property Access Granted',
  PROPERTY_SCOPE_UPDATED: 'Property Access Updated',
  PROPERTY_SCOPE_REMOVED: 'Property Access Removed',
  PROFILE_UPDATED: 'Profile Updated',
  PROFILE_PHOTO_UPDATED: 'Profile Photo Updated',
  PAYMENT_SETTINGS_UPDATED: 'Payment Settings Updated',
  NOTIFICATION_SETTINGS_UPDATED: 'Notification Preferences Updated',
  WHATSAPP_SETTINGS_UPDATED: 'WhatsApp Settings Updated',
  SUBSCRIPTION_CHANGE_REQUESTED: 'Plan Change Requested',
  COUPON_APPLIED: 'Coupon Applied',
  PASSWORD_RESET_REQUESTED: 'Password Reset Requested',
  ACCOUNT_DATA_EXPORTED: 'Account Data Exported',
  ACCOUNT_DATA_CLEARED: 'Account Data Cleared',
};

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All Events' },
  { key: 'tenant', label: 'Tenants', events: ['TENANT_ASSIGNED', 'TENANT_VACATED', 'TENANT_ARCHIVED', 'TENANT_STATUS_CHANGED'] },
  { key: 'payment', label: 'Payments', events: ['PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'DEPOSIT_SETTLED'] },
  { key: 'maintenance', label: 'Maintenance', events: ['MAINTENANCE_CREATED', 'MAINTENANCE_RESOLVED', 'MAINTENANCE_UPDATED'] },
  { key: 'rooms', label: 'Rooms', events: ['ROOM_VACATED', 'ROOM_OCCUPIED'] },
  { key: 'team', label: 'Team', events: ['TEAM_INVITE_SENT', 'TEAM_INVITE_REVOKED', 'TEAM_INVITE_REFRESHED', 'TEAM_INVITE_ACCEPTED', 'TEAM_MEMBER_REMOVED', 'PROPERTY_SCOPE_ADDED', 'PROPERTY_SCOPE_UPDATED', 'PROPERTY_SCOPE_REMOVED'] },
  { key: 'settings', label: 'Settings', events: ['PROFILE_UPDATED', 'PROFILE_PHOTO_UPDATED', 'PAYMENT_SETTINGS_UPDATED', 'NOTIFICATION_SETTINGS_UPDATED', 'WHATSAPP_SETTINGS_UPDATED', 'SUBSCRIPTION_CHANGE_REQUESTED', 'COUPON_APPLIED', 'PASSWORD_RESET_REQUESTED', 'ACCOUNT_DATA_EXPORTED', 'ACCOUNT_DATA_CLEARED'] },
  { key: 'other', label: 'Other', events: ['ANNOUNCEMENT_CREATED', 'CSV_IMPORT_COMPLETED', 'PROPERTY_UPDATED'] },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function AuditEntry({ entry, propertyName }: { entry: ActivityLogEntry; propertyName?: string }) {
  const Icon = EVENT_ICONS[entry.event] ?? EVENT_ICONS.DEFAULT;
  const colorClass = EVENT_COLORS[entry.event] ?? EVENT_COLORS.DEFAULT;
  const label = EVENT_LABELS[entry.event] ?? entry.event.replace(/_/g, ' ');

  return (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0 group">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</span>
            {propertyName && (
              <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{propertyName}</span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 flex-shrink-0 whitespace-nowrap">{formatRelativeTime(entry.createdAt)}</span>
        </div>
        <p className="text-sm text-zinc-800 leading-relaxed">{entry.detail}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">
          {new Date(entry.createdAt).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

export function AuditLog({ onBack }: AuditLogProps) {
  const { properties, selectedProperty } = useProperty();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(50);

  const getPropertyName = (propertyId: string | null) =>
    propertyId ? (properties.find((p) => p.id === propertyId)?.name ?? null) : null;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getActivityLog(selectedProperty, 200);
      setEntries(data);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProperty]);

  useEffect(() => { void load(); }, [load]);

  useRealtimeRefresh({
    key: 'audit-log',
    tables: ['activity_logs'],
    onChange: () => void load(true),
    enabled: !isDemoModeEnabled(),
  });

  const filtered = useMemo(() => {
    let result = entries;

    if (categoryFilter !== 'all') {
      const cat = CATEGORY_FILTERS.find((f) => f.key === categoryFilter);
      if (cat?.events) {
        result = result.filter((e) => cat.events!.includes(e.event));
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.detail.toLowerCase().includes(q) ||
          e.event.toLowerCase().includes(q) ||
          (EVENT_LABELS[e.event] ?? '').toLowerCase().includes(q),
      );
    }

    return result.slice(0, limit);
  }, [entries, categoryFilter, search, limit]);

  const exportCSV = () => {
    const rows = [
      ['Timestamp', 'Event', 'Detail', 'Property'],
      ...filtered.map((e) => [
        new Date(e.createdAt).toISOString(),
        e.event,
        `"${e.detail.replace(/"/g, '""')}"`,
        getPropertyName(e.propertyId) ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Full operational history — every action, timestamped</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="gap-1.5 text-gray-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="gap-1.5 text-gray-600"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
            placeholder="Search events, details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            categoryFilter !== 'all'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {categoryFilter === 'all' ? 'Filter' : CATEGORY_FILTERS.find((f) => f.key === categoryFilter)?.label}
        </button>
      </div>

      {/* Category filter chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setCategoryFilter(f.key); setShowFilters(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Events', value: entries.length },
          { label: 'Showing', value: filtered.length },
          { label: 'Today', value: entries.filter((e) => new Date(e.createdAt).toDateString() === new Date().toDateString()).length },
          { label: 'This Week', value: entries.filter((e) => Date.now() - new Date(e.createdAt).getTime() < 7 * 86400000).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Activity Timeline</span>
          </div>
          <span className="text-xs text-gray-400">{filtered.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Activity className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1">Actions taken in the platform appear here automatically.</p>
          </div>
        ) : (
          <>
            {filtered.map((entry) => (
              <AuditEntry
                key={entry.id}
                entry={entry}
                propertyName={getPropertyName(entry.propertyId) ?? undefined}
              />
            ))}

            {/* Load more */}
            {entries.length > limit && (
              <div className="px-4 py-3 text-center border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit((l) => l + 50)}
                  className="text-gray-600"
                >
                  Load more ({entries.length - limit} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
