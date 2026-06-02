import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, AlertCircle, Plus, MessageCircle,
  Download, IndianRupee, Calendar, Save, Receipt,
  Loader2, TrendingUp, ChevronDown, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { isDemoModeEnabled, getPayments, updatePaymentStatusRecord, addPaymentChargeRecord, getTenantById } from '../services/dataService';
import type { PaymentRecord, PaymentStatus } from '../services/supabaseData';
import { openReceiptWindow } from '../services/receiptGenerator';

// ── Period helpers ──────────────────────────────────────────────────────────
type PeriodMode = 'this-month' | 'last-month' | 'all';

function getPeriodRange(mode: PeriodMode): { start: Date; end: Date } | null {
  if (mode === 'all') return null;
  const now = new Date();
  if (mode === 'this-month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  // last-month
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
  };
}

function periodLabel(mode: PeriodMode): string {
  if (mode === 'all') return 'All Time';
  const now = new Date();
  const target = mode === 'this-month' ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
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

function KpiCard({
  label, value, meta, icon: Icon, iconBg, iconColor, highlight,
}: {
  label: string; value: string; meta?: string;
  icon: typeof IndianRupee; iconBg: string; iconColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="ds-card flex items-start justify-between"
      style={{ padding: '14px 16px', gap: 12, ...(highlight ? { borderColor: '#FECACA', background: '#FFF5F5' } : {}) }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0B', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {value}
        </p>
        {meta && <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>{meta}</p>}
      </div>
      <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: iconBg }}>
        <Icon style={{ width: 16, height: 16, color: iconColor, strokeWidth: 1.75 }} />
      </div>
    </div>
  );
}

interface PaymentsProps {
  onNavigate?: (tab: string) => void;
}

export function Payments({ onNavigate }: PaymentsProps) {
  const { properties, selectedProperty } = useProperty();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  const [period, setPeriod] = useState<PeriodMode>('this-month');

  // Extra charge modal
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [chargeForm, setChargeForm] = useState({ amount: 0, description: '', type: 'other' });
  const [chargeSaving, setChargeSaving] = useState(false);

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPayments(selectedProperty);
      setPayments(data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [selectedProperty]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeRefresh({
    key: 'payments',
    tables: ['payments', 'payment_charges'],
    onChange: () => void load(),
    enabled: !isDemoModeEnabled(),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Period-filtered payment set (used for stats + KPIs)
  const periodPayments = useMemo(() => {
    const range = getPeriodRange(period);
    if (!range) return payments;
    return payments.filter((p) => {
      const d = new Date(p.dueDate);
      return d >= range.start && d <= range.end;
    });
  }, [payments, period]);

  const unstampedOverdue = periodPayments.filter(
    (p) => p.status === 'pending' && new Date(p.dueDate) < today,
  );

  const markAllOverdue = async () => {
    try {
      await Promise.all(unstampedOverdue.map((p) => updatePaymentStatusRecord(p.id, 'overdue')));
      await load();
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

  const filterCounts = {
    all: periodPayments.length,
    paid: periodPayments.filter((p) => p.status === 'paid').length,
    pending: periodPayments.filter((p) => p.status === 'pending').length,
    overdue: periodPayments.filter((p) => p.status === 'overdue').length,
  };

  const handleStatusChange = async (paymentId: string, newStatus: PaymentStatus) => {
    const prev = payments;
    setPayments((ps) => ps.map((p) => p.id === paymentId ? { ...p, status: newStatus } : p));
    try {
      const updated = await updatePaymentStatusRecord(paymentId, newStatus);
      setPayments((ps) => ps.map((p) => p.id === paymentId ? updated : p));
      toast.success(`Payment marked as ${STATUS_LABEL[newStatus]}`);
    } catch (err) {
      setPayments(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
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
    openReceiptWindow({ payment, propertyName: getPropertyName(payment.propertyId) });
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

  const handleAddCharge = async () => {
    if (!selectedPayment || chargeForm.amount <= 0) { toast.error('Please enter a valid amount'); return; }
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
          {/* Period selector */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid #E4E4E7', background: '#fff' }}
          >
            <button
              onClick={() => setPeriod('this-month')}
              style={{
                fontSize: 12, fontWeight: 500, padding: '5px 12px', cursor: 'pointer',
                background: period === 'this-month' ? '#6366F1' : 'transparent',
                color: period === 'this-month' ? '#fff' : '#52525B',
                border: 'none', transition: 'all 0.15s',
              }}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('last-month')}
              style={{
                fontSize: 12, fontWeight: 500, padding: '5px 12px', cursor: 'pointer',
                background: period === 'last-month' ? '#6366F1' : 'transparent',
                color: period === 'last-month' ? '#fff' : '#52525B',
                borderTop: 'none', borderBottom: 'none',
                borderLeft: '1px solid #E4E4E7', borderRight: '1px solid #E4E4E7',
                transition: 'all 0.15s',
              }}
            >
              Last Month
            </button>
            <button
              onClick={() => setPeriod('all')}
              style={{
                fontSize: 12, fontWeight: 500, padding: '5px 12px', cursor: 'pointer',
                background: period === 'all' ? '#6366F1' : 'transparent',
                color: period === 'all' ? '#fff' : '#52525B',
                border: 'none', transition: 'all 0.15s',
              }}
            >
              All
            </button>
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

      {/* ── Period label ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calendar style={{ width: 13, height: 13, color: '#A1A1AA' }} />
        <span style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>{periodLabel(period)}</span>
        {period !== 'all' && (
          <span style={{ fontSize: 11, color: '#A1A1AA' }}>· {periodPayments.length} invoices</span>
        )}
      </div>

      {/* ── KPI Cards ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard
          label="Expected"
          value={fmt(stats.expected)}
          meta={`${payments.length} invoices`}
          icon={IndianRupee}
          iconBg="#EEF2FF"
          iconColor="#6366F1"
        />
        <KpiCard
          label="Collected"
          value={fmt(stats.paid)}
          meta={`${filterCounts.paid} paid`}
          icon={CheckCircle2}
          iconBg="#ECFDF5"
          iconColor="#059669"
        />
        <KpiCard
          label="Pending"
          value={fmt(stats.pending)}
          meta={`${filterCounts.pending} open`}
          icon={Clock}
          iconBg="#FFFBEB"
          iconColor="#D97706"
        />
        <KpiCard
          label="Overdue"
          value={fmt(stats.overdue)}
          meta={`${filterCounts.overdue} tenants`}
          icon={AlertCircle}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          highlight={stats.overdue > 0}
        />
        <KpiCard
          label="Recovery Rate"
          value={`${stats.recoveryRate}%`}
          meta={stats.recoveryRate >= 80 ? 'On track' : stats.recoveryRate >= 50 ? 'Below target' : 'Action needed'}
          icon={TrendingUp}
          iconBg={stats.recoveryRate >= 80 ? '#ECFDF5' : stats.recoveryRate >= 50 ? '#FFFBEB' : '#FEF2F2'}
          iconColor={stats.recoveryRate >= 80 ? '#059669' : stats.recoveryRate >= 50 ? '#D97706' : '#DC2626'}
        />
      </div>

      {/* ── Overdue action banner ────────────── */}
      {unstampedOverdue.length > 0 && (
        <div
          className="flex items-center justify-between rounded-xl"
          style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', gap: 12 }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
                {unstampedOverdue.length} pending payment{unstampedOverdue.length > 1 ? 's are' : ' is'} past due date
              </p>
              <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 1 }}>
                These have not been collected and their due date has passed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onNavigate && (
              <button
                onClick={() => onNavigate('tenants')}
                className="ds-btn ds-btn-secondary"
                style={{ fontSize: 12, padding: '5px 10px', borderColor: '#FECACA', color: '#991B1B' }}
              >
                View Tenants
              </button>
            )}
            <button
              onClick={() => void markAllOverdue()}
              className="ds-btn"
              style={{ fontSize: 12, padding: '5px 10px', background: '#DC2626', color: '#fff', border: 'none' }}
            >
              Mark Overdue
            </button>
          </div>
        </div>
      )}

      {/* ── Collection Risk Action Queue ──────── */}
      {overdueQueue.length > 0 && (
        <div className="ds-card" style={{ padding: '14px 16px' }}>
          {/* Aging buckets header */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p style={{ fontSize: 12, fontWeight: 600, color: '#71717A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Collection Risk · {overdueQueue.length} Overdue
            </p>
            <div className="flex items-center gap-2">
              {[
                { label: '>30d', count: overdueQueue.filter((p) => ageBucket(p.dueDate).days > 30).length, color: '#991B1B', bg: '#FEF2F2' },
                { label: '>15d', count: overdueQueue.filter((p) => ageBucket(p.dueDate).days > 15 && ageBucket(p.dueDate).days <= 30).length, color: '#92400E', bg: '#FFFBEB' },
                { label: '>7d',  count: overdueQueue.filter((p) => ageBucket(p.dueDate).days > 7  && ageBucket(p.dueDate).days <= 15).length, color: '#D97706', bg: '#FFFBEB' },
              ].map(({ label, count, color, bg }) => count > 0 ? (
                <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: bg, color, border: `1px solid ${bg === '#FEF2F2' ? '#FECACA' : '#FDE68A'}` }}>
                  {count} {label}
                </span>
              ) : null)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {overdueQueue.slice(0, 6).map((p, i, arr) => {
              const age = ageBucket(p.dueDate);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid #F4F4F6' : 'none',
                    gap: 12,
                  }}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="flex-shrink-0 flex items-center justify-center rounded-lg"
                      style={{ width: 28, height: 28, background: '#FEF2F2' }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#991B1B' }}>
                        {p.tenant.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.tenant}
                      </p>
                      <div className="flex items-center gap-2">
                        <p style={{ fontSize: 11, color: '#A1A1AA' }}>Room {p.room}</p>
                        <span style={{ fontSize: 10, fontWeight: 600, color: age.color }}>· {age.label}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {fmt(p.totalAmount)}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      title="Mark as paid"
                      onClick={() => void handleStatusChange(p.id, 'paid')}
                      className="ds-btn ds-btn-secondary"
                      style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
                    >
                      <CheckCircle2 style={{ width: 12, height: 12, color: '#059669' }} />
                      Collect
                    </button>
                    <button
                      title="WhatsApp reminder"
                      onClick={() => void handleWhatsAppReminder(p)}
                      className="ds-btn ds-btn-secondary"
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <MessageCircle style={{ width: 12, height: 12, color: '#25D366' }} />
                    </button>
                  </div>
                </div>
              );
            })}
            {overdueQueue.length > 6 && (
              <button
                onClick={() => setFilterStatus('overdue')}
                style={{ fontSize: 12, color: '#6366F1', marginTop: 8, textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                View all {overdueQueue.length} overdue payments →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Filter + table ───────────────────── */}
      <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Filter bar */}
        <div
          className="flex items-center justify-between flex-wrap gap-3"
          style={{ padding: '12px 16px', borderBottom: '1px solid #F4F4F6' }}
        >
          <div className="flex items-center gap-1.5">
            <Filter style={{ width: 13, height: 13, color: '#A1A1AA' }} />
            {(['all', 'paid', 'pending', 'overdue'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
                  border: `1px solid ${filterStatus === s ? '#6366F1' : '#E4E4E7'}`,
                  background: filterStatus === s ? '#6366F1' : '#fff',
                  color: filterStatus === s ? '#fff' : '#52525B',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
                <span style={{ marginLeft: 5, opacity: 0.75 }}>{filterCounts[s]}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#A1A1AA' }}>
            {filteredPayments.length} {filteredPayments.length === 1 ? 'record' : 'records'}
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F1F1F3' }}>
                {['Tenant', 'Room', 'Property', 'Monthly Rent', 'Extra', 'Total', 'Due Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px 14px', textAlign: 'center', fontSize: 13, color: '#A1A1AA' }}>
                    No payments found
                  </td>
                </tr>
              ) : filteredPayments.map((payment, i) => (
                <tr
                  key={payment.id}
                  style={{
                    borderBottom: i < filteredPayments.length - 1 ? '1px solid #F4F4F6' : 'none',
                    background: payment.status === 'overdue' ? '#FFFAFA' : '#fff',
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-lg"
                        style={{ width: 30, height: 30, background: '#EEF2FF' }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1' }}>
                          {payment.tenant.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{payment.tenant}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#52525B', fontVariantNumeric: 'tabular-nums' }}>
                    {payment.room}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#71717A', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getPropertyName(payment.propertyId)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(payment.monthlyRent)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: payment.extraCharges > 0 ? '#D97706' : '#A1A1AA', fontVariantNumeric: 'tabular-nums' }}>
                    {payment.extraCharges > 0 ? fmt(payment.extraCharges) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(payment.totalAmount)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#71717A', whiteSpace: 'nowrap' }}>
                    {new Date(payment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
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
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                      </select>
                      <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, pointerEvents: 'none', color: STATUS_STYLE[payment.status].color }} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div className="flex items-center gap-1">
                      <button
                        title="Add extra charge"
                        onClick={() => { setSelectedPayment(payment); setAddChargeOpen(true); }}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0 }}
                      >
                        <Plus style={{ width: 12, height: 12 }} />
                      </button>
                      <button
                        title="WhatsApp reminder"
                        onClick={() => void handleWhatsAppReminder(payment)}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0 }}
                      >
                        <MessageCircle style={{ width: 12, height: 12, color: '#25D366' }} />
                      </button>
                      <button
                        title="View receipt"
                        onClick={() => handleOpenReceipt(payment)}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0 }}
                      >
                        <Receipt style={{ width: 12, height: 12, color: '#6366F1' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {payment.tenant}
                    </p>
                    <p style={{ fontSize: 11, color: '#A1A1AA' }}>
                      Room {payment.room} · {getPropertyName(payment.propertyId)}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
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
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                    <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, pointerEvents: 'none', color: STATUS_STYLE[payment.status].color }} />
                  </div>
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
                <button
                  onClick={() => { setSelectedPayment(payment); setAddChargeOpen(true); }}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4 }}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Charge
                </button>
                <button
                  onClick={() => void handleWhatsAppReminder(payment)}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4 }}
                >
                  <MessageCircle style={{ width: 12, height: 12, color: '#25D366' }} /> Remind
                </button>
                <button
                  onClick={() => handleOpenReceipt(payment)}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4 }}
                >
                  <Receipt style={{ width: 12, height: 12, color: '#6366F1' }} /> Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
