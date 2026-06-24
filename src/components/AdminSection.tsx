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
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileClock,
  Gift,
  Globe,
  HeadphonesIcon,
  Link2,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Plus,
  Search,
  Server,
  Shield,
  Tag,
  TrendingUp,
  TrendingDown,
  Users,
  User,
  Wallet,
  Wrench,
  XCircle,
  Bed,
} from 'lucide-react';
import { InfrastructureHealth } from './InfrastructureHealth';
import { AdminLayout, type AdminNavId } from './AdminLayout';
import { toast } from 'sonner';
import {
  type AdminCouponRecord,
  type SupportTicketStatus,
  supabaseAdminDataApi,
} from '../services/supabaseData';
import { isDemoModeEnabled } from '../services/dataService';
import { supabase } from '../lib/supabase';
import { buildDemoAdminSummary } from '../data/demoData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';
import { KpiCard } from './ui/KpiCard';
import { useDateRange } from '../contexts/DateRangeContext';

type AdminView =
  | 'dashboard'
  | 'owners'
  | 'subscriptions'
  | 'plans'
  | 'offers-coupons'
  | 'transactions'
  | 'support'
  | 'analytics'
  | 'audit-logs'
  | 'platform-settings'
  | 'team-management';

type AdminSummary = Awaited<ReturnType<typeof supabaseAdminDataApi.getAdminSummary>>;
type OwnerCard = AdminSummary['owners'][number];
type AdminActivityEntry = Awaited<ReturnType<typeof supabaseAdminDataApi.getPlatformAuditLog>>[number];

interface TeamInviteRow { id: string; owner_id: string; invited_email: string; display_role: string; status: string; invited_at: string; expires_at: string; }

const PAGE_SIZE = 20;

type SettingsTab = 'General' | 'Email Templates' | 'WhatsApp' | 'Billing' | 'Security';

type FeatureFlagKey = 'whatsapp' | 'aiAssistant' | 'tenantPortal' | 'multiUser' | 'receipts' | 'buildingView';

const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  whatsapp: 'WhatsApp Integration',
  aiAssistant: 'AI Assistant',
  tenantPortal: 'Tenant Portal',
  multiUser: 'Multi-User Access',
  receipts: 'Receipt Generation',
  buildingView: 'Building View',
};

type PaymentGatewayKey = 'razorpay' | 'phonepe' | 'cashfree';

const PAYMENT_GATEWAY_LABELS: Record<PaymentGatewayKey, string> = {
  razorpay: 'Razorpay',
  phonepe: 'PhonePe',
  cashfree: 'Cashfree',
};

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Sent to owners when they create a RentCare account.',
    subject: 'Welcome to RentCare, {{owner_name}}!',
    body: 'Hi {{owner_name}},\n\nWelcome aboard! Your RentCare workspace is ready. Add your first property to get started.\n\n— The RentCare Team',
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    description: 'Sent to tenants ahead of their rent due date.',
    subject: 'Rent reminder — due {{due_date}}',
    body: 'Hi {{tenant_name}},\n\nThis is a reminder that your rent of {{amount}} for {{property_name}} is due on {{due_date}}.\n\nThank you,\n{{owner_name}}',
  },
  {
    id: 'rent_receipt',
    name: 'Rent Receipt',
    description: 'Sent to tenants automatically after a payment is recorded.',
    subject: 'Receipt for your payment — {{property_name}}',
    body: 'Hi {{tenant_name}},\n\nWe have received your payment of {{amount}} on {{paid_date}}. Your receipt is attached.\n\nThank you,\n{{owner_name}}',
  },
  {
    id: 'agreement_notice',
    name: 'Agreement Notification',
    description: 'Sent when an agreement is ready for a tenant to sign.',
    subject: 'Your rental agreement is ready to sign',
    body: 'Hi {{tenant_name}},\n\nYour rental agreement for {{property_name}} is ready. Please review and sign it from your tenant portal.\n\n— {{owner_name}}',
  },
  {
    id: 'password_reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset link.',
    subject: 'Reset your RentCare password',
    body: 'Hi {{user_name}},\n\nWe received a request to reset your password. Use the link below to set a new one. This link expires in 60 minutes.\n\n{{reset_link}}',
  },
];

function formatRs(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtRelative(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(value);
}

function activityDotColor(event: string): string {
  const e = event.toLowerCase();
  if (e.includes('suspend') || e.includes('cancel') || e.includes('fail') || e.includes('overdue')) return 'bg-red-500';
  if (e.includes('upgrade') || e.includes('verif') || e.includes('resolve') || e.includes('paid') || e.includes('signup') || e.includes('created')) return 'bg-emerald-500';
  if (e.includes('ticket') || e.includes('support')) return 'bg-amber-500';
  return 'bg-blue-500';
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

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#7C3AED]' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-1'}`} />
    </button>
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
  const { range } = useDateRange();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Owner detail state
  const [selectedOwner, setSelectedOwner] = useState<OwnerCard | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<any | null>(null);
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

  const [activeOwnerTab, setActiveOwnerTab] = useState<'overview' | 'properties' | 'tenants' | 'payments' | 'team-members' | 'subscription' | 'support' | 'timeline' | 'audit-logs'>('overview');
  const [isOwnerDrawerOpen, setIsOwnerDrawerOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const [ownerTeamMembers, setOwnerTeamMembers] = useState<any[]>([]);
  const [ownerSubHistory, setOwnerSubHistory] = useState<any[]>([]);

  // Plans Catalog state
  const [plansList, setPlansList] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    code: '',
    label: '',
    price: 0,
    billingCycle: 'monthly',
    propertyLimit: null as number | null,
    tenantLimit: null as number | null,
    features: [] as string[],
    featureFlags: {
      whatsapp: false,
      aiAssistant: false,
      tenantPortal: true,
      multiUser: false,
      receipts: true,
      buildingView: true
    }
  });

  // Coupons state
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percent' as 'percent' | 'flat',
    discountValue: 0,
    maxUses: '' as string | number,
    validUntil: '',
    planRestriction: '',
    isActive: true
  });

  // MRR / Analytics
  const [mrrData, setMrrData] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getMRRHistory>> | null>(null);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getPlatformAnalytics>> | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Transactions
  const [transactionsData, setTransactionsData] = useState<Awaited<ReturnType<typeof supabaseAdminDataApi.getPlatformTransactions>> | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);


  // Platform Settings
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('General');
  const [platformName, setPlatformName] = useState('RentCare');
  const [supportEmail, setSupportEmail] = useState('support@rentcare.com');
  const [maintenanceModeEnabled, setMaintenanceModeEnabledState] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<FeatureFlagKey, boolean>>({
    whatsapp: true,
    aiAssistant: false,
    tenantPortal: true,
    multiUser: true,
    receipts: true,
    buildingView: true,
  });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>(DEFAULT_EMAIL_TEMPLATES[0].id);
  const [draftTemplateSubject, setDraftTemplateSubject] = useState(DEFAULT_EMAIL_TEMPLATES[0].subject);
  const [draftTemplateBody, setDraftTemplateBody] = useState(DEFAULT_EMAIL_TEMPLATES[0].body);
  const [whatsappAutoReminders, setWhatsappAutoReminders] = useState(true);
  const [whatsappFooterText, setWhatsappFooterText] = useState('Thank you for choosing RentCare. Reply STOP to opt out.');
  const [whatsappReminderTemplate, setWhatsappReminderTemplate] = useState(
    'Hi {{tenant_name}}, your rent of {{amount}} for {{property_name}} is due on {{due_date}}. Please pay at your earliest convenience.'
  );
  const [paymentGateways, setPaymentGateways] = useState<Record<PaymentGatewayKey, boolean>>({
    razorpay: true,
    phonepe: true,
    cashfree: false,
  });
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [sessionTimeoutEnabled, setSessionTimeoutEnabled] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState('30');
  const [ipAllowlistEnabled, setIpAllowlistEnabled] = useState(false);
  const [auditRetentionDays, setAuditRetentionDays] = useState('180');

  const setMaintenanceModeEnabled = (next: boolean) => {
    setMaintenanceModeEnabledState(next);
    toast.success(next ? 'Maintenance mode enabled — users will see the maintenance page' : 'Maintenance mode disabled');
  };

  const handleSelectEmailTemplate = (templateId: string) => {
    setSelectedEmailTemplateId(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      setDraftTemplateSubject(template.subject);
      setDraftTemplateBody(template.body);
    }
  };

  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const handleSaveEmailTemplate = async () => {
    const template = emailTemplates.find((t) => t.id === selectedEmailTemplateId);
    if (!template) return;
    setIsSavingTemplate(true);
    try {
      await supabaseAdminDataApi.saveEmailTemplate({
        id: template.id,
        name: template.name,
        subject: draftTemplateSubject,
        body: draftTemplateBody,
      });
      // Reflect the saved values locally only after the write succeeds.
      setEmailTemplates((prev) => prev.map((t) => (
        t.id === selectedEmailTemplateId ? { ...t, subject: draftTemplateSubject, body: draftTemplateBody } : t
      )));
      toast.success(`${template.name} saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Audit logs
  const [auditLogEntries, setAuditLogEntries] = useState<AdminActivityEntry[]>([]);
  const [isLoadingAuditLog, setIsLoadingAuditLog] = useState(false);
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [auditLogEventFilter, setAuditLogEventFilter] = useState('');

  // Team management
  const [teamInvites, setTeamInvites] = useState<TeamInviteRow[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('');

  // Suspend dialog
  const [suspendTarget, setSuspendTarget] = useState<OwnerCard | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Create Owner modal
  const [createOwnerOpen, setCreateOwnerOpen] = useState(false);
  const [createOwnerEmail, setCreateOwnerEmail] = useState('');
  const [createOwnerName, setCreateOwnerName] = useState('');
  const [createOwnerPhone, setCreateOwnerPhone] = useState('');
  const [createOwnerPgName, setCreateOwnerPgName] = useState('');
  const [createOwnerCity, setCreateOwnerCity] = useState('');
  const [isCreatingOwner, setIsCreatingOwner] = useState(false);
  const [createdOwnerResult, setCreatedOwnerResult] = useState<{ ownerId: string; tempPassword: string } | null>(null);

  // Migration status probe
  const [migrationStatus, setMigrationStatus] = useState<{
    suspendColumnsApplied: boolean;
    adminCouponsApplied: boolean;
    referralsApplied: boolean;
    fullyApplied: boolean;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = isDemoModeEnabled()
        ? buildDemoAdminSummary()
        : await supabaseAdminDataApi.getAdminSummary();
      setSummary(data as AdminSummary);
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

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      if (isDemoModeEnabled()) {
        setPlansList([
          {
            id: 'plan-starter',
            code: 'starter',
            label: 'Starter Plan',
            price: 999,
            billing_cycle: 'monthly',
            property_limit: 2,
            tenant_limit: 10,
            features: ['Receipt Generator', 'Basic Support'],
            feature_flags: { whatsapp: false, aiAssistant: false, tenantPortal: true, multiUser: false, receipts: true, buildingView: true },
            is_active: true,
            is_archived: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'plan-growth',
            code: 'growth',
            label: 'Growth Plan',
            price: 1999,
            billing_cycle: 'monthly',
            property_limit: 5,
            tenant_limit: 30,
            features: ['Receipt Generator', 'WhatsApp Integration', 'Basic Support'],
            feature_flags: { whatsapp: true, aiAssistant: false, tenantPortal: true, multiUser: true, receipts: true, buildingView: true },
            is_active: true,
            is_archived: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'plan-pro',
            code: 'pro',
            label: 'Pro Enterprise',
            price: 2999,
            billing_cycle: 'monthly',
            property_limit: 20,
            tenant_limit: 150,
            features: ['Receipt Generator', 'WhatsApp Integration', 'AI Tenant Assistant', 'Priority Support'],
            feature_flags: { whatsapp: true, aiAssistant: true, tenantPortal: true, multiUser: true, receipts: true, buildingView: true },
            is_active: true,
            is_archived: false,
            created_at: new Date().toISOString()
          }
        ]);
        return;
      }
      const data = await supabaseAdminDataApi.listPlans();
      setPlansList(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load plans.');
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    setIsLoadingCoupons(true);
    try {
      if (isDemoModeEnabled()) {
        setCouponsList([
          {
            id: 'cp-1',
            code: 'WELCOME50',
            description: '50% discount on Starter/Growth plans',
            discountType: 'percent',
            discountValue: 50,
            maxUses: 100,
            usedCount: 42,
            validFrom: new Date(Date.now() - 5*86400000).toISOString(),
            validUntil: new Date(Date.now() + 30*86400000).toISOString(),
            isActive: true,
            planRestriction: 'starter,growth',
            createdAt: new Date().toISOString()
          },
          {
            id: 'cp-2',
            code: 'FLAT500',
            description: 'Flat ₹500 off on Pro plan',
            discountType: 'flat',
            discountValue: 500,
            maxUses: 50,
            usedCount: 15,
            validFrom: new Date(Date.now() - 2*86400000).toISOString(),
            validUntil: new Date(Date.now() + 15*86400000).toISOString(),
            isActive: true,
            planRestriction: 'pro',
            createdAt: new Date().toISOString()
          }
        ]);
        return;
      }
      const data = await supabaseAdminDataApi.listCoupons();
      setCouponsList(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load coupons.');
    } finally {
      setIsLoadingCoupons(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    void loadPlans();
  }, [loadSummary, loadPlans]);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    supabaseAdminDataApi.checkMigrationStatus()
      .then(setMigrationStatus)
      .catch(() => {});
  }, []);

  const loadOwnerDetail = useCallback(async (ownerId: string) => {
    if (isDemoModeEnabled()) {
      setOwnerDetail({
        properties: [
          { id: 'prop-1', name: 'Sunset Premium PG Boys Hostel', city: 'Bangalore', total_rooms: 12 },
          { id: 'prop-2', name: 'Co-Living Hub Girls', city: 'Noida', total_rooms: 8 }
        ],
        tenants: [
          { id: 't-1', name: 'Aditya Sen', status: 'active' },
          { id: 't-2', name: 'Rohan Sharma', status: 'pending_onboarding' }
        ],
        agreements: [
          { id: 'agr-1', tenantName: 'Aditya Sen', status: 'active', createdAt: new Date(Date.now() - 15*86400000).toISOString() }
        ],
        documents: [
          { id: 'doc-1', tenantName: 'Aditya Sen', docType: 'government_id', label: 'Aadhaar Card', fileUrl: 'https://example.com/id.pdf', createdAt: new Date(Date.now() - 15*86400000).toISOString() }
        ],
        subscription: { planCode: 'pro', status: 'active', amount: 2499, billingCycle: 'monthly', renewsAt: new Date(Date.now() + 15*86400000).toISOString(), seats: 5, updatedAt: new Date().toISOString() },
        payments: [
          { id: 'p-1', tenant_name: 'Aditya Sen', room: '101-A', total_amount: 8500, due_date: new Date().toISOString(), status: 'paid' },
          { id: 'p-2', tenant_name: 'Rohan Sharma', room: '202-B', total_amount: 9000, due_date: new Date().toISOString(), status: 'pending' }
        ],
        support: [
          { id: 's-1', subject: 'WhatsApp Gateway not sending messages', status: 'open' }
        ],
        audit: [
          { id: 'a-1', event: 'TENANT_INVITED', detail: 'Invitation sent to Rohan Sharma', created_at: new Date().toISOString() }
        ]
      } as any);

      setOwnerTeamMembers([
        { id: 'team-1', email: 'manager@hivedemo.com', full_name: 'Suresh Kumar', role: 'owner_manager' },
        { id: 'team-2', email: 'staff@hivedemo.com', full_name: 'Ramesh Singh', role: 'staff' }
      ]);

      setOwnerSubHistory([
        { id: 'sh-1', plan_code: 'pro', status: 'active', created_at: new Date().toISOString() },
        { id: 'sh-2', plan_code: 'starter', status: 'trialing', created_at: new Date(Date.now() - 30*86400000).toISOString() }
      ]);
      return;
    }
    setIsLoadingDetail(true);
    try {
      const [detailData, teamData, historyData] = await Promise.all([
        supabaseAdminDataApi.getAdminOwnerDetailedView(ownerId),
        supabaseAdminDataApi.getOwnerTeamMembers(ownerId),
        supabaseAdminDataApi.getSubscriptionHistory(ownerId),
      ]);
      setOwnerDetail(detailData);
      setOwnerTeamMembers(teamData);
      setOwnerSubHistory(historyData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load owner detail.');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const openOwnerDetail = (owner: OwnerCard, initialTab: typeof activeOwnerTab = 'overview') => {
    setSelectedOwner(owner);
    setOwnerDetail(null);
    setViewAsOwnerOpen(false);
    setIsOwnerDrawerOpen(true);
    setActiveOwnerTab(initialTab);
    void loadOwnerDetail(owner.id);
  };

  const loadAnalytics = useCallback(async () => {
    if (isDemoModeEnabled()) return; // analytics disabled in demo — no live Supabase session
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

  const loadTransactions = useCallback(async () => {
    if (isDemoModeEnabled()) return;
    setIsLoadingTransactions(true);
    try {
      const data = await supabaseAdminDataApi.getPlatformTransactions();
      setTransactionsData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);



  const loadAuditLog = useCallback(async () => {
    if (isDemoModeEnabled()) return; // demo summary already has activity; no Supabase call needed
    setIsLoadingAuditLog(true);
    try {
      const data = await supabaseAdminDataApi.getPlatformAuditLog();
      setAuditLogEntries(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit log.');
    } finally {
      setIsLoadingAuditLog(false);
    }
  }, []);



  useEffect(() => { void loadAuditLog(); }, [loadAuditLog]);

  const handleRealtimeChange = useCallback(() => {
    void loadSummary();
    if (currentView === 'transactions') void loadTransactions();
    if (currentView === 'audit-logs') void loadAuditLog();
    if (currentView === 'analytics') void loadAnalytics();
    if (currentView === 'plans') void loadPlans();
    if (currentView === 'offers-coupons') void loadCoupons();
    if (isOwnerDrawerOpen && selectedOwner) void loadOwnerDetail(selectedOwner.id);
  }, [currentView, isOwnerDrawerOpen, selectedOwner, loadSummary, loadTransactions, loadAuditLog, loadAnalytics, loadPlans, loadCoupons, loadOwnerDetail]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'platform-admin-summary',
    tables: ['profiles', 'properties', 'tenants', 'payments', 'owner_subscriptions', 'support_tickets', 'support_ticket_comments', 'admin_coupons', 'referrals', 'lead_sources', 'activity_logs', 'maintenance_tickets'],
    onChange: handleRealtimeChange,
  });

  // Reload analytics when date range changes while on analytics view
  useEffect(() => {
    if (currentView === 'analytics') void loadAnalytics();
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentView === 'plans') void loadPlans();
    if (currentView === 'offers-coupons') void loadCoupons();
  }, [currentView, loadPlans, loadCoupons]);

  // Overlay any DB-persisted email-template edits on top of the built-in defaults
  // so saved subject/body changes survive a reload (degrades to defaults when the
  // platform_email_templates table has not been migrated yet).
  useEffect(() => {
    let cancelled = false;
    void supabaseAdminDataApi.getEmailTemplateOverrides()
      .then((overrides) => {
        if (cancelled || overrides.length === 0) return;
        const byId = new Map(overrides.map((o) => [o.id, o]));
        setEmailTemplates((prev) => prev.map((t) => {
          const o = byId.get(t.id);
          return o ? { ...t, subject: o.subject, body: o.body } : t;
        }));
        const sel = byId.get(selectedEmailTemplateId);
        if (sel) { setDraftTemplateSubject(sel.subject); setDraftTemplateBody(sel.body); }
      })
      .catch(() => { /* table not migrated — keep defaults */ });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTeamInvites = useCallback(async () => {
    setIsLoadingTeam(true);
    try {
      const { data } = await supabase
        .from('owner_invites')
        .select('id,owner_id,invited_email,display_role,status,invited_at,expires_at')
        .order('invited_at', { ascending: false });
      setTeamInvites((data as unknown as TeamInviteRow[]) ?? []);
    } catch { /* best-effort */ } finally {
      setIsLoadingTeam(false);
    }
  }, []);

  const navigateTo = (view: AdminView) => {
    setCurrentView(view);
    if (view === 'analytics') void loadAnalytics();
    if (view === 'transactions') void loadTransactions();
    if (view === 'audit-logs') void loadAuditLog();
    if (view === 'team-management') void loadTeamInvites();
  };

  // ── Plan & Coupon Actions ──────────────────────────────────────────────────

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await supabaseAdminDataApi.updatePlan(editingPlan.id, {
          label: planForm.label,
          price: planForm.price,
          billingCycle: planForm.billingCycle,
          propertyLimit: planForm.propertyLimit,
          tenantLimit: planForm.tenantLimit,
          features: planForm.features,
          featureFlags: planForm.featureFlags
        });
        toast.success('Plan updated successfully');
      } else {
        await supabaseAdminDataApi.createPlan({
          code: planForm.code,
          label: planForm.label,
          price: planForm.price,
          billingCycle: planForm.billingCycle,
          propertyLimit: planForm.propertyLimit,
          tenantLimit: planForm.tenantLimit,
          features: planForm.features,
          featureFlags: planForm.featureFlags
        });
        toast.success('Plan created successfully');
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      void loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan.');
    }
  };

  const handleTogglePlanActive = async (plan: any) => {
    try {
      await supabaseAdminDataApi.updatePlan(plan.id, { isActive: !plan.is_active });
      toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`);
      void loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan status.');
    }
  };

  const handleArchivePlan = async (plan: any) => {
    try {
      await supabaseAdminDataApi.updatePlan(plan.id, { isArchived: !plan.is_archived });
      toast.success(`Plan ${plan.is_archived ? 'restored' : 'archived'}`);
      void loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive plan.');
    }
  };

  const handleClonePlan = (plan: any) => {
    setEditingPlan(null);
    setPlanForm({
      code: `${plan.code}-clone`,
      label: `Copy of ${plan.label}`,
      price: plan.price,
      billingCycle: plan.billing_cycle || 'monthly',
      propertyLimit: plan.property_limit,
      tenantLimit: plan.tenant_limit,
      features: [...(plan.features || [])],
      featureFlags: {
        whatsapp: plan.feature_flags?.whatsapp ?? false,
        aiAssistant: plan.feature_flags?.aiAssistant ?? false,
        tenantPortal: plan.feature_flags?.tenantPortal ?? true,
        multiUser: plan.feature_flags?.multiUser ?? false,
        receipts: plan.feature_flags?.receipts ?? true,
        buildingView: plan.feature_flags?.buildingView ?? true
      }
    });
    setIsPlanModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await supabaseAdminDataApi.updateCoupon(editingCoupon.id, {
          isActive: couponForm.isActive ?? true,
          maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
          validUntil: couponForm.validUntil || undefined
        });
        toast.success('Coupon updated successfully');
      } else {
        await supabaseAdminDataApi.createCoupon({
          code: couponForm.code,
          description: couponForm.description,
          discountType: couponForm.discountType,
          discountValue: couponForm.discountValue,
          maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
          validUntil: couponForm.validUntil || undefined,
          planRestriction: couponForm.planRestriction || undefined
        });
        toast.success('Coupon created successfully');
      }
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
      void loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save coupon.');
    }
  };

  const handleToggleCouponActive = async (coupon: any) => {
    try {
      await supabaseAdminDataApi.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      toast.success(`Coupon ${coupon.isActive ? 'deactivated' : 'activated'}`);
      void loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update coupon status.');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await supabaseAdminDataApi.deleteCoupon(couponId);
      toast.success('Coupon deleted');
      void loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete coupon.');
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSubscriptionStatusChange = async (ownerId: string, status: 'trialing' | 'active' | 'paused' | 'past_due' | 'cancelled') => {
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

  const handleImpersonate = async (owner: OwnerCard) => {
    try {
      await supabaseAdminDataApi.logImpersonation(owner.id, owner.name);
      localStorage.setItem('admin_impersonate_id', owner.id);
      toast.success(`Impersonating ${owner.name}... Redirecting.`);
      setTimeout(() => {
        window.location.href = '/'; // Reload to apply impersonation
      }, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to impersonate owner.');
    }
  };


  const handleCreateOwner = async () => {
    if (!createOwnerEmail.trim() || !createOwnerName.trim()) {
      toast.error('Email and name are required.');
      return;
    }
    setIsCreatingOwner(true);
    try {
      const result = await supabaseAdminDataApi.createOwner({
        email: createOwnerEmail.trim(),
        name: createOwnerName.trim(),
        phone: createOwnerPhone.trim() || undefined,
        pgName: createOwnerPgName.trim() || undefined,
        city: createOwnerCity.trim() || undefined,
      });
      setCreatedOwnerResult(result);
      await loadSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create owner.');
    } finally {
      setIsCreatingOwner(false);
    }
  };

  const handleResetAccess = async (owner: OwnerCard) => {
    try {
      await supabaseAdminDataApi.resetOwnerAccess(owner.id);
      toast.success(`Password reset email sent to ${owner.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send password reset.');
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

  // ── Sidebar nav mapping ───────────────────────────────────────────────────

  const sidebarCurrent: AdminNavId = currentView as AdminNavId;

  const handleSidebarNavigate = (id: AdminNavId) => {
    navigateTo(id);
  };

  const openSupportCount = (summary?.support ?? []).filter((t) => t.status === 'open').length;

  // ── View: Dashboard ───────────────────────────────────────────────────────

  const renderDashboard = () => {
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const freeUsers = summary.stats.totalOwners - summary.stats.ownersActive - summary.stats.ownersTrialing;
    const mrrGrowth = summary.stats.arr > 0 ? (summary.stats.newMrr / (summary.stats.arr / 12)) * 100 : 0;
    const recentActivity = isDemoModeEnabled() 
      ? (summary.activity || []).map(a => ({
          id: a.id,
          event: a.label.replace(/ /g, '_').toUpperCase(),
          detail: a.detail,
          createdAt: a.createdAt,
          ownerId: 'demo-owner',
          propertyId: null,
          metadata: {}
        } as AdminActivityEntry)).slice(0, 10)
      : auditLogEntries.slice(0, 10);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="ds-page-title">Platform Overview</h1>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
          <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Live" />
        </div>

        {/* 8 KPI Cards (2 rows of 4) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Monthly Recurring Revenue" value={summary.stats.monthlyRevenue} prefix="₹" accent="purple" icon={TrendingUp}
            trend={mrrGrowth} trendLabel="vs last month" />
          <KpiCard label="Paying Customers" value={summary.stats.ownersActive} accent="blue" icon={Users}
            format={(n) => Math.round(n).toString()} meta="Active subscriptions" />
          <KpiCard label="Free Users" value={freeUsers} accent="cyan" icon={User}
            format={(n) => Math.round(n).toString()} meta="Unconverted accounts" />
          <KpiCard label="Churn (MRR Lost)" value={summary.stats.churnMrr} prefix="₹" accent="rose" icon={TrendingDown}
            meta="This month" />
          <KpiCard label="Total Properties" value={summary.stats.totalProperties} accent="cyan" icon={Building2}
            format={(n) => Math.round(n).toString()} meta="Managed on platform" />
          <KpiCard label="Total Tenants" value={summary.stats.totalTenants} accent="violet" icon={Users}
            format={(n) => Math.round(n).toString()} meta={`+${summary.stats.newTenantsThisMonth} this month`} />
          <KpiCard label="Open Tickets" value={summary.stats.openSupportTickets} accent="amber" icon={AlertCircle}
            format={(n) => Math.round(n).toString()} meta={`${summary.stats.urgentSupportTickets} urgent`} />
          <KpiCard label="Occupancy" value={Math.round(summary.stats.occupancyRate * 100)} suffix="%" accent="emerald" icon={Bed}
            format={(n) => Math.round(n).toString()} meta="Platform average" />
        </div>

        {/* Full-width Activity Feed */}
        <div className="bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-[15px] font-semibold text-gray-900">Recent Activity</h2>
            <button onClick={() => navigateTo('audit-logs')} className="text-[13px] font-semibold text-violet-600 hover:text-violet-700 hover:underline transition-colors">View all logs</button>
          </div>
          <div className="divide-y divide-gray-50 relative">
            {isLoadingAuditLog && recentActivity.length === 0 ? (
              <div className="px-6 py-10 flex items-center justify-center text-sm text-gray-500">
                <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mr-3" />
                Loading activity stream...
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">No activity yet.</p>
            ) : (
              recentActivity.map((entry) => (
                <div key={entry.id} className="px-6 py-4 flex items-start gap-5 hover:bg-gray-50/80 transition-colors group">
                  <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-gray-100 ${activityDotColor(entry.event).replace('bg-', 'text-').replace('500', '600')}`}>
                    <Activity className="w-4 h-4 opacity-70" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-[14px] font-semibold text-gray-900">
                      {entry.event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {entry.detail && <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{entry.detail}</p>}
                  </div>
                  <div className="shrink-0 text-right pt-1">
                    <p className="text-[12px] font-medium text-gray-400 group-hover:text-gray-500 transition-colors">{fmtRelative(entry.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── View: Owners List ─────────────────────────────────────────────────────

  const renderOwners = () => {
    const totalOwners = summary.stats.totalOwners;
    const activeSubs = summary.stats.activeSubscriptions;
    const suspended = summary.stats.ownersSuspended;
    const trialing = summary.stats.ownersTrialing;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="ds-page-title">Owner Accounts</h1>
          <button onClick={() => { setCreateOwnerOpen(true); setCreatedOwnerResult(null); setCreateOwnerEmail(''); setCreateOwnerName(''); setCreateOwnerPhone(''); setCreateOwnerPgName(''); setCreateOwnerCity(''); }} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Owner
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Total Owners" value={totalOwners} accent="purple" icon={Users} format={(n) => Math.round(n).toString()} />
          <KpiCard label="Active Subscriptions" value={activeSubs} accent="emerald" icon={CheckCircle} format={(n) => Math.round(n).toString()} />
          <KpiCard label="Suspended Accounts" value={suspended} accent="rose" icon={AlertCircle} format={(n) => Math.round(n).toString()} />
          <KpiCard label="Trialing Accounts" value={trialing} accent="blue" icon={Clock} format={(n) => Math.round(n).toString()} />
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={ownerSearch}
              onChange={(e) => { setOwnerSearch(e.target.value); setOwnerPage(1); }}
              placeholder="Search name, email, city, PG…"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={ownerStatusFilter} 
              onChange={(e) => { setOwnerStatusFilter(e.target.value); setOwnerPage(1); }} 
              className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="suspended">Suspended</option>
              <option value="verified">Verified</option>
            </select>
            <select 
              value={ownerPlanFilter} 
              onChange={(e) => { setOwnerPlanFilter(e.target.value); setOwnerPage(1); }} 
              className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer"
            >
              <option value="">All Plans</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden ds-card-list p-3">
            {pagedOwners.map((owner) => {
              const initials = owner.name
                ? owner.name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                : 'OW';
              return (
                <div key={owner.id} className="ds-card-list-item" onClick={() => openOwnerDetail(owner, 'overview')}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 flex items-center justify-center font-bold text-[13px] overflow-hidden shrink-0 shadow-sm border border-violet-100/50">
                      {owner.photoUrl ? <img src={owner.photoUrl} alt={owner.name} className="w-full h-full object-cover" /> : initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[14px] text-gray-900 truncate">{owner.name}</p>
                      <p className="text-[12px] text-gray-500 truncate">{owner.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase flex-shrink-0 ${statusColor(owner.subscriptionStatus)}`}>
                      {owner.subscriptionStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <div className="ds-card-list-row"><span className="ds-card-list-label">Plan</span><span className="ds-card-list-value">{owner.planCode}</span></div>
                    <div className="ds-card-list-row"><span className="ds-card-list-label">Revenue</span><span className="ds-card-list-value">{formatRs(owner.revenue)}</span></div>
                    <div className="ds-card-list-row"><span className="ds-card-list-label">Properties</span><span className="ds-card-list-value">{owner.propertyCount}</span></div>
                    <div className="ds-card-list-row"><span className="ds-card-list-label">Tenants</span><span className="ds-card-list-value">{owner.tenantCount}</span></div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-gray-400">{fmtRelative(owner.lastActive)}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openOwnerDetail(owner, 'overview')} className="text-[13px] font-medium text-violet-600">View</button>
                      {owner.isSuspended ? (
                        <button onClick={() => void handleUnsuspend(owner)} className="text-[13px] font-medium text-emerald-600">Activate</button>
                      ) : (
                        <button onClick={() => { setSuspendTarget(owner); setSuspendReason(''); }} className="text-[13px] font-medium text-rose-600">Suspend</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {pagedOwners.length === 0 && (
              <div className="ds-empty-state">
                <div className="ds-empty-icon"><Users style={{ width: 22, height: 22 }} /></div>
                <p className="ds-empty-title">No owners found</p>
                <p className="ds-empty-description">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  {['Avatar', 'Name', 'Email', 'Status', 'Plan', 'Properties', 'Tenants', 'Revenue', 'Last Active', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-[12px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/80">
                {pagedOwners.map((owner) => {
                  const initials = owner.name
                    ? owner.name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'OW';
                  return (
                    <tr key={owner.id} className="hover:bg-gray-50/60 cursor-pointer transition-colors group" onClick={() => openOwnerDetail(owner, 'overview')}>
                      <td className="px-5 py-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 flex items-center justify-center font-bold text-[13px] overflow-hidden shrink-0 shadow-sm border border-violet-100/50">
                          {owner.photoUrl ? (
                            <img src={owner.photoUrl} alt={owner.name} className="w-full h-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[14px] text-gray-900">{owner.name}</td>
                      <td className="px-5 py-4 text-[13px] text-gray-500">{owner.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${statusColor(owner.subscriptionStatus)}`}>
                            {owner.subscriptionStatus}
                          </span>
                          {owner.isSuspended && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-red-100 text-red-700 border border-red-200/50">
                              suspended
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100 uppercase tracking-wide">
                          {owner.planCode}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[14px] text-gray-700 font-semibold">{owner.propertyCount}</td>
                      <td className="px-5 py-4 text-[14px] text-gray-700 font-semibold">{owner.tenantCount}</td>
                      <td className="px-5 py-4 text-[14px] text-gray-900 font-bold tabular-nums">{formatRs(owner.revenue)}</td>
                      <td className="px-5 py-4 text-gray-400 text-[12px] font-medium">{fmtRelative(owner.lastActive)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openOwnerDetail(owner, 'overview')}
                            className="text-[13px] font-medium text-violet-600 hover:text-violet-700"
                          >
                            View
                          </button>
                          {owner.isSuspended ? (
                            <button
                              onClick={() => void handleUnsuspend(owner)}
                              className="text-[13px] font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSuspendTarget(owner); setSuspendReason(''); }}
                              className="text-[13px] font-medium text-rose-600 hover:text-rose-700"
                            >
                              Suspend
                            </button>
                          )}
                          <select
                            value={owner.planCode}
                            onChange={(e) => void handlePlanChange(owner.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-gray-50 font-medium text-gray-700 focus:outline-none focus:border-violet-500 focus:bg-white cursor-pointer"
                          >
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="pro">Pro</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pagedOwners.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <div className="ds-empty-state">
                        <div className="ds-empty-icon"><Users style={{ width: 22, height: 22 }} /></div>
                        <p className="ds-empty-title">No owners found</p>
                        <p className="ds-empty-description">Try adjusting your filters or search terms.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={ownerPage} total={filteredOwners.length} pageSize={PAGE_SIZE} onChange={setOwnerPage} />
        </div>
      </div>
    );
  };

  const renderOwnerDrawer = () => {
    if (!selectedOwner || !isOwnerDrawerOpen) return null;
    const subscription = ownerDetail?.subscription ?? summary?.subscriptions.find((s) => s.ownerId === selectedOwner.id);

    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end md:flex-row">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsOwnerDrawerOpen(false)} />
        <div className="relative w-full h-[90dvh] md:h-full md:max-w-3xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300 rounded-t-2xl md:rounded-none">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedOwner.name}</h2>
              <p className="text-xs text-gray-500">{selectedOwner.email} · {selectedOwner.city || 'No City'}</p>
            </div>
            <button onClick={() => setIsOwnerDrawerOpen(false)} className="p-2 rounded-full hover:bg-gray-100"><XCircle className="w-6 h-6 text-gray-400" /></button>
          </div>

          <div className="flex px-6 border-b border-gray-200 shrink-0 overflow-x-auto hide-scrollbar bg-gray-50/50">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'properties', label: 'Properties' },
              { id: 'tenants', label: 'Tenants' },
              { id: 'payments', label: 'Payments' },
              { id: 'team-members', label: 'Team Members' },
              { id: 'subscription', label: 'Subscription' },
              { id: 'support', label: 'Support Tickets' },
              { id: 'timeline', label: 'Activity Timeline' },
              { id: 'audit-logs', label: 'Audit Logs' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveOwnerTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${activeOwnerTab === tab.id ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                <p className="text-xs text-gray-500 font-medium">Fetching owner credentials & telemetry...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeOwnerTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor(selectedOwner.subscriptionStatus)}`}>
                        {selectedOwner.subscriptionStatus}
                      </span>
                      {selectedOwner.isSuspended ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">Suspended</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active Access</span>
                      )}
                      {selectedOwner.verifiedAt ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Verified {fmtDate(selectedOwner.verifiedAt)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Pending Verification</span>
                      )}

                      <div className="flex gap-2 ml-auto">
                        {!selectedOwner.verifiedAt && (
                          <button onClick={() => void handleVerify(selectedOwner)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 flex items-center gap-1.5 shadow-sm transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" /> Verify
                          </button>
                        )}
                        {selectedOwner.isSuspended ? (
                          <button onClick={() => void handleUnsuspend(selectedOwner)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 shadow-sm transition-colors">
                            Activate Owner
                          </button>
                        ) : (
                          <button onClick={() => setSuspendTarget(selectedOwner)} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 flex items-center gap-1.5 shadow-sm transition-colors">
                            <XCircle className="w-3.5 h-3.5" /> Suspend
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Telemetry Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Properties</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{selectedOwner.propertyCount}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tenants</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{selectedOwner.tenantCount}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Billed Revenue</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{formatRs(selectedOwner.revenue)}</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Telemetry Last Seen</p>
                        <p className="text-xs font-semibold text-gray-800 mt-2.5 truncate">{fmtRelative(selectedOwner.lastActive)}</p>
                      </div>
                    </div>

                    {/* Business Details card */}
                    <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Platform Credentials & Profile</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-gray-400 font-medium">Platform Account ID</p>
                          <p className="font-mono text-gray-900 mt-1 font-semibold">{selectedOwner.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Business / PG Name</p>
                          <p className="font-semibold text-gray-900 mt-1">{selectedOwner.pgName || 'Not Set'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">City Location</p>
                          <p className="font-semibold text-gray-900 mt-1">{selectedOwner.city || 'Not Provided'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Owner Phone</p>
                          <p className="font-semibold text-gray-900 mt-1">{selectedOwner.phone || 'Not Provided'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium">Joined Platform</p>
                          <p className="font-semibold text-gray-900 mt-1">{fmtDate(selectedOwner.joinedAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">SaaS Control Tower Commands</h3>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void handleResetAccess(selectedOwner)} className="px-3 py-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold transition-colors bg-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Force Password Reset
                        </button>
                        <button onClick={() => void handleImpersonate(selectedOwner)} className="px-3 py-1.5 border border-violet-300 text-violet-700 hover:bg-violet-50 rounded-lg text-xs font-semibold transition-colors bg-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> View As Owner (Impersonate)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeOwnerTab === 'properties' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Registered Properties</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ownerDetail?.properties?.length ?? 0} total
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {(ownerDetail?.properties as any[] ?? []).map((p) => (
                        <li key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Building2 className="w-4 h-4" /></div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{p.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{p.city || 'Bangalore'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 bg-slate-100 px-2 py-1 rounded-md">{p.total_rooms || 0} Rooms</span>
                        </li>
                      ))}
                      {(ownerDetail?.properties as any[] ?? []).length === 0 && (
                        <li className="p-8 text-center text-xs text-gray-500">No properties registered under this account</li>
                      )}
                    </ul>
                  </div>
                )}

                {activeOwnerTab === 'tenants' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Connected Tenants</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ownerDetail?.tenants?.length ?? 0} total
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {(ownerDetail?.tenants as any[] ?? []).map((t) => (
                        <li key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User className="w-4 h-4" /></div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{t.name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Rent: {t.rent ? formatRs(t.rent) : 'Not Set'}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(t.status)}`}>
                            {t.status?.replace(/_/g, ' ') || 'active'}
                          </span>
                        </li>
                      ))}
                      {(ownerDetail?.tenants as any[] ?? []).length === 0 && (
                        <li className="p-8 text-center text-xs text-gray-500">No tenants assigned</li>
                      )}
                    </ul>
                  </div>
                )}

                {activeOwnerTab === 'payments' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Recent Rent Bills</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Last 50 payments</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {(ownerDetail?.payments as any[] ?? []).map((p) => (
                        <li key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50/40 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{p.tenant_name ?? 'Tenant'}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Room {p.room ?? '—'} · Due {fmtDate(p.due_date)}</p>
                          </div>
                          <div className="text-right ml-4 shrink-0 flex items-center gap-3">
                            <div>
                              <p className="text-xs font-bold text-gray-900">{formatRs(Number(p.total_amount))}</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 uppercase ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                      {(ownerDetail?.payments as any[] ?? []).length === 0 && (
                        <li className="p-8 text-center text-xs text-gray-500">No billing activity recorded</li>
                      )}
                    </ul>
                  </div>
                )}

                {activeOwnerTab === 'team-members' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Team Members & Managers</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ownerTeamMembers.length} active
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {ownerTeamMembers.map((member) => (
                        <li key={member.id} className="p-4 flex justify-between items-center hover:bg-gray-50/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-4 h-4" /></div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">{member.full_name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{member.email}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 uppercase tracking-wide">
                            {member.role?.replace('owner_', '')}
                          </span>
                        </li>
                      ))}
                      {ownerTeamMembers.length === 0 && (
                        <li className="p-8 text-center text-xs text-gray-500">This owner operates solo (no team accounts)</li>
                      )}
                    </ul>
                  </div>
                )}

                {activeOwnerTab === 'subscription' && (
                  <div className="space-y-6">
                    {/* Controls */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Subscription & Limits</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1">Upgrade / Downgrade Plan</label>
                          <select
                            value={selectedOwner.planCode}
                            onChange={(e) => void handlePlanChange(selectedOwner.id, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-700 focus:outline-none focus:border-violet-500"
                          >
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="pro">Pro</option>
                            {plansList.filter(p => !['starter', 'growth', 'pro'].includes(p.code)).map(p => (
                              <option key={p.id} value={p.code}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1">State Lifecycle</label>
                          <select
                            value={selectedOwner.subscriptionStatus === 'not_configured' ? 'trialing' : selectedOwner.subscriptionStatus}
                            onChange={(e) => void handleSubscriptionStatusChange(selectedOwner.id, e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-700 focus:outline-none focus:border-violet-500"
                          >
                            <option value="trialing">Trialing</option>
                            <option value="active">Active (Subscribed)</option>
                            <option value="paused">Paused</option>
                            <option value="past_due">Past Due</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Card */}
                    {subscription && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Current Agreement Terms</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-gray-400 font-medium">Billed Rate</p>
                            <p className="font-semibold text-gray-900 mt-1">{formatRs(subscription.amount)} / {subscription.billingCycle || 'monthly'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium">Renewal Target Date</p>
                            <p className="font-semibold text-gray-900 mt-1">{fmtDate(subscription.renewsAt)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium">Workspace Seats (Max Users)</p>
                            <p className="font-semibold text-gray-900 mt-1">{subscription.seats ?? 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 font-medium">Last State Refresh</p>
                            <p className="font-semibold text-gray-900 mt-1">{fmtDate(subscription.updatedAt)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plan History Logs */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Subscription Audit Trail</h3>
                      </div>
                      {/* Mobile cards */}
                      <div className="sm:hidden ds-card-list p-3">
                        {ownerSubHistory.map((history) => (
                          <div key={history.id} className="ds-card-list-item">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-gray-800 uppercase text-xs">{history.plan_code}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${history.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {history.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-100">
                              <span className="text-gray-500 font-mono">{fmtDate(history.created_at || history.createdAt)}</span>
                              <span className="text-gray-900 font-medium">{history.amount !== null ? formatRs(history.amount) : '—'}</span>
                            </div>
                          </div>
                        ))}
                        {ownerSubHistory.length === 0 && (
                          <p className="text-center text-gray-500 text-xs py-6">No historical changes logged yet.</p>
                        )}
                      </div>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                              <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan</th>
                              <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ownerSubHistory.map((history) => (
                              <tr key={history.id} className="hover:bg-slate-50/55 transition-colors">
                                <td className="px-5 py-3 text-gray-500 font-mono text-[10px]">{fmtDate(history.created_at || history.createdAt)}</td>
                                <td className="px-5 py-3 font-semibold text-gray-800 uppercase">{history.plan_code}</td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${history.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {history.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-gray-900 font-medium">{history.amount !== null ? formatRs(history.amount) : '—'}</td>
                              </tr>
                            ))}
                            {ownerSubHistory.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-5 py-6 text-center text-gray-500 text-xs">No historical changes logged yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeOwnerTab === 'support' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Support Ticket Log</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ownerDetail?.support?.length ?? 0} tickets
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {(ownerDetail?.support as any[] ?? []).map((s) => (
                        <li key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50/40 transition-colors">
                          <div>
                            <p className="text-xs font-bold text-gray-900">{s.subject}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Priority: {s.priority || 'medium'} · Opened {fmtDate(s.createdAt)}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === 'open' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {s.status}
                          </span>
                        </li>
                      ))}
                      {(ownerDetail?.support as any[] ?? []).length === 0 && (
                        <li className="p-8 text-center text-xs text-gray-500">No support tickets opened by this owner</li>
                      )}
                    </ul>
                  </div>
                )}

                {activeOwnerTab === 'timeline' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-6">
                    <h3 className="text-sm font-semibold text-gray-900">Telemetry Activity Timeline</h3>
                    <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
                      {[
                        // Merge various lists into clean chronologically sorted timeline items
                        ...(ownerDetail?.properties as any[] ?? []).map((p) => ({
                          date: p.created_at || new Date().toISOString(),
                          title: 'Property Registered',
                          body: `${p.name} was added to the workspace in ${p.city || 'Bangalore'}.`,
                          icon: <Building2 className="w-3 h-3 text-violet-600" />,
                          bg: 'bg-violet-50'
                        })),
                        ...(ownerDetail?.tenants as any[] ?? []).map((t) => ({
                          date: t.created_at || new Date().toISOString(),
                          title: 'Tenant Registered',
                          body: `${t.name} joined with onboarding status ${t.status?.replace(/_/g, ' ')}.`,
                          icon: <User className="w-3 h-3 text-blue-600" />,
                          bg: 'bg-blue-50'
                        })),
                        ...(ownerDetail?.support as any[] ?? []).map((s) => ({
                          date: s.createdAt || new Date().toISOString(),
                          title: 'Support Ticket Raised',
                          body: `Ticket: "${s.subject}" raised with priority ${s.priority || 'medium'}.`,
                          icon: <MessageSquare className="w-3 h-3 text-rose-600" />,
                          bg: 'bg-rose-50'
                        })),
                        ...(ownerSubHistory ?? []).map((sh) => ({
                          date: sh.created_at || sh.createdAt || new Date().toISOString(),
                          title: 'Plan Updated',
                          body: `Subscription switched to ${sh.plan_code || sh.planCode} plan (${sh.status}).`,
                          icon: <Package className="w-3 h-3 text-emerald-600" />,
                          bg: 'bg-emerald-50'
                        }))
                      ]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 15) // Limit to latest 15 telemetry items
                        .map((item, idx) => (
                          <div key={idx} className="relative">
                            <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-4 ring-white">
                              <div className={`p-1 rounded-full ${item.bg}`}>{item.icon}</div>
                            </span>
                            <div className="text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-gray-900">{item.title}</span>
                                <span className="text-[10px] text-gray-400 tabular-nums">{fmtRelative(item.date)}</span>
                              </div>
                              <p className="text-gray-600 mt-1 leading-relaxed">{item.body}</p>
                            </div>
                          </div>
                        ))}
                      {[
                        ...(ownerDetail?.properties as any[] ?? []),
                        ...(ownerDetail?.tenants as any[] ?? []),
                        ...(ownerDetail?.support as any[] ?? []),
                        ...(ownerSubHistory ?? [])
                      ].length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-4">No recent activities on record for this owner.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeOwnerTab === 'audit-logs' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Audit Logs</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Last 50 events</span>
                    </div>
                    {/* Mobile cards */}
                    <div className="sm:hidden ds-card-list p-3">
                      {(ownerDetail?.audit as any[] ?? []).map((a) => (
                        <div key={a.id} className="ds-card-list-item">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold uppercase tracking-wider truncate">
                              {(a.event || 'PLATFORM_EVENT').replace(/_/g, ' ')}
                            </span>
                            <span className="text-gray-400 font-mono text-[10px] whitespace-nowrap flex-shrink-0">{fmtDate(a.created_at || a.createdAt)}</span>
                          </div>
                          <p className="text-gray-600 text-xs leading-normal pt-1 border-t border-gray-100">{a.detail}</p>
                        </div>
                      ))}
                      {(ownerDetail?.audit as any[] ?? []).length === 0 && (
                        <p className="text-center text-gray-500 text-xs py-8">No system audits found for this owner.</p>
                      )}
                    </div>
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-gray-500">
                          <tr>
                            <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider">Timestamp</th>
                            <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider">Event ID</th>
                            <th className="px-5 py-3 font-semibold text-[10px] uppercase tracking-wider">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(ownerDetail?.audit as any[] ?? []).map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 text-gray-400 font-mono text-[10px] whitespace-nowrap">{fmtDate(a.created_at || a.createdAt)}</td>
                              <td className="px-5 py-3.5 font-bold text-gray-800">
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold uppercase tracking-wider">
                                  {(a.event || 'PLATFORM_EVENT').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600 leading-normal">{a.detail}</td>
                            </tr>
                          ))}
                          {(ownerDetail?.audit as any[] ?? []).length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-gray-500">No system audits found for this owner.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── View: Subscriptions / Plan Lifecycle ──────────────────────────────────

  const renderSubscriptions = () => {
    const starterCount = summary.owners.filter(o => o.planCode === 'starter').length;
    const growthCount = summary.owners.filter(o => o.planCode === 'growth').length;
    const proCount = summary.owners.filter(o => o.planCode === 'pro').length;
    const totalPlans = starterCount + growthCount + proCount || 1; // Prevent division by zero

    return (
      <div className="space-y-6">
        <div>
          <h1 className="ds-page-title">Subscriptions & Billing</h1>
          <p className="text-gray-600 mt-1">Manage owner subscription plans and billing lifecycle.</p>
        </div>

        {/* 4 MRR KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Total MRR</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatRs(summary.stats.monthlyRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Total ARR</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatRs(summary.stats.arr)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">New MRR</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">+{formatRs(summary.stats.newMrr)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Churn MRR</p>
            <p className="text-2xl font-bold text-rose-600 tabular-nums">-{formatRs(summary.stats.churnMrr)}</p>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Plan Distribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Starter</span>
                <span className="text-gray-500">{starterCount} ({Math.round((starterCount/totalPlans)*100)}%)</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-400 rounded-full" style={{ width: `${(starterCount/totalPlans)*100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Growth</span>
                <span className="text-gray-500">{growthCount} ({Math.round((growthCount/totalPlans)*100)}%)</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-600 rounded-full" style={{ width: `${(growthCount/totalPlans)*100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Pro</span>
                <span className="text-gray-500">{proCount} ({Math.round((proCount/totalPlans)*100)}%)</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-900 rounded-full" style={{ width: `${(proCount/totalPlans)*100}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Mobile cards */}
          <div className="md:hidden ds-card-list p-3">
            {summary.owners.map((owner) => {
              const sub = summary.subscriptions?.find((s) => s.ownerId === owner.id);
              const isPaused = owner.subscriptionStatus === 'paused';
              const isCancelled = owner.subscriptionStatus === 'cancelled';
              return (
                <div key={owner.id} className="ds-card-list-item">
                  <div className="cursor-pointer" onClick={() => openOwnerDetail(owner)}>
                    <p className="font-semibold text-gray-900 text-[14px]">{owner.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{owner.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                    <select
                      value={owner.planCode}
                      onChange={(e) => void handlePlanChange(owner.id, e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-gray-700 focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="pro">Pro</option>
                      {plansList.filter(p => !['starter', 'growth', 'pro'].includes(p.code)).map(p => (
                        <option key={p.id} value={p.code}>{p.label}</option>
                      ))}
                    </select>
                    <select
                      value={owner.subscriptionStatus === 'not_configured' ? 'trialing' : owner.subscriptionStatus}
                      onChange={(e) => void handleSubscriptionStatusChange(owner.id, e.target.value as any)}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-gray-700 focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      <option value="trialing">Trialing</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="past_due">Past Due</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  {sub && (
                    <div className="text-xs text-gray-600">
                      <p className="font-bold text-gray-800">{formatRs(sub.amount)} / {sub.billingCycle || 'mo'}</p>
                      <p className="text-[10px] text-gray-400">Renews: {fmtDate(sub.renewsAt)}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                    {isPaused ? (
                      <button onClick={() => void handleSubscriptionStatusChange(owner.id, 'active')} className="px-2.5 py-1 text-[11px] font-bold border border-green-300 bg-green-50 text-green-700 rounded-md">Resume</button>
                    ) : !isCancelled ? (
                      <button onClick={() => void handleSubscriptionStatusChange(owner.id, 'paused')} className="px-2.5 py-1 text-[11px] font-bold border border-amber-300 bg-amber-50 text-amber-700 rounded-md">Pause</button>
                    ) : null}
                    {!isCancelled && (
                      <button onClick={() => void handleSubscriptionStatusChange(owner.id, 'cancelled')} className="px-2.5 py-1 text-[11px] font-bold border border-rose-300 bg-rose-50 text-rose-700 rounded-md">Cancel</button>
                    )}
                    <button onClick={() => openOwnerDetail(owner, 'subscription')} className="text-xs font-semibold text-violet-600 ml-auto">View History</button>
                  </div>
                </div>
              );
            })}
            {summary.owners.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">No subscriptions found.</p>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Renewal & Rate</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.owners.map((owner) => {
                  const sub = summary.subscriptions?.find((s) => s.ownerId === owner.id);
                  const isPaused = owner.subscriptionStatus === 'paused';
                  const isCancelled = owner.subscriptionStatus === 'cancelled';
                  return (
                    <tr key={owner.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="cursor-pointer hover:underline" onClick={() => openOwnerDetail(owner)}>
                          <p className="font-semibold text-gray-900">{owner.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{owner.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={owner.planCode}
                          onChange={(e) => void handlePlanChange(owner.id, e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-gray-700 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="starter">Starter</option>
                          <option value="growth">Growth</option>
                          <option value="pro">Pro</option>
                          {plansList.filter(p => !['starter', 'growth', 'pro'].includes(p.code)).map(p => (
                            <option key={p.id} value={p.code}>{p.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={owner.subscriptionStatus === 'not_configured' ? 'trialing' : owner.subscriptionStatus}
                          onChange={(e) => void handleSubscriptionStatusChange(owner.id, e.target.value as any)}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-semibold text-gray-700 focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="trialing">Trialing</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="past_due">Past Due</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {sub ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-800">{formatRs(sub.amount)} / {sub.billingCycle || 'mo'}</p>
                            <p className="text-[10px] text-gray-400">Renews: {fmtDate(sub.renewsAt)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 flex items-center gap-2">
                        {isPaused ? (
                          <button
                            onClick={() => void handleSubscriptionStatusChange(owner.id, 'active')}
                            className="px-2.5 py-1 text-[11px] font-bold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 rounded-md transition-colors"
                          >
                            Resume
                          </button>
                        ) : !isCancelled ? (
                          <button
                            onClick={() => void handleSubscriptionStatusChange(owner.id, 'paused')}
                            className="px-2.5 py-1 text-[11px] font-bold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
                          >
                            Pause
                          </button>
                        ) : null}
                        {!isCancelled && (
                          <button
                            onClick={() => void handleSubscriptionStatusChange(owner.id, 'cancelled')}
                            className="px-2.5 py-1 text-[11px] font-bold border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button onClick={() => openOwnerDetail(owner, 'subscription')} className="text-xs font-semibold text-violet-600 hover:text-violet-700 ml-2">
                          View History
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {summary.owners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">No subscriptions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── View: Transactions (platform-wide payments) ──────────────────────────

  const renderTransactions = () => {
    if (isLoadingTransactions || !transactionsData) {
      return (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          Loading transactions...
        </div>
      );
    }

    const { stats, transactions } = transactionsData;
    const filtered = transactionStatusFilter
      ? transactions.filter((tx) => tx.status === transactionStatusFilter)
      : transactions;
    const pageStart = (transactionPage - 1) * PAGE_SIZE;
    const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    const handleExport = () => {
      toast.success('Exporting transactions as CSV...');
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="ds-page-title">Transactions</h1>
            <p className="text-gray-600 mt-1">Platform-wide payment activity across all owner accounts.</p>
          </div>
          <button onClick={handleExport} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Total Processed</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatRs(stats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Successful</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{stats.successful}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Overdue</p>
            <p className="text-2xl font-bold text-rose-600 tabular-nums">{stats.failed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <select
              value={transactionStatusFilter}
              onChange={(e) => { setTransactionStatusFilter(e.target.value); setTransactionPage(1); }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 font-medium">{filtered.length} matching transactions</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Mobile cards */}
          <div className="md:hidden ds-card-list p-3">
            {paged.map((tx) => (
              <div key={tx.id} className="ds-card-list-item">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{tx.tenantName}</p>
                    <p className="text-xs text-gray-500 truncate">{tx.ownerName} · {tx.propertyName}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${tx.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {tx.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="font-semibold text-gray-900 tabular-nums">{formatRs(tx.amount)}</span>
                  <span className="text-xs text-gray-500">{tx.paymentMode ?? '—'}</span>
                  <span className="text-xs text-gray-500 tabular-nums">{fmtDate(tx.paidDate ?? tx.dueDate)}</span>
                </div>
              </div>
            ))}
            {paged.length === 0 && (
              <div className="ds-empty-state">
                <div className="ds-empty-icon"><Download style={{ width: 22, height: 22 }} /></div>
                <p className="ds-empty-title">No transactions found</p>
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tenant</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mode</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{tx.tenantName}</td>
                    <td className="px-5 py-3 text-gray-600">{tx.ownerName}</td>
                    <td className="px-5 py-3 text-gray-600">{tx.propertyName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">{formatRs(tx.amount)}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{tx.paymentMode ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${tx.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs tabular-nums">{fmtDate(tx.paidDate ?? tx.dueDate)}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div className="ds-empty-state">
                        <div className="ds-empty-icon"><CreditCard style={{ width: 22, height: 22 }} /></div>
                        <p className="ds-empty-title">No transactions found</p>
                        <p className="ds-empty-description">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={transactionPage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setTransactionPage} />
        </div>
      </div>
    );
  };



  // ── View: Audit Logs (platform-wide activity) ────────────────────────────

  const renderAuditLogs = () => {
    if (isLoadingAuditLog) {
      return (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          Loading audit log...
        </div>
      );
    }

    const uniqueEvents = Array.from(new Set(auditLogEntries.map((e) => e.event))).sort();
    
    const filtered = auditLogEventFilter 
      ? auditLogEntries.filter(e => e.event === auditLogEventFilter)
      : auditLogEntries;

    const pageStart = (auditLogPage - 1) * PAGE_SIZE;
    const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

    const handleExport = () => {
      toast.success('Exporting audit logs as CSV...');
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="ds-page-title">Audit Log</h1>
            <p className="text-gray-600 mt-1">Platform-wide record of owner and admin actions.</p>
          </div>
          <button onClick={handleExport} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <select
              value={auditLogEventFilter}
              onChange={(e) => { setAuditLogEventFilter(e.target.value); setAuditLogPage(1); }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer min-w-[200px]"
            >
              <option value="">All Events</option>
              {uniqueEvents.map(event => (
                <option key={event} value={event}>{event.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-500 font-medium">{filtered.length} matching entries</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Mobile cards */}
          <div className="md:hidden ds-card-list p-3">
            {paged.map((entry) => (
              <div key={entry.id} className="ds-card-list-item">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-wider truncate">
                    {entry.event.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500 tabular-nums flex-shrink-0">{fmtDate(entry.createdAt)}</span>
                </div>
                <p className="text-gray-800 text-sm">{entry.detail}</p>
                <p className="text-xs text-gray-500 font-mono pt-1 border-t border-gray-100">{entry.ownerId || 'system'}</p>
              </div>
            ))}
            {paged.length === 0 && (
              <div className="ds-empty-state">
                <div className="ds-empty-icon"><FileClock style={{ width: 22, height: 22 }} /></div>
                <p className="ds-empty-title">No audit logs found</p>
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Timestamp</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Event</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Actor ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 text-xs tabular-nums">{fmtDate(entry.createdAt)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-wider">
                        {entry.event.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-800">{entry.detail}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs font-mono">{entry.ownerId || 'system'}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <div className="ds-empty-state">
                        <div className="ds-empty-icon"><FileClock style={{ width: 22, height: 22 }} /></div>
                        <p className="ds-empty-title">No audit logs found</p>
                        <p className="ds-empty-description">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={auditLogPage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setAuditLogPage} />
        </div>
      </div>
    );
  };

  // ── View: Analytics (MRR + Platform) ─────────────────────────────────────

  const renderAnalytics = () => {
    if (isLoadingAnalytics || !mrrData || !analytics) {
      return (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          Loading analytics...
        </div>
      );
    }

    const maxMRR = Math.max(...mrrData.map((m) => m.mrr), 1);

    // SaaS Control Tower Metrics
    const activeSubs = summary.owners.filter(o => ['active', 'trialing', 'paused'].includes(o.subscriptionStatus));
    const churnRate = ((summary.stats.churnMrr || 0) / (summary.stats.monthlyRevenue || 1)) * 100;

    // Upcoming Renewals list
    const upcomingRenewals = [...(summary.subscriptions || [])]
      .map(s => {
        const owner = summary.owners.find(o => o.id === s.ownerId);
        return { ...s, ownerName: owner?.name || 'Unknown Owner', email: owner?.email };
      })
      .filter((s) => s.renewsAt && new Date(s.renewsAt).getTime() > Date.now())
      .sort((a, b) => new Date(a.renewsAt).getTime() - new Date(b.renewsAt).getTime())
      .slice(0, 5);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="ds-page-title">SaaS Control Tower Analytics</h1>
          <p className="text-gray-600 mt-1">Real-time revenue metrics, active subscriptions, MRR/ARR, churn rates, and renewal cycles.</p>
        </div>

        {/* SaaS KPIs Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Monthly Recurring Revenue (MRR)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5">{formatRs(summary.stats.monthlyRevenue)}</p>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Telemetry
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Annual Recurring Revenue (ARR)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5">{formatRs(summary.stats.arr)}</p>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Telemetry
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Subscription Contracts</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5">{activeSubs.length} active</p>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold mt-2">
              Out of {summary.owners.length} total signups
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Platform Churn Rate</p>
              <p className="text-2xl font-bold text-rose-600 mt-1.5">{churnRate.toFixed(1)}%</p>
            </div>
            <span className="text-[10px] text-rose-500 font-semibold mt-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> -{formatRs(summary.stats.churnMrr)} lost
            </span>
          </div>
        </div>

        {/* 2-Column Revenue & Renewal Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Collected Graph (takes 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Revenue Collected (12 months)</h2>
              </div>
              <div className="space-y-3">
                {mrrData.map((m) => (
                  <div key={m.month} className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-500 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1">
                      <Bar value={m.mrr} max={maxMRR} color="bg-emerald-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-24 text-right shrink-0 tabular-nums">{formatRs(m.mrr)}</span>
                    <span className="text-xs text-gray-400 w-16 text-right shrink-0">{m.paymentCount} pmts</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-gray-100 flex gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Total Collected</span>
                <span className="font-semibold text-gray-900 text-lg tabular-nums mt-0.5">{formatRs(mrrData.reduce((s, m) => s + m.mrr, 0))}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase tracking-wide">Avg Monthly</span>
                <span className="font-semibold text-gray-900 text-lg tabular-nums mt-0.5">{formatRs(Math.round(mrrData.reduce((s, m) => s + m.mrr, 0) / 12))}</span>
              </div>
            </div>
          </div>

          {/* Upcoming Renewals (takes 1 col) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-violet-600" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Upcoming Renewals</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {upcomingRenewals.map((r, idx) => (
                  <li key={idx} className="py-3 flex flex-col gap-1 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate">{r.ownerName}</span>
                      <span className="text-xs font-extrabold text-gray-800 shrink-0">{formatRs(r.amount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span className="uppercase font-semibold tracking-wider">{r.planCode}</span>
                      <span>Due {fmtDate(r.renewsAt)}</span>
                    </div>
                  </li>
                ))}
                {upcomingRenewals.length === 0 && (
                  <li className="py-6 text-center text-xs text-gray-400 font-medium">No upcoming renewals detected</li>
                )}
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-100 mt-6">
              <button onClick={() => navigateTo('subscriptions')} className="w-full py-2 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg text-xs font-semibold transition-colors">
                Manage All Subscriptions
              </button>
            </div>
          </div>
        </div>

        {/* Owner signup trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Owner Signups (12 months)</h2>
          </div>
          <div className="space-y-3">
            {analytics.ownersByMonth.map((m) => (
              <div key={m.month} className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500 w-16 shrink-0">{m.month}</span>
                <div className="flex-1">
                  <Bar value={m.count} max={Math.max(...analytics.ownersByMonth.map((x) => x.count), 1)} color="bg-blue-500" />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right shrink-0 tabular-nums">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid for Tenant Distribution & Top Cities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Tenant Distribution</h2>
            <div className="space-y-3 flex-1">
              {Object.entries(analytics.tenantsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider ${statusColor(status)}`}>{status.replace('_', ' ')}</span>
                  <span className="font-medium text-gray-900 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Maintenance Status</h2>
            <div className="space-y-3 flex-1">
              {Object.entries(analytics.maintenanceByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">{status.replace('-', ' ')}</span>
                  <span className="font-medium text-gray-900 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Top Cities</h2>
            <div className="space-y-3 flex-1">
              {analytics.topCitiesByOwners.map(({ city, count }) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{city}</span>
                  <span className="font-medium text-gray-900 tabular-nums">{count} <span className="text-gray-400 font-normal">owners</span></span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Occupancy Rate</span>
              <span className="font-bold text-gray-900 tabular-nums">{analytics.occupancyRate}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── View: Support Ticket Center ───────────────────────────────────────────

  const renderSupport = () => {
    const openCount = summary.support.filter(t => t.status === 'open').length;
    const urgentCount = summary.support.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length;
    const inProgressCount = summary.support.filter(t => t.status === 'in_progress').length;
    const resolvedCount = summary.support.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Support Center</h1>
          <p className="text-gray-600 mt-1">Manage and resolve issues reported by property owners.</p>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Open Tickets</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{openCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Urgent & Open</p>
            <p className="text-2xl font-bold text-rose-600 tabular-nums">{urgentCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">In Progress</p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{inProgressCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Resolved</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{resolvedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-3 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={supportSearch}
              onChange={(e) => { setSupportSearch(e.target.value); setSupportPage(1); }}
              placeholder="Search subject or description…"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={supportStatusFilter} 
              onChange={(e) => { setSupportStatusFilter(e.target.value); setSupportPage(1); }} 
              className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select 
              value={supportPriorityFilter} 
              onChange={(e) => { setSupportPriorityFilter(e.target.value); setSupportPage(1); }} 
              className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Ticket List */}
        <div className="space-y-3">
          {pagedSupport.map((ticket) => {
            const isExpanded = expandedTicketId === ticket.id;
            return (
              <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
                <div
                  className="p-4 sm:p-5 cursor-pointer hover:bg-gray-50/80 transition-colors"
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${ticket.priority === 'urgent' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ticket.priority === 'high' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{ticket.priority}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 font-medium">{ticket.category}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{fmtDate(ticket.createdAt)}</span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">{ticket.description}</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ticket.status}
                        onChange={(e) => void handleSupportStatusChange(ticket.id, e.target.value as SupportTicketStatus)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {ticket.comments.length} replies
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-4 sm:p-5">
                    {/* Comment thread */}
                    {ticket.comments.length > 0 && (
                      <div className="space-y-3 mb-5">
                        {ticket.comments.map((c) => (
                          <div key={c.id} className={`rounded-xl p-4 text-sm ${c.internalNote ? 'bg-amber-50 border border-amber-100' : 'bg-white border border-gray-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{c.internalNote ? '🔒 Internal note' : 'Reply'}</span>
                              <span className="text-[11px] text-gray-400">{fmtRelative(c.createdAt)}</span>
                            </div>
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows={3}
                        className="w-full border-0 bg-transparent text-sm resize-none focus:ring-0 p-0 placeholder-gray-400"
                      />
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                          <input type="checkbox" checked={replyInternal} onChange={(e) => setReplyInternal(e.target.checked)} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                          Internal note (hidden from owner)
                        </label>
                        <button
                          onClick={() => void handleSendReply(ticket.id)}
                          disabled={!replyText.trim() || isSendingReply}
                          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {isSendingReply ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {pagedSupport.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="ds-empty-state">
                <div className="ds-empty-icon"><HeadphonesIcon style={{ width: 22, height: 22 }} /></div>
                <p className="ds-empty-title">No tickets found</p>
                <p className="ds-empty-description">Try adjusting your filters or search query.</p>
              </div>
            </div>
          )}
        </div>

        <Pagination page={supportPage} total={filteredSupport.length} pageSize={PAGE_SIZE} onChange={setSupportPage} />
      </div>
    );
  };



  // ── View: Plans Catalog (CRUD, Limits, Feature Flags) ────────────────────

  const renderPlans = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="ds-page-title">Plans Catalog</h1>
            <p className="text-gray-600 mt-1">Configure pricing tiers, features, limits, and service flags.</p>
          </div>
          <button
            onClick={() => {
              setEditingPlan(null);
              setPlanForm({
                code: '',
                label: '',
                price: 0,
                billingCycle: 'monthly',
                propertyLimit: null,
                tenantLimit: null,
                features: [],
                featureFlags: {
                  whatsapp: false,
                  aiAssistant: false,
                  tenantPortal: true,
                  multiUser: false,
                  receipts: true,
                  buildingView: true
                }
              });
              setIsPlanModalOpen(true);
            }}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create New Plan
          </button>
        </div>

        {isLoadingPlans ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Loading plans catalog...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plansList.map((plan) => {
              const activeCount = summary?.owners.filter((o) => o.planCode === plan.code).length ?? 0;
              return (
                <div key={plan.id} className={`bg-white rounded-2xl border ${plan.is_active ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-300 opacity-75 shadow-xs'} overflow-hidden flex flex-col justify-between`}>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider">{plan.code}</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-0.5">{plan.label}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {plan.is_active ? 'Active' : 'Deactivated'}
                        </span>
                        {plan.is_archived && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Archived</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 py-2">
                      <span className="text-3xl font-extrabold text-gray-900">{formatRs(plan.price)}</span>
                      <span className="text-xs text-gray-400 font-medium">/{plan.billing_cycle || 'monthly'}</span>
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Property Limit:</span>
                        <span className="text-gray-900 font-semibold">{plan.property_limit === null ? 'Unlimited' : `${plan.property_limit} Properties`}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Tenant Limit:</span>
                        <span className="text-gray-900 font-semibold">{plan.tenant_limit === null ? 'Unlimited' : `${plan.tenant_limit} Tenants`}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Active Subscribers:</span>
                        <span className="text-violet-600 font-bold">{activeCount} owners</span>
                      </div>
                    </div>

                    {/* Features Tags */}
                    {plan.features && plan.features.length > 0 && (
                      <div className="space-y-1.5 border-t border-gray-100 pt-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Key Inclusions</p>
                        <div className="flex flex-wrap gap-1">
                          {(plan.features as string[]).map((feat, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium border border-violet-100">
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feature Flags */}
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Capability Flags</p>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${plan.feature_flags?.whatsapp ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={plan.feature_flags?.whatsapp ? 'text-gray-800 font-medium' : 'text-gray-400'}>WhatsApp Gateway</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${plan.feature_flags?.aiAssistant ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={plan.feature_flags?.aiAssistant ? 'text-gray-800 font-medium' : 'text-gray-400'}>AI Assistant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${plan.feature_flags?.tenantPortal ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={plan.feature_flags?.tenantPortal ? 'text-gray-800 font-medium' : 'text-gray-400'}>Tenant Portal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${plan.feature_flags?.multiUser ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={plan.feature_flags?.multiUser ? 'text-gray-800 font-medium' : 'text-gray-400'}>Multi-User</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setPlanForm({
                          code: plan.code,
                          label: plan.label,
                          price: plan.price,
                          billingCycle: plan.billing_cycle || 'monthly',
                          propertyLimit: plan.property_limit,
                          tenantLimit: plan.tenant_limit,
                          features: plan.features || [],
                          featureFlags: {
                            whatsapp: plan.feature_flags?.whatsapp ?? false,
                            aiAssistant: plan.feature_flags?.aiAssistant ?? false,
                            tenantPortal: plan.feature_flags?.tenantPortal ?? true,
                            multiUser: plan.feature_flags?.multiUser ?? false,
                            receipts: plan.feature_flags?.receipts ?? true,
                            buildingView: plan.feature_flags?.buildingView ?? true
                          }
                        });
                        setIsPlanModalOpen(true);
                      }}
                      className="flex-1 py-1.5 border border-gray-300 hover:border-violet-600 hover:text-violet-600 bg-white rounded-lg text-xs font-semibold text-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleClonePlan(plan)}
                      className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-slate-100 transition-colors"
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => void handleTogglePlanActive(plan)}
                      className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-slate-100 transition-colors"
                    >
                      {plan.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => void handleArchivePlan(plan)}
                      className={`px-3 py-1.5 border ${plan.is_archived ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-rose-300 text-rose-700 hover:bg-rose-50'} bg-white rounded-lg text-xs font-semibold transition-colors`}
                    >
                      {plan.is_archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </div>
              );
            })}
            {plansList.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
                No subscription plans configured.
              </div>
            )}
          </div>
        )}

        {/* Plan CRUD Modal */}
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">{editingPlan ? 'Edit Plan Configuration' : 'Create Subscription Plan'}</h3>
                <button onClick={() => setIsPlanModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
              </div>

              <form onSubmit={(e) => void handleSavePlan(e)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Plan Code</label>
                    <input
                      required
                      disabled={!!editingPlan}
                      value={planForm.code}
                      onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="e.g. starter"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500 disabled:bg-slate-100 disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Plan Name (Label)</label>
                    <input
                      required
                      value={planForm.label}
                      onChange={(e) => setPlanForm({ ...planForm, label: e.target.value })}
                      placeholder="e.g. Starter Plan"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Price (₹ INR)</label>
                    <input
                      required
                      type="number"
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                      placeholder="999"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Billing Cycle</label>
                    <select
                      value={planForm.billingCycle}
                      onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Properties Limit</label>
                    <input
                      type="number"
                      value={planForm.propertyLimit === null ? '' : planForm.propertyLimit}
                      onChange={(e) => setPlanForm({ ...planForm, propertyLimit: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="Unlimited (Leave Blank)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Tenants Limit</label>
                    <input
                      type="number"
                      value={planForm.tenantLimit === null ? '' : planForm.tenantLimit}
                      onChange={(e) => setPlanForm({ ...planForm, tenantLimit: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="Unlimited (Leave Blank)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Key Inclusions (One feature per line)</label>
                  <textarea
                    rows={3}
                    value={planForm.features.join('\n')}
                    onChange={(e) => setPlanForm({ ...planForm, features: e.target.value.split('\n').filter(Boolean) })}
                    placeholder="Receipt Generator&#10;WhatsApp Notifications&#10;Basic Support"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Capability Toggles</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.featureFlags.whatsapp}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          featureFlags: { ...planForm.featureFlags, whatsapp: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>WhatsApp Gateway</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.featureFlags.aiAssistant}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          featureFlags: { ...planForm.featureFlags, aiAssistant: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>AI Tenant Assistant</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.featureFlags.tenantPortal}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          featureFlags: { ...planForm.featureFlags, tenantPortal: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>Tenant Portal API</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.featureFlags.multiUser}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          featureFlags: { ...planForm.featureFlags, multiUser: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>Multi-user Workspace</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 hover:bg-slate-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── View: Offers & Coupons (CRUD) ──────────────────────────────────────────

  const renderOffersCoupons = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="ds-page-title">Offers & Coupons</h1>
            <p className="text-gray-600 mt-1">Configure platform-wide and plan-restricted discount codes.</p>
          </div>
          <button
            onClick={() => {
              setEditingCoupon(null);
              setCouponForm({
                code: '',
                description: '',
                discountType: 'percent',
                discountValue: 0,
                maxUses: '',
                validUntil: '',
                planRestriction: '',
                isActive: true
              });
              setIsCouponModalOpen(true);
            }}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Coupon
          </button>
        </div>

        {isLoadingCoupons ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Loading coupon codes...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Mobile cards */}
            <div className="md:hidden ds-card-list p-3">
              {couponsList.map((coupon) => (
                <div key={coupon.id} className="ds-card-list-item">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-gray-900 tracking-wider text-xs block">{coupon.code}</span>
                      <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block truncate">{coupon.description || 'No description'}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${coupon.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-[11px]">
                    <div className="ds-card-list-row"><span className="ds-card-list-label">Value</span><span className="ds-card-list-value">{coupon.discountType === 'percent' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Flat`}</span></div>
                    <div className="ds-card-list-row"><span className="ds-card-list-label">Uses</span><span className="ds-card-list-value">{coupon.usedCount} / {coupon.maxUses === null ? '∞' : coupon.maxUses}</span></div>
                  </div>
                  <p className="text-[11px] text-gray-500">Valid until {coupon.validUntil ? fmtDate(coupon.validUntil) : 'unlimited'}</p>
                  <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                    <button onClick={() => void handleToggleCouponActive(coupon)} className="px-2.5 py-1 border border-gray-300 rounded text-[11px] font-semibold bg-white text-gray-700">
                      {coupon.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => void handleDeleteCoupon(coupon.id)} className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded text-[11px] font-semibold bg-white">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {couponsList.length === 0 && (
                <p className="text-center text-gray-500 text-xs font-semibold py-8">No coupon codes registered.</p>
              )}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Coupon</th>
                    <th className="px-5 py-3.5">Value</th>
                    <th className="px-5 py-3.5">Uses Count</th>
                    <th className="px-5 py-3.5">Validity Range</th>
                    <th className="px-5 py-3.5">Applies To</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {couponsList.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-900 tracking-wider text-xs block">{coupon.code}</span>
                        <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">{coupon.description || 'No description'}</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-gray-800 text-xs">
                        {coupon.discountType === 'percent' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Flat`}
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-600">
                        {coupon.usedCount} / {coupon.maxUses === null ? '∞' : coupon.maxUses}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        Until {coupon.validUntil ? fmtDate(coupon.validUntil) : 'unlimited'}
                      </td>
                      <td className="px-5 py-4">
                        {coupon.planRestriction ? (
                          <div className="flex flex-wrap gap-1">
                            {coupon.planRestriction.split(',').map((p: string, idx: number) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[9px] font-bold uppercase tracking-wider border border-violet-100">
                                {p.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">All plans</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${coupon.isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => void handleToggleCouponActive(coupon)}
                          className="px-2.5 py-1 border border-gray-300 hover:bg-slate-100 rounded text-[11px] font-semibold bg-white text-gray-700 transition-colors"
                        >
                          {coupon.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => void handleDeleteCoupon(coupon.id)}
                          className="px-2.5 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded text-[11px] font-semibold bg-white transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {couponsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-500 text-xs font-semibold">No coupon codes registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coupon CRUD Modal */}
        {isCouponModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-bold text-gray-900">Create Coupon Code</h3>
                <button onClick={() => setIsCouponModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
              </div>

              <form onSubmit={(e) => void handleSaveCoupon(e)} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Promo Code (Uppercase)</label>
                  <input
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="e.g. PLATFORM25"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Coupon Description</label>
                  <input
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    placeholder="e.g. 25% off monthly subscription billing"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Discount Type</label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Fixed Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Discount Value</label>
                    <input
                      required
                      type="number"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                      placeholder="e.g. 25"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Max Usage Limit</label>
                    <input
                      type="number"
                      value={couponForm.maxUses}
                      onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                      placeholder="Unlimited (Leave Blank)"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Expiration Target Date</label>
                    <input
                      type="date"
                      value={couponForm.validUntil}
                      onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Plan Specific Limitations (Comma separated)</label>
                  <input
                    value={couponForm.planRestriction}
                    onChange={(e) => setCouponForm({ ...couponForm, planRestriction: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="e.g. starter,growth (Leave blank for all)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs w-full bg-white font-semibold text-gray-800 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 hover:bg-slate-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                  >
                    Generate Coupon
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── View: Platform Settings ───────────────────────────────────────────────

  const renderPlatformSettings = () => {
    const tabs: SettingsTab[] = ['General', 'Email Templates', 'WhatsApp', 'Billing', 'Security'];
    const selectedTemplate = emailTemplates.find((t) => t.id === selectedEmailTemplateId) ?? null;
    const templateIsDirty = !!selectedTemplate && (selectedTemplate.subject !== draftTemplateSubject || selectedTemplate.body !== draftTemplateBody);

    const planCounts = (['starter', 'growth', 'pro'] as const).map((plan) => ({
      plan,
      count: summary.owners.filter((o) => o.planCode === plan).length,
    }));
    const maxPlanCount = Math.max(...planCounts.map((p) => p.count), 1);

    const sectionLabel = (label: string) => (
      <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
    );

    const renderGeneral = () => (
      <>
        <section>
          {sectionLabel('Platform Details')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Platform Name</label>
              <input
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => toast.success('Platform details saved')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            >
              Save Details
            </button>
          </div>
        </section>

        <section className="pt-5 border-t border-gray-100">
          {sectionLabel('Maintenance Mode')}
          <div className="flex items-start justify-between gap-4 mt-3">
            <div>
              <p className="text-sm text-gray-900">Enable Maintenance Mode</p>
              <p className="text-xs text-gray-500 mt-0.5">Shows a maintenance page to all users while the platform is updated.</p>
            </div>
            <ToggleSwitch checked={maintenanceModeEnabled} onChange={setMaintenanceModeEnabled} label="Enable maintenance mode" />
          </div>
          {maintenanceModeEnabled && (
            <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-700">Maintenance mode is live — every owner and tenant will see the maintenance page until this is turned off.</p>
            </div>
          )}
        </section>

        <section className="pt-5 border-t border-gray-100">
          {sectionLabel('Feature Flags')}
          <p className="text-xs text-gray-500 mt-1">Toggle platform-wide capabilities on or off for every owner workspace.</p>
          <div className="mt-3 divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {(Object.keys(FEATURE_FLAG_LABELS) as FeatureFlagKey[]).map((key) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-700">{FEATURE_FLAG_LABELS[key]}</p>
                <ToggleSwitch
                  checked={featureFlags[key]}
                  label={FEATURE_FLAG_LABELS[key]}
                  onChange={(next) => {
                    setFeatureFlags((prev) => ({ ...prev, [key]: next }));
                    toast.success(`${FEATURE_FLAG_LABELS[key]} ${next ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </>
    );

    const renderEmailTemplates = () => (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden h-fit">
          {emailTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectEmailTemplate(template.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                template.id === selectedEmailTemplateId ? 'bg-[#7C3AED]/5 border-l-2 border-[#7C3AED]' : 'border-l-2 border-transparent hover:bg-gray-50'
              }`}
            >
              <p className={`text-sm ${template.id === selectedEmailTemplateId ? 'text-[#7C3AED] font-medium' : 'text-gray-900'}`}>{template.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
            </button>
          ))}
        </div>

        {selectedTemplate ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">Use placeholders like <code className="bg-gray-100 px-1 rounded">{'{{tenant_name}}'}</code> — they're replaced automatically when the email is sent.</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Subject Line</label>
              <input
                value={draftTemplateSubject}
                onChange={(e) => setDraftTemplateSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Body</label>
              <textarea
                value={draftTemplateBody}
                onChange={(e) => setDraftTemplateBody(e.target.value)}
                rows={9}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{templateIsDirty ? 'Unsaved changes' : 'No changes'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectEmailTemplate(selectedEmailTemplateId)}
                  disabled={!templateIsDirty}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Discard
                </button>
                <button
                  onClick={() => void handleSaveEmailTemplate()}
                  disabled={!templateIsDirty || isSavingTemplate}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSavingTemplate ? 'Saving…' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-gray-500">Select a template to edit its content.</div>
        )}
      </div>
    );

    const renderWhatsApp = () => (
      <>
        <section>
          {sectionLabel('Gateway Status')}
          <div className="mt-3 flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-900">WhatsApp Business API connected</p>
              <p className="text-xs text-emerald-700 mt-0.5">Messages are routed through the platform's verified business number.</p>
            </div>
          </div>
        </section>

        <section className="pt-5 border-t border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              {sectionLabel('Automatic Payment Reminders')}
              <p className="text-xs text-gray-500 mt-0.5">Send a WhatsApp reminder to tenants automatically as their due date approaches.</p>
            </div>
            <ToggleSwitch checked={whatsappAutoReminders} label="Automatic payment reminders" onChange={(next) => {
              setWhatsappAutoReminders(next);
              toast.success(`Automatic payment reminders ${next ? 'enabled' : 'disabled'}`);
            }} />
          </div>
        </section>

        <section className="pt-5 border-t border-gray-100 space-y-4">
          {sectionLabel('Message Templates')}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Payment Reminder Template</label>
            <textarea
              value={whatsappReminderTemplate}
              onChange={(e) => setWhatsappReminderTemplate(e.target.value)}
              rows={4}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Message Footer</label>
            <input
              value={whatsappFooterText}
              onChange={(e) => setWhatsappFooterText(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => toast.success('WhatsApp templates saved')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            >
              Save Templates
            </button>
          </div>
        </section>
      </>
    );

    const renderBilling = () => (
      <>
        <section>
          {sectionLabel('Revenue Snapshot')}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'MRR', value: formatRs(summary.stats.monthlyRevenue) },
              { label: 'ARR', value: formatRs(summary.stats.arr) },
              { label: 'Active Subscriptions', value: String(summary.stats.activeSubscriptions) },
              { label: 'Churn MRR', value: formatRs(summary.stats.churnMrr) },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-100 rounded-xl p-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-5 border-t border-gray-100">
          {sectionLabel('Plan Distribution')}
          <div className="mt-3 space-y-3">
            {planCounts.map(({ plan, count }) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-16 capitalize shrink-0">{plan}</span>
                <Bar value={count} max={maxPlanCount} color="bg-[#7C3AED]" />
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">{count} owner{count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-5 border-t border-gray-100">
          {sectionLabel('Payment Gateways')}
          <p className="text-xs text-gray-500 mt-1">Control which payment gateways owners can use to collect rent.</p>
          <div className="mt-3 divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {(Object.keys(PAYMENT_GATEWAY_LABELS) as PaymentGatewayKey[]).map((key) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-700">{PAYMENT_GATEWAY_LABELS[key]}</p>
                </div>
                <ToggleSwitch
                  checked={paymentGateways[key]}
                  label={PAYMENT_GATEWAY_LABELS[key]}
                  onChange={(next) => {
                    setPaymentGateways((prev) => ({ ...prev, [key]: next }));
                    toast.success(`${PAYMENT_GATEWAY_LABELS[key]} ${next ? 'enabled' : 'disabled'}`);
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </>
    );

    const renderSecurity = () => (
      <>
        <section>
          {sectionLabel('Admin Access')}
          <div className="mt-3 divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700">Require two-factor authentication</p>
                  <p className="text-xs text-gray-500 mt-0.5">All admin accounts must verify with a second factor at login.</p>
                </div>
              </div>
              <ToggleSwitch checked={requireTwoFactor} label="Require two-factor authentication" onChange={(next) => {
                setRequireTwoFactor(next);
                toast.success(`Two-factor authentication ${next ? 'required' : 'optional'} for admins`);
              }} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700">Restrict admin access by IP allowlist</p>
                  <p className="text-xs text-gray-500 mt-0.5">Only requests from approved IP ranges can reach the admin console.</p>
                </div>
              </div>
              <ToggleSwitch checked={ipAllowlistEnabled} label="Restrict admin access by IP allowlist" onChange={(next) => {
                setIpAllowlistEnabled(next);
                toast.success(`IP allowlist ${next ? 'enabled' : 'disabled'}`);
              }} />
            </div>
          </div>
        </section>

        <section className="pt-5 border-t border-gray-100">
          {sectionLabel('Session Policy')}
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700">Sign out idle sessions automatically</p>
              <p className="text-xs text-gray-500 mt-0.5">Admins are signed out after a period of inactivity.</p>
            </div>
            <ToggleSwitch checked={sessionTimeoutEnabled} label="Sign out idle sessions automatically" onChange={(next) => {
              setSessionTimeoutEnabled(next);
              toast.success(`Idle session timeout ${next ? 'enabled' : 'disabled'}`);
            }} />
          </div>
          {sessionTimeoutEnabled && (
            <div className="mt-3 max-w-xs">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Timeout after (minutes)</label>
              <select
                value={sessionTimeoutMinutes}
                onChange={(e) => { setSessionTimeoutMinutes(e.target.value); toast.success(`Idle timeout set to ${e.target.value} minutes`); }}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          )}
        </section>

        <section className="pt-5 border-t border-gray-100">
          {sectionLabel('Audit Log Retention')}
          <p className="text-xs text-gray-500 mt-1">How long platform audit log entries are kept before archival.</p>
          <div className="mt-3 max-w-xs">
            <select
              value={auditRetentionDays}
              onChange={(e) => { setAuditRetentionDays(e.target.value); toast.success(`Audit log retention set to ${e.target.value} days`); }}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
          </div>
        </section>
      </>
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Platform Settings</h1>
          <p className="text-gray-600 mt-1">Global configuration for the RentCare platform.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100 hide-scrollbar">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setSettingsTab(tab)}
                className={`px-5 py-3.5 text-sm whitespace-nowrap border-b-2 transition-all ${
                  settingsTab === tab
                    ? 'border-violet-600 text-violet-700 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            {settingsTab === 'General' && renderGeneral()}
            {settingsTab === 'Email Templates' && renderEmailTemplates()}
            {settingsTab === 'WhatsApp' && renderWhatsApp()}
            {settingsTab === 'Billing' && renderBilling()}
            {settingsTab === 'Security' && renderSecurity()}
          </div>
        </div>
      </div>
    );
  };

  // ── Create Owner Modal ────────────────────────────────────────────────────

  const CreateOwnerModal = () => {
    if (!createOwnerOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Create Owner Account</h3>
            <button onClick={() => { setCreateOwnerOpen(false); setCreatedOwnerResult(null); }} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            {createdOwnerResult ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-800 mb-2">Owner created successfully</p>
                  <p className="text-xs text-emerald-700">Share these credentials with the owner. They should change their password immediately.</p>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 font-mono text-sm">
                  <p><span className="text-gray-500">Email:    </span><span className="font-semibold text-gray-900">{createOwnerEmail}</span></p>
                  <p><span className="text-gray-500">Password: </span><span className="font-semibold text-gray-900">{createdOwnerResult.tempPassword}</span></p>
                </div>
                <button onClick={() => { setCreateOwnerOpen(false); setCreatedOwnerResult(null); }} className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">Done</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email *</label>
                    <input value={createOwnerEmail} onChange={(e) => setCreateOwnerEmail(e.target.value)} type="email" placeholder="owner@example.com" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Full Name *</label>
                    <input value={createOwnerName} onChange={(e) => setCreateOwnerName(e.target.value)} placeholder="Ravi Sharma" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</label>
                    <input value={createOwnerPhone} onChange={(e) => setCreateOwnerPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">City</label>
                    <input value={createOwnerCity} onChange={(e) => setCreateOwnerCity(e.target.value)} placeholder="Bengaluru" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">PG / Business Name</label>
                    <input value={createOwnerPgName} onChange={(e) => setCreateOwnerPgName(e.target.value)} placeholder="Shree Niwas PG" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">A temporary password will be auto-generated and shown once.</p>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setCreateOwnerOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={() => void handleCreateOwner()} disabled={isCreatingOwner || !createOwnerEmail.trim() || !createOwnerName.trim()} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isCreatingOwner ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Owner'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Team Management view ──────────────────────────────────────────────────

  const renderTeamManagement = () => {
    const inviteStatusColor = (s: string) => {
      if (s === 'accepted') return 'bg-green-100 text-green-700';
      if (s === 'revoked') return 'bg-red-100 text-red-600';
      if (s === 'expired') return 'bg-gray-100 text-gray-500';
      return 'bg-amber-100 text-amber-700';
    };

    const filtered = teamInvites.filter((i) => {
      const q = teamSearch.toLowerCase();
      const matchQ = !q || i.invited_email.toLowerCase().includes(q) || i.owner_id.toLowerCase().includes(q);
      const matchStatus = !teamStatusFilter || i.status === teamStatusFilter;
      return matchQ && matchStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Team Invitations</h2>
            <p className="text-sm text-slate-500">All workspace invitations across the platform</p>
          </div>
          <span className="text-sm text-slate-500">{filtered.length} invite{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 h-9 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              placeholder="Search email or owner…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 border border-slate-200 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            value={teamStatusFilter}
            onChange={(e) => setTeamStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {isLoadingTeam ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">Loading invitations…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">No invitations found</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden ds-card-list p-3">
                {filtered.map((inv) => (
                  <div key={inv.id} className="ds-card-list-item">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900 truncate">{inv.invited_email}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${inviteStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="ds-card-list-row"><span className="ds-card-list-label">Role</span><span className="ds-card-list-value capitalize">{inv.display_role}</span></div>
                      <div className="ds-card-list-row"><span className="ds-card-list-label">Invited</span><span className="ds-card-list-value">{fmtDate(inv.invited_at)}</span></div>
                      <div className="ds-card-list-row"><span className="ds-card-list-label">Expires</span><span className="ds-card-list-value">{fmtDate(inv.expires_at)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invited Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invited</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{inv.invited_email}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{inv.display_role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${inviteStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{fmtDate(inv.invited_at)}</td>
                        <td className="px-4 py-3 text-slate-500">{fmtDate(inv.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ── Root render ───────────────────────────────────────────────────────────

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return renderDashboard();
      case 'owners': return renderOwners();
      case 'subscriptions': return renderSubscriptions();
      case 'plans': return renderPlans();
      case 'offers-coupons': return renderOffersCoupons();
      case 'transactions': return renderTransactions();
      case 'analytics': return renderAnalytics();
      case 'audit-logs': return renderAuditLogs();
      case 'support': return renderSupport();
      case 'platform-settings': return renderPlatformSettings();
      case 'team-management': return renderTeamManagement();
      default: return renderDashboard();
    }
  };

  return (
    <AdminLayout
      current={sidebarCurrent}
      onNavigate={handleSidebarNavigate}
      profileName={summary.profile.name}
      profileRole={summary.profile.role === 'platform_admin' ? 'Super Admin' : summary.profile.role}
      notificationCount={openSupportCount}
    >
      <div className="space-y-4">
        <SuspendDialog />
        <CreateOwnerModal />
        {renderOwnerDrawer()}

        {isDemoModeEnabled() && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700">
            <span className="font-semibold">Demo Mode</span> — showing sample platform data. Log in with a real admin account to manage live owners.
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{errorMessage}</div>
        )}

        {renderView()}
      </div>
    </AdminLayout>
  );
}
