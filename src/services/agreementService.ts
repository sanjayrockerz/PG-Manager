import type { TenantRecord, AgreementCreateInput, AgreementTemplate } from './supabaseData';
import { supabaseLifecycleApi } from './supabaseData';

export interface AgreementData {
  tenant: TenantRecord;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  ownerName: string;
  ownerPhone: string;
  generatedAt: string;
  ownerSignature?: {
    type: 'image' | 'typed';
    value: string;
    name: string;
  };
  template?: AgreementTemplate | null;
}

/**
 * Generate and persist an agreement draft for a tenant.
 * Auto-fetches active signature vault and agreement template.
 * Returns the created AgreementRecord id.
 */
export async function createAndStoreAgreement(data: AgreementData): Promise<string> {
  // Fetch active vault signature and template in parallel
  const [vaultProfile, activeTemplate] = await Promise.all([
    supabaseLifecycleApi.getActiveSignatureProfile().catch(() => null),
    supabaseLifecycleApi.getActiveAgreementTemplate().catch(() => null),
  ]);

  // Build owner signature data from vault
  let ownerSig: AgreementData['ownerSignature'] | undefined;
  if (vaultProfile) {
    if (vaultProfile.signatureType === 'typed' && vaultProfile.signatureText) {
      ownerSig = { type: 'typed', value: vaultProfile.signatureText, name: data.ownerName };
    } else if (vaultProfile.signatureImage) {
      ownerSig = { type: 'image', value: vaultProfile.signatureImage, name: data.ownerName };
    }
  }

  const enrichedData: AgreementData = {
    ...data,
    ownerSignature: ownerSig,
    template: activeTemplate,
  };

  const html = generateAgreementHtml(enrichedData);

  const input: AgreementCreateInput = {
    tenantId: data.tenant.id,
    propertyId: data.tenant.propertyId,
    startDate: data.tenant.joinDate,
    monthlyRent: data.tenant.rent,
    securityDeposit: data.tenant.securityDeposit,
    agreementType: 'license',
    htmlContent: html,
    templateVersion: activeTemplate?.version,
    ...(ownerSig ? {
      autoOwnerSignatureName: data.ownerName,
      autoOwnerSignatureImage: ownerSig.type === 'image' ? ownerSig.value : undefined,
    } : {}),
  };

  const record = await supabaseLifecycleApi.createAgreement(input);
  return record.id;
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

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sigBlock(sig: AgreementData['ownerSignature'] | undefined, placeholderComment: string): string {
  if (!sig) return `<!-- ${placeholderComment} --><p style="margin-top:32px;">Signature: ____________________</p>`;
  const imgHtml = sig.type === 'image'
    ? `<img src="${sig.value}" style="height:54px;max-width:220px;margin-top:6px;display:block;" alt="signature" />`
    : `<span style="font-family:cursive,serif;font-size:24px;color:#1a1a1a;">${esc(sig.value)}</span>`;
  return imgHtml;
}

export function generateAgreementHtml(data: AgreementData): string {
  const { tenant, propertyName, propertyAddress, propertyCity, ownerName, ownerPhone, generatedAt, ownerSignature, template } = data;

  const joinDateFormatted = formatDate(tenant.joinDate);
  const generatedDateFormatted = formatDate(generatedAt);
  const rentDue = ordinal(tenant.rentDueDate);

  // All user-supplied values are escaped before interpolation into HTML.
  const eTenantName = esc(tenant.name);
  const eTenantPhone = esc(tenant.phone || '—');
  const eTenantEmail = esc(tenant.email || '—');
  const eTenantIdType = esc(tenant.idType || '—');
  const eTenantIdNumber = esc(tenant.idNumber || '—');
  const eTenantParentName = esc(tenant.parentName || '—');
  const eTenantParentPhone = esc(tenant.parentPhone || '—');
  const eOwnerName = esc(ownerName);
  const eOwnerPhone = esc(ownerPhone);
  const ePropertyName = esc(propertyName);
  const ePropertyAddress = esc(propertyAddress);
  const ePropertyCity = esc(propertyCity || '');
  const eRoomDetails = [
    tenant.floor ? `Floor ${esc(String(tenant.floor))}` : null,
    tenant.room ? `Room ${esc(tenant.room)}` : null,
    tenant.bed ? `Bed ${esc(tenant.bed)}` : null,
  ].filter(Boolean).join(', ');
  // Template clauses are owner-authored text — escape before embedding.
  const eLateFeeClause = esc(template?.lateFeeClause ?? '');
  const eSecurityDepositTerms = esc(template?.securityDepositTerms ?? '');
  const eNoticePeriodClause = esc(template?.noticePeriodClause ?? '');
  const eVisitorRules = esc(template?.visitorRules ?? '');
  const eHouseRules = esc(template?.houseRules ?? '');
  const ePropertyRules = esc(template?.propertyRules ?? '');
  const eRefundPolicy = esc(template?.refundPolicy ?? '');
  const eMiscTerms = template?.miscellaneousTerms ? esc(template.miscellaneousTerms) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rental Agreement — ${eTenantName}</title>
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
    <div class="pg-name">${ePropertyName}</div>
    <div class="address">${ePropertyAddress}${ePropertyCity ? ', ' + ePropertyCity : ''}</div>
    <h1 style="margin-top:12px;">PG Accommodation Agreement</h1>
    <div style="font-size:12px;color:#555;margin-top:4px;">This agreement is entered into on <strong>${generatedDateFormatted}</strong></div>
  </div>

  <p style="margin-bottom:12px;">
    This PG Accommodation Agreement is entered into between <strong>${eOwnerName}</strong>
    (hereinafter referred to as the <em>"Owner"</em>, reachable at ${eOwnerPhone}) operating
    <strong>${ePropertyName}</strong> located at ${ePropertyAddress}, and the following tenant:
  </p>

  <div class="section-title">Tenant Details</div>
  <table class="details">
    <tr><td>Full Name</td><td>${eTenantName}</td></tr>
    <tr><td>Phone</td><td>${eTenantPhone}</td></tr>
    <tr><td>Email</td><td>${eTenantEmail}</td></tr>
    <tr><td>ID Type</td><td>${eTenantIdType}</td></tr>
    <tr><td>ID Number</td><td>${eTenantIdNumber}</td></tr>
    <tr><td>Emergency Contact</td><td>${eTenantParentName} (${eTenantParentPhone})</td></tr>
  </table>

  <div class="section-title">Accommodation Details</div>
  <table class="details">
    <tr><td>Property</td><td>${ePropertyName}</td></tr>
    <tr><td>Address</td><td>${ePropertyAddress}${ePropertyCity ? ', ' + ePropertyCity : ''}</td></tr>
    <tr><td>Room / Bed Assigned</td><td>${eRoomDetails || '—'}</td></tr>
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
    <li><strong>Rent Payment:</strong> ${eLateFeeClause || `Rent is due on the ${rentDue} of each month. Late payments attract a penalty as stated above. Persistent non-payment is grounds for termination.`}</li>
    <li><strong>Security Deposit:</strong> ${eSecurityDepositTerms || `The security deposit of ₹${tenant.securityDeposit.toLocaleString('en-IN')} is held against damages, dues, or unpaid rent, and will be refunded within 15 days of vacating after deductions (if any).`}</li>
    <li><strong>Notice Period:</strong> ${eNoticePeriodClause || 'Either party must provide a minimum of 30 days written notice before termination. Early vacating may result in forfeiture of a portion of the deposit.'}</li>
    <li><strong>Guests / Visitors:</strong> ${eVisitorRules || 'Overnight guests are not permitted without prior approval from the owner/manager.'}</li>
    <li><strong>Maintenance:</strong> Tenants must maintain the room in good condition. Damage beyond normal wear and tear will be deducted from the security deposit.</li>
    <li><strong>Common Areas:</strong> Tenants are responsible for keeping common areas clean. Any damage to shared facilities will be shared equally among occupants unless attributed to a specific individual.</li>
    <li><strong>House Rules:</strong> ${eHouseRules || 'Smoking, consumption of alcohol on premises, and any illegal activities are strictly prohibited.'}</li>
    <li><strong>Utilities:</strong> Electricity, water, and Wi-Fi (if provided) are included in the rent unless stated otherwise. Excessive usage may attract additional charges.</li>
    <li><strong>Inspections:</strong> The owner/manager reserves the right to inspect the room with 24 hours notice (or immediately in emergencies).</li>
    <li><strong>Keys/Access:</strong> Loss of key/access card will be charged at actual replacement cost plus ₹500 administrative fee.</li>
    <li><strong>Property Rules:</strong> ${ePropertyRules || 'All tenants must comply with the property rules as communicated by the owner from time to time.'}</li>
    <li><strong>Refund Policy:</strong> ${eRefundPolicy || 'The security deposit refund is subject to property inspection and settlement of all dues.'}</li>
    ${eMiscTerms ? `<li><strong>Additional Terms:</strong> ${eMiscTerms}</li>` : ''}
    <li><strong>Governing Law:</strong> This agreement is governed by the laws of India. Any disputes shall be resolved through mutual discussion; failing which, in the courts of ${ePropertyCity || 'the applicable jurisdiction'}.</li>
  </ol>

  <div class="notice">
    ⚠️ This agreement has been auto-generated by RentCare based on tenant records. Both parties should review the terms before signing. This document carries the same legal weight as a manually drafted agreement when signed by both parties.
  </div>

  <div class="signatures">
    <div class="sig-block">
      <p>Owner / Authorized Signatory</p>
      <strong>${eOwnerName}</strong>
      ${sigBlock(ownerSignature, 'OWNER_SIGNATURE_SLOT')}
      ${ownerSignature ? `<p style="font-size:11px;color:#555;margin-top:4px;">Signed: ${generatedDateFormatted}</p>` : `<p>Date: ____________________</p>`}
    </div>
    <div class="sig-block" style="text-align:right;">
      <p>Tenant</p>
      <strong>${eTenantName}</strong>
      <!-- TENANT_SIGNATURE_SLOT -->
      <p style="margin-top:32px;">Signature: ____________________</p>
      <p>Date: ____________________</p>
    </div>
  </div>

  <div class="generated">
    Generated by RentCare · ${generatedDateFormatted} · Tenant ID: ${esc(tenant.id.slice(0, 8).toUpperCase())}
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
