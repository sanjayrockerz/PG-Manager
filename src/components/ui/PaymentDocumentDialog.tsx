import { Dialog, DialogContent } from './dialog';
import { Button } from './button';
import { Printer, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { PaymentRecord } from '../../services/supabaseData';

interface PaymentDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentRecord | null;
  propertyName: string;
  ownerName?: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function PaymentDocumentDialog({
  open,
  onOpenChange,
  payment,
  propertyName,
  ownerName,
}: PaymentDocumentDialogProps) {
  if (!payment) return null;

  const isPaid = payment.status === 'paid';
  const isOverdue = payment.status === 'overdue';
  
  const docNo = isPaid 
    ? `RCP-${payment.id.slice(-8).toUpperCase()}` 
    : `INV-${payment.id.slice(-8).toUpperCase()}`;

  const generatedOn = formatDate(new Date().toISOString());
  const issuedBy = ownerName?.trim() || propertyName;

  // Colors based on status
  const gradientClass = isPaid
    ? 'from-emerald-600 to-emerald-700 text-emerald-50 border-emerald-500/30'
    : isOverdue
    ? 'from-rose-600 to-rose-700 text-rose-50 border-rose-500/30'
    : 'from-amber-500 to-amber-600 text-amber-50 border-amber-500/30';

  const badgeClass = isPaid
    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
    : isOverdue
    ? 'bg-rose-500/20 border-rose-400/40 text-rose-100'
    : 'bg-amber-500/20 border-amber-400/40 text-amber-100';

  const textStatusColor = isPaid
    ? 'text-emerald-600'
    : isOverdue
    ? 'text-rose-600'
    : 'text-amber-600';

  const bgStatusAlert = isPaid
    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
    : isOverdue
    ? 'bg-rose-50 border-rose-100 text-rose-800'
    : 'bg-amber-50 border-amber-100 text-amber-800';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] p-0 overflow-hidden border border-zinc-200 shadow-2xl rounded-2xl bg-white">
        {/* The Printable Container (marked with print-content) */}
        <div className="print-content flex flex-col w-full text-zinc-800 bg-white">
          {/* Header Banner */}
          <div className={`bg-gradient-to-br ${gradientClass} p-6 flex flex-col gap-4 border-b`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider opacity-75 font-semibold">RentCare</span>
                <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                  {isPaid ? 'Rent Receipt' : 'Rent Invoice'}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-base font-mono font-bold text-white">{docNo}</p>
                <p className="text-[11px] opacity-75 mt-0.5">Generated: {generatedOn}</p>
              </div>
            </div>
            
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                {isPaid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PAID
                  </>
                ) : isOverdue ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    OVERDUE
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    PENDING
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Document Content Details */}
          <div className="p-6 space-y-6">
            {/* Section 1: Tenant & Property */}
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-2">Tenant &amp; Property</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 block">Tenant Name</span>
                  <span className="text-sm font-semibold text-zinc-900">{payment.tenant}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 block">Room / Bed</span>
                  <span className="text-sm font-semibold text-zinc-900">Room {payment.room}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 block">Property</span>
                  <span className="text-sm font-semibold text-zinc-900">{propertyName}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 block">Due Date</span>
                  <span className="text-sm font-semibold text-zinc-900">{formatDate(payment.dueDate)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            {/* Section 2: Breakdown */}
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-2">Amount Details</p>
              <div className="bg-zinc-50 rounded-xl p-4 space-y-2 border border-zinc-100/50">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Monthly Rent</span>
                  <span className="font-mono">{formatCurrency(payment.monthlyRent)}</span>
                </div>
                {payment.extraCharges > 0 && (
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>Extra Charges</span>
                    <span className="font-mono">{formatCurrency(payment.extraCharges)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-200/60 pt-2 flex justify-between items-center mt-1">
                  <span className="text-xs font-bold text-zinc-900">{isPaid ? 'Total Paid' : 'Total Due'}</span>
                  <span className={`text-base font-bold font-mono ${textStatusColor}`}>
                    {formatCurrency(payment.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Payment details (if paid) or alerts */}
            {isPaid ? (
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 block">Paid On</span>
                  <span className="text-sm font-semibold text-emerald-600">{formatDate(payment.paidDate)}</span>
                </div>
                {payment.paymentMode && (
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-zinc-400 block">Payment Mode</span>
                    <span className="text-sm font-semibold text-zinc-900 capitalize">{payment.paymentMode.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {payment.referenceNumber && (
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-[11px] text-zinc-400 block">Reference / TXN ID</span>
                    <span className="text-xs font-mono font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 rounded px-2 py-0.5 block w-full truncate">
                      {payment.referenceNumber}
                    </span>
                  </div>
                )}
                {payment.paymentNotes && (
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-[11px] text-zinc-400 block">Notes</span>
                    <span className="text-xs text-zinc-600 block">{payment.paymentNotes}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={`p-3 rounded-xl border flex gap-2 text-xs leading-relaxed ${bgStatusAlert}`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {isOverdue
                    ? 'This payment is overdue. Please settle immediately to avoid additional charges or service suspension.'
                    : 'This invoice is pending payment. Please clear by the due date to keep your occupancy active.'}
                </span>
              </div>
            )}

            <div className="border-t border-zinc-100" />

            {/* Section 4: Signature / Issued info */}
            <div className="flex justify-between items-center text-xs text-zinc-500">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Issued By</span>
                <span className="font-semibold text-zinc-700">{issuedBy}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Document Reference</span>
                <span className="font-mono font-medium text-zinc-700">{docNo}</span>
              </div>
            </div>
          </div>

          {/* Footer explanation */}
          <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 text-center text-[10px] text-zinc-400">
            <p>This is a computer-generated document and does not require a physical signature.</p>
            <p className="mt-0.5">For any payment discrepancies, please contact your property manager.</p>
          </div>
        </div>

        {/* Action Controls (Hidden on print) */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2.5 no-print">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-zinc-600 hover:text-zinc-800 border-zinc-200 hover:bg-zinc-100"
          >
            Close
          </Button>
          <Button
            onClick={() => window.print()}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
