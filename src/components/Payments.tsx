import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, AlertCircle, Plus, MessageCircle,
  Download, IndianRupee, Calendar, Save, Receipt,
  Loader2, TrendingUp, ChevronDown, Filter, ChevronLeft, ChevronRight, Lock,
  Target, Percent,
} from 'lucide-react';
import { KpiCard } from './ui/KpiCard';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { isDemoModeEnabled, getPayments, getTenants, updatePaymentStatusRecord, addPaymentChargeRecord, getTenantById, patchPaymentCache, invalidatePaymentCache } from '../services/dataService';
import { supabaseOwnerDataApi } from '../services/supabaseData';
import type { PaymentRecord, PaymentStatus, TenantRecord } from '../services/supabaseData';
import { PaymentDocumentDialog } from './ui/PaymentDocumentDialog';

// A payment row that may be a synthetic projection (an upcoming invoice that has
// not been generated yet) rather than a persisted payment record.
type PaymentRow = PaymentRecord & { projected?: boolean };
const isProjected = (p: PaymentRow): boolean => p.projected === true;

// Tenant statuses that should carry an upcoming-month rent projection.
const PROJECTION_STATUSES = ['active', 'payment_overdue', 'notice_submitted', 'vacating'];

// ── Period helpers ──────────────────────────────────────────────────────────
// Mirrors the Dashboard calendar filter: This Month (default) / Next Month / This
// Year. There is no "All" option — collection tracking is always period-scoped.
type PeriodMode = 'this-month' | 'next-month' | 'this-year';

const PERIOD_OPTIONS: { key: PeriodMode; label: string }[] = [
  { key: 'this-month', label: 'This Month' },
  { key: 'next-month', label: 'Next Month' },
  { key: 'this-year',  label: 'This Year' },
];

function getPeriodRange(mode: PeriodMode): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (mode === 'this-month') {
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
  }
  if (mode === 'next-month') {
    return { start: new Date(y, m + 1, 1), end: new Date(y, m + 2, 0, 23, 59, 59) };
  }
  // this-year
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
}

function periodLabel(mode: PeriodMode): string {
  const now = new Date();
  if (mode === 'this-year') return String(now.getFullYear());
  const offset = mode === 'next-month' ? 1 : 0;
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return target.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function ageBucket(dueDate: string): { label: string; color: string; days: number } {
  const days = Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86400000);
  if (days > 30) return { label: `${days}d overdue`, color: '#991B1B', days };
  if (days > 15) return { label: `${days}d overdue`, color: '#B45309', days };
  if (days > 7)  return { label: `${days}d overdue`, color: '#D97706', days };
  return           { label: `${days}d overdue`, color: '#71717A', days };
}

const STATUS_LABEL: Record<PaymentStatus, string> = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' };

const STATUS_STYLE: Record<PaymentStatus, { bg: string; color: string; border: string }> = {
  paid:    { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  pending: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  overdue: { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function StatusBadge({ status }: { status: PaymentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}


interface PaymentsProps {
  onNavigate?: (tab: string) => void;
}

export function Payments({ onNavigate }: PaymentsProps) {
  const { properties, selectedProperty } = useProperty();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // Receipt/invoice "Issued by" authority — always the registered property
  // owner, fetched from the database (not the logged-in user).
  const [authorityName, setAuthorityName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    supabaseOwnerDataApi.getAuthorityProfile()
      .then((profile) => setAuthorityName(profile?.name || undefined))
      .catch(() => setAuthorityName(undefined));
  }, []);
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  // Period scope — defaults to the current month, mirroring the Dashboard filter.
  const [period, setPeriod] = useState<PeriodMode>('this-month');

  // Mark paid modal
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidPayment, setMarkPaidPayment] = useState<PaymentRecord | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState({ paymentMode: 'upi', referenceNumber: '', paidDate: new Date().toISOString().split('T')[0], paymentNotes: '' });
  const [markPaidSaving, setMarkPaidSaving] = useState(false);

  // Extra charge modal
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [chargeForm, setChargeForm] = useState({ amount: 0, description: '', type: 'other' });
  const [chargeSaving, setChargeSaving] = useState(false);

  // Bulk select
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [bulkMarkPaidOpen, setBulkMarkPaidOpen] = useState(false);
  const [bulkMarkPaidForm, setBulkMarkPaidForm] = useState({ paymentMode: 'upi', referenceNumber: '', paidDate: new Date().toISOString().split('T')[0], paymentNotes: '' });
  const [bulkMarkPaidSaving, setBulkMarkPaidSaving] = useState(false);

  // In-app Receipt/Invoice Dialog state
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedDocPayment, setSelectedDocPayment] = useState<PaymentRecord | null>(null);

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Tenants are loaded alongside payments so we can project upcoming-month
      // invoices for active tenants that have not been generated yet.
      const [paymentData, tenantData] = await Promise.all([
        getPayments(selectedProperty),
        getTenants(selectedProperty).catch(() => [] as TenantRecord[]),
      ]);
      setPayments(paymentData);
      setTenants(tenantData);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void reload();

    if (isDemoModeEnabled()) return;

    const channel = supabase.channel(`payments-rt-${selectedProperty}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const row = payload.new as Record<string, unknown>;
          if (selectedProperty !== 'all' && String(row.property_id) !== selectedProperty) return;
          const patch: Partial<PaymentRecord> = {
            status: String(row.status) as PaymentStatus,
          };
          if (row.paid_date) patch.paidDate = String(row.paid_date);
          patchPaymentCache(String(row.id), patch);
          setPayments((prev) => prev.map((p) => p.id === String(row.id) ? { ...p, ...patch } : p));
        } else {
          // INSERT or DELETE
          invalidatePaymentCache(selectedProperty === 'all' ? undefined : selectedProperty);
          void reload();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_charges' }, () => {
        // If extra charges are added, reload to get aggregated amounts
        invalidatePaymentCache(selectedProperty === 'all' ? undefined : selectedProperty);
        void reload();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedProperty, reload]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Period-filtered payment set — driven by local period picker
  const localPeriodRange = useMemo(() => getPeriodRange(period), [period]);

  // Real payments whose due date falls within the selected period.
  const realPeriodPayments = useMemo(() => payments.filter((p) => {
    const d = new Date(p.dueDate);
    return d >= localPeriodRange.start && d <= localPeriodRange.end;
  }), [payments, localPeriodRange]);

  // Projected upcoming invoices — for an upcoming-month view, synthesize a pending
  // row for every active tenant who does not yet have a real invoice in range, so
  // the period never renders empty just because invoices were not generated yet.
  const projectedPayments = useMemo<PaymentRow[]>(() => {
    if (period !== 'next-month') return [];
    const covered = new Set(realPeriodPayments.map((p) => p.tenantId));
    return tenants
      .filter((t) => PROJECTION_STATUSES.includes(t.status))
      .filter((t) => selectedProperty === 'all' || t.propertyId === selectedProperty)
      .filter((t) => !covered.has(t.id))
      .map((t) => {
        const dueDay = Math.min(Math.max(t.rentDueDate || 1, 1), 28);
        const due = new Date(localPeriodRange.start.getFullYear(), localPeriodRange.start.getMonth(), dueDay);
        return {
          id: `projected-${t.id}`,
          tenantId: t.id,
          tenant: t.name,
          propertyId: t.propertyId,
          room: t.room,
          monthlyRent: t.rent,
          extraCharges: 0,
          totalAmount: t.rent,
          dueDate: due.toISOString(),
          paidDate: '',
          status: 'pending' as PaymentStatus,
          createdAt: '',
          projected: true,
        } satisfies PaymentRow;
      });
  }, [period, tenants, realPeriodPayments, localPeriodRange, selectedProperty]);

  const periodPayments = useMemo<PaymentRow[]>(
    () => [...realPeriodPayments, ...projectedPayments],
    [realPeriodPayments, projectedPayments],
  );

  const unstampedOverdue = periodPayments.filter(
    (p) => p.status === 'pending' && new Date(p.dueDate) < today,
  );

  const markAllOverdue = async () => {
    try {
      await Promise.all(unstampedOverdue.map((p) => updatePaymentStatusRecord(p.id, 'overdue')));
      await reload();
      toast.success(`${unstampedOverdue.length} payment${unstampedOverdue.length > 1 ? 's' : ''} marked as overdue`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update payments');
    }
  };

  const stats = useMemo(() => {
    const expected = periodPayments.reduce((s, p) => s + p.totalAmount, 0);
    const paid = periodPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.totalAmount, 0);
    const pending = periodPayments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.totalAmount, 0);
    const overdue = periodPayments.filter((p) => p.status === 'overdue').reduce((s, p) => s + p.totalAmount, 0);
    const recoveryRate = expected > 0 ? Math.round((paid / expected) * 100) : 0;
    return { expected, paid, pending, overdue, recoveryRate };
  }, [periodPayments]);

  // Overdue tenants sorted by amount desc then age desc (action queue)
  const overdueQueue = useMemo(() =>
    [...periodPayments.filter((p) => p.status === 'overdue')]
      .sort((a, b) => {
        const ageDiff = ageBucket(b.dueDate).days - ageBucket(a.dueDate).days;
        if (ageDiff !== 0) return ageDiff;
        return b.totalAmount - a.totalAmount;
      }),
  [periodPayments]);

  const filteredPayments = periodPayments.filter(
    (p) => filterStatus === 'all' || p.status === filterStatus,
  );

  // Projected rows have no persisted invoice, so they cannot be bulk-selected.
  const selectablePayments = filteredPayments.filter((p) => !isProjected(p));

  const filterCounts = {
    all: periodPayments.length,
    paid: periodPayments.filter((p) => p.status === 'paid').length,
    pending: periodPayments.filter((p) => p.status === 'pending').length,
    overdue: periodPayments.filter((p) => p.status === 'overdue').length,
  };

  const handleStatusChange = async (paymentId: string, newStatus: PaymentStatus) => {
    const current = payments.find((p) => p.id === paymentId);
    // Status protection: a completed payment is locked. Once paid (receipt issued,
    // reference captured) the owner cannot revert it to pending/overdue.
    if (current?.status === 'paid' && newStatus !== 'paid') {
      toast.error('This payment is completed and locked. Paid invoices cannot be reverted.');
      return;
    }
    if (newStatus === 'paid') {
      const payment = payments.find((p) => p.id === paymentId);
      if (payment) {
        setMarkPaidPayment(payment);
        setMarkPaidForm({ paymentMode: 'upi', referenceNumber: '', paidDate: new Date().toISOString().split('T')[0], paymentNotes: '' });
        setMarkPaidOpen(true);
        return;
      }
    }
    const prev = payments;
    setPayments((ps) => ps.map((p) => p.id === paymentId ? { ...p, status: newStatus } : p));
    try {
      const updated = await updatePaymentStatusRecord(paymentId, newStatus);
      patchPaymentCache(paymentId, updated);
      setPayments((ps) => ps.map((p) => p.id === paymentId ? updated : p));
      toast.success(`Payment marked as ${STATUS_LABEL[newStatus]}`);
    } catch (err) {
      setPayments(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleConfirmMarkPaid = async () => {
    if (!markPaidPayment) return;
    setMarkPaidSaving(true);
    const prev = payments;
    try {
      const updated = await updatePaymentStatusRecord(markPaidPayment.id, 'paid', {
        paymentMode: markPaidForm.paymentMode,
        referenceNumber: markPaidForm.referenceNumber || undefined,
        paidDate: markPaidForm.paidDate,
        paymentNotes: markPaidForm.paymentNotes || undefined,
      });
      patchPaymentCache(markPaidPayment.id, updated);
      setPayments((ps) => ps.map((p) => p.id === markPaidPayment.id ? updated : p));
      setMarkPaidOpen(false);
      setMarkPaidPayment(null);
      toast.success('Payment marked as paid');
    } catch (err) {
      setPayments(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to mark payment as paid');
    } finally {
      setMarkPaidSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Tenant', 'Property', 'Room', 'Monthly Rent', 'Extra Charges', 'Total', 'Due Date', 'Paid On', 'Status'];
    const rows = filteredPayments.map((p) => [
      p.tenant, getPropertyName(p.propertyId), p.room, p.monthlyRent, p.extraCharges,
      p.totalAmount, p.dueDate, p.paidDate || '', p.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Payments exported to CSV');
  };

  const handleOpenReceipt = (payment: PaymentRecord) => {
    setSelectedDocPayment(payment);
    setDocDialogOpen(true);
  };

  const handleWhatsAppReminder = async (payment: PaymentRecord) => {
    try {
      const tenant = await getTenantById(payment.tenantId);
      const phone = tenant?.phone?.replace(/\D/g, '');
      if (!phone) { toast.error('No phone number on file for this tenant'); return; }
      const dueDate = new Date(payment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const property = getPropertyName(payment.propertyId);
      const message = encodeURIComponent(
        `Dear ${payment.tenant}, your rent of ₹${payment.totalAmount.toLocaleString('en-IN')} for Room ${payment.room} at ${property} is due on ${dueDate}. Please pay at your earliest. Thank you.`
      );
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not open WhatsApp reminder');
    }
  };

  const handleBulkMarkPaid = () => {
    if (selectedPaymentIds.size === 0) return;
    setBulkMarkPaidForm({ paymentMode: 'upi', referenceNumber: '', paidDate: new Date().toISOString().split('T')[0], paymentNotes: '' });
    setBulkMarkPaidOpen(true);
  };

  const handleConfirmBulkMarkPaid = async () => {
    const toUpdate = [...selectedPaymentIds];
    setBulkMarkPaidSaving(true);
    try {
      await Promise.all(toUpdate.map((id) => updatePaymentStatusRecord(id, 'paid', {
        paymentMode: bulkMarkPaidForm.paymentMode,
        referenceNumber: bulkMarkPaidForm.referenceNumber || undefined,
        paidDate: bulkMarkPaidForm.paidDate,
        paymentNotes: bulkMarkPaidForm.paymentNotes || undefined,
      })));
      setSelectedPaymentIds(new Set());
      setBulkMarkPaidOpen(false);
      await reload();
      toast.success(`${toUpdate.length} payment${toUpdate.length > 1 ? 's' : ''} marked as paid`);
    } catch {
      toast.error('Some updates failed — please retry');
      await reload();
    } finally {
      setBulkMarkPaidSaving(false);
    }
  };

  const handleAddCharge = async () => {
    if (!selectedPayment || chargeForm.amount <= 0) { toast.error('Please enter a valid amount'); return; }
    if (selectedPayment.status === 'paid') { toast.error('Invoice is paid and locked. Select a pending invoice to add charges.'); return; }
    setChargeSaving(true);
    try {
      const updated = await addPaymentChargeRecord(selectedPayment.id, {
        type: chargeForm.type, description: chargeForm.description || undefined, amount: chargeForm.amount,
      });
      setPayments((ps) => ps.map((p) => p.id === updated.id ? updated : p));
      setAddChargeOpen(false);
      setSelectedPayment(null);
      setChargeForm({ amount: 0, description: '', type: 'other' });
      toast.success(`Extra charge of ₹${chargeForm.amount} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add charge');
    } finally {
      setChargeSaving(false);
    }
  };

  // Status cell — projected rows are read-only, paid rows are locked, everything
  // else is an editable dropdown (no revert-from-paid option is ever offered).
  const StatusControl = ({ payment }: { payment: PaymentRow }) => {
    if (isProjected(payment)) {
      return (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#F4F4F6', color: '#71717A', border: '1px dashed #D4D4D8' }}>
          Projected
        </span>
      );
    }
    if (payment.status === 'paid') {
      const s = STATUS_STYLE.paid;
      return (
        <span
          title="Paid invoices are locked and cannot be reverted"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
          <Lock style={{ width: 9, height: 9 }} /> Paid
        </span>
      );
    }
    return (
      <div className="relative inline-flex items-center">
        <select
          value={payment.status}
          onChange={(e) => void handleStatusChange(payment.id, e.target.value as PaymentStatus)}
          style={{
            appearance: 'none',
            paddingLeft: 8, paddingRight: 22, paddingTop: 3, paddingBottom: 3,
            borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: STATUS_STYLE[payment.status].bg,
            color: STATUS_STYLE[payment.status].color,
            border: `1px solid ${STATUS_STYLE[payment.status].border}`,
          }}
        >
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
        <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, pointerEvents: 'none', color: STATUS_STYLE[payment.status].color }} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ds-card" style={{ height: 90, padding: 16 }}>
              <div style={{ height: 10, background: '#F4F4F6', borderRadius: 4, width: '50%', marginBottom: 8 }} />
              <div style={{ height: 22, background: '#F4F4F6', borderRadius: 4, width: '65%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Page header ─────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Payments</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            Collection tracking across all properties
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector — This Month (default) → Next Month → This Year */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid #E4E4E7', background: '#fff' }}
          >
            {PERIOD_OPTIONS.map(({ key, label }, i) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', cursor: 'pointer',
                  background: period === key ? '#6366F1' : 'transparent',
                  color: period === key ? '#fff' : '#52525B',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid #E4E4E7' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCSV}
            className="ds-btn ds-btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            <Download style={{ width: 13, height: 13 }} />
            Export
          </button>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Expected"  value={stats.expected} prefix="₹" accent="violet"  icon={Target}       meta={periodLabel(period)} />
        <KpiCard label="Collected" value={stats.paid}     prefix="₹" accent="emerald" icon={CheckCircle2} meta={`${periodPayments.length} payments`} />
        <KpiCard label="Pending"   value={stats.pending}  prefix="₹" accent="amber"   icon={Clock}        meta={projectedPayments.length > 0 ? `${projectedPayments.length} projected` : 'In period'} />
        <KpiCard label="Overdue"   value={stats.overdue}  prefix="₹" accent="rose"    icon={AlertCircle}  meta={stats.overdue > 0 ? 'Needs collection' : 'None'} />
        <KpiCard label="Recovery"  value={stats.recoveryRate} suffix="%" accent="blue" icon={Percent}     format={(n) => Math.round(n).toString()} meta="Collection rate" />
      </div>

      {/* ── Compact overdue / mark-overdue banner ──── */}
      {unstampedOverdue.length > 0 && (
        <div className="flex items-center justify-between rounded-lg"
          style={{ padding: '7px 12px', background: '#FEF2F2', border: '1px solid #FECACA', gap: 10 }}>
          <div className="flex items-center gap-2">
            <AlertCircle style={{ width: 13, height: 13, color: '#DC2626', flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: '#991B1B' }}>
              <strong>{unstampedOverdue.length}</strong> pending past due — not yet stamped overdue
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onNavigate && (
              <button onClick={() => onNavigate('tenants')} className="ds-btn ds-btn-secondary"
                style={{ fontSize: 11, padding: '3px 8px', borderColor: '#FECACA', color: '#991B1B' }}>
                Tenants
              </button>
            )}
            <button onClick={() => void markAllOverdue()} className="ds-btn"
              style={{ fontSize: 11, padding: '3px 9px', background: '#DC2626', color: '#fff', border: 'none' }}>
              Mark Overdue
            </button>
          </div>
        </div>
      )}

      {/* ── Filter + table ───────────────────── */}
      <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Filter bar */}
        <div
          className="flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10 bg-white"
          style={{ padding: '8px 12px', borderBottom: '1px solid #F4F4F6' }}
        >
          <div className="flex items-center gap-1.5">
            <Filter style={{ width: 12, height: 12, color: '#A1A1AA' }} />
            {(['all', 'paid', 'pending', 'overdue'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                  border: `1px solid ${filterStatus === s ? '#6366F1' : '#E4E4E7'}`,
                  background: filterStatus === s ? '#6366F1' : '#fff',
                  color: filterStatus === s ? '#fff' : '#52525B',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
                <span style={{ marginLeft: 4, opacity: 0.75, fontSize: 10 }}>{filterCounts[s]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {overdueQueue.length > 0 && (
              <div className="flex items-center gap-1.5">
                {[
                  { label: '>30d', count: overdueQueue.filter((p) => ageBucket(p.dueDate).days > 30).length, color: '#991B1B', bg: '#FEF2F2' },
                  { label: '>15d', count: overdueQueue.filter((p) => ageBucket(p.dueDate).days > 15 && ageBucket(p.dueDate).days <= 30).length, color: '#92400E', bg: '#FFFBEB' },
                  { label: '>7d',  count: overdueQueue.filter((p) => ageBucket(p.dueDate).days > 7  && ageBucket(p.dueDate).days <= 15).length, color: '#D97706', bg: '#FFFBEB' },
                ].map(({ label, count, color, bg }) => count > 0 ? (
                  <span key={label} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: bg, color, border: `1px solid ${bg === '#FEF2F2' ? '#FECACA' : '#FDE68A'}`, cursor: 'pointer' }}
                    onClick={() => setFilterStatus('overdue')}>
                    {count} {label}
                  </span>
                ) : null)}
              </div>
            )}
            <p style={{ fontSize: 11, color: '#A1A1AA' }}>{filteredPayments.length} records</p>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedPaymentIds.size > 0 && (
          <div style={{ padding: '7px 12px', background: '#EEF2FF', borderBottom: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#4338CA' }}>{selectedPaymentIds.size} selected</span>
            <button onClick={() => void handleBulkMarkPaid()} className="ds-btn ds-btn-secondary"
              style={{ fontSize: 11, padding: '3px 9px', color: '#059669', borderColor: '#A7F3D0', gap: 4 }}>
              <CheckCircle2 style={{ width: 12, height: 12 }} /> Mark Paid
            </button>
            <button onClick={() => setSelectedPaymentIds(new Set())} className="ds-btn ds-btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}>
              Clear
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F1F1F3' }}>
                <th style={{ width: 36, padding: '8px 6px 8px 12px' }}>
                  <input
                    type="checkbox"
                    checked={selectablePayments.length > 0 && selectedPaymentIds.size === selectablePayments.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedPaymentIds(new Set(selectablePayments.map((p) => p.id)));
                      else setSelectedPaymentIds(new Set());
                    }}
                    style={{ cursor: 'pointer', accentColor: '#6366F1' }}
                  />
                </th>
                {['Tenant', 'Room', 'Property', 'Rent', 'Extra', 'Total', 'Due', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 14px', textAlign: 'center', fontSize: 13, color: '#A1A1AA' }}>
                    No payments found
                  </td>
                </tr>
              ) : filteredPayments.map((payment, i) => (
                <tr
                  key={payment.id}
                  style={{
                    borderBottom: i < filteredPayments.length - 1 ? '1px solid #F4F4F6' : 'none',
                    background: selectedPaymentIds.has(payment.id) ? '#F5F3FF' : payment.status === 'overdue' ? '#FFFAFA' : '#fff',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '7px 6px 7px 12px' }}>
                    <input
                      type="checkbox"
                      disabled={isProjected(payment)}
                      checked={selectedPaymentIds.has(payment.id)}
                      onChange={(e) => {
                        const next = new Set(selectedPaymentIds);
                        if (e.target.checked) next.add(payment.id);
                        else next.delete(payment.id);
                        setSelectedPaymentIds(next);
                      }}
                      style={{ cursor: isProjected(payment) ? 'not-allowed' : 'pointer', accentColor: '#6366F1', opacity: isProjected(payment) ? 0.3 : 1 }}
                    />
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-md"
                        style={{ width: 26, height: 26, background: '#EEF2FF' }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#6366F1' }}>
                          {payment.tenant.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{payment.tenant}</span>
                    </div>
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: '#52525B', fontVariantNumeric: 'tabular-nums' }}>
                    {payment.room}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: '#71717A', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getPropertyName(payment.propertyId)}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 500, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(payment.monthlyRent)}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: payment.extraCharges > 0 ? '#D97706' : '#A1A1AA', fontVariantNumeric: 'tabular-nums' }}>
                    {payment.extraCharges > 0 ? fmt(payment.extraCharges) : '—'}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(payment.totalAmount)}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 11, color: '#71717A', whiteSpace: 'nowrap' }}>
                    {new Date(payment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <StatusControl payment={payment} />
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div className="flex items-center gap-1">
                      {(() => { const locked = payment.status === 'paid' || isProjected(payment); return (
                      <button
                        title={isProjected(payment) ? 'Invoice not generated yet — projected invoice' : payment.status === 'paid' ? 'Invoice closed — add charges to the current pending invoice' : 'Add extra charge'}
                        disabled={locked}
                        onClick={() => {
                          if (isProjected(payment)) {
                            toast.info('This is a projected invoice for an upcoming month. It can be charged once generated.');
                            return;
                          }
                          if (payment.status === 'paid') {
                            toast.info('This invoice is paid and locked. To add charges, find the pending invoice for this tenant.');
                            return;
                          }
                          setSelectedPayment(payment);
                          setAddChargeOpen(true);
                        }}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0, opacity: locked ? 0.35 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
                      >
                        <Plus style={{ width: 12, height: 12 }} />
                      </button>
                      ); })()}
                      <button
                        title="WhatsApp reminder"
                        onClick={() => void handleWhatsAppReminder(payment)}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0 }}
                      >
                        <MessageCircle style={{ width: 12, height: 12, color: '#25D366' }} />
                      </button>
                      <button
                        title={isProjected(payment) ? 'Invoice not generated yet' : payment.status === 'paid' ? 'View receipt' : 'View invoice'}
                        disabled={isProjected(payment)}
                        onClick={() => { if (!isProjected(payment)) handleOpenReceipt(payment); }}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0, opacity: isProjected(payment) ? 0.35 : 1, cursor: isProjected(payment) ? 'not-allowed' : 'pointer' }}
                      >
                        <Receipt style={{ width: 12, height: 12, color: payment.status === 'paid' ? '#16a34a' : '#6366F1' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col" style={{ padding: 12, gap: 8 }}>
          {filteredPayments.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#A1A1AA', padding: '32px 0' }}>No payments found</p>
          ) : filteredPayments.map((payment) => (
            <div
              key={payment.id}
              style={{
                border: `1px solid ${payment.status === 'overdue' ? '#FECACA' : '#E4E4E7'}`,
                borderRadius: 10, padding: '12px 14px',
                background: payment.status === 'overdue' ? '#FFFAFA' : '#fff',
              }}
            >
              <div className="flex items-center justify-between mb-2.5" style={{ gap: 10 }}>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{ width: 34, height: 34, background: '#EEF2FF' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1' }}>
                      {payment.tenant.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', wordBreak: 'break-word' }}>
                      {payment.tenant}
                    </p>
                    <p style={{ fontSize: 11, color: '#A1A1AA' }}>
                      Room {payment.room} · {getPropertyName(payment.propertyId)}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <StatusControl payment={payment} />
                </div>
              </div>

              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#A1A1AA' }}>Total</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(payment.totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: 11, color: '#A1A1AA' }}>Due</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#52525B' }}>
                    {new Date(payment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(() => { const locked = payment.status === 'paid' || isProjected(payment); return (
                <button
                  disabled={locked}
                  onClick={() => {
                    if (isProjected(payment)) { toast.info('This is a projected invoice for an upcoming month. It can be charged once generated.'); return; }
                    if (payment.status === 'paid') { toast.info('This invoice is paid and locked.'); return; }
                    setSelectedPayment(payment); setAddChargeOpen(true);
                  }}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4, opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Charge
                </button>
                ); })()}
                <button
                  onClick={() => void handleWhatsAppReminder(payment)}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4 }}
                >
                  <MessageCircle style={{ width: 12, height: 12, color: '#25D366' }} /> Remind
                </button>
                <button
                  disabled={isProjected(payment)}
                  onClick={() => { if (!isProjected(payment)) handleOpenReceipt(payment); }}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4, opacity: isProjected(payment) ? 0.4 : 1, cursor: isProjected(payment) ? 'not-allowed' : 'pointer' }}
                >
                  <Receipt style={{ width: 12, height: 12, color: payment.status === 'paid' ? '#16a34a' : '#6366F1' }} />
                  {isProjected(payment) ? 'Projected' : payment.status === 'paid' ? 'Receipt' : 'Invoice'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mark Paid Modal ───────────────────── */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Received</DialogTitle>
            <DialogDescription>
              {markPaidPayment ? `${markPaidPayment.tenant} · Room ${markPaidPayment.room} · ${fmt(markPaidPayment.totalAmount)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4, paddingBottom: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Payment Mode</Label>
              <select
                value={markPaidForm.paymentMode}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMode: e.target.value })}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Reference Number (optional)</Label>
              <Input
                placeholder="UPI transaction ID, cheque number, etc."
                value={markPaidForm.referenceNumber}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, referenceNumber: e.target.value })}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Paid Date</Label>
              <Input
                type="date"
                value={markPaidForm.paidDate}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, paidDate: e.target.value })}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Notes (optional)</Label>
              <Input
                placeholder="e.g. Cash collected in person"
                value={markPaidForm.paymentNotes}
                onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentNotes: e.target.value })}
                style={{ height: 40 }}
              />
            </div>
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleConfirmMarkPaid()} disabled={markPaidSaving} className="ds-btn ds-btn-primary">
              {markPaidSaving ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <CheckCircle2 style={{ width: 14, height: 14, marginRight: 6 }} />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Mark Paid Modal ─────────────── */}
      <Dialog open={bulkMarkPaidOpen} onOpenChange={setBulkMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {selectedPaymentIds.size} Payment{selectedPaymentIds.size > 1 ? 's' : ''} as Paid</DialogTitle>
            <DialogDescription>Payment metadata will be applied to all selected payments.</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4, paddingBottom: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Payment Mode</Label>
              <select
                value={bulkMarkPaidForm.paymentMode}
                onChange={(e) => setBulkMarkPaidForm({ ...bulkMarkPaidForm, paymentMode: e.target.value })}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Reference Number (optional)</Label>
              <Input
                placeholder="UPI transaction ID, cheque number, etc."
                value={bulkMarkPaidForm.referenceNumber}
                onChange={(e) => setBulkMarkPaidForm({ ...bulkMarkPaidForm, referenceNumber: e.target.value })}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Paid Date</Label>
              <Input
                type="date"
                value={bulkMarkPaidForm.paidDate}
                onChange={(e) => setBulkMarkPaidForm({ ...bulkMarkPaidForm, paidDate: e.target.value })}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Notes (optional)</Label>
              <Input
                placeholder="e.g. Paid in advance, partial cash + UPI…"
                value={bulkMarkPaidForm.paymentNotes}
                onChange={(e) => setBulkMarkPaidForm({ ...bulkMarkPaidForm, paymentNotes: e.target.value })}
                style={{ height: 40 }}
              />
            </div>
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button variant="outline" onClick={() => setBulkMarkPaidOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleConfirmBulkMarkPaid()} disabled={bulkMarkPaidSaving} className="ds-btn ds-btn-primary">
              {bulkMarkPaidSaving ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <CheckCircle2 style={{ width: 14, height: 14, marginRight: 6 }} />}
              Confirm {selectedPaymentIds.size} Payment{selectedPaymentIds.size > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Extra Charge Modal ───────────── */}
      <Dialog open={addChargeOpen} onOpenChange={setAddChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Extra Charge</DialogTitle>
            <DialogDescription>Add additional charges for {selectedPayment?.tenant}</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4, paddingBottom: 4 }}>
            {selectedPayment && (
              <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E4E4E7', borderRadius: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{selectedPayment.tenant}</p>
                <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                  Current extra charges: {fmt(selectedPayment.extraCharges)}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Charge Type</Label>
              <select
                value={chargeForm.type}
                onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
              >
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="maintenance">Maintenance</option>
                <option value="late_fee">Late Fee</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Amount (₹) *</Label>
              <Input
                type="number" min="0" placeholder="500"
                value={chargeForm.amount || ''}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: parseInt(e.target.value) || 0 })}
                style={{ height: 40 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Description</Label>
              <textarea
                placeholder="e.g., Electricity bill for April"
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                style={{ width: '100%', minHeight: 72, padding: '8px 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', resize: 'vertical' }}
              />
            </div>
            {chargeForm.amount > 0 && selectedPayment && (
              <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#065F46' }}>New Total</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(selectedPayment.totalAmount + chargeForm.amount)}
                </span>
              </div>
            )}
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button variant="outline" onClick={() => setAddChargeOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddCharge()} disabled={chargeSaving} className="ds-btn ds-btn-primary">
              {chargeSaving ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14, marginRight: 6 }} />}
              Add Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDocumentDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        payment={selectedDocPayment}
        propertyName={selectedDocPayment ? getPropertyName(selectedDocPayment.propertyId) : ''}
        ownerName={authorityName}
      />
    </div>
  );
}
