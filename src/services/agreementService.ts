import type { TenantRecord } from './supabaseData';

export interface AgreementData {
  tenant: TenantRecord;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  ownerName: string;
  ownerPhone: string;
  generatedAt: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function generateAgreementHtml(data: AgreementData): string {
  const { tenant, propertyName, propertyAddress, propertyCity, ownerName, ownerPhone, generatedAt } = data;

  const joinDateFormatted = formatDate(tenant.joinDate);
  const generatedDateFormatted = formatDate(generatedAt);
  const rentDue = ordinal(tenant.rentDueDate);

  const roomDetails = [
    tenant.floor ? `Floor ${tenant.floor}` : null,
    tenant.room ? `Room ${tenant.room}` : null,
    tenant.bed ? `Bed ${tenant.bed}` : null,
  ].filter(Boolean).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rental Agreement — ${tenant.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 13px;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fff;
      padding: 48px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }
    .header .pg-name {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
    }
    .header .address {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin: 20px 0 10px;
      color: #333;
    }
    table.details {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    table.details td {
      padding: 5px 8px;
      vertical-align: top;
      font-size: 12.5px;
    }
    table.details td:first-child {
      width: 35%;
      color: #555;
      font-weight: normal;
    }
    table.details td:last-child {
      font-weight: bold;
    }
    table.details tr:nth-child(even) {
      background: #f9f9f9;
    }
    ol.terms {
      padding-left: 20px;
    }
    ol.terms li {
      margin-bottom: 8px;
      font-size: 12.5px;
    }
    .signatures {
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .sig-block {
      flex: 1;
      border-top: 1px solid #888;
      padding-top: 8px;
      min-height: 80px;
    }
    .sig-block p {
      font-size: 12px;
      color: #555;
    }
    .sig-block strong {
      display: block;
      margin-top: 4px;
      font-size: 13px;
    }
    .notice {
      margin-top: 24px;
      padding: 10px 14px;
      background: #fffbeb;
      border: 1px solid #d97706;
      border-radius: 4px;
      font-size: 11.5px;
      color: #92400e;
    }
    .generated {
      text-align: right;
      font-size: 11px;
      color: #aaa;
      margin-top: 32px;
      border-top: 1px solid #eee;
      padding-top: 8px;
    }
    @media print {
      body { padding: 32px; }
      .notice { display: none; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="pg-name">${propertyName}</div>
    <div class="address">${propertyAddress}${propertyCity ? ', ' + propertyCity : ''}</div>
    <h1 style="margin-top:12px;">PG Accommodation Agreement</h1>
    <div style="font-size:12px;color:#555;margin-top:4px;">This agreement is entered into on <strong>${generatedDateFormatted}</strong></div>
  </div>

  <p style="margin-bottom:12px;">
    This PG Accommodation Agreement is entered into between <strong>${ownerName}</strong>
    (hereinafter referred to as the <em>"Owner"</em>, reachable at ${ownerPhone}) operating
    <strong>${propertyName}</strong> located at ${propertyAddress}, and the following tenant:
  </p>

  <div class="section-title">Tenant Details</div>
  <table class="details">
    <tr><td>Full Name</td><td>${tenant.name}</td></tr>
    <tr><td>Phone</td><td>${tenant.phone || '—'}</td></tr>
    <tr><td>Email</td><td>${tenant.email || '—'}</td></tr>
    <tr><td>ID Type</td><td>${tenant.idType || '—'}</td></tr>
    <tr><td>ID Number</td><td>${tenant.idNumber || '—'}</td></tr>
    <tr><td>Emergency Contact</td><td>${tenant.parentName || '—'} (${tenant.parentPhone || '—'})</td></tr>
  </table>

  <div class="section-title">Accommodation Details</div>
  <table class="details">
    <tr><td>Property</td><td>${propertyName}</td></tr>
    <tr><td>Address</td><td>${propertyAddress}${propertyCity ? ', ' + propertyCity : ''}</td></tr>
    <tr><td>Room / Bed Assigned</td><td>${roomDetails || '—'}</td></tr>
    <tr><td>Check-In Date</td><td>${joinDateFormatted}</td></tr>
    <tr><td>Agreement Date</td><td>${generatedDateFormatted}</td></tr>
  </table>

  <div class="section-title">Financial Terms</div>
  <table class="details">
    <tr><td>Monthly Rent</td><td>₹${tenant.rent.toLocaleString('en-IN')} per month</td></tr>
    <tr><td>Rent Due Date</td><td>${rentDue} of every month</td></tr>
    <tr><td>Security Deposit</td><td>₹${tenant.securityDeposit.toLocaleString('en-IN')} (refundable)</td></tr>
    <tr><td>Late Payment</td><td>A late fee of ₹100/day applies after the due date</td></tr>
  </table>

  <div class="section-title">Terms and Conditions</div>
  <ol class="terms">
    <li><strong>Accommodation Use:</strong> The accommodation is provided strictly for residential purposes and may not be sublet or used for commercial activities.</li>
    <li><strong>Rent Payment:</strong> Rent is due on the ${rentDue} of each month. Late payments attract a penalty as stated above. Persistent non-payment is grounds for termination.</li>
    <li><strong>Security Deposit:</strong> The security deposit of ₹${tenant.securityDeposit.toLocaleString('en-IN')} is held against damages, dues, or unpaid rent, and will be refunded within 15 days of vacating after deductions (if any).</li>
    <li><strong>Notice Period:</strong> Either party must provide a minimum of 30 days written notice before termination. Early vacating may result in forfeiture of a portion of the deposit.</li>
    <li><strong>Guests:</strong> Overnight guests are not permitted without prior approval from the owner/manager.</li>
    <li><strong>Maintenance:</strong> Tenants must maintain the room in good condition. Damage beyond normal wear and tear will be deducted from the security deposit.</li>
    <li><strong>Common Areas:</strong> Tenants are responsible for keeping common areas clean. Any damage to shared facilities will be shared equally among occupants unless attributed to a specific individual.</li>
    <li><strong>Prohibited Activities:</strong> Smoking, consumption of alcohol on premises, and any illegal activities are strictly prohibited.</li>
    <li><strong>Utilities:</strong> Electricity, water, and Wi-Fi (if provided) are included in the rent unless stated otherwise. Excessive usage may attract additional charges.</li>
    <li><strong>Inspections:</strong> The owner/manager reserves the right to inspect the room with 24 hours notice (or immediately in emergencies).</li>
    <li><strong>Keys/Access:</strong> Loss of key/access card will be charged at actual replacement cost plus ₹500 administrative fee.</li>
    <li><strong>Governing Law:</strong> This agreement is governed by the laws of India. Any disputes shall be resolved through mutual discussion; failing which, in the courts of ${propertyCity || 'the applicable jurisdiction'}.</li>
  </ol>

  <div class="notice">
    ⚠️ This agreement has been auto-generated by RentCare based on tenant records. Both parties should review the terms before signing. This document carries the same legal weight as a manually drafted agreement when signed by both parties.
  </div>

  <div class="signatures">
    <div class="sig-block">
      <p>Owner / Authorized Signatory</p>
      <strong>${ownerName}</strong>
      <p style="margin-top:32px;">Signature: ____________________</p>
      <p>Date: ____________________</p>
    </div>
    <div class="sig-block" style="text-align:right;">
      <p>Tenant</p>
      <strong>${tenant.name}</strong>
      <p style="margin-top:32px;">Signature: ____________________</p>
      <p>Date: ____________________</p>
    </div>
  </div>

  <div class="generated">
    Generated by RentCare · ${generatedDateFormatted} · Tenant ID: ${tenant.id.slice(0, 8).toUpperCase()}
  </div>

</body>
</html>`;
}

export function printAgreement(data: AgreementData): void {
  const html = generateAgreementHtml(data);
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 600);
}

export function downloadAgreementHtml(data: AgreementData): void {
  const html = generateAgreementHtml(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agreement-${data.tenant.name.replace(/\s+/g, '-').toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
