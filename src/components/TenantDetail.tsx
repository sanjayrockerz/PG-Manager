import { useEffect, useRef, useState } from 'react';
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
  ReceiptText, Plus, Trash2, Printer, History,
  Upload, Eye, Download, Activity, CreditCard, X,
  ImageIcon,
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
  updateTenantRecord,
} from '../services/dataService';
import type { TenantRecord, PaymentRecord, MaintenanceTicketRecord } from '../services/supabaseData';
import {
  TENANT_STATUS_LABELS,
  TENANT_STATUS_COLORS,
  isTenantCurrentlyInRoom,
} from '../services/supabaseData';
import {
  type SettlementDeductionItem,
  type DeductionCategory,
  DEDUCTION_CATEGORY_LABELS,
  calculateSettlement,
  printSettlementReceipt,
  createDeductionItem,
} from '../services/depositSettlementService';
import { printAgreement, downloadAgreementHtml } from '../services/agreementService';

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

// ─── Enhanced Vacate Workflow Modal ───────────────────────────────────────────

interface VacateModalProps {
  tenant: TenantRecord;
  pendingPayments: PaymentRecord[];
  propertyName: string;
  ownerName: string;
  open: boolean;
  onClose: () => void;
  onComplete: (updated: TenantRecord) => void;
}

function VacateWorkflowModal({
  tenant,
  pendingPayments,
  propertyName,
  ownerName,
  open,
  onClose,
  onComplete,
}: VacateModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [vacateDate, setVacateDate] = useState('');
  const [reason, setReason] = useState('');

  // Step 2 — deductions
  const [deductions, setDeductions] = useState<SettlementDeductionItem[]>([]);
  const [adjustPendingRent, setAdjustPendingRent] = useState(true);
  const [newCategory, setNewCategory] = useState<DeductionCategory>('other');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const minDate = new Date().toISOString().split('T')[0];

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0);

  const settlement = calculateSettlement({
    tenantId: tenant.id,
    tenantName: tenant.name,
    room: tenant.room,
    floor: String(tenant.floor),
    propertyId: tenant.propertyId,
    securityDeposit: tenant.securityDeposit,
    monthlyRent: tenant.rent,
    vacateDate: vacateDate || new Date().toISOString().split('T')[0],
    reason,
    pendingPayments: pendingPayments.map((p) => ({
      id: p.id,
      dueDate: p.dueDate,
      totalAmount: p.totalAmount,
      status: p.status as 'pending' | 'overdue',
    })),
    deductions,
    adjustPendingRentFromDeposit: adjustPendingRent,
  });

  const resetAndClose = () => {
    setStep(1);
    setVacateDate('');
    setReason('');
    setDeductions([]);
    setAdjustPendingRent(true);
    setNewCategory('other');
    setNewDesc('');
    setNewAmount('');
    onClose();
  };

  const addDeduction = () => {
    const amt = Number(newAmount);
    if (!newDesc.trim() || !amt || amt <= 0) {
      toast.error('Enter a description and valid amount.');
      return;
    }
    setDeductions((prev) => [...prev, createDeductionItem(newCategory, newDesc.trim(), amt)]);
    setNewDesc('');
    setNewAmount('');
  };

  const removeDeduction = (id: string) => setDeductions((prev) => prev.filter((d) => d.id !== id));

  const handlePrint = () => {
    if (!vacateDate) return;
    printSettlementReceipt({
      tenantName: tenant.name,
      room: tenant.room,
      floor: String(tenant.floor),
      joinDate: tenant.joinDate,
      vacateDate,
      reason,
      securityDeposit: tenant.securityDeposit,
      deductionBreakdown: settlement.deductionBreakdown,
      totalDeductions: settlement.totalDeductions,
      netRefund: settlement.netRefund,
      pendingRentTotal: settlement.pendingRentTotal,
      settledAt: new Date().toISOString(),
      propertyName,
      ownerName,
    });
  };

  const handleConfirm = async () => {
    if (!vacateDate || !reason.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      const totalDeduction = settlement.totalDeductions;

      const updated = await processVacateWorkflow({
        tenantId: tenant.id,
        vacateDate,
        reason: reason.trim(),
        depositDeduction: totalDeduction,
        deductionReason: settlement.deductionBreakdown.map((d) => d.description).join('; '),
        deductionItems: settlement.deductionBreakdown,
        adjustPendingRentFromDeposit: adjustPendingRent,
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

  const canProceedStep1 = vacateDate && reason.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <span className={`text-xs ${active ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{title}</span>
                {i < stepTitles.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Notice Details ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-gray-900">{tenant.name}</p>
              <p className="text-gray-500">Room {tenant.room} · Floor {tenant.floor}{tenant.bed ? ` · Bed ${tenant.bed}` : ''}</p>
              <p className="text-gray-500">Security Deposit: ₹{tenant.securityDeposit.toLocaleString('en-IN')}</p>
            </div>

            {pendingPayments.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {pendingPayments.length} pending payment{pendingPayments.length > 1 ? 's' : ''} — ₹{pendingTotal.toLocaleString('en-IN')}
                </p>
                <p className="text-amber-600 text-xs">You can adjust these from the deposit in the next step.</p>
              </div>
            )}

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
                Set to today for immediate vacate. Future date submits a notice.
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

        {/* ── Step 2: Settlement ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Deposit summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4" /> Deposit Settlement
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Security Deposit Held</span>
                  <span className="font-semibold text-gray-900">₹{tenant.securityDeposit.toLocaleString('en-IN')}</span>
                </div>
                {settlement.totalDeductions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Deductions</span>
                    <span className="font-semibold text-red-600">− ₹{settlement.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-blue-200 pt-1.5 mt-1.5">
                  <span className="font-semibold text-gray-800">Net Refund</span>
                  <span className={`text-lg font-bold ${settlement.netRefund >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ₹{settlement.netRefund.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending rent toggle */}
            {pendingPayments.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <input
                  id="adjust-rent"
                  type="checkbox"
                  checked={adjustPendingRent}
                  onChange={(e) => setAdjustPendingRent(e.target.checked)}
                  className="mt-0.5 accent-amber-600"
                />
                <label htmlFor="adjust-rent" className="text-sm cursor-pointer">
                  <span className="font-semibold text-amber-800">Deduct pending rent from deposit</span>
                  <p className="text-amber-600 text-xs mt-0.5">
                    ₹{pendingTotal.toLocaleString('en-IN')} across {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} will be auto-deducted
                  </p>
                </label>
              </div>
            )}

            {/* Manual deduction items */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Additional Deductions</p>

              {deductions.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {deductions.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <span className="text-xs text-red-600 font-medium flex-shrink-0">{DEDUCTION_CATEGORY_LABELS[d.category as DeductionCategory]}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate">{d.description}</span>
                      <span className="text-xs font-semibold text-red-700 flex-shrink-0">₹{d.amount.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => removeDeduction(d.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add deduction row */}
              <div className="grid grid-cols-12 gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DeductionCategory)}
                  className="col-span-4 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {(Object.keys(DEDUCTION_CATEGORY_LABELS) as DeductionCategory[]).map((key) => (
                    <option key={key} value={key}>{DEDUCTION_CATEGORY_LABELS[key]}</option>
                  ))}
                </select>
                <input
                  className="col-span-5 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Description…"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
                <input
                  className="col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="₹"
                  type="number"
                  min="1"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
                <button
                  onClick={addDeduction}
                  className="col-span-1 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Confirm Vacate
              </h4>
              <p className="text-sm text-red-700">
                {new Date(vacateDate) <= new Date()
                  ? `This will immediately mark ${tenant.name} as vacated and release the room.`
                  : `A vacate notice will be submitted for ${tenant.name}. Room released on ${new Date(vacateDate).toLocaleDateString('en-IN')}.`}
              </p>
            </div>

            <div className="text-sm space-y-1.5">
              {[
                ['Tenant', tenant.name],
                ['Room', `${tenant.room} · Floor ${tenant.floor}${tenant.bed ? ` · Bed ${tenant.bed}` : ''}`],
                ['Move-Out Date', new Date(vacateDate).toLocaleDateString('en-IN')],
                ['Reason', reason],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-gray-500 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Settlement summary */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Settlement</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Security Deposit</span>
                <span className="font-medium">₹{tenant.securityDeposit.toLocaleString('en-IN')}</span>
              </div>
              {settlement.deductionBreakdown.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-gray-500 truncate max-w-[200px]">{d.description}</span>
                  <span className="text-red-600 font-medium">− ₹{d.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1">
                <span className="font-semibold text-gray-800">Net Refund</span>
                <span className={`font-bold text-base ${settlement.netRefund >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{settlement.netRefund.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Print receipt */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="w-full border-dashed text-gray-600 gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Settlement Receipt
            </Button>
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
                if (step === 1 && !canProceedStep1) {
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

// ─── Agreement Generator ──────────────────────────────────────────────────────

function AgreementTab({ tenant, property }: { tenant: TenantRecord; property?: { name: string; address: string; city: string; state: string } | null }) {
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  const agreementData = {
    tenant,
    propertyName: property?.name ?? 'PG Accommodation',
    propertyAddress: property?.address ?? '',
    propertyCity: property ? `${property.city}, ${property.state}` : '',
    ownerName: ownerName || 'Property Owner',
    ownerPhone: ownerPhone || '—',
    generatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-5">
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-indigo-600" /> Rental Agreement Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-gray-500 text-sm">
            Generate a pre-filled rental agreement for <strong>{tenant.name}</strong> using existing tenant and property data. Customize owner details below before printing.
          </p>

          {/* Auto-filled preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto-Filled Details</p>
            {[
              ['Tenant Name', tenant.name],
              ['Phone', tenant.phone || '—'],
              ['Email', tenant.email || '—'],
              ['ID', `${tenant.idType || '—'} · ${tenant.idNumber || '—'}`],
              ['Property', property?.name ?? '—'],
              ['Room / Bed', [tenant.floor ? `Floor ${tenant.floor}` : null, tenant.room ? `Room ${tenant.room}` : null, tenant.bed ? `Bed ${tenant.bed}` : null].filter(Boolean).join(', ') || '—'],
              ['Monthly Rent', `₹${tenant.rent.toLocaleString('en-IN')}`],
              ['Security Deposit', `₹${tenant.securityDeposit.toLocaleString('en-IN')}`],
              ['Move-In Date', tenant.joinDate ? new Date(tenant.joinDate).toLocaleDateString('en-IN') : '—'],
              ['Rent Due', `${tenant.rentDueDate}th of month`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">{label}</span>
                <span className="text-gray-900 text-xs font-medium">{String(value)}</span>
              </div>
            ))}
          </div>

          {/* Owner customization */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Owner Details (for Agreement)</p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Owner / PG Manager Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Owner Phone</label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              onClick={() => printAgreement(agreementData)}
            >
              <Printer className="w-4 h-4" /> Print Agreement
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => downloadAgreementHtml(agreementData)}
            >
              <Download className="w-4 h-4" /> Download (HTML)
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              The agreement is generated from existing tenant data and standard PG terms. Both parties should sign printed copies. Keep one copy with records and give one to the tenant.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  date: string;
  type: 'payment_paid' | 'payment_overdue' | 'payment_pending' | 'maintenance' | 'status' | 'joined';
  title: string;
  detail: string;
}

function ActivityTimeline({
  payments,
  tickets,
  tenant,
}: {
  payments: PaymentRecord[];
  tickets: MaintenanceTicketRecord[];
  tenant: TenantRecord;
}) {
  const events: ActivityEvent[] = [];

  // Join event
  events.push({
    id: 'joined',
    date: tenant.joinDate,
    type: 'joined',
    title: 'Tenant moved in',
    detail: `Joined ${tenant.pgName ?? ''} · Room ${tenant.room}${tenant.bed ? ` · Bed ${tenant.bed}` : ''}`,
  });

  // Payment events
  for (const p of payments) {
    const dateStr = p.paidDate ?? p.dueDate;
    events.push({
      id: `pay-${p.id}`,
      date: dateStr,
      type: p.status === 'paid' ? 'payment_paid' : p.status === 'overdue' ? 'payment_overdue' : 'payment_pending',
      title: p.status === 'paid'
        ? `Rent paid — ₹${p.totalAmount.toLocaleString('en-IN')}`
        : p.status === 'overdue'
          ? `Rent overdue — ₹${p.totalAmount.toLocaleString('en-IN')}`
          : `Rent due — ₹${p.totalAmount.toLocaleString('en-IN')}`,
      detail: `Due ${new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${p.paidDate ? ` · Paid ${new Date(p.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}${p.extraCharges > 0 ? ` · +₹${p.extraCharges.toLocaleString('en-IN')} extra charges` : ''}`,
    });
  }

  // Maintenance events
  for (const t of tickets) {
    events.push({
      id: `maint-${t.id}`,
      date: t.date,
      type: 'maintenance',
      title: t.issue,
      detail: `${t.priority.toUpperCase()} priority · ${t.status === 'resolved' ? 'Resolved' : t.status === 'in-progress' ? 'In progress' : 'Open'} · ${t.ticketId}`,
    });
  }

  // Sort newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const iconForType = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'payment_paid': return { icon: CheckCircle, color: '#059669', bg: '#ECFDF5' };
      case 'payment_overdue': return { icon: AlertCircle, color: '#DC2626', bg: '#FEF2F2' };
      case 'payment_pending': return { icon: Clock, color: '#D97706', bg: '#FFFBEB' };
      case 'maintenance': return { icon: Wrench, color: '#7C3AED', bg: '#F5F3FF' };
      case 'joined': return { icon: User, color: '#6366F1', bg: '#EEF2FF' };
      default: return { icon: Activity, color: '#71717A', bg: '#F4F4F6' };
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: '#A1A1AA' }}>
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p style={{ fontSize: 13 }}>No activity yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((ev, idx) => {
        const { icon: Icon, color, bg } = iconForType(ev.type);
        const isLast = idx === events.length - 1;
        return (
          <div key={ev.id} className="flex gap-3" style={{ position: 'relative', paddingBottom: isLast ? 0 : 16 }}>
            {/* Vertical line */}
            {!isLast && (
              <div style={{
                position: 'absolute', left: 15, top: 32, bottom: 0, width: 1, background: '#F1F1F3',
              }} />
            )}
            {/* Icon */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, background: bg, zIndex: 1 }}
            >
              <Icon style={{ width: 14, height: 14, color }} />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{ev.title}</p>
                <p style={{ fontSize: 11, color: '#A1A1AA', flexShrink: 0, marginTop: 1 }}>
                  {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{ev.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ID Proof Upload ──────────────────────────────────────────────────────────

function IdProofSection({
  tenant,
  onUpdate,
}: {
  tenant: TenantRecord;
  onUpdate: (updated: TenantRecord) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(tenant.idDocumentUrl || null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [uploading, setUploading] = useState(false);
  const isDemoMode = isDemoModeEnabled();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB.'); return; }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setPreviewType(file.type.startsWith('image/') ? 'image' : 'pdf');
  };

  const handleSave = async () => {
    if (!previewUrl) return;
    setUploading(true);
    try {
      if (isDemoMode) {
        // In demo mode: update the demo store with the object URL (session-only)
        const updated = await updateTenantRecord(tenant.id, { idType: tenant.idType, idNumber: tenant.idNumber } as any);
        // Manually patch idDocumentUrl in the returned object for UI (demo store doesn't persist objectURLs)
        onUpdate({ ...updated, idDocumentUrl: previewUrl });
        toast.success('ID proof saved (demo mode — resets on refresh).');
      } else {
        // Live mode: upload file to Supabase storage
        const { supabase } = await import('../lib/supabase');
        const fileInput = fileInputRef.current?.files?.[0];
        if (!fileInput) { toast.error('Please select a file first.'); return; }

        const ext = fileInput.name.split('.').pop() ?? 'jpg';
        const path = `tenant-ids/${tenant.id}/id-proof.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('tenant-documents')
          .upload(path, fileInput, { upsert: true, contentType: fileInput.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tenant-documents')
          .getPublicUrl(path);

        const updated = await updateTenantRecord(tenant.id, {} as any);
        onUpdate({ ...updated, idDocumentUrl: publicUrl });
        setPreviewUrl(publicUrl);
        toast.success('ID proof uploaded successfully.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ID info row */}
      <div className="ds-card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>ID Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
            <p style={{ fontSize: 10, color: '#A1A1AA', marginBottom: 3 }}>ID Type</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>{tenant.idType || '—'}</p>
          </div>
          <div style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
            <p style={{ fontSize: 10, color: '#A1A1AA', marginBottom: 3 }}>ID Number</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', fontFamily: 'monospace' }}>{tenant.idNumber || '—'}</p>
          </div>
        </div>
      </div>

      {/* Upload section */}
      <div className="ds-card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>ID Proof Document</p>

        {/* Preview */}
        {previewUrl && (
          <div style={{ marginBottom: 12, position: 'relative' }}>
            {previewType === 'image' || (previewUrl && !previewUrl.endsWith('.pdf')) ? (
              <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <img
                  src={previewUrl}
                  alt="ID proof"
                  style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 8, border: '1px solid #E4E4E7', background: '#F8FAFC' }}
                  onError={() => setPreviewType('pdf')}
                />
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => window.open(previewUrl, '_blank')}
                    style={{ padding: '4px 8px', borderRadius: 6, background: '#0A0A0B99', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Eye style={{ width: 11, height: 11 }} /> View Full
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{ padding: '20px 16px', background: '#F8FAFC', border: '1px solid #E4E4E7', borderRadius: 8, textAlign: 'center', cursor: 'pointer' }}
                onClick={() => window.open(previewUrl, '_blank')}
              >
                <FileText style={{ width: 32, height: 32, color: '#6366F1', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: '#6366F1' }}>PDF Document — Click to view</p>
              </div>
            )}
          </div>
        )}

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #E4E4E7', borderRadius: 10, padding: '20px 16px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLElement).style.background = '#EEF2FF50'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <ImageIcon style={{ width: 24, height: 24, color: '#A1A1AA', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#52525B' }}>
            {previewUrl ? 'Replace document' : 'Upload ID proof'}
          </p>
          <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>Aadhaar, PAN, Passport, Driving License · JPG, PNG, PDF · Max 10 MB</p>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
        </div>

        {/* Save button — show only after selecting a new file */}
        {previewUrl && (
          <button
            onClick={() => void handleSave()}
            disabled={uploading}
            className="ds-btn ds-btn-primary"
            style={{ width: '100%', marginTop: 10, justifyContent: 'center', gap: 6, fontSize: 13, padding: '8px 0' }}
          >
            {uploading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Upload style={{ width: 14, height: 14 }} />}
            {uploading ? 'Saving…' : 'Save ID Proof'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Document Vault ───────────────────────────────────────────────────────────

interface DocumentItem {
  name: string;
  label: string;
  url: string | null | undefined;
  category: 'id' | 'photo' | 'agreement' | 'other';
}

function DocumentVaultTab({ tenant }: { tenant: TenantRecord }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDemoMode = isDemoModeEnabled();

  const documents: DocumentItem[] = [
    { name: 'ID Document', label: `${tenant.idType || 'ID'} · ${tenant.idNumber || '—'}`, url: tenant.idDocumentUrl, category: 'id' },
    { name: 'Profile Photo', label: 'Tenant photo', url: tenant.photoUrl, category: 'photo' },
  ];

  const existing = documents.filter((d) => d.url);
  const missing = documents.filter((d) => !d.url);

  const handleUploadClick = () => {
    if (isDemoMode) {
      toast.info('Document upload is available in live mode. Connect Supabase to enable.');
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload prompt */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
        onClick={handleUploadClick}
      >
        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-600">Upload Documents</p>
        <p className="text-xs text-gray-400 mt-1">Aadhaar, Passport, ID proof, agreements…</p>
        {isDemoMode && (
          <span className="mt-2 inline-block text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
            Live mode only
          </span>
        )}
        <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf" />
      </div>

      {/* Existing documents */}
      {existing.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uploaded Documents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existing.map((doc) => (
              <Card key={doc.name} className="border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{doc.name}</h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{doc.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white h-8 text-xs gap-1"
                      onClick={() => window.open(doc.url!, '_blank')}
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = doc.url!;
                        a.download = doc.name;
                        a.click();
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Missing documents */}
      {missing.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending Upload</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {missing.map((doc) => (
              <div
                key={doc.name}
                className="border border-dashed border-gray-200 rounded-lg p-4 flex items-center gap-3 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleUploadClick}
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{doc.name}</p>
                  <p className="text-xs text-gray-400">Not uploaded yet</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {existing.length === 0 && missing.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No documents configured</p>
        </div>
      )}
    </div>
  );
}

// ─── Main TenantDetail ────────────────────────────────────────────────────────

export function TenantDetail({ tenantId, onBack }: TenantDetailProps) {
  const { properties } = useProperty();
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [vacateOpen, setVacateOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const property = properties.find((p) => p.id === tenant?.propertyId);
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
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-2xl text-white font-bold"
              style={{ width: 72, height: 72, background: '#EEF2FF', color: '#6366F1', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {initials}
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
                        <LogOut className="w-3.5 h-3.5 mr-1.5" /> Vacate
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
          <TabsTrigger value="activity" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <Activity className="w-4 h-4 mr-1.5" /> Activity
          </TabsTrigger>
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
          <TabsTrigger value="agreement" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <ReceiptText className="w-4 h-4 mr-1.5" /> Agreement
          </TabsTrigger>
          {tenant.vacateDate && (
            <TabsTrigger value="settlement" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
              <History className="w-4 h-4 mr-1.5" /> Settlement
            </TabsTrigger>
          )}
        </TabsList>

        {/* Activity tab */}
        <TabsContent value="activity">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-indigo-600" /> Tenant Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline payments={payments} tickets={tickets} tenant={tenant} />
            </CardContent>
          </Card>
        </TabsContent>

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
                        <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!isCurrentlyInRoom && p.status !== 'paid' ? 'opacity-60' : ''}`}>
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
            <CardHeader><CardTitle>Maintenance Requests</CardTitle></CardHeader>
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
            <IdProofSection tenant={tenant} onUpdate={(updated) => setTenant(updated)} />

            <Card className="border-gray-200">
              <CardHeader><CardTitle className="text-base">Guardian / Emergency Contact</CardTitle></CardHeader>
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
          <DocumentVaultTab tenant={tenant} />
        </TabsContent>

        {/* Agreement tab */}
        <TabsContent value="agreement">
          <AgreementTab tenant={tenant} property={property} />
        </TabsContent>

        {/* Settlement tab (shown only after vacate) */}
        {tenant.vacateDate && (
          <TabsContent value="settlement">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-indigo-600" /> Deposit Settlement Record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Move-Out Date', new Date(tenant.vacateDate).toLocaleDateString('en-IN')],
                    ['Reason', tenant.vacateReason ?? '—'],
                    ['Security Deposit', `₹${tenant.securityDeposit.toLocaleString('en-IN')}`],
                    ['Status', TENANT_STATUS_LABELS[tenant.status]],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                      <p className="font-semibold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-xs text-amber-700">
                    Full settlement breakdown is generated at time of vacate. Print the receipt from the vacate workflow for complete records.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="gap-2 text-gray-600"
                  onClick={() => {
                    printSettlementReceipt({
                      tenantName: tenant.name,
                      room: tenant.room,
                      floor: String(tenant.floor),
                      joinDate: tenant.joinDate,
                      vacateDate: tenant.vacateDate!,
                      reason: tenant.vacateReason ?? '',
                      securityDeposit: tenant.securityDeposit,
                      deductionBreakdown: [],
                      totalDeductions: 0,
                      netRefund: tenant.securityDeposit,
                      pendingRentTotal: 0,
                      settledAt: new Date().toISOString(),
                      propertyName: property?.name ?? '',
                      ownerName: '',
                    });
                  }}
                >
                  <Printer className="w-4 h-4" /> Print Settlement Receipt
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Vacate workflow modal */}
      {vacateOpen && (
        <VacateWorkflowModal
          tenant={tenant}
          pendingPayments={pendingPayments}
          propertyName={property?.name ?? ''}
          ownerName=""
          open={vacateOpen}
          onClose={() => setVacateOpen(false)}
          onComplete={(updated) => {
            setTenant(updated);
            // Reload all data after vacate
            void load();
          }}
        />
      )}
    </div>
  );
}
