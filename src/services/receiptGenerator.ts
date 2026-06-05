/**
 * Receipt/Invoice Generator
 * Generates printable HTML receipts for rent payments.
 */

import type { PaymentRecord } from './supabaseData';

export interface ReceiptData {
  payment: PaymentRecord;
  propertyName: string;
  ownerName?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function generateReceiptNumber(paymentId: string): string {
  return `RCP-${paymentId.slice(-8).toUpperCase()}`;
}

export function generateReceiptHTML(data: ReceiptData): string {
  const { payment, propertyName, ownerName = 'Property Manager' } = data;
  const receiptNo = generateReceiptNumber(payment.id);
  const generatedOn = formatDate(new Date().toISOString());

  const statusColor = payment.status === 'paid' ? '#16a34a' : payment.status === 'overdue' ? '#dc2626' : '#d97706';
  const statusLabel = payment.status === 'paid' ? 'PAID' : payment.status === 'overdue' ? 'OVERDUE' : 'PENDING';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${receiptNo}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 20mm; size: A4; }
    }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 24px; background: #f9fafb; color: #111827; }
    .receipt { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 28px 32px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .receipt-label { font-size: 13px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
    .receipt-no { font-size: 18px; font-weight: 700; }
    .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 1px; background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.5); }
    .body { padding: 28px 32px; }
    .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-item label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .info-item span { font-size: 14px; font-weight: 600; color: #111827; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    .breakdown { background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #374151; }
    .breakdown-row.total { border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 12px; font-weight: 800; font-size: 16px; color: #111827; }
    .total-amount { font-size: 20px; color: ${statusColor}; }
    .status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .status-indicator { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; background: ${statusColor}1a; color: ${statusColor}; border: 1.5px solid ${statusColor}40; }
    .footer { background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 11px; color: #9ca3af; margin: 2px 0; }
    .print-btn { display: block; width: 100%; margin: 20px auto 0; max-width: 600px; padding: 12px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="header-top">
        <div>
          <div class="brand">PG Manager</div>
          <div class="receipt-label" style="margin-top:4px">Rent Receipt</div>
        </div>
        <div style="text-align:right">
          <div class="receipt-no">${receiptNo}</div>
          <div style="font-size:12px;opacity:0.7;margin-top:4px">Generated: ${generatedOn}</div>
        </div>
      </div>
      <div class="status-badge">${statusLabel}</div>
    </div>

    <div class="body">
      <div class="section-label">Tenant Information</div>
      <div class="info-grid">
        <div class="info-item">
          <label>Tenant Name</label>
          <span>${payment.tenant}</span>
        </div>
        <div class="info-item">
          <label>Room</label>
          <span>${payment.room}</span>
        </div>
        <div class="info-item">
          <label>Property</label>
          <span>${propertyName}</span>
        </div>
        <div class="info-item">
          <label>Due Date</label>
          <span>${formatDate(payment.dueDate)}</span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section-label">Payment Breakdown</div>
      <div class="breakdown">
        <div class="breakdown-row">
          <span>Monthly Rent</span>
          <span>${formatCurrency(payment.monthlyRent)}</span>
        </div>
        ${payment.extraCharges > 0 ? `
        <div class="breakdown-row">
          <span>Extra Charges</span>
          <span>${formatCurrency(payment.extraCharges)}</span>
        </div>` : ''}
        <div class="breakdown-row total">
          <span>Total Amount</span>
          <span class="total-amount">${formatCurrency(payment.totalAmount)}</span>
        </div>
      </div>

      <div class="status-row">
        <div>
          <div style="font-size:12px;color:#6b7280;">Payment Status</div>
          <div class="status-indicator">${statusLabel}</div>
        </div>
        ${payment.paidDate ? `
        <div style="text-align:right">
          <div style="font-size:12px;color:#6b7280;">Paid On</div>
          <div style="font-size:14px;font-weight:700;color:#16a34a">${formatDate(payment.paidDate)}</div>
        </div>` : ''}
      </div>

      ${(payment.paymentMode || payment.referenceNumber || payment.paymentNotes) ? `
      <div class="divider"></div>
      <div class="section-label">Payment Details</div>
      <div class="info-grid">
        ${payment.paymentMode ? `<div class="info-item"><label>Payment Mode</label><span style="text-transform:capitalize">${payment.paymentMode.replace('_', ' ')}</span></div>` : ''}
        ${payment.referenceNumber ? `<div class="info-item"><label>Reference / TXN ID</label><span style="font-family:monospace">${payment.referenceNumber}</span></div>` : ''}
        ${payment.paymentNotes ? `<div class="info-item" style="grid-column:1/-1"><label>Notes</label><span>${payment.paymentNotes}</span></div>` : ''}
      </div>` : ''}

      <div class="divider"></div>

      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;">
        <div>Issued by: <strong style="color:#374151">${ownerName}</strong></div>
        <div>Receipt ID: <strong style="color:#374151">${receiptNo}</strong></div>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated receipt and does not require a physical signature.</p>
      <p>For queries, contact your property manager.</p>
    </div>
  </div>

  <button class="print-btn no-print" onclick="window.print()">Print Receipt</button>
</body>
</html>`;
}

export function openReceiptWindow(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  const win = window.open('', '_blank', 'width=700,height=900,scrollbars=yes');
  if (!win) {
    return;
  }
  win.document.write(html);
  win.document.close();
}
