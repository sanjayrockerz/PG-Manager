import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import {
  ArrowLeft, FileText, Calendar, Wrench, User,
  MapPin, Phone, Mail, IndianRupee, CheckCircle,
  Clock, AlertCircle, Loader2, ShieldCheck, LogOut,
  AlertTriangle, Archive, ChevronRight, ChevronLeft,
  ReceiptText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  isDemoModeEnabled,
  getTenantById,
  getPaymentsForTenant,
  getMaintenanceForTenant,
  processVacateWorkflow,
  archiveTenantRecord,
} from '../services/dataService';
import type { TenantRecord, PaymentRecord, MaintenanceTicketRecord } from '../services/supabaseData';
import {
  TENANT_STATUS_LABELS,
  TENANT_STATUS_COLORS,
  isTenantCurrentlyInRoom,
} from '../services/supabaseData';

interface TenantDetailProps {
  tenantId: string;
  onBack?: () => void;
}

const paymentStatusColor: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
};

const priorityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

const ticketStatusColor: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
};

const ticketStatusLabel: Record<string, string> = {
  open: 'Open',
  'in-progress': 'In Progress',
  resolved: 'Resolved',
};

// ─── Vacate Workflow Modal ────────────────────────────────────────────────────

interface VacateModalProps {
  tenant: TenantRecord;
  open: boolean;
  onClose: () => void;
  onComplete: (updated: TenantRecord) => void;
}

function VacateWorkflowModal({ tenant, open, onClose, onComplete }: VacateModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [vacateDate, setVacateDate] = useState('');
  const [reason, setReason] = useState('');

  // Step 2 fields
  const [depositDeduction, setDepositDeduction] = useState('0');
  const [deductionReason, setDeductionReason] = useState('');

  const minDate = new Date().toISOString().split('T')[0];
  const depositRefund = Math.max(0, tenant.securityDeposit - (Number(depositDeduction) || 0));

  const resetAndClose = () => {
    setStep(1);
    setVacateDate('');
    setReason('');
    setDepositDeduction('0');
    setDeductionReason('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!vacateDate) {
      toast.error('Please select a move-out date.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a vacate reason.');
      return;
    }

    setSaving(true);
    try {
      const updated = await processVacateWorkflow({
        tenantId: tenant.id,
        vacateDate,
        reason: reason.trim(),
        depositDeduction: Number(depositDeduction) || 0,
        deductionReason: deductionReason.trim(),
      });

      const isImmediate = new Date(vacateDate) <= new Date();
      toast.success(
        isImmediate
          ? `${tenant.name} has been vacated. Room is now available.`
          : `Vacate notice submitted for ${tenant.name}. Move-out: ${new Date(vacateDate).toLocaleDateString('en-IN')}.`,
      );
      onComplete(updated);
      resetAndClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process vacate request');
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = ['Notice Details', 'Settlement', 'Confirm'];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <LogOut className="w-5 h-5" /> Submit Vacate Notice
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {stepTitles.map((title, i) => {
            const num = i + 1;
            const active = num === step;
            const done = num < step;
            return (
              <div key={title} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : active
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done ? '✓' : num}
                </div>
                <span className={`text-xs ${active ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                  {title}
                </span>
                {i < stepTitles.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Notice Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-gray-900">{tenant.name}</p>
              <p className="text-gray-500">Room {tenant.room} · Floor {tenant.floor} · Bed {tenant.bed}</p>
              <p className="text-gray-500">Security Deposit: ₹{tenant.securityDeposit.toLocaleString('en-IN')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move-Out Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                min={minDate}
                value={vacateDate}
                onChange={(e) => setVacateDate(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Set to today for an immediate vacate. Future date submits a notice.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vacate Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                rows={3}
                placeholder="e.g. Relocating to another city, course completed…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Settlement */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4" /> Final Settlement Summary
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Month Rent</span>
                  <span className="font-medium">₹{tenant.rent.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit Held</span>
                  <span className="font-medium">₹{tenant.securityDeposit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deposit Deduction (₹)
              </label>
              <Input
                type="number"
                min="0"
                max={tenant.securityDeposit}
                value={depositDeduction}
                onChange={(e) => setDepositDeduction(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">Leave 0 if full deposit is refunded.</p>
            </div>

            {Number(depositDeduction) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deduction Reason
                </label>
                <Input
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="e.g. Minor wall damage, missing furniture…"
                />
              </div>
            )}

            <div className={`rounded-lg p-3 border ${depositRefund >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Deposit Refund to Tenant</span>
                <span className={`text-lg font-bold ${depositRefund >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{Math.max(0, depositRefund).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Confirm Vacate
              </h4>
              <p className="text-sm text-red-700">
                {new Date(vacateDate) <= new Date()
                  ? `This will immediately mark ${tenant.name} as vacated and release the room.`
                  : `A vacate notice will be submitted for ${tenant.name}. Room will be released on ${new Date(vacateDate).toLocaleDateString('en-IN')}.`}
              </p>
            </div>

            <div className="text-sm space-y-2">
              {[
                ['Tenant', tenant.name],
                ['Room', `${tenant.room} · Floor ${tenant.floor} · Bed ${tenant.bed}`],
                ['Move-Out Date', new Date(vacateDate).toLocaleDateString('en-IN')],
                ['Reason', reason],
                ['Deposit Refund', `₹${Math.max(0, depositRefund).toLocaleString('en-IN')}`],
                ...(Number(depositDeduction) > 0 ? [['Deduction', `₹${Number(depositDeduction).toLocaleString('en-IN')} — ${deductionReason || 'No reason specified'}`]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-gray-500 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            Cancel
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && (!vacateDate || !reason.trim())) {
                  toast.error('Please fill in the move-out date and reason.');
                  return;
                }
                setStep((s) => s + 1);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => void handleConfirm()}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              Process Vacate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main TenantDetail ────────────────────────────────────────────────────────

export function TenantDetail({ tenantId, onBack }: TenantDetailProps) {
  const { properties } = useProperty();
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments');
  const [vacateOpen, setVacateOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  const load = async () => {
    setLoading(true);
    try {
      const [tenantData, paymentsData, ticketsData] = await Promise.all([
        getTenantById(tenantId),
        getPaymentsForTenant(tenantId),
        getMaintenanceForTenant(tenantId),
      ]);
      setTenant(tenantData);
      setPayments(paymentsData);
      setTickets(ticketsData);
    } catch {
      // errors shown by empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async () => {
    if (!tenant) return;
    setArchiving(true);
    try {
      const updated = await archiveTenantRecord(tenant.id);
      setTenant(updated);
      toast.success(`${tenant.name} has been archived.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive tenant');
    } finally {
      setArchiving(false);
    }
  };

  useRealtimeRefresh({
    key: `tenant-detail-${tenantId}`,
    tables: ['tenants', 'payments', 'maintenance_tickets'],
    onChange: () => void load(),
    enabled: !isDemoModeEnabled(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4 text-gray-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tenants
        </Button>
        <div className="text-center py-16 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Tenant not found</p>
        </div>
      </div>
    );
  }

  const initials = tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const statusClass = TENANT_STATUS_COLORS[tenant.status] ?? 'bg-gray-100 text-gray-600';
  const statusLabel = TENANT_STATUS_LABELS[tenant.status] ?? tenant.status;
  const isCurrentlyInRoom = isTenantCurrentlyInRoom(tenant.status);
  const canVacate = tenant.status === 'active' || tenant.status === 'payment_overdue';
  const canArchive = !isCurrentlyInRoom && tenant.status !== 'archived';

  const pendingPayments = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen pb-20 md:pb-6">
      <Button variant="ghost" onClick={onBack} className="mb-4 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tenants
      </Button>

      {/* Pending alert banner */}
      {pendingPayments.length > 0 && isCurrentlyInRoom && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{pendingPayments.length} outstanding payment{pendingPayments.length > 1 ? 's' : ''}</strong> totalling ₹{pendingTotal.toLocaleString('en-IN')} need attention.
          </p>
        </div>
      )}

      {/* Upcoming vacate alert */}
      {(tenant.status === 'notice_submitted' || tenant.status === 'vacating') && tenant.vacateDate && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {tenant.status === 'vacating' ? 'Vacating Soon' : 'Vacate Notice Submitted'}
            </p>
            <p className="text-sm text-amber-700">
              Planned move-out: <strong>{new Date(tenant.vacateDate).toLocaleDateString('en-IN')}</strong>
              {tenant.vacateReason && ` — ${tenant.vacateReason}`}
            </p>
          </div>
        </div>
      )}

      {/* Profile card */}
      <Card className="border-gray-200 mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
              <span className="text-white font-bold text-2xl md:text-3xl">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{tenant.name}</h1>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="text-left md:text-right">
                    <div className="text-sm text-gray-500">Monthly Rent</div>
                    <div className="text-2xl font-bold text-gray-900">₹{tenant.rent.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Due on {tenant.rentDueDate}th</div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {canVacate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVacateOpen(true)}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-8 text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1.5" /> Submit Vacate Notice
                      </Button>
                    )}
                    {canArchive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleArchive()}
                        disabled={archiving}
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 h-8 text-xs"
                      >
                        {archiving
                          ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          : <Archive className="w-3.5 h-3.5 mr-1.5" />}
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate">{tenant.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{tenant.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate">{getPropertyName(tenant.propertyId)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Floor {tenant.floor} · Room {tenant.room}{tenant.bed ? ` · Bed ${tenant.bed}` : ''}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Joined: {new Date(tenant.joinDate).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4" />
                  <span>Deposit: ₹{tenant.securityDeposit.toLocaleString()}</span>
                </div>
                {tenant.vacateDate && (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <LogOut className="w-4 h-4" />
                    <span>Vacate: {new Date(tenant.vacateDate).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-gray-200 flex-wrap h-auto gap-1">
          <TabsTrigger value="payments" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <IndianRupee className="w-4 h-4 mr-1.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <Wrench className="w-4 h-4 mr-1.5" /> Maintenance
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <ShieldCheck className="w-4 h-4 mr-1.5" /> ID & Guardian
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-1.5" /> Documents
          </TabsTrigger>
        </TabsList>

        {/* Payments tab */}
        <TabsContent value="payments">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No payment records found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Due Date', 'Monthly Rent', 'Extra', 'Total', 'Status', 'Paid On'].map((h) => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">{new Date(p.dueDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">₹{p.monthlyRent.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm text-purple-700">₹{p.extraCharges.toLocaleString()}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900">₹{p.totalAmount.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${paymentStatusColor[p.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {p.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                              {p.status === 'pending' && <Clock className="w-3 h-3" />}
                              {p.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                              {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {p.paidDate ? new Date(p.paidDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance tab */}
        <TabsContent value="maintenance">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No maintenance tickets found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Ticket ID', 'Issue', 'Priority', 'Status', 'Date'].map((h) => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{t.ticketId}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{t.issue}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColor[t.priority] ?? 'bg-gray-100 text-gray-700'}`}>
                              {t.priority.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ticketStatusColor[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {ticketStatusLabel[t.status] ?? t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ID & Guardian tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-base">ID Proof</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className="font-semibold text-gray-900">{tenant.idType || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number</span>
                  <span className="font-semibold text-gray-900">{tenant.idNumber || '—'}</span>
                </div>
                {tenant.idDocumentUrl && (
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open(tenant.idDocumentUrl, '_blank')}>
                    <FileText className="w-4 h-4 mr-2" /> View Document
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-base">Guardian / Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="font-semibold text-gray-900">{tenant.parentName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone</span>
                  <span className="font-semibold text-gray-900">{tenant.parentPhone || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'ID Document', url: tenant.idDocumentUrl, label: `${tenant.idType} — ${tenant.idNumber}` },
              { name: 'Photo', url: tenant.photoUrl, label: 'Profile photo' },
            ].filter((d) => d.url).map((doc) => (
              <Card key={doc.name} className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{doc.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{doc.label}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                    onClick={() => window.open(doc.url!, '_blank')}
                  >
                    View
                  </Button>
                </CardContent>
              </Card>
            ))}
            {!tenant.idDocumentUrl && !tenant.photoUrl && (
              <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                No documents uploaded yet
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Vacate workflow modal */}
      {vacateOpen && (
        <VacateWorkflowModal
          tenant={tenant}
          open={vacateOpen}
          onClose={() => setVacateOpen(false)}
          onComplete={(updated) => setTenant(updated)}
        />
      )}
    </div>
  );
}
