/**
 * Receipt / Invoice Generator
 *
 * ACCOUNTING RULES (enforced here and at every call site):
 *   - Receipt  → ONLY when payment.status === 'paid'
 *   - Invoice  → for pending | overdue | any non-paid status
 *
 * openReceiptWindow() throws if called with a non-paid payment.
 * openInvoiceWindow() throws if called with a paid payment.
 */

import type { PaymentRecord } from './supabaseData';

export interface ReceiptData {
  payment: PaymentRecord;
  propertyName: string;
  ownerName?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function receiptNumber(paymentId: string): string {
  return `RCP-${paymentId.slice(-8).toUpperCase()}`;
}

function invoiceNumber(paymentId: string): string {
  return `INV-${paymentId.slice(-8).toUpperCase()}`;
}

// ── RECEIPT (paid only) ───────────────────────────────────────────────────────

export function generateReceiptHTML(data: ReceiptData): string {
  const { payment, propertyName } = data;
  // Issuer is the registered owner; fall back to the property name (never a
  // generic placeholder) when the owner name has not been resolved.
  const issuedBy = data.ownerName?.trim() || propertyName;

  if (payment.status !== 'paid') {
    throw new Error(
      `Receipt cannot be generated until payment is marked paid. Current status: ${payment.status}`
    );
  }

  const rcpNo      = receiptNumber(payment.id);
  const generatedOn = formatDate(new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${rcpNo}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 20mm; size: A4; }
    }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 24px; background: #f9fafb; color: #111827; }
    .card { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .hdr  { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; padding: 28px 32px; }
    .hdr-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .doc-label { font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; }
    .doc-no { font-size: 18px; font-weight: 700; }
    .paid-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 1px; background: rgba(255,255,255,0.25); border: 1.5px solid rgba(255,255,255,0.6); }
    .body { padding: 28px 32px; }
    .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-item label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .info-item span  { font-size: 14px; font-weight: 600; color: #111827; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    .breakdown { background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #374151; }
    .breakdown-row.total { border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 12px; font-weight: 800; font-size: 16px; color: #111827; }
    .total-amount { font-size: 20px; color: #16a34a; }
    .footer { background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 11px; color: #9ca3af; margin: 2px 0; }
    .print-btn { display: block; width: 100%; margin: 20px auto 0; max-width: 600px; padding: 12px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
    .print-btn:hover { background: #15803d; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <div class="hdr-top">
        <div>
          <div class="brand">RentCare</div>
          <div class="doc-label" style="margin-top:4px">Rent Receipt</div>
        </div>
        <div style="text-align:right">
          <div class="doc-no">${rcpNo}</div>
          <div style="font-size:12px;opacity:0.7;margin-top:4px">Generated: ${generatedOn}</div>
        </div>
      </div>
      <div class="paid-badge">✓ PAID</div>
    </div>

    <div class="body">
      <div class="section-label">Tenant &amp; Property</div>
      <div class="info-grid">
        <div class="info-item"><label>Tenant Name</label><span>${payment.tenant}</span></div>
        <div class="info-item"><label>Room</label><span>${payment.room}</span></div>
        <div class="info-item"><label>Property</label><span>${propertyName}</span></div>
        <div class="info-item"><label>Due Date</label><span>${formatDate(payment.dueDate)}</span></div>
      </div>

      <div class="divider"></div>

      <div class="section-label">Payment Breakdown</div>
      <div class="breakdown">
        <div class="breakdown-row"><span>Monthly Rent</span><span>${formatCurrency(payment.monthlyRent)}</span></div>
        ${payment.extraCharges > 0 ? `<div class="breakdown-row"><span>Extra Charges</span><span>${formatCurrency(payment.extraCharges)}</span></div>` : ''}
        <div class="breakdown-row total"><span>Total Paid</span><span class="total-amount">${formatCurrency(payment.totalAmount)}</span></div>
      </div>

      <div class="info-grid">
        <div class="info-item"><label>Paid On</label><span style="color:#16a34a">${formatDate(payment.paidDate)}</span></div>
        ${payment.paymentMode ? `<div class="info-item"><label>Payment Mode</label><span style="text-transform:capitalize">${payment.paymentMode.replace(/_/g, ' ')}</span></div>` : ''}
        ${payment.referenceNumber ? `<div class="info-item"><label>Reference / TXN ID</label><span style="font-family:monospace;font-size:12px">${payment.referenceNumber}</span></div>` : ''}
        ${payment.paymentNotes ? `<div class="info-item" style="grid-column:1/-1"><label>Notes</label><span>${payment.paymentNotes}</span></div>` : ''}
      </div>

      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;">
        <div>Issued by: <strong style="color:#374151">${issuedBy}</strong></div>
        <div>Receipt: <strong style="color:#374151">${rcpNo}</strong></div>
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
  if (data.payment.status !== 'paid') {
    throw new Error(
      `Receipt cannot be generated until payment is marked paid. Current status: ${data.payment.status}`
    );
  }
  const html = generateReceiptHTML(data);
  const win = window.open('', '_blank', 'width=700,height=900,scrollbars=yes');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ── INVOICE (non-paid: pending | overdue | awaiting_verification | etc.) ──────

export function generateInvoiceHTML(data: ReceiptData): string {
  const { payment, propertyName } = data;
  // Issuer is the registered owner; fall back to the property name (never a
  // generic placeholder) when the owner name has not been resolved.
  const issuedBy = data.ownerName?.trim() || propertyName;

  if (payment.status === 'paid') {
    throw new Error('Use generateReceiptHTML() for paid payments — not generateInvoiceHTML().');
  }

  const invNo      = invoiceNumber(payment.id);
  const generatedOn = formatDate(new Date().toISOString());

  const isOverdue = payment.status === 'overdue';
  const hdrColor  = isOverdue ? '#dc2626' : '#d97706';
  const hdrGrad   = isOverdue
    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
    : 'linear-gradient(135deg, #d97706, #b45309)';
  const statusLabel = isOverdue ? 'OVERDUE' : 'PENDING';
  const btnColor    = isOverdue ? '#dc2626' : '#d97706';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invNo}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 20mm; size: A4; }
    }
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 24px; background: #f9fafb; color: #111827; }
    .card { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .hdr  { background: ${hdrGrad}; color: #fff; padding: 28px 32px; }
    .hdr-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .doc-label { font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; }
    .doc-no { font-size: 18px; font-weight: 700; }
    .status-badge { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; letter-spacing: 1px; background: rgba(255,255,255,0.25); border: 1.5px solid rgba(255,255,255,0.6); }
    .body { padding: 28px 32px; }
    .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-item label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .info-item span  { font-size: 14px; font-weight: 600; color: #111827; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    .breakdown { background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #374151; }
    .breakdown-row.total { border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 12px; font-weight: 800; font-size: 16px; color: #111827; }
    .total-amount { font-size: 20px; color: ${hdrColor}; }
    .notice { margin-top: 16px; padding: 12px 16px; background: ${isOverdue ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${isOverdue ? '#fca5a5' : '#fde68a'}; border-radius: 8px; font-size: 12px; color: ${isOverdue ? '#991b1b' : '#92400e'}; }
    .footer { background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 11px; color: #9ca3af; margin: 2px 0; }
    .print-btn { display: block; width: 100%; margin: 20px auto 0; max-width: 600px; padding: 12px; background: ${btnColor}; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <div class="hdr-top">
        <div>
          <div class="brand">RentCare</div>
          <div class="doc-label" style="margin-top:4px">Rent Invoice</div>
        </div>
        <div style="text-align:right">
          <div class="doc-no">${invNo}</div>
          <div style="font-size:12px;opacity:0.7;margin-top:4px">Generated: ${generatedOn}</div>
        </div>
      </div>
      <div class="status-badge">${statusLabel}</div>
    </div>

    <div class="body">
      <div class="section-label">Tenant &amp; Property</div>
      <div class="info-grid">
        <div class="info-item"><label>Tenant Name</label><span>${payment.tenant}</span></div>
        <div class="info-item"><label>Room</label><span>${payment.room}</span></div>
        <div class="info-item"><label>Property</label><span>${propertyName}</span></div>
        <div class="info-item"><label>Due Date</label><span style="color:${hdrColor}">${formatDate(payment.dueDate)}</span></div>
      </div>

      <div class="divider"></div>

      <div class="section-label">Amount Due</div>
      <div class="breakdown">
        <div class="breakdown-row"><span>Monthly Rent</span><span>${formatCurrency(payment.monthlyRent)}</span></div>
        ${payment.extraCharges > 0 ? `<div class="breakdown-row"><span>Extra Charges</span><span>${formatCurrency(payment.extraCharges)}</span></div>` : ''}
        <div class="breakdown-row total"><span>Total Due</span><span class="total-amount">${formatCurrency(payment.totalAmount)}</span></div>
      </div>

      <div class="notice">
        ${isOverdue
          ? '⚠️ This payment is overdue. Please settle immediately to avoid additional charges.'
          : '📋 This invoice is pending payment. Please pay by the due date to avoid overdue charges.'}
      </div>

      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;">
        <div>Issued by: <strong style="color:#374151">${issuedBy}</strong></div>
        <div>Invoice: <strong style="color:#374151">${invNo}</strong></div>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated invoice. Receipt will be issued upon payment confirmation.</p>
      <p>For queries, contact your property manager.</p>
    </div>
  </div>
  <button class="print-btn no-print" onclick="window.print()">Print Invoice</button>
</body>
</html>`;
}

export function openInvoiceWindow(data: ReceiptData): void {
  if (data.payment.status === 'paid') {
    throw new Error('Use openReceiptWindow() for paid payments — not openInvoiceWindow().');
  }
  const html = generateInvoiceHTML(data);
  const win = window.open('', '_blank', 'width=700,height=900,scrollbars=yes');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ── Safe dispatcher — picks receipt or invoice based on status ─────────────

export function openPaymentDocument(data: ReceiptData): void {
  if (data.payment.status === 'paid') {
    openReceiptWindow(data);
  } else {
    openInvoiceWindow(data);
  }
}
