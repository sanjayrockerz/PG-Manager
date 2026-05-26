/**
 * Deposit Settlement Engine
 *
 * Handles full Indian PG deposit settlement calculations:
 * - Security deposit balance
 * - Pending rent adjustments
 * - Multi-item deductions (maintenance, damage, dues, etc.)
 * - Refund computation
 * - Settlement summary + receipt data
 */

export type DeductionCategory =
  | 'pending_rent'
  | 'maintenance_damage'
  | 'utility_dues'
  | 'key_loss'
  | 'furniture_damage'
  | 'cleaning'
  | 'notice_period_shortfall'
  | 'other';

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionCategory, string> = {
  pending_rent: 'Pending Rent',
  maintenance_damage: 'Maintenance / Damage',
  utility_dues: 'Utility Dues',
  key_loss: 'Key / Lock Loss',
  furniture_damage: 'Furniture Damage',
  cleaning: 'Cleaning Charges',
  notice_period_shortfall: 'Notice Period Shortfall',
  other: 'Other',
};

export interface SettlementDeductionItem {
  id: string;
  category: DeductionCategory;
  description: string;
  amount: number;
}

export interface PendingPaymentSummary {
  id: string;
  dueDate: string;
  totalAmount: number;
  status: 'pending' | 'overdue';
}

export interface DepositSettlementInput {
  tenantId: string;
  tenantName: string;
  room: string;
  floor: string;
  propertyId: string;
  securityDeposit: number;
  monthlyRent: number;
  vacateDate: string;
  reason: string;
  pendingPayments: PendingPaymentSummary[];
  deductions: SettlementDeductionItem[];
  adjustPendingRentFromDeposit: boolean;
}

export interface DepositSettlementResult {
  securityDeposit: number;
  totalDeductions: number;
  deductionBreakdown: SettlementDeductionItem[];
  pendingRentTotal: number;
  pendingRentCoveredFromDeposit: number;
  grossRefund: number;
  netRefund: number;
  settledAt: string;
  summary: string;
}

const createItemId = (): string =>
  `deduction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const createDeductionItem = (
  category: DeductionCategory,
  description: string,
  amount: number,
): SettlementDeductionItem => ({
  id: createItemId(),
  category,
  description,
  amount: Math.max(0, amount),
});

export function calculateSettlement(input: DepositSettlementInput): DepositSettlementResult {
  const {
    securityDeposit,
    deductions,
    pendingPayments,
    adjustPendingRentFromDeposit,
  } = input;

  const pendingRentTotal = pendingPayments.reduce((sum, p) => sum + p.totalAmount, 0);

  let allDeductions = [...deductions];

  // Auto-add pending rent as a deduction line if chosen
  if (adjustPendingRentFromDeposit && pendingRentTotal > 0) {
    const existingRentDeduction = allDeductions.find((d) => d.category === 'pending_rent');
    if (!existingRentDeduction) {
      allDeductions = [
        createDeductionItem(
          'pending_rent',
          `Pending rent (${pendingPayments.length} payment${pendingPayments.length > 1 ? 's' : ''})`,
          pendingRentTotal,
        ),
        ...allDeductions,
      ];
    }
  }

  const totalDeductions = allDeductions.reduce((sum, d) => sum + d.amount, 0);
  const pendingRentCoveredFromDeposit = adjustPendingRentFromDeposit ? Math.min(pendingRentTotal, securityDeposit) : 0;

  const grossRefund = securityDeposit;
  const netRefund = Math.max(0, securityDeposit - totalDeductions);

  const lines: string[] = [];
  if (allDeductions.length > 0) {
    lines.push(`Deductions: ₹${totalDeductions.toLocaleString('en-IN')}`);
  }
  lines.push(`Refund: ₹${netRefund.toLocaleString('en-IN')}`);
  const summary = lines.join(' · ');

  return {
    securityDeposit,
    totalDeductions,
    deductionBreakdown: allDeductions,
    pendingRentTotal,
    pendingRentCoveredFromDeposit,
    grossRefund,
    netRefund,
    settledAt: new Date().toISOString(),
    summary,
  };
}

export interface SettlementReceiptData {
  tenantName: string;
  room: string;
  floor: string;
  joinDate: string;
  vacateDate: string;
  reason: string;
  securityDeposit: number;
  deductionBreakdown: SettlementDeductionItem[];
  totalDeductions: number;
  netRefund: number;
  pendingRentTotal: number;
  settledAt: string;
  propertyName: string;
  ownerName: string;
}

export function generateSettlementReceiptHtml(data: SettlementReceiptData): string {
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const receiptNo = `RC-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const deductionRows = data.deductionBreakdown.length > 0
    ? data.deductionBreakdown.map((d) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:13px">${d.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#ef4444;font-size:13px;text-align:right">- ${fmt(d.amount)}</td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af;font-size:13px;text-align:center">No deductions</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Settlement Receipt — ${data.tenantName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; padding: 40px 20px; }
    .receipt { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 28px 32px; color: #fff; }
    .body { padding: 28px 32px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .amount-row td { font-weight: 600; }
    .total-row { background: #f0fdf4; }
    .total-row td { color: #15803d; font-size: 15px; font-weight: 700; padding: 10px 12px; }
    .footer { padding: 16px 32px; border-top: 1px solid #f0f0f0; text-align: center; color: #9ca3af; font-size: 11px; }
    @media print { body { padding: 0; } .receipt { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Deposit Settlement Receipt</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:4px">${data.tenantName}</div>
      <div style="font-size:13px;opacity:0.85">Room ${data.room}, Floor ${data.floor} · ${data.propertyName}</div>
      <div style="font-size:11px;opacity:0.65;margin-top:8px">Receipt #${receiptNo} · Generated ${fmtDate(data.settledAt)}</div>
    </div>

    <div class="body">
      <!-- Tenant summary -->
      <table style="margin-bottom:20px">
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px">Owner</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:500">${data.ownerName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px">Move-in Date</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:500">${fmtDate(data.joinDate)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px">Vacate Date</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:500">${fmtDate(data.vacateDate)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px">Reason</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:500">${data.reason}</td>
        </tr>
      </table>

      <!-- Settlement breakdown -->
      <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Settlement Breakdown</div>
      <table>
        <tr class="amount-row">
          <td style="padding:10px 12px;background:#fafafa;border-radius:6px 6px 0 0;color:#111827;font-size:14px">Security Deposit Held</td>
          <td style="padding:10px 12px;background:#fafafa;border-radius:6px 6px 0 0;color:#111827;font-size:14px;text-align:right;font-weight:700">${fmt(data.securityDeposit)}</td>
        </tr>
        ${deductionRows}
        ${data.totalDeductions > 0 ? `
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">Total Deductions</td>
          <td style="padding:8px 12px;color:#ef4444;font-size:13px;text-align:right;font-weight:600">- ${fmt(data.totalDeductions)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td style="border-radius:0 0 0 6px">Net Refund to Tenant</td>
          <td style="text-align:right;border-radius:0 0 6px 0">${fmt(data.netRefund)}</td>
        </tr>
      </table>

      ${data.pendingRentTotal > 0 ? `
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-top:4px;font-size:12px;color:#92400e">
        Note: ₹${data.pendingRentTotal.toLocaleString('en-IN')} in pending rent payments may require separate settlement.
      </div>` : ''}
    </div>

    <div class="footer">
      This is a computer-generated receipt. Powered by RentCare PG Management.
    </div>
  </div>
</body>
</html>`;
}

export function printSettlementReceipt(data: SettlementReceiptData): void {
  const html = generateSettlementReceiptHtml(data);
  const win = window.open('', '_blank', 'width=640,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
