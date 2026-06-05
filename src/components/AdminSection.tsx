import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  Gift,
  Globe,
  HeadphonesIcon,
  Link2,
  MessageSquare,
  Package,
  Search,
  Server,
  Shield,
  Tag,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { InfrastructureHealth } from './InfrastructureHealth';
import { toast } from 'sonner';
import {
  type AdminCouponRecord,
  type SupportTicketStatus,
  supabaseAdminDataApi,
} from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';
import { useLocalization } from '../contexts/LocalizationContext';
import { useDateRange } from '../contexts/DateRangeContext';

type AdminView =
  | 'dashboard'
  | 'owners'
  | 'owner-detail'
  | 'subscriptions'
  | 'support'
  | 'analytics'
  | 'coupons'
  | 'referrals'
  | 'leads'
  | 'activity'
  | 'infrastructure'
  | 'notifications';

type AdminSummary = Awaited<ReturnType<typeof supabaseAdminDataApi.getAdminSummary>>;
type OwnerCard = AdminSummary['owners'][number];

const PAGE_SIZE = 20;

function formatRs(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'trialing': return 'bg-blue-100 text-blue-700';
    case 'past_due': return 'bg-amber-100 text-amber-700';
    case 'cancelled': return 'bg-gray-100 text-gray-600';
    case 'not_configured': return 'bg-gray-100 text-gray-500';
    case 'open': return 'bg-red-100 text-red-700';
    case 'in_progress': return 'bg-yellow-100 text-yellow-700';
    case 'resolved': return 'bg-green-100 text-green-700';
    case 'closed': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function Bar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <p className="text-xs text-gray-500">{Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}</p>
      <div className="flex gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={() => onChange(page + 1)} disabled={page === pages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function AdminSection() {
  const { t } = useLocalization();
  const { range } = useDateRange();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Owner detail state
  const [selectedOwner, setSelectedOwner] = useState<OwnerCard | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getAdminOwnerDetailedView>> | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [viewAsOwnerOpen, setViewAsOwnerOpen] = useState(false);

  // Owners list state
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerPlanFilter, setOwnerPlanFilter] = useState('');
  const [ownerStatusFilter, setOwnerStatusFilter] = useState('');
  const [ownerPage, setOwnerPage] = useState(1);

  // Support state
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('');
  const [supportPriorityFilter, setSupportPriorityFilter] = useState('');
  const [supportPage, setSupportPage] = useState(1);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // MRR / Analytics
  const [mrrData, setMrrData] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getMRRHistory>> | null>(null);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getPlatformAnalytics>> | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<AdminCouponRecord[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', description: '', discountType: 'percent' as 'percent' | 'flat', discountValue: '', maxUses: '', validUntil: '', planRestriction: '' });
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);

  // Referrals
  const [referralStats, setReferralStats] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getReferralStats>> | null>(null);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);

  // Leads
  const [leadStats, setLeadStats] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getLeadSourceStats>> | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Referral create form
  const [createReferralOpen, setCreateReferralOpen] = useState(false);
  const [newReferralEmail, setNewReferralEmail] = useState('');
  const [newReferralReward, setNewReferralReward] = useState('');
  const [isCreatingReferral, setIsCreatingReferral] = useState(false);

  // Suspend dialog
  const [suspendTarget, setSuspendTarget] = useState<OwnerCard | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await supabaseAdminDataApi.getAdminSummary();
      setSummary(data);
      // Functional update keeps selectedOwner in sync without adding it as a dep
      // (adding selectedOwner as dep would retrigger this effect on every row click)
      setSelectedOwner((prev) => {
        if (!prev) return prev;
        const updated = data.owners.find((o) => o.id === prev.id);
        return updated ?? prev;
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load admin summary.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'platform-admin-summary',
    tables: ['profiles', 'properties', 'tenants', 'payments', 'owner_subscriptions', 'support_tickets', 'support_ticket_comments', 'admin_coupons', 'referrals', 'lead_sources'],
    onChange: loadSummary,
  });

  const loadOwnerDetail = useCallback(async (ownerId: string) => {
    setIsLoadingDetail(true);
    try {
      const data = await supabaseAdminDataApi.getAdminOwnerDetailedView(ownerId);
      setOwnerDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load owner detail.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const openOwnerDetail = (owner: OwnerCard) => {
    setSelectedOwner(owner);
    setOwnerDetail(null);
    setViewAsOwnerOpen(false);
    setCurrentView('owner-detail');
    void loadOwnerDetail(owner.id);
  };

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const [mrr, ana] = await Promise.all([
        supabaseAdminDataApi.getMRRHistory(range),
        supabaseAdminDataApi.getPlatformAnalytics(),
      ]);
      setMrrData(mrr);
      setAnalytics(ana);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    setIsLoadingCoupons(true);
    try {
      const data = await supabaseAdminDataApi.listCoupons();
      setCoupons(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load coupons.');
    } finally {
      setIsLoadingCoupons(false);
    }
  }, []);

  const loadReferrals = useCallback(async () => {
    setIsLoadingReferrals(true);
    try {
      const data = await supabaseAdminDataApi.getReferralStats();
      setReferralStats(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load referrals.');
    } finally {
      setIsLoadingReferrals(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const data = await supabaseAdminDataApi.getLeadSourceStats();
      setLeadStats(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load leads.');
    } finally {
      setIsLoadingLeads(false);
    }
  }, []);

  // Reload analytics when date range changes while on analytics view
  useEffect(() => {
    if (currentView === 'analytics') void loadAnalytics();
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (view: AdminView) => {
    setCurrentView(view);
    if (view === 'analytics') void loadAnalytics();
    if (view === 'coupons' && coupons.length === 0) void loadCoupons();
    if (view === 'referrals' && !referralStats) void loadReferrals();
    if (view === 'leads' && !leadStats) void loadLeads();
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSubscriptionStatusChange = async (ownerId: string, status: 'trialing' | 'active' | 'past_due' | 'cancelled') => {
    try {
      await supabaseAdminDataApi.updateOwnerSubscription(ownerId, { status });
      toast.success('Subscription status updated');
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subscription.');
    }
  };

  const handlePlanChange = async (ownerId: string, planCode: string) => {
    if (!planCode.trim()) return;
    const prevPlan = summary?.owners.find((o) => o.id === ownerId)?.planCode ?? 'unknown';
    try {
      await supabaseAdminDataApi.updateOwnerSubscription(ownerId, { planCode: planCode.trim().toLowerCase() });
      void supabaseAdminDataApi.logPlanChange(ownerId, prevPlan, planCode.trim().toLowerCase()).catch(() => {});
      toast.success('Plan updated');
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan.');
    }
  };

  const handleSupportStatusChange = async (ticketId: string, status: SupportTicketStatus) => {
    try {
      await supabaseAdminDataApi.updateSupportTicketStatus(ticketId, status);
      toast.success('Ticket status updated');
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket.');
    }
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setIsSendingReply(true);
    try {
      await supabaseAdminDataApi.addSupportTicketComment(ticketId, replyText.trim(), replyInternal);
      toast.success('Reply sent');
      setReplyText('');
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    try {
      await supabaseAdminDataApi.suspendOwner(suspendTarget.id, suspendReason);
      toast.success(`${suspendTarget.name} suspended`);
      setSuspendTarget(null);
      setSuspendReason('');
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to suspend owner.');
    }
  };

  const handleUnsuspend = async (owner: OwnerCard) => {
    try {
      await supabaseAdminDataApi.unsuspendOwner(owner.id);
      toast.success(`${owner.name} unsuspended`);
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unsuspend owner.');
    }
  };

  const handleVerify = async (owner: OwnerCard) => {
    try {
      await supabaseAdminDataApi.verifyOwner(owner.id);
      toast.success(`${owner.name} verified`);
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify owner.');
    }
  };

  const handleCreateCoupon = async () => {
    const value = parseFloat(couponForm.discountValue);
    if (!couponForm.code.trim() || isNaN(value) || value <= 0) {
      toast.error('Code and discount value are required.');
      return;
    }
    setIsSavingCoupon(true);
    try {
      await supabaseAdminDataApi.createCoupon({
        code: couponForm.code,
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: value,
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses, 10) : undefined,
        validUntil: couponForm.validUntil || undefined,
        planRestriction: couponForm.planRestriction || undefined,
      });
      toast.success('Coupon created');
      setCouponForm({ code: '', description: '', discountType: 'percent', discountValue: '', maxUses: '', validUntil: '', planRestriction: '' });
      setShowCouponForm(false);
      await loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon.');
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (coupon: AdminCouponRecord) => {
    try {
      await supabaseAdminDataApi.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated');
      await loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update coupon.');
    }
  };

  // ── Filtered data helpers ─────────────────────────────────────────────────

  const filteredOwners = (summary?.owners ?? []).filter((o) => {
    const q = ownerSearch.toLowerCase();
    const matchesSearch = !q || o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.city.toLowerCase().includes(q) || o.pgName.toLowerCase().includes(q);
    const matchesPlan = !ownerPlanFilter || o.planCode === ownerPlanFilter;
    const matchesStatus = !ownerStatusFilter
      || (ownerStatusFilter === 'suspended' && o.isSuspended)
      || (ownerStatusFilter === 'verified' && !!o.verifiedAt)
      || (ownerStatusFilter === 'active' && o.subscriptionStatus === 'active')
      || (ownerStatusFilter === 'trialing' && o.subscriptionStatus === 'trialing')
      || (ownerStatusFilter === 'past_due' && o.subscriptionStatus === 'past_due');
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const pagedOwners = filteredOwners.slice((ownerPage - 1) * PAGE_SIZE, ownerPage * PAGE_SIZE);

  const filteredSupport = (summary?.support ?? []).filter((ticket) => {
    const q = supportSearch.toLowerCase();
    const matchesSearch = !q || ticket.subject.toLowerCase().includes(q) || ticket.description.toLowerCase().includes(q);
    const matchesStatus = !supportStatusFilter || ticket.status === supportStatusFilter;
    const matchesPriority = !supportPriorityFilter || ticket.priority === supportPriorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pagedSupport = filteredSupport.slice((supportPage - 1) * PAGE_SIZE, supportPage * PAGE_SIZE);

  // ── Loading / error states ────────────────────────────────────────────────

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
        <button onClick={() => void loadSummary()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Retry</button>
      </div>
    );
  }

  if (!summary) return null;

  // ── Suspend dialog ────────────────────────────────────────────────────────

  const SuspendDialog = () => {
    if (!suspendTarget) return null;
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
          <h3 className="text-gray-900 mb-2">Suspend {suspendTarget.name}?</h3>
          <p className="text-sm text-gray-600 mb-4">This will block the owner from accessing their account.</p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Reason for suspension (optional)"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => { setSuspendTarget(null); setSuspendReason(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button onClick={() => void handleSuspend()} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Suspend</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Nav tabs ──────────────────────────────────────────────────────────────

  const NavTabs = () => {
    // Derive unread admin alert count from summary data
    const adminAlertCount = summary ? (
      (summary.support ?? []).filter((t) => t.status === 'open').length
      + (summary.owners ?? []).filter((o) => o.subscriptionStatus === 'past_due').length
    ) : 0;

    const tabs: { id: AdminView; label: string; icon: typeof Shield; badge?: number }[] = [
      { id: 'dashboard', label: 'Dashboard', icon: Shield },
      { id: 'owners', label: 'Owners', icon: Users },
      { id: 'subscriptions', label: 'Plans', icon: Package },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'support', label: 'Support', icon: HeadphonesIcon, badge: (summary?.support ?? []).filter((t) => t.status === 'open').length },
      { id: 'notifications', label: 'Alerts', icon: Bell, badge: adminAlertCount },
      { id: 'coupons', label: 'Coupons', icon: Tag },
      { id: 'referrals', label: 'Referrals', icon: Link2 },
      { id: 'leads', label: 'Leads', icon: Globe },
      { id: 'activity', label: 'Activity', icon: Activity },
      { id: 'infrastructure', label: 'Infrastructure', icon: Server },
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => navigateTo(id)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap relative ${currentView === id || (currentView === 'owner-detail' && id === 'owners') ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {badge != null && badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // ── View: Dashboard ───────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">{t('admin.title', 'Platform Admin')}</h1>
        <p className="text-gray-600 mt-1">SaaS control center — owners, plans, support, analytics.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Owners', value: summary.stats.totalOwners, color: 'text-blue-600' },
          { label: 'Properties', value: summary.stats.totalProperties, color: 'text-purple-600' },
          { label: 'Tenants', value: summary.stats.totalTenants, color: 'text-green-600' },
          { label: 'Active Plans', value: summary.stats.activeSubscriptions, color: 'text-indigo-600' },
          { label: 'Open Support', value: summary.stats.openSupportTickets, color: 'text-amber-600' },
          { label: 'MRR', value: formatRs(summary.stats.monthlyRevenue), color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Top Owner Accounts</h2>
            <button onClick={() => navigateTo('owners')} className="text-sm text-blue-600 hover:text-blue-700">View all</button>
          </div>
          <div className="space-y-3">
            {summary.owners.slice(0, 6).map((owner) => (
              <div key={owner.id} className="flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded" onClick={() => openOwnerDetail(owner)}>
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{owner.name}</p>
                  <p className="text-xs text-gray-500">{owner.propertyCount} props · {owner.tenantCount} tenants</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {owner.isSuspended && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">suspended</span>}
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{owner.planCode}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Support Queue</h2>
            <button onClick={() => navigateTo('support')} className="text-sm text-blue-600 hover:text-blue-700">Open queue</button>
          </div>
          <div className="space-y-3">
            {summary.support.slice(0, 6).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-500">{ticket.category} · {fmtDate(ticket.createdAt)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(ticket.status)} shrink-0`}>{ticket.status}</span>
              </div>
            ))}
            {summary.support.length === 0 && <p className="text-sm text-gray-500">No support tickets.</p>}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-blue-900">Signed in as <strong>{summary.profile.name}</strong> ({summary.profile.role})</p>
          <p className="text-xs text-blue-700 mt-1">{summary.stats.activeSubscriptions} active plans · {formatRs(summary.stats.monthlyRevenue)} MRR · {summary.stats.openSupportTickets} open tickets</p>
        </div>
      </div>
    </div>
  );

  // ── View: Owners List ─────────────────────────────────────────────────────

  const renderOwners = () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-gray-900">Owner Accounts</h1>
        <p className="text-gray-600 mt-1">{filteredOwners.length} of {summary.owners.length} owners</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={ownerSearch}
            onChange={(e) => { setOwnerSearch(e.target.value); setOwnerPage(1); }}
            placeholder="Search name, email, city, PG…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select value={ownerPlanFilter} onChange={(e) => { setOwnerPlanFilter(e.target.value); setOwnerPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
        </select>
        <select value={ownerStatusFilter} onChange={(e) => { setOwnerStatusFilter(e.target.value); setOwnerPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="suspended">Suspended</option>
          <option value="verified">Verified</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Owner', 'PG / City', 'Portfolio', 'Plan', 'Status', 'Joined', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedOwners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openOwnerDetail(owner)}>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{owner.name}</p>
                    <p className="text-xs text-gray-500">{owner.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{owner.pgName || '-'} · {owner.city || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{owner.propertyCount} props · {owner.tenantCount} tenants</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{owner.planCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(owner.subscriptionStatus)}`}>{owner.subscriptionStatus}</span>
                      {owner.isSuspended && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">suspended</span>}
                      {owner.verifiedAt && <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">verified</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(owner.joinedAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); openOwnerDetail(owner); }} className="text-xs text-blue-600 hover:underline">Detail</button>
                  </td>
                </tr>
              ))}
              {pagedOwners.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No owners match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={ownerPage} total={filteredOwners.length} pageSize={PAGE_SIZE} onChange={setOwnerPage} />
      </div>
    </div>
  );

  // ── View: Owner Detail ────────────────────────────────────────────────────

  const renderOwnerDetail = () => {
    if (!selectedOwner) return null;
    const subscription = summary.subscriptions.find((s) => s.ownerId === selectedOwner.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('owners')} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-gray-900">{selectedOwner.name}</h1>
            <p className="text-gray-500 text-sm">{selectedOwner.email} · {selectedOwner.city}</p>
          </div>
        </div>

        {/* Status badges + action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm ${statusColor(selectedOwner.subscriptionStatus)}`}>{selectedOwner.subscriptionStatus}</span>
          {selectedOwner.isSuspended && <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">Suspended</span>}
          {selectedOwner.verifiedAt && <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Verified {fmtDate(selectedOwner.verifiedAt)}</span>}

          <div className="flex flex-wrap gap-2 ml-auto">
            {!selectedOwner.verifiedAt && (
              <button onClick={() => void handleVerify(selectedOwner)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />Verify
              </button>
            )}
            {selectedOwner.isSuspended
              ? <button onClick={() => void handleUnsuspend(selectedOwner)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">Unsuspend</button>
              : <button onClick={() => setSuspendTarget(selectedOwner)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Suspend</button>
            }
            <button onClick={() => {
              const opening = !viewAsOwnerOpen;
              setViewAsOwnerOpen(opening);
              if (!ownerDetail) void loadOwnerDetail(selectedOwner.id);
              if (opening) {
                void supabaseAdminDataApi.logImpersonation(selectedOwner.id, selectedOwner.name).catch(() => {});
              }
            }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />View As Owner
            </button>
          </div>
        </div>

        {/* Subscription management */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-gray-900 mb-4">Subscription & Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{selectedOwner.planCode}</span>
                <select
                  defaultValue={selectedOwner.planCode}
                  onChange={(e) => void handlePlanChange(selectedOwner.id, e.target.value)}
                  className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Billing Status</p>
              <select
                value={selectedOwner.subscriptionStatus === 'not_configured' ? 'trialing' : selectedOwner.subscriptionStatus}
                onChange={(e) => void handleSubscriptionStatusChange(selectedOwner.id, e.target.value as 'trialing' | 'active' | 'past_due' | 'cancelled')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {subscription && (
              <>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Amount</p>
                  <p className="text-sm text-gray-900">{formatRs(subscription.amount)} / {subscription.billingCycle}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Renews At</p>
                  <p className="text-sm text-gray-900">{fmtDate(subscription.renewsAt)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Portfolio overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Properties', value: selectedOwner.propertyCount },
            { label: 'Tenants', value: selectedOwner.tenantCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase">{label}</p>
              <p className="text-2xl text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* View As Owner panel */}
        {viewAsOwnerOpen && (
          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h2 className="text-gray-900">Viewing as {selectedOwner.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 ml-auto">Read-only</span>
            </div>
            {isLoadingDetail ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Loading...</div>
            ) : ownerDetail ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Properties ({ownerDetail.properties.length})</p>
                  <div className="space-y-2">
                    {(ownerDetail.properties as Array<{ id: string; name: string; city: string; total_rooms: number }>).slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-900">{p.name}</span>
                        <span className="text-gray-500">{p.city} · {p.total_rooms} rooms</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Recent Tenants ({ownerDetail.tenants.length})</p>
                  <div className="space-y-2">
                    {(ownerDetail.tenants as Array<{ id: string; name: string; room: string; status: string }>).slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-900">{t.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Room {t.room}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(t.status)}`}>{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // ── View: Subscriptions / Plan Lifecycle ──────────────────────────────────

  const renderSubscriptions = () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-gray-900">Plan Lifecycle</h1>
        <p className="text-gray-600 mt-1">Manage billing status and plan tiers for all owners.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['trialing', 'active', 'past_due', 'cancelled'] as const).map((s) => {
          const count = summary.owners.filter((o) => o.subscriptionStatus === s).length;
          return (
            <div key={s} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase">{s.replace('_', ' ')}</p>
              <p className="text-2xl text-gray-900 mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {summary.owners.map((owner) => (
          <div key={owner.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="cursor-pointer" onClick={() => openOwnerDetail(owner)}>
              <p className="text-sm text-gray-900">{owner.name}</p>
              <p className="text-xs text-gray-500">{owner.email} · {owner.propertyCount} properties</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={owner.planCode}
                onChange={(e) => void handlePlanChange(owner.id, e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
              <select
                value={owner.subscriptionStatus === 'not_configured' ? 'trialing' : owner.subscriptionStatus}
                onChange={(e) => void handleSubscriptionStatusChange(owner.id, e.target.value as 'trialing' | 'active' | 'past_due' | 'cancelled')}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        ))}
        {summary.owners.length === 0 && <p className="text-sm text-gray-500">No owners found.</p>}
      </div>
    </div>
  );

  // ── View: Analytics (MRR + Platform) ─────────────────────────────────────

  const renderAnalytics = () => {
    if (isLoadingAnalytics || !mrrData || !analytics) {
      return (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading analytics...
        </div>
      );
    }

    const maxMRR = Math.max(...mrrData.map((m) => m.mrr), 1);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900">Platform Analytics</h1>
          <p className="text-gray-600 mt-1">Revenue trends, owner growth, occupancy, and platform health.</p>
        </div>

        {/* MRR trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-gray-900">Monthly Recurring Revenue (12 months)</h2>
          </div>
          <div className="space-y-2">
            {mrrData.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                <div className="flex-1">
                  <Bar value={m.mrr} max={maxMRR} color="bg-emerald-500" />
                </div>
                <span className="text-xs text-gray-700 w-24 text-right shrink-0">{formatRs(m.mrr)}</span>
                <span className="text-xs text-gray-400 w-12 text-right shrink-0">{m.paymentCount} pmts</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-sm text-gray-600">
            <span>Total collected: <strong>{formatRs(mrrData.reduce((s, m) => s + m.mrr, 0))}</strong></span>
            <span>Avg MRR: <strong>{formatRs(Math.round(mrrData.reduce((s, m) => s + m.mrr, 0) / 12))}</strong></span>
          </div>
        </div>

        {/* Owner growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-gray-900 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Owner Signups (12 months)</h2>
          <div className="space-y-2">
            {analytics.ownersByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 shrink-0">{m.month}</span>
                <div className="flex-1"><Bar value={m.count} max={Math.max(...analytics.ownersByMonth.map((x) => x.count), 1)} color="bg-blue-500" /></div>
                <span className="text-xs text-gray-700 w-8 text-right shrink-0">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-900 mb-3">Tenant Distribution</h2>
            <div className="space-y-2">
              {Object.entries(analytics.tenantsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(status)}`}>{status.replace('_', ' ')}</span>
                  <span className="text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-900 mb-3">Maintenance by Status</h2>
            <div className="space-y-2">
              {Object.entries(analytics.maintenanceByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{status.replace('-', ' ')}</span>
                  <span className="text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-900 mb-3">Top Cities</h2>
            <div className="space-y-2">
              {analytics.topCitiesByOwners.map(({ city, count }) => (
                <div key={city} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{city}</span>
                  <span className="text-gray-700">{count} owners</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
              Occupancy rate: <strong>{analytics.occupancyRate}%</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── View: Support Ticket Center ───────────────────────────────────────────

  const renderSupport = () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-gray-900">Support Center</h1>
        <p className="text-gray-600 mt-1">{filteredSupport.length} of {summary.support.length} tickets</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={supportSearch}
            onChange={(e) => { setSupportSearch(e.target.value); setSupportPage(1); }}
            placeholder="Search subject or description…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select value={supportStatusFilter} onChange={(e) => { setSupportStatusFilter(e.target.value); setSupportPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={supportPriorityFilter} onChange={(e) => { setSupportPriorityFilter(e.target.value); setSupportPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="space-y-3">
        {pagedSupport.map((ticket) => {
          const isExpanded = expandedTicketId === ticket.id;
          return (
            <div key={ticket.id} className="bg-white rounded-xl border border-gray-200">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 rounded-xl"
                onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-gray-900">{ticket.subject}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{ticket.priority}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ticket.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{ticket.category} · {fmtDate(ticket.createdAt)} · {ticket.comments.length} comments</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={ticket.status}
                      onChange={(e) => void handleSupportStatusChange(ticket.id, e.target.value as SupportTicketStatus)}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  {/* Comment thread */}
                  {ticket.comments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {ticket.comments.map((c) => (
                        <div key={c.id} className={`rounded-lg p-3 text-sm ${c.internalNote ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">{c.internalNote ? '🔒 Internal note' : 'Reply'} · {fmtDate(c.createdAt)}</span>
                          </div>
                          <p className="text-gray-700">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="mt-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply…"
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={replyInternal} onChange={(e) => setReplyInternal(e.target.checked)} className="rounded" />
                        Internal note (not visible to owner)
                      </label>
                      <button
                        onClick={() => void handleSendReply(ticket.id)}
                        disabled={!replyText.trim() || isSendingReply}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {isSendingReply ? 'Sending…' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {pagedSupport.length === 0 && <p className="text-sm text-gray-500 py-6 text-center">No tickets match the current filters.</p>}
      </div>

      <Pagination page={supportPage} total={filteredSupport.length} pageSize={PAGE_SIZE} onChange={setSupportPage} />
    </div>
  );

  // ── View: Coupon Management ───────────────────────────────────────────────

  const renderCoupons = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Coupon Management</h1>
          <p className="text-gray-600 mt-1">{coupons.length} coupons</p>
        </div>
        <button onClick={() => setShowCouponForm(!showCouponForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
          <Tag className="w-4 h-4" />New Coupon
        </button>
      </div>

      {showCouponForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-gray-900 mb-4">Create Coupon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Code *</label>
              <input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Description</label>
              <input value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} placeholder="20% off Growth plan" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Discount Type *</label>
              <select value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as 'percent' | 'flat' })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (Rs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Value *</label>
              <input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })} placeholder={couponForm.discountType === 'percent' ? '20' : '500'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Max Uses</label>
              <input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })} placeholder="Unlimited" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Valid Until</label>
              <input type="date" value={couponForm.validUntil} onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Plan Restriction</label>
              <select value={couponForm.planRestriction} onChange={(e) => setCouponForm({ ...couponForm, planRestriction: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Any plan</option>
                <option value="growth">Growth only</option>
                <option value="pro">Pro only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowCouponForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button onClick={() => void handleCreateCoupon()} disabled={isSavingCoupon} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSavingCoupon ? 'Creating…' : 'Create Coupon'}
            </button>
          </div>
        </div>
      )}

      {isLoadingCoupons ? (
        <div className="flex items-center gap-2 py-8 justify-center text-sm text-gray-500"><div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Description', 'Discount', 'Used / Max', 'Valid Until', 'Plan', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{coupon.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{coupon.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{coupon.discountValue}{coupon.discountType === 'percent' ? '%' : ' Rs'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{coupon.usedCount} / {coupon.maxUses ?? '∞'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(coupon.validUntil)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{coupon.planRestriction || 'Any'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => void handleToggleCoupon(coupon)} className="text-xs text-blue-600 hover:underline">
                        {coupon.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No coupons yet. Create one above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ── View: Referral Dashboard ──────────────────────────────────────────────

  const renderReferrals = () => {
    if (isLoadingReferrals || !referralStats) {
      return <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500"><div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Loading...</div>;
    }

    const { referrals, summary: s } = referralStats;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-gray-900 flex items-center gap-2"><Link2 className="w-5 h-5 text-purple-600" />Referral Dashboard</h1>
            <p className="text-gray-600 mt-1">Track referral signups, conversions, and rewards.</p>
          </div>
          <button
            onClick={() => setCreateReferralOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2"
          >
            <Gift className="w-4 h-4" /> Create Referral Code
          </button>
        </div>

        {/* Create referral modal */}
        {createReferralOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
              <h3 className="text-gray-900 font-semibold">Issue Referral Code</h3>
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">Referee Email</label>
                <input
                  type="email"
                  value={newReferralEmail}
                  onChange={(e) => setNewReferralEmail(e.target.value)}
                  placeholder="prospect@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">Reward Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newReferralReward}
                  onChange={(e) => setNewReferralReward(e.target.value)}
                  placeholder="500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setCreateReferralOpen(false); setNewReferralEmail(''); setNewReferralReward(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                <button
                  disabled={isCreatingReferral || !newReferralEmail.trim()}
                  onClick={async () => {
                    setIsCreatingReferral(true);
                    try {
                      await supabaseAdminDataApi.createReferralCode({ refereeEmail: newReferralEmail, rewardAmount: parseFloat(newReferralReward) || 0 });
                      toast.success('Referral code created');
                      setCreateReferralOpen(false);
                      setNewReferralEmail('');
                      setNewReferralReward('');
                      void loadReferrals();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to create referral');
                    } finally {
                      setIsCreatingReferral(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {isCreatingReferral ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Referrals', value: s.total },
            { label: 'Converted', value: s.converted },
            { label: 'Rewarded', value: s.rewarded },
            { label: 'Total Rewards', value: formatRs(s.totalRewardAmount) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase">{label}</p>
              <p className="text-xl text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Referrer', 'Referee Email', 'Status', 'Reward', 'Date', 'Converted'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.referrerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.refereeEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'converted' || r.status === 'rewarded' ? 'bg-green-100 text-green-700' : r.status === 'signed_up' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.rewardAmount > 0 ? formatRs(r.rewardAmount) : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.convertedAt)}</td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No referrals yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── View: Lead Source Tracking ────────────────────────────────────────────

  const renderLeads = () => {
    if (isLoadingLeads || !leadStats) {
      return <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500"><div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Loading...</div>;
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" />Lead Source Tracking</h1>
          <p className="text-gray-600 mt-1">UTM parameters and traffic sources for owner signups.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-900 mb-3">By Source</h2>
            <div className="space-y-2">
              {leadStats.bySource.map(({ source, count }) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{source}</span>
                  <span className="text-gray-700">{count}</span>
                </div>
              ))}
              {leadStats.bySource.length === 0 && <p className="text-sm text-gray-500">No data yet.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-gray-900 mb-3">By Campaign</h2>
            <div className="space-y-2">
              {leadStats.byCampaign.map(({ campaign, count }) => (
                <div key={campaign} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{campaign}</span>
                  <span className="text-gray-700">{count}</span>
                </div>
              ))}
              {leadStats.byCampaign.length === 0 && <p className="text-sm text-gray-500">No campaign data yet.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Owner', 'Source', 'Medium', 'Campaign', 'Landing Page', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leadStats.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{r.ownerEmail}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.utmSource || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.utmMedium || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.utmCampaign || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">{r.landingPage || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
                {leadStats.rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No lead data yet. Capture UTM params on signup to populate this view.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── View: Admin Notifications ─────────────────────────────────────────────

  const renderNotifications = () => {
    const openTickets = (summary?.support ?? []).filter((t) => t.status === 'open');
    const pastDueOwners = (summary?.owners ?? []).filter((o) => o.subscriptionStatus === 'past_due');
    const suspendedOwners = (summary?.owners ?? []).filter((o) => o.isSuspended);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const newOwners = (summary?.owners ?? []).filter((o) => o.joinedAt && o.joinedAt > sevenDaysAgo);

    type Alert = { id: string; level: 'high' | 'medium' | 'low'; title: string; detail: string; action?: () => void; actionLabel?: string };
    const alerts: Alert[] = [
      ...openTickets.map((t) => ({
        id: `ticket-${t.id}`, level: 'high' as const,
        title: `Open support ticket: ${t.subject}`,
        detail: `Priority: ${t.priority} · ${t.category} · ${fmtDate(t.createdAt)}`,
        action: () => navigateTo('support'), actionLabel: 'View Ticket',
      })),
      ...pastDueOwners.map((o) => ({
        id: `pastdue-${o.id}`, level: 'high' as const,
        title: `Payment overdue: ${o.name}`,
        detail: `Plan: ${o.planCode} · ${o.email}`,
        action: () => { setSelectedOwner(o); void loadOwnerDetail(o.id); setCurrentView('owner-detail'); }, actionLabel: 'View Owner',
      })),
      ...suspendedOwners.map((o) => ({
        id: `suspended-${o.id}`, level: 'medium' as const,
        title: `Suspended account: ${o.name}`,
        detail: o.email,
        action: () => { setSelectedOwner(o); void loadOwnerDetail(o.id); setCurrentView('owner-detail'); }, actionLabel: 'View Owner',
      })),
      ...newOwners.map((o) => ({
        id: `new-${o.id}`, level: 'low' as const,
        title: `New owner signup: ${o.name}`,
        detail: `${o.email} · ${o.city} · ${fmtDate(o.joinedAt)}`,
        action: () => { setSelectedOwner(o); void loadOwnerDetail(o.id); setCurrentView('owner-detail'); }, actionLabel: 'View Owner',
      })),
    ];

    const levelStyle = {
      high: 'border-red-200 bg-red-50',
      medium: 'border-amber-200 bg-amber-50',
      low: 'border-blue-200 bg-blue-50',
    };
    const dotStyle = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400' };

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-gray-900">Admin Alerts</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Real-time actionable items requiring attention.
            {isSyncing && <span className="ml-2 text-blue-500 text-xs animate-pulse">Syncing…</span>}
          </p>
        </div>
        {alerts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">All clear</p>
            <p className="text-gray-500 text-sm mt-1">No open tickets, past-due accounts, or suspensions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={`flex items-start justify-between gap-4 border rounded-xl px-4 py-3 ${levelStyle[alert.level]}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotStyle[alert.level]}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.detail}</p>
                  </div>
                </div>
                {alert.action && (
                  <button
                    onClick={alert.action}
                    className="flex-shrink-0 text-xs font-semibold text-gray-700 border border-gray-300 bg-white rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    {alert.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── View: Activity ────────────────────────────────────────────────────────

  const renderActivity = () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-gray-900">Platform Activity</h1>
        <p className="text-gray-600 mt-1">Recent events across all owner accounts.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {summary.activity.map((entry) => (
          <div key={entry.id} className="px-4 py-3">
            <p className="text-sm text-gray-900">{entry.label}</p>
            <p className="text-sm text-gray-600 mt-0.5">{entry.detail}</p>
            <p className="text-xs text-gray-500 mt-1">{fmtDate(entry.createdAt)}</p>
          </div>
        ))}
        {summary.activity.length === 0 && <p className="px-4 py-8 text-center text-sm text-gray-500">No recent activity.</p>}
      </div>
    </div>
  );

  // ── Root render ───────────────────────────────────────────────────────────

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return renderDashboard();
      case 'owners': return renderOwners();
      case 'owner-detail': return renderOwnerDetail();
      case 'subscriptions': return renderSubscriptions();
      case 'analytics': return renderAnalytics();
      case 'support': return renderSupport();
      case 'coupons': return renderCoupons();
      case 'referrals': return renderReferrals();
      case 'leads': return renderLeads();
      case 'notifications': return renderNotifications();
      case 'activity': return renderActivity();
      case 'infrastructure': return <InfrastructureHealth />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="space-y-4">
      <SuspendDialog />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <NavTabs />

      <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Platform telemetry live" />

      {renderView()}
    </div>
  );
}
