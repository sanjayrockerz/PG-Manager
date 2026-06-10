import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Bell, Building2, Calendar,
  Check, CheckCircle2, ChevronRight, CreditCard,
  Download, FileText, Home, IndianRupee, LayoutDashboard, LogOut,
  MapPin, MessageSquare, Phone, Plus, QrCode, Send, Upload, User,
  Wrench, X, HelpCircle, Menu, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  type MaintenancePriority,
  type NotificationRecord,
  type PaymentRecord,
  type TenantPortalSnapshot,
  type AgreementRecord,
  type TenantDocument,
  supabaseTenantDataApi,
  supabaseLifecycleApi,
} from '../services/supabaseData';
import {
  getTenantPortalSnapshot,
  submitTenantVacateRequest,
  createTenantMaintenanceTicket,
} from '../services/dataService';
import { openReceiptWindow, openInvoiceWindow } from '../services/receiptGenerator';
import { getAppMode } from '../config/appMode';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type TenantView =
  | 'home'
  | 'payments'
  | 'maintenance'
  | 'maintenance-new'
  | 'maintenance-detail'
  | 'announcements'
  | 'notifications'
  | 'documents'
  | 'profile'
  | 'help'
  | 'vacate';

const MAINTENANCE_CATEGORIES = [
  'Plumbing', 'Electrical', 'AC / Cooling', 'Wi-Fi / Internet',
  'Cleanliness', 'Furniture / Fixtures', 'Water Supply',
  'Lock / Security', 'Pest Control', 'Other',
];

const welcomeKey = (userId: string) => `tenant-welcome-v1-seen:${userId}`;
const notifSeenKey = (tenantId: string) => `tenant-notif-last-seen:${tenantId}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v: string | undefined | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtAmount = (v: number) => `₹${v.toLocaleString('en-IN')}`;

const buildUpiLink = (upiId: string, amount: number, name: string, month: string) => {
  if (!upiId) return null;
  const note = encodeURIComponent(`Rent ${month}`);
  const pn = encodeURIComponent(name);
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${pn}&am=${amount}&tn=${note}&cu=INR`;
};

const paymentMonth = (p: PaymentRecord) => {
  const d = new Date(p.dueDate);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const stayingSince = (joinDate: string) => {
  const d = new Date(joinDate);
  if (isNaN(d.getTime())) return joinDate;
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return 'New arrival';
  if (months < 12) return `${months}+ month${months > 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  return `${years}+ year${years > 1 ? 's' : ''}`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

function statusBadge(status: string): string {
  if (status === 'paid') return 'bg-green-100 text-green-700';
  if (status === 'overdue') return 'bg-red-100 text-red-700';
  if (status === 'open') return 'bg-amber-100 text-amber-700';
  if (status === 'in-progress') return 'bg-blue-100 text-blue-700';
  if (status === 'resolved' || status === 'closed') return 'bg-gray-100 text-gray-600';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'waiting') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ snapshot, onDone }: { snapshot: TenantPortalSnapshot; onDone: () => void }) {
  const { tenant, property, ownerPaymentInfo } = snapshot;

  const features = [
    'Real-time rent tracking and payment history',
    'File maintenance requests in seconds',
    'Instant announcements from your PG',
  ];

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Left gradient panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 50%, #0891B2 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">RentCare</span>
          </div>
          <h1 className="text-3xl font-bold leading-snug mb-4">Your PG, managed<br />beautifully.</h1>
          <p className="text-white/75 text-sm leading-relaxed mb-10">
            Track rent, file complaints, get announcements — all from one place.
          </p>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">Powered by RentCare</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white overflow-y-auto flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Success icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Welcome to RentCare, {tenant.name.split(' ')[0]}! 🎉
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Your account has been set up by{' '}
            {ownerPaymentInfo.pgName || property?.name || 'your property manager'}.
          </p>

          {/* Room details card */}
          <div className="bg-[#F5F3FF] rounded-2xl p-6 mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Room</p>
                <p className="font-bold text-gray-900">{tenant.room}</p>
              </div>
              {tenant.bed && (
                <div>
                  <p className="text-xs font-semibold text-indigo-600 mb-1">Bed</p>
                  <p className="font-bold text-gray-900">Bed {tenant.bed}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Floor</p>
                <p className="font-bold text-gray-900">Floor {tenant.floor}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Monthly Rent</p>
                <p className="font-bold text-gray-900">{fmtAmount(tenant.rent)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Due Date</p>
                <p className="font-bold text-gray-900">{tenant.rentDueDate}th of every month</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Property</p>
                <p className="font-bold text-gray-900">{ownerPaymentInfo.pgName || property?.name}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onDone}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
          >
            Go to my Dashboard <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
            Your payment history and documents will appear here as your PG manager updates them.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Navigation ────────────────────────────────────────────────────────

const SIDEBAR_SECTIONS = [
  {
    heading: 'OVERVIEW',
    items: [{ id: 'home' as TenantView, label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'FINANCE',
    items: [{ id: 'payments' as TenantView, label: 'Payments', icon: CreditCard }],
  },
  {
    heading: 'OPERATIONS',
    items: [
      { id: 'maintenance' as TenantView, label: 'Maintenance', icon: Wrench },
      { id: 'announcements' as TenantView, label: 'Announcements', icon: Bell },
    ],
  },
  {
    heading: 'MY ACCOUNT',
    items: [
      { id: 'documents' as TenantView, label: 'Documents', icon: FileText },
      { id: 'profile' as TenantView, label: 'My Profile', icon: User },
      { id: 'help' as TenantView, label: 'Help & Rules', icon: HelpCircle },
    ],
  },
];

const BOTTOM_TABS = [
  { id: 'home' as TenantView, label: 'Home', icon: Home },
  { id: 'payments' as TenantView, label: 'Payments', icon: CreditCard },
  { id: 'maintenance' as TenantView, label: 'Repairs', icon: Wrench },
  { id: 'announcements' as TenantView, label: 'Updates', icon: Bell },
  { id: 'profile' as TenantView, label: 'Profile', icon: User },
];

const activeTabFor = (v: TenantView): TenantView => {
  if (v === 'maintenance-new' || v === 'maintenance-detail') return 'maintenance';
  if (v === 'vacate') return 'profile';
  if (v === 'notifications') return 'announcements';
  if (v === 'help') return 'profile';
  return v;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function TenantPortal() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<TenantView>('home');
  const [snapshot, setSnapshot] = useState<TenantPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifLastSeen, setNotifLastSeen] = useState<string>(() => {
    if (typeof window === 'undefined') return new Date(0).toISOString();
    return localStorage.getItem(notifSeenKey('__init')) ?? new Date(0).toISOString();
  });

  // Agreement signing state
  const [tenantSignModal, setTenantSignModal] = useState<{ agreement: AgreementRecord } | null>(null);
  const [tenantSignatureName, setTenantSignatureName] = useState('');
  const [tenantSigning, setTenantSigning] = useState(false);

  // Maintenance form state
  const [ticketForm, setTicketForm] = useState({
    category: '', issue: '', description: '',
    priority: 'medium' as MaintenancePriority,
    imageFile: null as File | null,
    imageUploading: false, imageUrl: '', submitting: false,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);

  // Vacate form state
  const [vacateForm, setVacateForm] = useState({ date: '', reason: '', confirm: false, submitting: false });

  const isDemo = getAppMode() === 'demo';

  // ── Initial full load (once on mount) ─────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await getTenantPortalSnapshot();
      setSnapshot(data);

      const storedSeen = localStorage.getItem(notifSeenKey(data.tenant.id)) ?? new Date(0).toISOString();
      setNotifLastSeen(storedSeen);

      // Welcome screen logic
      const key = welcomeKey(data.tenant.id);
      const localSeen = typeof window !== 'undefined' && localStorage.getItem(key) === 'true';
      if (!localSeen && !isDemo) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('first_login_completed_at')
          .eq('id', user?.id ?? '')
          .maybeSingle<{ first_login_completed_at: string | null }>();
        if (!profileRow?.first_login_completed_at) setShowWelcome(true);
      } else if (!localSeen) {
        setShowWelcome(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load portal data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  // Guard inactive tenants
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.tenant.status !== 'inactive') return;
    const INACTIVE_ALLOWED: TenantView[] = ['payments', 'documents'];
    if (!INACTIVE_ALLOWED.includes(view)) setView('payments');
  }, [snapshot, view]);

  // ── Realtime — delta-patch per table, no full reload ─────────────────────
  useEffect(() => {
    if (isDemo || !snapshot) return;

    const tenantId = snapshot.tenant.id;
    const propertyId = snapshot.tenant.propertyId;

    const channel = supabase.channel(`tenant-portal-rt-${tenantId}`)

      // Payments: patch on insert or update
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        if (!payload.new) return;
        const updated = payload.new as Record<string, unknown>;
        setSnapshot((prev) => {
          if (!prev) return prev;
          const exists = prev.payments.some((p) => p.id === updated.id);
          const mappedPayment: PaymentRecord = {
            id: String(updated.id ?? ''),
            tenantId: String(updated.tenant_id ?? ''),
            propertyId: String(updated.property_id ?? ''),
            ownerId: String(updated.owner_id ?? ''),
            dueDate: String(updated.due_date ?? ''),
            paidDate: updated.paid_date ? String(updated.paid_date) : undefined,
            amount: Number(updated.amount ?? 0),
            charges: [],
            totalAmount: Number(updated.amount ?? 0),
            status: String(updated.status ?? 'pending') as PaymentRecord['status'],
            paymentMode: updated.payment_mode ? String(updated.payment_mode) : undefined,
            referenceNumber: updated.reference_number ? String(updated.reference_number) : undefined,
            notes: updated.notes ? String(updated.notes) : undefined,
            createdAt: String(updated.created_at ?? ''),
          };
          const payments = exists
            ? prev.payments.map((p) => p.id === mappedPayment.id ? mappedPayment : p)
            : [mappedPayment, ...prev.payments];
          return { ...prev, payments };
        });
      })

      // Maintenance: patch on insert or update
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tickets', filter: `tenant_id=eq.${tenantId}` }, () => {
        // For maintenance tickets we do a targeted re-fetch to also get threads
        void supabase
          .from('maintenance_tickets')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (!data) return;
            setSnapshot((prev) => {
              if (!prev) return prev;
              return { ...prev, maintenance: data.map((row: Record<string, unknown>) => ({
                id: String(row.id ?? ''),
                tenantId: String(row.tenant_id ?? ''),
                propertyId: String(row.property_id ?? ''),
                ownerId: String(row.owner_id ?? ''),
                issue: String(row.issue ?? ''),
                description: String(row.description ?? ''),
                status: String(row.status ?? 'open') as 'open' | 'in-progress' | 'resolved' | 'closed' | 'pending' | 'waiting',
                priority: String(row.priority ?? 'medium') as MaintenancePriority,
                date: String(row.created_at ?? ''),
                threads: [],
              })) };
            });
          });
      })

      // Announcements: prepend new ones
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (String(row.property_id ?? '') !== propertyId && row.property_id !== null) return;
        setSnapshot((prev) => {
          if (!prev) return prev;
          const newAnn = {
            id: String(row.id ?? ''),
            title: String(row.title ?? ''),
            content: String(row.content ?? ''),
            category: String(row.category ?? 'general') as 'general' | 'maintenance' | 'payment' | 'rules' | 'event',
            date: String(row.created_at ?? ''),
            isPinned: Boolean(row.is_pinned ?? false),
            propertyId: row.property_id ? String(row.property_id) : null,
            ownerId: String(row.owner_id ?? ''),
          };
          return { ...prev, announcements: [newAnn, ...prev.announcements] };
        });
      })

      // Notifications: prepend new ones
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const msg = String(row.message ?? '');
        const title = String(row.title ?? '');
        const type = String(row.type ?? '');
        if (type !== 'announcement' && type !== 'system' && !msg.includes(snapshot.tenant.name) && !title.includes(snapshot.tenant.name)) return;
        setSnapshot((prev) => {
          if (!prev) return prev;
          const newNotif: NotificationRecord = {
            id: String(row.id ?? ''),
            ownerId: String(row.owner_id ?? ''),
            propertyId: row.property_id ? String(row.property_id) : undefined,
            type: type as NotificationRecord['type'],
            title,
            message: msg,
            read: Boolean(row.read ?? false),
            createdAt: String(row.created_at ?? ''),
          };
          return { ...prev, notifications: [newNotif, ...prev.notifications].slice(0, 50) };
        });
      })

      // Tenant row updates (status, room, rent changes)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` }, () => {
        // Full reload only when the tenant's own record changes
        void load();
      })

      // Agreements
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements', filter: `tenant_id=eq.${tenantId}` }, () => {
        void supabaseLifecycleApi.getAgreements(tenantId)
          .then((agreements) => {
            setSnapshot((prev) => prev ? { ...prev, agreements } : prev);
          })
          .catch(() => {});
      })

      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Silent fallback: reload data if realtime fails
          void load();
        }
      });

    // 90-second fallback polling only if realtime has been completely silent
    const lastRefreshRef = { current: Date.now() };
    const fallbackTimer = setInterval(() => {
      if (Date.now() - lastRefreshRef.current >= 90_000) {
        lastRefreshRef.current = Date.now();
        void load();
      }
    }, 90_000);

    return () => {
      clearInterval(fallbackTimer);
      void supabase.removeChannel(channel);
    };
  }, [snapshot?.tenant.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values ────────────────────────────────────────────────────────
  const pendingPayments = useMemo(() => (snapshot?.payments ?? []).filter((p) => p.status !== 'paid'), [snapshot]);
  const openTickets = useMemo(() => (snapshot?.maintenance ?? []).filter((t) => t.status !== 'resolved' && t.status !== 'closed'), [snapshot]);
  const pinnedAnnouncements = useMemo(() => (snapshot?.announcements ?? []).filter((a) => a.isPinned), [snapshot]);
  const detailTicket = useMemo(() => snapshot?.maintenance.find((t) => t.id === detailTicketId) ?? null, [snapshot, detailTicketId]);
  const tenantUnreadCount = useMemo(
    () => (snapshot?.notifications ?? []).filter((n) => n.createdAt > notifLastSeen).length,
    [snapshot, notifLastSeen],
  );
  const paidPayments = useMemo(() => (snapshot?.payments ?? []).filter((p) => p.status === 'paid'), [snapshot]);

  // ── Welcome done handler ───────────────────────────────────────────────────
  const handleWelcomeDone = () => {
    if (snapshot) localStorage.setItem(welcomeKey(snapshot.tenant.id), 'true');
    if (user?.id && !isDemo) {
      void supabase.from('profiles').update({ first_login_completed_at: new Date().toISOString() }).eq('id', user.id).catch(() => {});
    }
    setShowWelcome(false);
  };

  // ── Maintenance submit ─────────────────────────────────────────────────────
  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    const issueFull = ticketForm.category ? `${ticketForm.category}: ${ticketForm.issue}` : ticketForm.issue;
    if (!ticketForm.issue.trim() || !ticketForm.description.trim()) return;
    setTicketForm((f) => ({ ...f, submitting: true }));
    try {
      const newTicket = await createTenantMaintenanceTicket({
        issue: issueFull.trim(),
        description: ticketForm.description.trim(),
        priority: ticketForm.priority,
        imageUrl: ticketForm.imageUrl || undefined,
      });
      // Optimistic update
      setSnapshot((prev) => prev ? { ...prev, maintenance: [newTicket, ...prev.maintenance] } : prev);
      setTicketForm({ category: '', issue: '', description: '', priority: 'medium', imageFile: null, imageUploading: false, imageUrl: '', submitting: false });
      setView('maintenance');
      toast.success('Request submitted.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request.');
      setTicketForm((f) => ({ ...f, submitting: false }));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB.'); return; }
    setTicketForm((f) => ({ ...f, imageFile: file, imageUploading: true }));
    try {
      const url = isDemo ? URL.createObjectURL(file) : await supabaseTenantDataApi.uploadMaintenanceImage(file);
      setTicketForm((f) => ({ ...f, imageUrl: url, imageUploading: false }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image upload failed.');
      setTicketForm((f) => ({ ...f, imageFile: null, imageUploading: false }));
    }
  };

  // ── Vacate submit ──────────────────────────────────────────────────────────
  const submitVacate = async (e: FormEvent) => {
    e.preventDefault();
    if (!vacateForm.date || !vacateForm.confirm) return;
    setVacateForm((f) => ({ ...f, submitting: true }));
    try {
      const vr = await submitTenantVacateRequest({ vacateDate: vacateForm.date, reason: vacateForm.reason });
      setSnapshot((prev) => prev ? { ...prev, vacateRequest: vr } : prev);
      setView('profile');
      toast.success('Vacate notice submitted. Your manager has been notified.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit notice.');
    } finally {
      setVacateForm((f) => ({ ...f, submitting: false }));
    }
  };

  // ── Agreement signing ──────────────────────────────────────────────────────
  const handleTenantSign = async () => {
    if (!tenantSignModal) return;
    const name = tenantSignatureName.trim();
    if (!name) { toast.error('Please provide your name.'); return; }
    setTenantSigning(true);
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      const updated = await supabaseLifecycleApi.signAgreement({
        agreementId: tenantSignModal.agreement.id,
        signatureName: name,
        role: 'tenant',
        deviceMetadata: ua,
      });
      setSnapshot((prev) => prev ? {
        ...prev,
        agreements: prev.agreements.map((a) => a.id === updated.id ? updated : a),
      } : prev);
      setTenantSignModal(null);
      setTenantSignatureName('');
      toast.success('Agreement signed successfully!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Signing failed');
    } finally {
      setTenantSigning(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render guards
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (err && !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-sm text-gray-700 mb-4">{err}</p>
          <button onClick={() => void load()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const { tenant, property, owner, ownerPaymentInfo, payments, maintenance, announcements, notifications, vacateRequest, documents, agreements } = snapshot;

  if (tenant.status === 'archived') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Deactivated</h2>
          <p className="text-sm text-gray-500 mb-6">Your tenant account has been archived. Please contact your property manager for assistance.</p>
          <button onClick={() => { void logout(); }} className="w-full py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isInactiveTenant = tenant.status === 'inactive';
  const visibleSidebarSections = isInactiveTenant
    ? SIDEBAR_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => ['payments', 'documents'].includes(i.id)),
      })).filter((s) => s.items.length > 0)
    : SIDEBAR_SECTIONS;

  // ─── View: Home ────────────────────────────────────────────────────────────
  const currentPayment = pendingPayments[0] ?? null;

  const viewHome = (
    <div className="space-y-5 pb-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {tenant.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {ownerPaymentInfo.pgName || property?.name} · Room {tenant.room}{tenant.bed ? `, Bed ${tenant.bed}` : ''}
          {property?.name ? ` · Floor ${tenant.floor}` : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Monthly Rent', value: fmtAmount(tenant.rent), sub: `Due on ${tenant.rentDueDate}th`, icon: IndianRupee, color: 'text-purple-600 bg-purple-50' },
          {
            label: currentPayment ? `${new Date().toLocaleString('en-IN', { month: 'long' })} Status` : 'Payment Status',
            value: currentPayment ? `${fmtAmount(currentPayment.totalAmount)} Due` : 'All Paid',
            sub: currentPayment ? `Due by ${fmtDate(currentPayment.dueDate)}` : 'No pending dues',
            icon: CreditCard,
            color: currentPayment ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50',
          },
          { label: 'Security Deposit', value: fmtAmount(tenant.securityDeposit), sub: 'Active tenancy', icon: Shield, color: 'text-blue-600 bg-blue-50' },
          { label: 'Staying Since', value: fmtDate(tenant.joinDate).split(' ')[2] ? `${fmtDate(tenant.joinDate).split(' ')[1]} ${fmtDate(tenant.joinDate).split(' ')[2]}` : fmtDate(tenant.joinDate), sub: stayingSince(tenant.joinDate), icon: Calendar, color: 'text-teal-600 bg-teal-50' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rent Status */}
        {currentPayment && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Rent Status</p>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 mb-0.5">{fmtAmount(currentPayment.totalAmount)}</p>
            <p className="text-sm text-amber-600 mb-4">Due by {fmtDate(currentPayment.dueDate)}</p>
            {ownerPaymentInfo.upiId && (
              <a
                href={buildUpiLink(ownerPaymentInfo.upiId, currentPayment.totalAmount, owner?.name ?? 'Manager', paymentMonth(currentPayment)) ?? '#'}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
              >
                <QrCode className="w-4 h-4" />
                Pay via UPI →
              </a>
            )}
          </div>
        )}

        {/* Caretaker Contact */}
        {(ownerPaymentInfo.ownerPhone || owner?.phone) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Caretaker Contact</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-700 font-bold text-sm">
                  {(owner?.name || 'M').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{owner?.name || 'Property Manager'}</p>
                <p className="text-sm text-gray-500">{ownerPaymentInfo.ownerPhone || owner?.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${ownerPaymentInfo.ownerPhone || owner?.phone}`}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call
              </a>
              <a
                href={`https://wa.me/${(ownerPaymentInfo.ownerPhone || owner?.phone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Recent Announcements</p>
            <button onClick={() => setView('announcements')} className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="px-5 py-3.5 flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  a.category === 'maintenance' ? 'bg-orange-400'
                  : a.category === 'payment' ? 'bg-red-400'
                  : a.isPinned ? 'bg-red-500'
                  : 'bg-blue-400'
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{a.content}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(a.date).split(' ')[0]} {fmtDate(a.date).split(' ')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'payments' as TenantView, icon: CreditCard, label: 'Payments', sub: `${pendingPayments.length} pending`, color: 'text-green-600 bg-green-50' },
          { id: 'documents' as TenantView, icon: FileText, label: 'Documents', sub: `${agreements.length} agreements`, color: 'text-purple-600 bg-purple-50' },
          { id: 'maintenance' as TenantView, icon: Wrench, label: 'Maintenance', sub: `${openTickets.length} open`, color: 'text-orange-600 bg-orange-50' },
          ...(ownerPaymentInfo.ownerPhone || owner?.phone ? [{
            id: null as null, icon: Phone, label: 'Contact Manager', sub: ownerPaymentInfo.ownerPhone || owner?.phone || '',
            color: 'text-blue-600 bg-blue-50',
          }] : []),
        ].map(({ id, icon: Icon, label, sub, color }) => (
          id !== null ? (
            <button
              key={id}
              onClick={() => setView(id)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-sm hover:border-gray-300 transition-all active:scale-[0.98]"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            </button>
          ) : (
            <a
              key="contact"
              href={`tel:${ownerPaymentInfo.ownerPhone || owner?.phone}`}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-sm hover:border-gray-300 transition-all"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
            </a>
          )
        ))}
      </div>
    </div>
  );

  // ── View: Payments ─────────────────────────────────────────────────────────
  const viewPayments = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Payments</h1>
      </div>

      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900">
            {fmtAmount(pendingPayments.reduce((s, p) => s + p.totalAmount, 0))} pending
          </p>
          <p className="text-xs text-amber-700 mt-0.5">{pendingPayments.length} payment(s) outstanding</p>
        </div>
      )}

      {ownerPaymentInfo.upiId && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pay Now</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <IndianRupee className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-mono text-gray-700 truncate">{ownerPaymentInfo.upiId}</span>
            </div>
            {pendingPayments[0] && (
              <a
                href={buildUpiLink(ownerPaymentInfo.upiId, pendingPayments[0].totalAmount, owner?.name ?? 'Manager', paymentMonth(pendingPayments[0])) ?? '#'}
                className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                Pay ₹{pendingPayments[0].totalAmount.toLocaleString('en-IN')}
              </a>
            )}
          </div>
          {ownerPaymentInfo.qrCodeUrl && (
            <div className="flex justify-center pt-1">
              <img src={ownerPaymentInfo.qrCodeUrl} alt="Payment QR" className="w-36 h-36 border border-gray-200 rounded-xl object-contain p-2" />
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {payments.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No payment records yet.</p>
          </div>
        )}
        {payments.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{paymentMonth(p)}</p>
                <p className="text-xs text-gray-500">Due {fmtDate(p.dueDate)}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-gray-900">{fmtAmount(p.totalAmount)}</p>
              <div className="flex items-center gap-2">
                {p.status === 'paid' && (
                  <button
                    onClick={() => openReceiptWindow({ payment: p, propertyName: property?.name ?? '', ownerName: owner?.name })}
                    className="flex items-center gap-1 px-3 py-1.5 border border-green-200 rounded-lg text-xs text-green-700 hover:bg-green-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Receipt
                  </button>
                )}
                {p.status !== 'paid' && (
                  <button
                    onClick={() => openInvoiceWindow({ payment: p, propertyName: property?.name ?? '', ownerName: owner?.name })}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Invoice
                  </button>
                )}
                {p.status !== 'paid' && ownerPaymentInfo.upiId && (
                  <a
                    href={buildUpiLink(ownerPaymentInfo.upiId, p.totalAmount, owner?.name ?? 'Manager', paymentMonth(p)) ?? '#'}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Pay
                  </a>
                )}
              </div>
            </div>
            {p.paidDate && <p className="text-xs text-gray-400 mt-1.5">Paid on {fmtDate(p.paidDate)}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // ── View: Maintenance list ─────────────────────────────────────────────────
  const viewMaintenance = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Maintenance</h1>
        <button
          onClick={() => setView('maintenance-new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {maintenance.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No maintenance requests yet.</p>
          <button onClick={() => setView('maintenance-new')} className="mt-3 text-indigo-600 text-sm font-medium">
            Raise your first request →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {maintenance.map((t) => (
          <button
            key={t.id}
            onClick={() => { setDetailTicketId(t.id); setView('maintenance-detail'); }}
            className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-sm transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900 flex-1">{t.issue}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge(t.status)}`}>{t.status}</span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span className={`font-medium ${t.priority === 'high' ? 'text-red-600' : t.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                {t.priority} priority
              </span>
              <span>{fmtDate(t.date)}</span>
            </div>
            {(t.threads?.length ?? 0) > 0 && (
              <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {t.threads!.length} update{t.threads!.length !== 1 ? 's' : ''}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ── View: Maintenance detail ───────────────────────────────────────────────
  const viewMaintenanceDetail = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('maintenance')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Request Details</h1>
      </div>
      {detailTicket ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">{detailTicket.issue}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusBadge(detailTicket.status)}`}>{detailTicket.status}</span>
            </div>
            <p className="text-sm text-gray-600">{detailTicket.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
              <span>{fmtDate(detailTicket.date)}</span>
              <span className={`font-medium ${detailTicket.priority === 'high' ? 'text-red-600' : detailTicket.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                {detailTicket.priority} priority
              </span>
            </div>
          </div>
          {(detailTicket.threads?.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <p className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Updates from Manager</p>
              <div className="divide-y divide-gray-100">
                {detailTicket.threads!.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">{entry.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(detailTicket.status === 'resolved' || detailTicket.status === 'closed') && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" /> This request has been {detailTicket.status}.
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">Ticket not found.</p>
      )}
    </div>
  );

  // ── View: New Maintenance Form ─────────────────────────────────────────────
  const viewMaintenanceNew = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('maintenance')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Request</h1>
      </div>
      <form onSubmit={(e) => void submitTicket(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select value={ticketForm.category} onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">Select a category…</option>
            {MAINTENANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Issue title *</label>
          <input value={ticketForm.issue} onChange={(e) => setTicketForm((f) => ({ ...f, issue: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. AC not cooling in my room" maxLength={120} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Description *</label>
          <textarea value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Describe the issue clearly." rows={4} maxLength={800} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Priority</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as MaintenancePriority[]).map((p) => (
              <button key={p} type="button" onClick={() => setTicketForm((f) => ({ ...f, priority: p }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  ticketForm.priority === p
                    ? p === 'high' ? 'border-red-500 bg-red-50 text-red-700'
                      : p === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-400 bg-gray-100 text-gray-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Photo (optional)</label>
          {ticketForm.imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={ticketForm.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
              <button type="button" onClick={() => setTicketForm((f) => ({ ...f, imageUrl: '', imageFile: null }))} className="p-1.5 hover:bg-red-50 rounded-lg">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <button type="button" disabled={ticketForm.imageUploading} onClick={() => imageInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50">
              {ticketForm.imageUploading
                ? <><div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /><span className="text-xs">Uploading…</span></>
                : <><Upload className="w-5 h-5" /><span className="text-xs">Tap to add photo</span></>}
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageChange(e)} />
        </div>
        <button type="submit" disabled={ticketForm.submitting || ticketForm.imageUploading}
          className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
          {ticketForm.submitting
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
            : <><Send className="w-4 h-4" /> Submit Request</>}
        </button>
      </form>
    </div>
  );

  // ── View: Announcements ────────────────────────────────────────────────────
  const viewAnnouncements = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Announcements</h1>
        {tenantUnreadCount > 0 && (
          <button
            onClick={() => { const now = new Date().toISOString(); localStorage.setItem(notifSeenKey(tenant.id), now); setNotifLastSeen(now); }}
            className="text-xs bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-full hover:bg-indigo-700"
          >
            {tenantUnreadCount} new
          </button>
        )}
      </div>

      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pinned</p>
          {pinnedAnnouncements.map((a) => (
            <div key={a.id} className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 bg-red-200 text-red-800 rounded-full flex-shrink-0">Pinned</span>
                <p className="text-sm font-semibold text-red-900">{a.title}</p>
              </div>
              <p className="text-sm text-red-800 mt-1">{a.content}</p>
              <p className="text-xs text-red-500 mt-2">{fmtDate(a.date)}</p>
            </div>
          ))}
        </div>
      )}

      {announcements.filter((a) => !a.isPinned).map((a) => (
        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
              a.category === 'payment' ? 'bg-green-100 text-green-700'
              : a.category === 'maintenance' ? 'bg-orange-100 text-orange-700'
              : a.category === 'rules' ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
            }`}>{a.category}</span>
          </div>
          <p className="text-sm text-gray-600">{a.content}</p>
          <p className="text-xs text-gray-400 mt-2">{fmtDate(a.date)}</p>
        </div>
      ))}

      {announcements.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No announcements yet.</p>
        </div>
      )}
    </div>
  );

  // ── View: Documents ────────────────────────────────────────────────────────
  const ID_PROOF_TYPES = ['aadhaar_front', 'aadhaar_back', 'pan', 'passport', 'driving_license', 'photo'];
  const DOC_TYPE_DISPLAY: Record<string, string> = {
    aadhaar_front: 'Aadhaar (Front)', aadhaar_back: 'Aadhaar (Back)',
    pan: 'PAN Card', passport: 'Passport', driving_license: 'Driving License',
    photo: 'Profile Photo', other: 'Document',
  };
  const idProofDocs = documents.filter((d) => ID_PROOF_TYPES.includes(d.docType));
  const otherDocs = documents.filter((d) => !ID_PROOF_TYPES.includes(d.docType) && d.docType !== 'agreement' && d.docType !== 'receipt');

  const viewDocuments = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
      </div>

      {/* 1. Agreements */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Agreements</p>
            <p className="text-xs text-gray-500">{agreements.length} agreement{agreements.length !== 1 ? 's' : ''}</p>
          </div>
          {agreements.some((a) => a.status === 'pending_tenant_signature') && (
            <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Action Required</span>
          )}
        </div>
        {agreements.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No agreements available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {agreements.map((ag) => {
              const needsSign = ag.status === 'pending_tenant_signature' && !ag.tenantSignedAt;
              const isExecuted = ag.status === 'executed';
              const statusLabel: Record<string, string> = {
                draft: 'Draft', pending_owner_signature: 'Awaiting Owner',
                pending_tenant_signature: 'Sign Required', executed: 'Executed ✓',
                sent: 'Sent', signed: 'Signed', expired: 'Expired', archived: 'Archived', cancelled: 'Cancelled',
              };
              return (
                <div key={ag.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ag.agreementType === 'license' ? 'License Agreement' : ag.agreementType}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${needsSign ? 'text-blue-600' : isExecuted ? 'text-green-600' : 'text-gray-500'}`}>
                        {statusLabel[ag.status] ?? ag.status} · {new Date(ag.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {needsSign && (
                        <button
                          onClick={() => { setTenantSignModal({ agreement: ag }); setTenantSignatureName(tenant.name); }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Sign Now
                        </button>
                      )}
                      {ag.htmlContent && (
                        <button
                          onClick={() => { const win = window.open('', '_blank', 'width=900,height=700'); if (win && ag.htmlContent) { win.document.write(ag.htmlContent); win.document.close(); } }}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Download className="w-3.5 h-3.5" /> View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Receipts — only paid payments */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Receipts</p>
          <p className="text-xs text-gray-500">{paidPayments.length} paid payment{paidPayments.length !== 1 ? 's' : ''}</p>
        </div>
        {paidPayments.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No receipts yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paidPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{paymentMonth(p)}</p>
                  <p className="text-xs text-gray-500">{fmtAmount(p.totalAmount)} · {fmtDate(p.paidDate)}</p>
                </div>
                <button
                  onClick={() => openReceiptWindow({ payment: p, propertyName: property?.name ?? '', ownerName: owner?.name })}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> Receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Identity Documents */}
      {(tenant.idDocumentUrl || idProofDocs.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Identity Documents</p>
          </div>
          <div className="divide-y divide-gray-100">
            {tenant.idDocumentUrl && (
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-900">{tenant.idType || 'ID Document'} {tenant.idNumber ? `· ${tenant.idNumber}` : ''}</p>
                <a href={tenant.idDocumentUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            )}
            {idProofDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-900">{doc.label || DOC_TYPE_DISPLAY[doc.docType] || doc.docType}</p>
                  <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Other Files */}
      {otherDocs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Other Files</p>
          </div>
          <div className="divide-y divide-gray-100">
            {otherDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-900">{doc.label || DOC_TYPE_DISPLAY[doc.docType] || doc.docType}</p>
                  <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── View: Profile ──────────────────────────────────────────────────────────
  const viewProfile = (
    <div className="space-y-4 pb-8">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
      <p className="text-sm text-gray-500 -mt-2">View your personal and tenancy information</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
              {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{tenant.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active Tenant</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Phone Number</p>
                <p className="text-sm text-gray-900">{tenant.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Email Address</p>
                <p className="text-sm text-gray-900">{user?.email || tenant.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Room & Tenancy */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Room & Tenancy Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Property', value: property?.name },
              { label: 'Room', value: tenant.room },
              { label: 'Bed', value: tenant.bed || '—' },
              { label: 'Floor', value: `Floor ${tenant.floor}` },
              { label: 'Monthly Rent', value: fmtAmount(tenant.rent) },
              { label: 'Security Deposit', value: fmtAmount(tenant.securityDeposit) },
              { label: 'Due Date', value: `${tenant.rentDueDate}th of every month` },
              { label: 'Joined', value: fmtDate(tenant.joinDate) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-indigo-600 font-medium mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        {(tenant.parentName || tenant.parentPhone) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="space-y-2 text-sm">
              {tenant.parentName && <p className="text-gray-700">Contact Name: <span className="font-semibold">{tenant.parentName} ({tenant.guardianRelationship || 'Guardian'})</span></p>}
              {tenant.parentPhone && <p className="text-gray-700">Contact Number: <a href={`tel:${tenant.parentPhone}`} className="font-semibold text-indigo-600">+{tenant.parentPhone.replace(/^\+/, '')}</a></p>}
            </div>
          </div>
        )}

        {/* Verification */}
        {(tenant.idType || tenant.idNumber) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Verification</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {tenant.idType && (
                <div>
                  <p className="text-xs text-indigo-600 font-medium mb-0.5">ID Type</p>
                  <p className="font-semibold text-gray-900">{tenant.idType}</p>
                </div>
              )}
              {tenant.idNumber && (
                <div>
                  <p className="text-xs text-indigo-600 font-medium mb-0.5">ID Number</p>
                  <p className="font-semibold text-gray-900 font-mono tracking-wide">
                    XXXX XXXX {tenant.idNumber.slice(-4)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vacate section */}
      {vacateRequest ? (
        <div className={`rounded-xl p-4 border ${
          vacateRequest.status === 'pending' ? 'bg-amber-50 border-amber-200'
          : vacateRequest.status === 'confirmed' ? 'bg-blue-50 border-blue-200'
          : 'bg-green-50 border-green-200'
        }`}>
          <p className="text-sm font-semibold text-gray-900">Vacate Notice Submitted</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Planned move-out: {fmtDate(vacateRequest.plannedVacateDate)} · Status: <strong>{vacateRequest.status}</strong>
          </p>
        </div>
      ) : (
        ['active', 'payment_overdue'].includes(tenant.status) && (
          <button
            onClick={() => setView('vacate')}
            className="w-full py-3 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Submit Vacate Notice
          </button>
        )
      )}

      <button
        onClick={() => { void logout(); }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors w-full"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );

  // ── View: Help & Rules ─────────────────────────────────────────────────────
  const viewHelp = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Help & Rules</h1>
      </div>

      {ownerPaymentInfo.pgRules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">House Rules</p>
            <p className="text-xs text-gray-500">{ownerPaymentInfo.pgRules.length} rules</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {ownerPaymentInfo.pgRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700">{rule}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ownerPaymentInfo.pgRules.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No house rules have been added yet.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Contact Support</p>
        {ownerPaymentInfo.ownerPhone && (
          <a href={`tel:${ownerPaymentInfo.ownerPhone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
            <Phone className="w-4 h-4 text-gray-400" /> {ownerPaymentInfo.ownerPhone}
          </a>
        )}
        {owner?.email && (
          <a href={`mailto:${owner.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
            <MapPin className="w-4 h-4 text-gray-400" /> {owner.email}
          </a>
        )}
      </div>
    </div>
  );

  // ── View: Vacate ──────────────────────────────────────────────────────────
  const minVacateDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const viewVacate = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('profile')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Submit Vacate Notice</h1>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Please read before submitting</p>
          <p className="text-xs text-amber-700 mt-1">
            Submitting this notice will alert your property manager. A minimum of 7 days notice is required.
          </p>
        </div>
      </div>
      <form onSubmit={(e) => void submitVacate(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Planned Move-Out Date *</label>
          <input type="date" value={vacateForm.date} min={minVacateDate}
            onChange={(e) => setVacateForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea value={vacateForm.reason} onChange={(e) => setVacateForm((f) => ({ ...f, reason: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="e.g. Relocating to another city for work" rows={3} maxLength={400} />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={vacateForm.confirm} onChange={(e) => setVacateForm((f) => ({ ...f, confirm: e.target.checked }))}
            className="w-4 h-4 mt-0.5 accent-red-600" />
          <span className="text-sm text-gray-700">
            I understand this notice is final. My manager will be notified immediately.
          </span>
        </label>
        <button type="submit" disabled={!vacateForm.date || !vacateForm.confirm || vacateForm.submitting}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
          {vacateForm.submitting ? 'Submitting…' : 'Submit Vacate Notice'}
        </button>
      </form>
    </div>
  );

  // ── View router ────────────────────────────────────────────────────────────
  const renderView = () => {
    switch (view) {
      case 'home': return viewHome;
      case 'payments': return viewPayments;
      case 'maintenance': return viewMaintenance;
      case 'maintenance-new': return viewMaintenanceNew;
      case 'maintenance-detail': return viewMaintenanceDetail;
      case 'announcements': return viewAnnouncements;
      case 'notifications': return viewAnnouncements;
      case 'documents': return viewDocuments;
      case 'profile': return viewProfile;
      case 'help': return viewHelp;
      case 'vacate': return viewVacate;
      default: return viewHome;
    }
  };

  const activeNavTab = activeTabFor(view);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {showWelcome && !isInactiveTenant && <WelcomeScreen snapshot={snapshot} onDone={handleWelcomeDone} />}

      {/* Agreement signing modal */}
      {tenantSignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Sign Agreement</h3>
            <p className="text-xs text-gray-500">By typing your name below you are electronically signing this agreement.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                value={tenantSignatureName}
                onChange={(e) => setTenantSignatureName(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your full name"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setTenantSignModal(null); setTenantSignatureName(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => void handleTenantSign()} disabled={tenantSigning || !tenantSignatureName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                {tenantSigning ? 'Signing…' : 'Sign Agreement'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 flex-shrink-0">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">RentCare</p>
                <p className="text-xs text-gray-500">Tenant Portal</p>
              </div>
            </div>
          </div>

          {/* Tenant identity card */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{tenant.name}</p>
                <p className="text-xs text-gray-500 truncate">Room {tenant.room}{tenant.bed ? `, Bed ${tenant.bed}` : ''}</p>
                <p className="text-xs text-gray-400 truncate">{ownerPaymentInfo.pgName || property?.name}</p>
              </div>
            </div>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {visibleSidebarSections.map((section) => (
              <div key={section.heading}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{section.heading}</p>
                {section.items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeNavTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setView(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                      {label}
                      {id === 'payments' && pendingPayments.length > 0 && (
                        <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {pendingPayments.length}
                        </span>
                      )}
                      {id === 'announcements' && tenantUnreadCount > 0 && (
                        <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {tenantUnreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sign out */}
          <div className="px-4 py-4 border-t border-gray-100">
            <button
              onClick={() => { void logout(); }}
              className="w-full flex items-center gap-2.5 text-sm text-gray-500 hover:text-red-600 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative flex flex-col w-64 bg-white h-full z-50 shadow-xl">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">RentCare</p>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {visibleSidebarSections.map((section) => (
                  <div key={section.heading}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{section.heading}</p>
                    {section.items.map(({ id, label, icon: Icon }) => {
                      const isActive = activeNavTab === id;
                      return (
                        <button
                          key={id}
                          onClick={() => { setView(id); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                            isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
              <div className="px-4 py-4 border-t border-gray-100">
                <button onClick={() => { void logout(); }}
                  className="w-full flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {ownerPaymentInfo.pgName || property?.name || 'RentCare'}
              </span>
              {tenant.room && <span className="text-xs text-gray-500">· Room {tenant.room}</span>}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>
          </header>

          {/* Desktop top bar */}
          <header className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-3 items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{ownerPaymentInfo.pgName || property?.name}</span>
              {tenant.room && <><span className="text-gray-300">·</span><span>Room {tenant.room}</span></>}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('announcements')}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {tenantUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tenantUnreadCount > 9 ? '9+' : tenantUnreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                  {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{tenant.name}</p>
                  <p className="text-xs text-indigo-600 font-medium">tenant</p>
                </div>
              </div>
            </div>
          </header>

          {/* Inactive banner */}
          {isInactiveTenant && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium truncate">Tenancy ended — payments & documents available</p>
              </div>
              <button onClick={() => { void logout(); }} className="text-xs text-amber-700 underline hover:text-amber-900 shrink-0">Sign out</button>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
            <div className="max-w-4xl mx-auto px-4 py-6">
              {renderView()}
            </div>
          </main>

          {/* Mobile bottom tabs */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
            <div className="flex">
              {(isInactiveTenant ? BOTTOM_TABS.filter((t) => ['payments', 'documents'].includes(t.id)) : BOTTOM_TABS).map(({ id, label, icon: Icon }) => {
                const isActive = activeNavTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {id === 'payments' && pendingPayments.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {pendingPayments.length}
                        </span>
                      )}
                      {id === 'announcements' && tenantUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {tenantUnreadCount > 9 ? '9+' : tenantUnreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{label}</span>
                    {isActive && <div className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
