import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Bell, Building2, Calendar,
  Check, CheckCircle2, ChevronDown, ChevronRight, CreditCard,
  Download, FileText, Home, IndianRupee, LogOut, MapPin, MessageSquare,
  Phone, Plus, QrCode, RefreshCw, Send, Upload, User, Wrench, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  type MaintenancePriority,
  type NotificationRecord,
  type PaymentRecord,
  type TenantPortalSnapshot,
  supabaseTenantDataApi,
} from '../services/supabaseData';
import { openReceiptWindow } from '../services/receiptGenerator';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

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
  | 'vacate';

const MAINTENANCE_CATEGORIES = [
  'Plumbing', 'Electrical', 'AC / Cooling', 'Wi-Fi / Internet',
  'Cleanliness', 'Furniture / Fixtures', 'Water Supply',
  'Lock / Security', 'Pest Control', 'Other',
];

const welcomeKey = (userId: string) => `tenant-welcome-v1-seen:${userId}`;

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

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-sky-600 to-teal-600 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome, {tenant.name.split(' ')[0]}!</h1>
            <p className="text-white/80 text-sm mt-1">
              {ownerPaymentInfo.pgName || property?.name || 'Your new home'}
            </p>
          </div>

          {/* Room card */}
          <div className="bg-white/20 rounded-2xl p-5 space-y-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Room</span>
              <span className="font-bold text-lg">{tenant.room} {tenant.bed ? `· Bed ${tenant.bed}` : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Monthly Rent</span>
              <span className="font-bold text-lg">{fmtAmount(tenant.rent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Security Deposit</span>
              <span className="font-semibold">{fmtAmount(tenant.securityDeposit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Due Date</span>
              <span className="font-semibold">{tenant.rentDueDate}th of every month</span>
            </div>
          </div>

          {/* Caretaker contact */}
          {ownerPaymentInfo.ownerPhone && (
            <div className="bg-white/20 rounded-2xl p-4 flex items-center gap-3 text-white">
              <Phone className="w-5 h-5 text-white/70 flex-shrink-0" />
              <div>
                <p className="text-xs text-white/70">Caretaker / Manager</p>
                <a href={`tel:${ownerPaymentInfo.ownerPhone}`} className="font-semibold hover:underline">
                  {ownerPaymentInfo.ownerPhone}
                </a>
              </div>
            </div>
          )}

          {/* Payment instructions */}
          {ownerPaymentInfo.upiId && (
            <div className="bg-white/20 rounded-2xl p-4 text-white">
              <p className="text-xs text-white/70 mb-1">Pay Rent via UPI</p>
              <p className="font-mono font-semibold break-all">{ownerPaymentInfo.upiId}</p>
            </div>
          )}

          {/* PG Rules */}
          {ownerPaymentInfo.pgRules.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4 text-white">
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">House Rules</p>
              <ul className="space-y-1.5">
                {ownerPaymentInfo.pgRules.slice(0, 5).map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-white/50 text-xs mt-0.5">{i + 1}.</span>
                    {rule}
                  </li>
                ))}
                {ownerPaymentInfo.pgRules.length > 5 && (
                  <p className="text-xs text-white/50">+{ownerPaymentInfo.pgRules.length - 5} more rules</p>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={onDone}
            className="w-full py-3.5 bg-white text-teal-700 font-bold rounded-2xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
          >
            Enter Portal <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────

const BOTTOM_TABS: { id: TenantView; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Repairs', icon: Wrench },
  { id: 'announcements', label: 'Updates', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function TenantPortal() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<TenantView>('home');
  const [snapshot, setSnapshot] = useState<TenantPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  // maintenance new-ticket form state
  const [ticketForm, setTicketForm] = useState({
    category: '',
    issue: '',
    description: '',
    priority: 'medium' as MaintenancePriority,
    imageFile: null as File | null,
    imageUploading: false,
    imageUrl: '',
    submitting: false,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);

  // maintenance detail state
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);

  // vacate state
  const [vacateForm, setVacateForm] = useState({ date: '', reason: '', confirm: false, submitting: false });

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await supabaseTenantDataApi.getPortalSnapshot();
      setSnapshot(data);
      const key = welcomeKey(data.tenant.id);
      if (typeof window !== 'undefined' && localStorage.getItem(key) !== 'true') {
        setShowWelcome(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load portal data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'tenant-portal',
    tables: ['tenants', 'payments', 'maintenance_tickets', 'maintenance_threads', 'announcements', 'notifications', 'rooms', 'properties', 'vacate_requests'],
    onChange: load,
  });

  const pendingPayments = useMemo(() => (snapshot?.payments ?? []).filter((p) => p.status !== 'paid'), [snapshot]);
  const openTickets = useMemo(() => (snapshot?.maintenance ?? []).filter((t) => t.status !== 'resolved' && t.status !== 'closed'), [snapshot]);
  const pinnedAnnouncements = useMemo(() => (snapshot?.announcements ?? []).filter((a) => a.isPinned), [snapshot]);
  const detailTicket = useMemo(() => snapshot?.maintenance.find((t) => t.id === detailTicketId) ?? null, [snapshot, detailTicketId]);

  const handleWelcomeDone = () => {
    if (typeof window !== 'undefined' && snapshot) {
      localStorage.setItem(welcomeKey(snapshot.tenant.id), 'true');
    }
    setShowWelcome(false);
  };

  // ── Maintenance ticket submit ───────────────────────────────────────────────
  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    const issueFull = ticketForm.category
      ? `${ticketForm.category}: ${ticketForm.issue}`
      : ticketForm.issue;
    if (!ticketForm.issue.trim() || !ticketForm.description.trim()) return;

    setTicketForm((f) => ({ ...f, submitting: true }));
    try {
      await supabaseTenantDataApi.createMaintenanceTicket({
        issue: issueFull.trim(),
        description: ticketForm.description.trim(),
        priority: ticketForm.priority,
        imageUrl: ticketForm.imageUrl || undefined,
      });
      setTicketForm({ category: '', issue: '', description: '', priority: 'medium', imageFile: null, imageUploading: false, imageUrl: '', submitting: false });
      setView('maintenance');
      await load();
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
      const url = await supabaseTenantDataApi.uploadMaintenanceImage(file);
      setTicketForm((f) => ({ ...f, imageUrl: url, imageUploading: false }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image upload failed.');
      setTicketForm((f) => ({ ...f, imageFile: null, imageUploading: false }));
    }
  };

  // ── Vacate submit ─────────────────────────────────────────────────────────
  const submitVacate = async (e: FormEvent) => {
    e.preventDefault();
    if (!vacateForm.date || !vacateForm.confirm) return;
    setVacateForm((f) => ({ ...f, submitting: true }));
    try {
      await supabaseTenantDataApi.submitVacateRequest({ vacateDate: vacateForm.date, reason: vacateForm.reason });
      await load();
      setView('profile');
      toast.success('Vacate notice submitted. Your manager has been notified.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit notice.');
    } finally {
      setVacateForm((f) => ({ ...f, submitting: false }));
    }
  };

  // ── Render loading / error ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (err && !snapshot) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-700 text-sm mb-3">{err}</p>
        <button onClick={() => void load()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) return null;

  const { tenant, property, owner, ownerPaymentInfo, payments, maintenance, announcements, notifications, vacateRequest } = snapshot;

  // ── View: Home ─────────────────────────────────────────────────────────────
  const viewHome = (
    <div className="space-y-4 pb-6">
      {/* Header greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hi, {tenant.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">{ownerPaymentInfo.pgName || property?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSyncing && <span className="text-xs text-sky-600 animate-pulse">Syncing…</span>}
          <button
            onClick={() => void load()}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Room card */}
      <div className="bg-gradient-to-br from-sky-600 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-white/80" />
            <span className="text-sm text-white/80">Room {tenant.room}</span>
          </div>
          {tenant.bed && <span className="text-sm text-white/70">Bed {tenant.bed}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60">Monthly Rent</p>
            <p className="text-2xl font-bold">{fmtAmount(tenant.rent)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">Due on</p>
            <p className="text-lg font-semibold">{tenant.rentDueDate}th</p>
          </div>
        </div>
        {property?.name && (
          <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            {property.name}
          </div>
        )}
      </div>

      {/* Pending rent banner */}
      {pendingPayments.length > 0 && (
        <button
          onClick={() => setView('payments')}
          className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex items-center justify-between hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {pendingPayments.length === 1
                  ? `Rent due — ${fmtDate(pendingPayments[0].dueDate)}`
                  : `${pendingPayments.length} pending payments`}
              </p>
              <p className="text-xs text-amber-700">
                {fmtAmount(pendingPayments.reduce((s, p) => s + p.totalAmount, 0))} total outstanding
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600" />
        </button>
      )}

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'payments' as TenantView, icon: CreditCard, label: 'Payments', sub: `${pendingPayments.length} pending`, color: 'text-green-600 bg-green-50' },
          { id: 'maintenance' as TenantView, icon: Wrench, label: 'Maintenance', sub: `${openTickets.length} open`, color: 'text-orange-600 bg-orange-50' },
          { id: 'announcements' as TenantView, icon: Bell, label: 'Announcements', sub: `${pinnedAnnouncements.length} pinned`, color: 'text-blue-600 bg-blue-50' },
          { id: 'notifications' as TenantView, icon: MessageSquare, label: 'Notifications', sub: `${(snapshot?.notifications ?? []).filter((n) => !n.read).length} unread`, color: 'text-indigo-600 bg-indigo-50' },
          { id: 'documents' as TenantView, icon: FileText, label: 'Documents', sub: `${payments.filter((p) => p.status === 'paid').length} receipts`, color: 'text-purple-600 bg-purple-50' },
        ].map(({ id, icon: Icon, label, sub, color }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:shadow-sm transition-shadow active:scale-[0.98]"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </button>
        ))}
      </div>

      {/* Caretaker contact */}
      {(ownerPaymentInfo.ownerPhone || owner?.phone) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact Manager</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{owner?.name || 'Property Manager'}</p>
                <p className="text-xs text-gray-500">{ownerPaymentInfo.ownerPhone || owner?.phone}</p>
              </div>
            </div>
            <a
              href={`tel:${ownerPaymentInfo.ownerPhone || owner?.phone}`}
              className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* PG Rules */}
      {ownerPaymentInfo.pgRules.length > 0 && (
        <details className="bg-white border border-gray-200 rounded-xl">
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none list-none">
            <p className="text-sm font-semibold text-gray-900">House Rules</p>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </summary>
          <ul className="px-4 pb-4 space-y-2">
            {ownerPaymentInfo.pgRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Recent announcements */}
      {announcements.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Recent Announcements</p>
            <button onClick={() => setView('announcements')} className="text-xs text-sky-600">See all</button>
          </div>
          <div className="divide-y divide-gray-100">
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.isPinned ? 'bg-red-500' : 'bg-blue-400'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{a.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── View: Payments ─────────────────────────────────────────────────────────
  const viewPayments = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Payments</h1>
        <button onClick={() => void load()} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Summary bar */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900">
            {fmtAmount(pendingPayments.reduce((s, p) => s + p.totalAmount, 0))} pending
          </p>
          <p className="text-xs text-amber-700 mt-0.5">{pendingPayments.length} payment(s) outstanding</p>
        </div>
      )}

      {/* UPI / QR */}
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

      {/* Payment list */}
      <div className="space-y-3">
        {payments.length === 0 && (
          <div className="text-center py-10 text-gray-400">
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
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}>
                {p.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-gray-900">{fmtAmount(p.totalAmount)}</p>
              <div className="flex items-center gap-2">
                {p.status === 'paid' && (
                  <button
                    onClick={() => openReceiptWindow({ payment: p, propertyName: property?.name ?? '', ownerName: owner?.name })}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Receipt
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
            {p.paidDate && (
              <p className="text-xs text-gray-400 mt-1.5">Paid on {fmtDate(p.paidDate)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ── View: Maintenance list ─────────────────────────────────────────────────
  const viewMaintenance = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Maintenance</h1>
        <button
          onClick={() => setView('maintenance-new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {maintenance.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No maintenance requests yet.</p>
          <button onClick={() => setView('maintenance-new')} className="mt-3 text-sky-600 text-sm font-medium">
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
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge(t.status)}`}>
                {t.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span className={`font-medium ${t.priority === 'high' ? 'text-red-600' : t.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                {t.priority} priority
              </span>
              <span>{fmtDate(t.date)}</span>
            </div>
            {(t.threads?.length ?? 0) > 0 && (
              <p className="text-xs text-sky-600 mt-1.5 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {t.threads!.length} update{t.threads!.length !== 1 ? 's' : ''}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ── View: Maintenance detail ────────────────────────────────────────────────
  const viewMaintenanceDetail = (
    <div className="space-y-4 pb-6">
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
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusBadge(detailTicket.status)}`}>
                {detailTicket.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{detailTicket.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
              <span>{fmtDate(detailTicket.date)}</span>
              <span className={`font-medium ${detailTicket.priority === 'high' ? 'text-red-600' : detailTicket.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                {detailTicket.priority} priority
              </span>
            </div>
          </div>

          {/* Thread */}
          {(detailTicket.threads?.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <p className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Updates from Manager
              </p>
              <div className="divide-y divide-gray-100">
                {detailTicket.threads!.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">{entry.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailTicket.status === 'resolved' || detailTicket.status === 'closed' ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" /> This request has been {detailTicket.status}.
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-gray-500">Ticket not found.</p>
      )}
    </div>
  );

  // ── View: New maintenance form ─────────────────────────────────────────────
  const viewMaintenanceNew = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('maintenance')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Request</h1>
      </div>

      <form onSubmit={(e) => void submitTicket(e)} className="space-y-4">
        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <select
            value={ticketForm.category}
            onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">Select a category…</option>
            {MAINTENANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Issue title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Issue title *</label>
          <input
            value={ticketForm.issue}
            onChange={(e) => setTicketForm((f) => ({ ...f, issue: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. AC not cooling in my room"
            maxLength={120}
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Description *</label>
          <textarea
            value={ticketForm.description}
            onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Describe the issue clearly. When did it start? What have you tried?"
            rows={4}
            maxLength={800}
            required
          />
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Priority</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as MaintenancePriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTicketForm((f) => ({ ...f, priority: p }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  ticketForm.priority === p
                    ? p === 'high'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : p === 'medium'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-400 bg-gray-100 text-gray-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Image upload */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Photo (optional)</label>
          {ticketForm.imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={ticketForm.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
              <button
                type="button"
                onClick={() => setTicketForm((f) => ({ ...f, imageUrl: '', imageFile: null }))}
                className="p-1.5 hover:bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={ticketForm.imageUploading}
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-sky-400 hover:text-sky-600 transition-colors disabled:opacity-50"
            >
              {ticketForm.imageUploading
                ? <><div className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" /><span className="text-xs">Uploading…</span></>
                : <><Upload className="w-5 h-5" /><span className="text-xs">Tap to add photo</span></>}
            </button>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleImageChange(e)}
          />
        </div>

        <button
          type="submit"
          disabled={ticketForm.submitting || ticketForm.imageUploading}
          className="w-full py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {ticketForm.submitting
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
            : <><Send className="w-4 h-4" /> Submit Request</>}
        </button>
      </form>
    </div>
  );

  // ── View: Announcements ────────────────────────────────────────────────────
  const viewAnnouncements = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
      </div>

      {/* Notification feed */}
      {notifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <p className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
            Recent Notifications
          </p>
          <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {notifications.slice(0, 5).map((n: NotificationRecord) => (
              <div key={n.id} className="px-4 py-3 flex items-start gap-2">
                <Bell className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 truncate">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pinned */}
      {pinnedAnnouncements.length > 0 && (
        <>
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
        </>
      )}

      {/* All announcements */}
      {announcements.filter((a) => !a.isPinned).map((a) => (
        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
              a.category === 'payment' ? 'bg-green-100 text-green-700'
              : a.category === 'maintenance' ? 'bg-orange-100 text-orange-700'
              : a.category === 'rules' ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {a.category}
            </span>
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
  const paidPayments = payments.filter((p) => p.status === 'paid');

  const viewDocuments = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
      </div>

      {/* Receipts */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Rent Receipts</p>
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
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agreements placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Rental Agreement</p>
            <p className="text-xs text-gray-500">
              {tenant.status === 'active' ? 'Contact your manager to obtain your agreement copy.' : 'Not available.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tenant files if any */}
      {tenant.idDocumentUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ID Document</p>
          <a
            href={tenant.idDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
          >
            <Download className="w-4 h-4" /> View uploaded document
          </a>
        </div>
      )}
    </div>
  );

  // ── View: Profile ─────────────────────────────────────────────────────────
  const viewProfile = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <button
          onClick={() => void logout()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      {/* Identity */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-teal-500 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tenant.name}</p>
            <p className="text-xs text-gray-500">{user?.email || tenant.email}</p>
          </div>
        </div>
        {[
          { icon: Phone, label: 'Phone', value: tenant.phone },
          { icon: Building2, label: 'Property', value: property?.name },
          { icon: MapPin, label: 'Address', value: property?.address },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm text-gray-900 truncate">{value || '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tenancy details */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tenancy</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Room', value: `${tenant.room}${tenant.bed ? ` · Bed ${tenant.bed}` : ''}` },
            { label: 'Floor', value: `${tenant.floor}` },
            { label: 'Monthly Rent', value: fmtAmount(tenant.rent) },
            { label: 'Deposit', value: fmtAmount(tenant.securityDeposit) },
            { label: 'Joined', value: fmtDate(tenant.joinDate) },
            { label: 'Due Date', value: `${tenant.rentDueDate}th` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vacate request status / button */}
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
    </div>
  );

  // ── View: Notifications ───────────────────────────────────────────────────
  const allNotifications = snapshot?.notifications ?? [];

  const viewNotifications = (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Notifications</h1>
        {allNotifications.some((n) => !n.read) && (
          <span className="text-xs bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-full">
            {allNotifications.filter((n) => !n.read).length} new
          </span>
        )}
      </div>

      {allNotifications.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allNotifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white border rounded-xl p-4 ${n.read ? 'border-gray-200' : 'border-indigo-200 bg-indigo-50/40'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── View: Vacate ──────────────────────────────────────────────────────────
  const minVacateDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const viewVacate = (
    <div className="space-y-4 pb-6">
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
            Your manager will confirm the vacate date and discuss deposit settlement.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void submitVacate(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Planned Move-Out Date *</label>
          <input
            type="date"
            value={vacateForm.date}
            min={minVacateDate}
            onChange={(e) => setVacateForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea
            value={vacateForm.reason}
            onChange={(e) => setVacateForm((f) => ({ ...f, reason: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="e.g. Relocating to another city for work"
            rows={3}
            maxLength={400}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={vacateForm.confirm}
            onChange={(e) => setVacateForm((f) => ({ ...f, confirm: e.target.checked }))}
            className="w-4 h-4 mt-0.5 accent-red-600"
          />
          <span className="text-sm text-gray-700">
            I understand this notice is final. My manager will be notified immediately and will reach out to confirm arrangements.
          </span>
        </label>

        <button
          type="submit"
          disabled={!vacateForm.date || !vacateForm.confirm || vacateForm.submitting}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {vacateForm.submitting ? 'Submitting…' : 'Submit Vacate Notice'}
        </button>
      </form>
    </div>
  );

  // ── View router ─────────────────────────────────────────────────────────────
  const renderView = () => {
    switch (view) {
      case 'home': return viewHome;
      case 'payments': return viewPayments;
      case 'maintenance': return viewMaintenance;
      case 'maintenance-new': return viewMaintenanceNew;
      case 'maintenance-detail': return viewMaintenanceDetail;
      case 'announcements': return viewAnnouncements;
      case 'notifications': return viewNotifications;
      case 'documents': return viewDocuments;
      case 'profile': return viewProfile;
      case 'vacate': return viewVacate;
      default: return viewHome;
    }
  };

  // ── Bottom nav active resolution ────────────────────────────────────────────
  const activeTab = (v: TenantView): TenantView => {
    if (v === 'maintenance-new' || v === 'maintenance-detail') return 'maintenance';
    if (v === 'vacate') return 'profile';
    return v;
  };

  return (
    <>
      {showWelcome && <WelcomeScreen snapshot={snapshot} onDone={handleWelcomeDone} />}

      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
          {err && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{err}</div>
          )}
          {renderView()}
        </div>

        {/* Bottom tab bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-40">
          <div className="flex items-center max-w-xl mx-auto">
            {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab(view) === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                    isActive ? 'text-sky-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : ''}`} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-sky-600' : ''}`}>{label}</span>
                  {id === 'payments' && pendingPayments.length > 0 && (
                    <span className="absolute -top-0.5 ml-4 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
