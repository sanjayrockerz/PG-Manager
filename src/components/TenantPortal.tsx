import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Bell, Building2, Calendar,
  Check, CheckCircle2, ChevronRight, ClipboardCheck, CreditCard, Copy,
  Download, FileText, Home, IndianRupee, LayoutDashboard, LogOut,
  MapPin, MessageSquare, PanelLeftClose, PanelLeftOpen, Phone, Plus, QrCode,
  Send, Upload, User, Wrench, X, HelpCircle, Menu, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
  type MaintenancePriority,
  type MaintenanceSource,
  type MaintenanceTicketRecord,
  type AnnouncementRecord,
  type NotificationRecord,
  type PaymentRecord,
  type TenantPortalSnapshot,
  type AgreementRecord,
  type TenantDocument,
  supabaseTenantDataApi,
  supabaseLifecycleApi,
} from '../services/supabaseData';
import {
  getTenantPortalSnapshot,
  submitTenantVacateRequest,
  createTenantMaintenanceTicket,
} from '../services/dataService';
import { PaymentDocumentDialog } from './ui/PaymentDocumentDialog';
import { getAppMode } from '../config/appMode';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type TenantView =
  | 'home'
  | 'payments'
  | 'maintenance'
  | 'maintenance-new'
  | 'maintenance-detail'
  | 'announcements'
  | 'notifications'
  | 'documents'
  | 'profile'
  | 'help'
  | 'vacate';

const MAINTENANCE_CATEGORIES = [
  'Plumbing', 'Electrical', 'AC / Cooling', 'Wi-Fi / Internet',
  'Cleanliness', 'Furniture / Fixtures', 'Water Supply',
  'Lock / Security', 'Pest Control', 'Other',
];

const welcomeKey = (userId: string) => `tenant-welcome-v1-seen:${userId}`;
const notifSeenKey = (tenantId: string) => `tenant-notif-last-seen:${tenantId}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v: string | undefined | null) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtAmount = (v: number) => `₹${v.toLocaleString('en-IN')}`;

const buildUpiLink = (upiId: string, amount: number, name: string, month: string) => {
  if (!upiId) return null;
  const note = encodeURIComponent(`Rent ${month}`);
  const pn = encodeURIComponent(name);
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${pn}&am=${amount}&tn=${note}&cu=INR`;
};

const paymentMonth = (p: PaymentRecord) => {
  const d = new Date(p.dueDate);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const stayingSince = (joinDate: string) => {
  const d = new Date(joinDate);
  if (isNaN(d.getTime())) return joinDate;
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return 'New arrival';
  if (months < 12) return `${months}+ month${months > 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  return `${years}+ year${years > 1 ? 's' : ''}`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

function statusBadge(status: string): string {
  if (status === 'paid') return 'bg-green-100 text-green-700';
  if (status === 'overdue') return 'bg-red-100 text-red-700';
  if (status === 'open') return 'bg-amber-100 text-amber-700';
  if (status === 'in-progress') return 'bg-blue-100 text-blue-700';
  if (status === 'resolved' || status === 'closed') return 'bg-gray-100 text-gray-600';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'waiting') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

// ─── Onboarding Wizard ────────────────────────────────────────────────────────
// Unified 4-step first-login wizard. Replaces the old separate WelcomeScreen
// and MandatoryAgreementScreen. Steps:
//   1 → Welcome  2 → Verify Info  3 → Review Agreement  4 → Sign Agreement
// If no pending agreement, only steps 1-2 run.

interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  agreement: AgreementRecord | null;
}

function OnboardingWizard({
  state,
  snapshot,
  onAdvance,
  onSigned,
  onDismiss,
}: {
  state: OnboardingState;
  snapshot: TenantPortalSnapshot;
  onAdvance: () => void;
  onSigned: (updated: AgreementRecord) => void;
  onDismiss: () => void;
}) {
  const { step, agreement } = state;
  const { tenant, property, owner, ownerPaymentInfo } = snapshot;
  const pgName = ownerPaymentInfo.pgName || property?.name || 'your property manager';
  const totalSteps = agreement ? 4 : 2;

  // Sign step state
  const [signAccepted, setSignAccepted] = useState(false);
  const [signName, setSignName] = useState(tenant.name);
  const [signing, setSigning] = useState(false);

  const handleDownload = () => {
    if (!agreement?.htmlContent) return;
    const blob = new Blob([agreement.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rental-agreement.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSign = async () => {
    if (!agreement || !signName.trim() || !signAccepted) return;
    setSigning(true);
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      const updated = await supabaseLifecycleApi.signAgreement({
        agreementId: agreement.id,
        signatureName: signName.trim(),
        role: 'tenant',
        deviceMetadata: ua,
      });
      toast.success('Agreement signed! A copy has been saved to your Documents.');
      onSigned(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Signing failed. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[380px] flex-shrink-0 p-10 text-white"
        style={{ background: 'linear-gradient(160deg, #5B21B6 0%, #4F46E5 55%, #0891B2 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">RentCare</span>
          </div>

          {step === 1 && (
            <>
              <CheckCircle2 className="w-10 h-10 text-white/60 mb-5" />
              <h1 className="text-2xl font-bold leading-snug mb-3">Welcome to<br />{pgName}</h1>
              <p className="text-white/70 text-sm leading-relaxed">Your account has been set up by your property manager. Let's get you onboarded.</p>
            </>
          )}
          {step === 2 && (
            <>
              <User className="w-10 h-10 text-white/60 mb-5" />
              <h1 className="text-2xl font-bold leading-snug mb-3">Verify Your<br />Information</h1>
              <p className="text-white/70 text-sm leading-relaxed">Confirm your details are correct before accessing your portal. Contact your manager if anything needs updating.</p>
            </>
          )}
          {step === 3 && (
            <>
              <FileText className="w-10 h-10 text-white/60 mb-5" />
              <h1 className="text-2xl font-bold leading-snug mb-3">Review Your<br />Agreement</h1>
              <p className="text-white/70 text-sm leading-relaxed">Please read your rental agreement carefully. Your property manager has already signed it.</p>
            </>
          )}
          {step === 4 && (
            <>
              <Check className="w-10 h-10 text-white/60 mb-5" />
              <h1 className="text-2xl font-bold leading-snug mb-3">Sign Your<br />Agreement</h1>
              <p className="text-white/70 text-sm leading-relaxed">Complete your digital signature to activate your tenant account fully.</p>
              {agreement?.ownerSignatureName && (
                <div className="mt-6 bg-white/10 rounded-xl p-4">
                  <p className="text-xs text-white/60 mb-1">Owner signed by</p>
                  <p className="text-sm font-semibold text-white">{agreement.ownerSignatureName}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step progress */}
        <div className="space-y-2">
          <p className="text-xs text-white/50">Step {step} of {totalSteps}</p>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < step ? 'bg-white' : 'bg-white/25'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Right content panel */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">

        {/* ── Step 1: Welcome ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 lg:p-10">
            <div className="w-full max-w-md space-y-6">
              {/* Mobile heading */}
              <div className="lg:hidden text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}>
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Welcome, {tenant.name.split(' ')[0]}!</h2>
              </div>

              <div className="hidden lg:block">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {tenant.name.split(' ')[0]}! 🎉</h2>
                <p className="text-sm text-gray-500">Your account has been set up by {pgName}.</p>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-6 space-y-4 border border-indigo-100">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Property', value: pgName },
                    { label: 'Room', value: `Room ${tenant.room}${tenant.bed ? `, Bed ${tenant.bed}` : ''}` },
                    { label: 'Monthly Rent', value: fmtAmount(tenant.rent) },
                    { label: 'Move-in Date', value: fmtDate(tenant.joinDate) },
                    { label: 'Rent Due', value: `${tenant.rentDueDate}th of every month` },
                    ...(tenant.floor ? [{ label: 'Floor', value: `Floor ${tenant.floor}` }] : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold text-indigo-600 mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>
                {(ownerPaymentInfo.ownerPhone || owner?.phone) && (
                  <div className="pt-3 border-t border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-600 mb-1">Manager / Caretaker</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {(owner?.name ?? 'M')[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{owner?.name ?? 'Property Manager'}</p>
                        <p className="text-xs text-gray-500">{ownerPaymentInfo.ownerPhone || owner?.phone}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onAdvance}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Verify Info ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 lg:p-10">
            <div className="w-full max-w-md space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Confirm Your Details</h2>
                <p className="text-sm text-gray-500">Review your information below. Contact your property manager if anything is incorrect.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
                {[
                  { label: 'Full Name', value: tenant.name },
                  { label: 'Email', value: tenant.email || '—' },
                  { label: 'Phone', value: tenant.phone || '—' },
                  ...(tenant.alternatePhone ? [{ label: 'Alternate Phone', value: tenant.alternatePhone }] : []),
                  ...(tenant.parentName ? [{ label: 'Emergency Contact', value: `${tenant.parentName}${tenant.parentPhone ? ` · ${tenant.parentPhone}` : ''}` }] : []),
                  ...(tenant.dob ? [{ label: 'Date of Birth', value: fmtDate(tenant.dob) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between px-4 py-3 gap-4">
                    <span className="text-xs text-gray-400 font-medium mt-0.5 flex-shrink-0">{label}</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  If any details are wrong, contact your property manager before proceeding.
                  {owner?.phone && <> Call <a href={`tel:${owner.phone}`} className="font-semibold underline">{owner.phone}</a></>}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => onAdvance()} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Something is wrong
                </button>
                <button
                  onClick={onAdvance}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}
                >
                  Looks correct <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Review Agreement ─────────────────────────────────────── */}
        {step === 3 && agreement && (
          <>
            <div className="px-6 lg:px-8 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base lg:text-lg font-bold text-gray-900">Rental Agreement</h2>
                <p className="text-xs text-gray-500 mt-0.5">{pgName} · From {fmtDate(agreement.startDate)}</p>
              </div>
              {agreement.htmlContent && (
                <button onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto">
              {agreement.htmlContent ? (
                <iframe srcDoc={agreement.htmlContent} className="w-full h-full border-0" title="Rental Agreement" sandbox="allow-same-origin" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Agreement preview not available.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 lg:px-8 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <button onClick={onDismiss} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
                I'll review later
              </button>
              <button
                onClick={onAdvance}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}
              >
                Continue to Sign <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Sign Agreement ───────────────────────────────────────── */}
        {step === 4 && agreement && (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 lg:p-10">
            <div className="w-full max-w-md space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign Agreement</h2>
                <p className="text-sm text-gray-500">Confirm your identity and accept the terms to complete signing.</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    {agreement.agreementType === 'license' ? 'License Agreement' : 'Rental Agreement'}
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">{pgName} · {fmtAmount(agreement.monthlyRent)}/month</p>
                  {agreement.ownerSignatureName && (
                    <p className="text-xs text-green-700 mt-1 font-medium">✓ Owner signed by {agreement.ownerSignatureName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Your Full Name (E-Signature)</label>
                <input
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your full name to sign"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">This typed name serves as your electronic signature.</p>
              </div>

              <button type="button" className="flex items-start gap-3 text-left w-full" onClick={() => setSignAccepted((v) => !v)}>
                <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${signAccepted ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'}`}>
                  {signAccepted && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-600 leading-relaxed">
                  I have read and agree to all terms in the rental agreement. I understand this e-signature is legally binding.
                </span>
              </button>

              <div className="flex gap-3 pt-1">
                <button onClick={() => onAdvance()} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => void handleSign()}
                  disabled={signing || !signName.trim() || !signAccepted}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}
                >
                  {signing ? 'Signing…' : 'Sign Agreement ✓'}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">Your signature and timestamp will be recorded securely.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legacy shims (kept so callers compile while we migrate) ──────────────────
function WelcomeScreen({ snapshot, onDone }: { snapshot: TenantPortalSnapshot; onDone: () => void }) {
  const { tenant, property, ownerPaymentInfo } = snapshot;

  const features = [
    'Real-time rent tracking and payment history',
    'File maintenance requests in seconds',
    'Instant announcements from your PG',
  ];

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Left gradient panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 50%, #0891B2 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">RentCare</span>
          </div>
          <h1 className="text-3xl font-bold leading-snug mb-4">Your PG, managed<br />beautifully.</h1>
          <p className="text-white/75 text-sm leading-relaxed mb-10">
            Track rent, file complaints, get announcements — all from one place.
          </p>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">Powered by RentCare</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white overflow-y-auto flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Success icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Welcome to RentCare, {tenant.name.split(' ')[0]}! 🎉
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Your account has been set up by{' '}
            {ownerPaymentInfo.pgName || property?.name || 'your property manager'}.
          </p>

          {/* Room details card */}
          <div className="bg-[#F5F3FF] rounded-2xl p-6 mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Room</p>
                <p className="font-bold text-gray-900">{tenant.room}</p>
              </div>
              {tenant.bed && (
                <div>
                  <p className="text-xs font-semibold text-indigo-600 mb-1">Bed</p>
                  <p className="font-bold text-gray-900">Bed {tenant.bed}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Floor</p>
                <p className="font-bold text-gray-900">Floor {tenant.floor}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Monthly Rent</p>
                <p className="font-bold text-gray-900">{fmtAmount(tenant.rent)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Due Date</p>
                <p className="font-bold text-gray-900">{tenant.rentDueDate}th of every month</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 mb-1">Property</p>
                <p className="font-bold text-gray-900">{ownerPaymentInfo.pgName || property?.name}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onDone}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
          >
            Go to my Dashboard <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
            Your payment history and documents will appear here as your PG manager updates them.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Mandatory Agreement Review Screen ───────────────────────────────────────

function MandatoryAgreementScreen({
  agreement,
  snapshot,
  onSigned,
  onDismiss,
}: {
  agreement: AgreementRecord;
  snapshot: TenantPortalSnapshot;
  onSigned: (updated: AgreementRecord) => void;
  onDismiss: () => void;
}) {
  const [step, setStep] = useState<'read' | 'sign'>('read');
  const [accepted, setAccepted] = useState(false);
  const [signName, setSignName] = useState(snapshot.tenant.name);
  const [signing, setSigning] = useState(false);
  const { ownerPaymentInfo, property } = snapshot;

  const handleDownload = () => {
    if (!agreement.htmlContent) return;
    const blob = new Blob([agreement.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rental-agreement.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSign = async () => {
    const name = signName.trim();
    if (!name || !accepted) return;
    setSigning(true);
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      const updated = await supabaseLifecycleApi.signAgreement({
        agreementId: agreement.id,
        signatureName: name,
        role: 'tenant',
        deviceMetadata: ua,
      });
      toast.success('Agreement signed! A copy has been saved to your Documents.');
      onSigned(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Signing failed. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const pgName = ownerPaymentInfo.pgName || property?.name || 'your property manager';

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Left gradient panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 50%, #0891B2 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">RentCare</span>
          </div>
          <FileText className="w-10 h-10 text-white/60 mb-5" />
          <h1 className="text-3xl font-bold leading-snug mb-4">Review Your<br />Agreement</h1>
          <p className="text-white/75 text-sm leading-relaxed mb-10">
            Please read and sign your rental agreement with {pgName}. This is a legally binding document.
          </p>
          <ul className="space-y-4">
            {['Review all terms carefully', 'Your e-signature is legally valid', 'A copy is saved to your Documents'].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-white/50">Step {step === 'read' ? '1' : '2'} of 2 — {step === 'read' ? 'Read Agreement' : 'Sign Agreement'}</p>
          <div className="flex gap-2">
            <div className="h-1 flex-1 rounded-full bg-white/80" />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'sign' ? 'bg-white/80' : 'bg-white/25'}`} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col">
        {step === 'read' ? (
          <>
            <div className="px-6 lg:px-8 py-4 lg:py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base lg:text-lg font-bold text-gray-900">Rental Agreement</h2>
                <p className="text-xs text-gray-500 mt-0.5">{pgName} · From {fmtDate(agreement.startDate)}</p>
              </div>
              {agreement.htmlContent && (
                <button onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {agreement.htmlContent ? (
                <iframe
                  srcDoc={agreement.htmlContent}
                  className="w-full h-full border-0"
                  title="Rental Agreement"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Agreement document not available for preview.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 lg:px-8 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <button onClick={onDismiss} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
                I'll review later
              </button>
              <button
                onClick={() => setStep('sign')}
                className="px-5 lg:px-6 py-2.5 lg:py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
              >
                Continue to Sign <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 lg:p-8">
            <div className="w-full max-w-md space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign Agreement</h2>
                <p className="text-sm text-gray-500">Confirm your identity and accept the terms to complete signing.</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    {agreement.agreementType === 'license' ? 'License Agreement' : 'Rental Agreement'}
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    {pgName} · {fmtAmount(agreement.monthlyRent)}/month · From {fmtDate(agreement.startDate)}
                  </p>
                  {agreement.ownerSignatureName && (
                    <p className="text-xs text-green-700 mt-1 font-medium">✓ Owner signed by {agreement.ownerSignatureName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Your Full Name (E-Signature)</label>
                <input
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your full name to sign"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">This typed name serves as your electronic signature.</p>
              </div>

              <button
                type="button"
                className="flex items-start gap-3 text-left w-full"
                onClick={() => setAccepted((v) => !v)}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${accepted ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 hover:border-indigo-400'}`}>
                  {accepted && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-600 leading-relaxed">
                  I have read and agree to all terms and conditions in the rental agreement. I understand this e-signature is legally binding.
                </span>
              </button>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep('read')}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => void handleSign()}
                  disabled={signing || !signName.trim() || !accepted}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
                >
                  {signing ? 'Signing…' : 'Sign Agreement ✓'}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">Your signature and timestamp will be recorded securely.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Navigation ────────────────────────────────────────────────────────

const SIDEBAR_SECTIONS = [
  {
    heading: 'OVERVIEW',
    items: [{ id: 'home' as TenantView, label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'FINANCE',
    items: [{ id: 'payments' as TenantView, label: 'Payments', icon: CreditCard }],
  },
  {
    heading: 'OPERATIONS',
    items: [
      { id: 'maintenance' as TenantView, label: 'Maintenance', icon: Wrench },
      { id: 'announcements' as TenantView, label: 'Announcements', icon: Bell },
    ],
  },
  {
    heading: 'MY ACCOUNT',
    items: [
      { id: 'documents' as TenantView, label: 'Documents', icon: FileText },
      { id: 'profile' as TenantView, label: 'My Profile', icon: User },
      { id: 'help' as TenantView, label: 'Help & Rules', icon: HelpCircle },
    ],
  },
];

const BOTTOM_TABS = [
  { id: 'home' as TenantView, label: 'Home', icon: Home },
  { id: 'payments' as TenantView, label: 'Payments', icon: CreditCard },
  { id: 'maintenance' as TenantView, label: 'Repairs', icon: Wrench },
  { id: 'announcements' as TenantView, label: 'Updates', icon: Bell },
  { id: 'profile' as TenantView, label: 'Profile', icon: User },
];

const activeTabFor = (v: TenantView): TenantView => {
  if (v === 'maintenance-new' || v === 'maintenance-detail') return 'maintenance';
  if (v === 'vacate') return 'profile';
  if (v === 'notifications') return 'announcements';
  if (v === 'help') return 'profile';
  return v;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function TenantPortal() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<TenantView>('home');
  const [snapshot, setSnapshot] = useState<TenantPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // In-app Receipt/Invoice Dialog state
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedDocPayment, setSelectedDocPayment] = useState<PaymentRecord | null>(null);

  const handleOpenDocument = (payment: PaymentRecord) => {
    setSelectedDocPayment(payment);
    setDocDialogOpen(true);
  };

  const [notifLastSeen, setNotifLastSeen] = useState<string>(() => {
    if (typeof window === 'undefined') return new Date(0).toISOString();
    return localStorage.getItem(notifSeenKey('__init')) ?? new Date(0).toISOString();
  });

  // Agreement signing state
  const [tenantSignModal, setTenantSignModal] = useState<{ agreement: AgreementRecord } | null>(null);
  const [tenantSignatureName, setTenantSignatureName] = useState('');
  const [tenantSigning, setTenantSigning] = useState(false);
  const [mandatoryAgreement, setMandatoryAgreement] = useState<AgreementRecord | null>(null);

  // Unified onboarding wizard (replaces showWelcome + mandatoryAgreement)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);

  // Sidebar collapse — persisted to localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tenant-sidebar-collapsed') === 'true';
  });
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      localStorage.setItem('tenant-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // UPI copy state
  const [upiCopied, setUpiCopied] = useState(false);
  const copyUpiId = useCallback((id: string) => {
    void navigator.clipboard.writeText(id).then(() => {
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    });
  }, []);

  // Maintenance form state
  const [ticketForm, setTicketForm] = useState({
    category: '', issue: '', description: '',
    priority: 'medium' as MaintenancePriority,
    imageFile: null as File | null,
    imageUploading: false, imageUrl: '', submitting: false,
  });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);

  // Vacate form state
  const [vacateForm, setVacateForm] = useState({ date: '', reason: '', confirm: false, submitting: false });

  const isDemo = getAppMode() === 'demo';

  // ── Initial full load (once on mount) ─────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await getTenantPortalSnapshot();
      setSnapshot(data);

      const storedSeen = localStorage.getItem(notifSeenKey(data.tenant.id)) ?? new Date(0).toISOString();
      setNotifLastSeen(storedSeen);

      // Onboarding wizard logic — only once per device+session
      const key = welcomeKey(data.tenant.id);
      const localSeen = typeof window !== 'undefined' && localStorage.getItem(key) === 'true';
      const pendingAgreement = data.agreements.find((a) => a.status === 'pending_tenant_signature' && !a.tenantSignedAt) ?? null;

      if (!localSeen && !isDemo) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('first_login_completed_at')
          .eq('id', user?.id ?? '')
          .maybeSingle<{ first_login_completed_at: string | null }>();
        if (!profileRow?.first_login_completed_at) {
          // Full onboarding: start from step 1
          setOnboarding({ step: 1, agreement: pendingAgreement });
        } else if (pendingAgreement) {
          // First-login done but agreement arrived later — jump to review
          setOnboarding({ step: 3, agreement: pendingAgreement });
        }
      } else if (!localSeen && isDemo) {
        setOnboarding({ step: 1, agreement: null });
      } else if (pendingAgreement) {
        // Returning login with unsigned agreement
        setOnboarding({ step: 3, agreement: pendingAgreement });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load portal data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  // Ctrl+B → toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  // Guard inactive tenants
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.tenant.status !== 'inactive') return;
    const INACTIVE_ALLOWED: TenantView[] = ['payments', 'documents'];
    if (!INACTIVE_ALLOWED.includes(view)) setView('payments');
  }, [snapshot, view]);

  // ── Realtime — delta-patch per table, no full reload ─────────────────────
  useEffect(() => {
    if (isDemo || !snapshot) return;

    const tenantId = snapshot.tenant.id;
    const propertyId = snapshot.tenant.propertyId;

    const channel = supabase.channel(`tenant-portal-rt-${tenantId}`)

      // Payments: patch on insert or update
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        if (!payload.new) return;
        const updated = payload.new as Record<string, unknown>;
        setSnapshot((prev) => {
          if (!prev) return prev;
          const id = String(updated.id ?? '');
          const existing = prev.payments.find((p) => p.id === id);
          const amount = Number(updated.amount ?? existing?.totalAmount ?? 0);
          // Delta-patch: preserve canonical fields (tenant/room/charges) from the
          // existing snapshot record and only overwrite the slices the realtime
          // payload actually carries.
          const patched: PaymentRecord = {
            ...(existing ?? {
              id,
              tenantId: String(updated.tenant_id ?? prev.tenant.id),
              tenant: prev.tenant.name,
              propertyId: String(updated.property_id ?? prev.tenant.propertyId),
              room: prev.tenant.room,
              monthlyRent: amount,
              extraCharges: 0,
              ownerId: String(updated.owner_id ?? ''),
            } as PaymentRecord),
            id,
            totalAmount: amount,
            dueDate: String(updated.due_date ?? existing?.dueDate ?? ''),
            paidDate: updated.paid_date ? String(updated.paid_date) : (existing?.paidDate ?? ''),
            status: String(updated.status ?? 'pending') as PaymentRecord['status'],
            paymentMode: updated.payment_mode ? String(updated.payment_mode) : existing?.paymentMode,
            referenceNumber: updated.reference_number ? String(updated.reference_number) : existing?.referenceNumber,
            createdAt: String(updated.created_at ?? existing?.createdAt ?? ''),
          };
          const payments = existing
            ? prev.payments.map((p) => p.id === id ? patched : p)
            : [patched, ...prev.payments];
          return { ...prev, payments };
        });
      })

      // Maintenance: patch on insert or update
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tickets', filter: `tenant_id=eq.${tenantId}` }, () => {
        // For maintenance tickets we do a targeted re-fetch to also get threads
        void supabase
          .from('maintenance_tickets')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (!data) return;
            setSnapshot((prev) => {
              if (!prev) return prev;
              const maintenance: MaintenanceTicketRecord[] = data.map((row: Record<string, unknown>, idx: number) => ({
                id: String(row.id ?? ''),
                ticketId: String(row.ticket_id ?? `TKT-${String(idx + 1).padStart(3, '0')}`),
                tenant: prev.tenant.name,
                propertyId: String(row.property_id ?? prev.tenant.propertyId),
                room: prev.tenant.room,
                issue: String(row.issue ?? ''),
                description: String(row.description ?? ''),
                source: String(row.source ?? 'portal') as MaintenanceSource,
                status: String(row.status ?? 'open') as MaintenanceTicketRecord['status'],
                priority: String(row.priority ?? 'medium') as MaintenancePriority,
                date: String(row.created_at ?? ''),
                phone: prev.tenant.phone,
                notes: [],
                threads: [],
              }));
              return { ...prev, maintenance };
            });
          });
      })

      // Announcements: prepend new ones
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (String(row.property_id ?? '') !== propertyId && row.property_id !== null) return;
        setSnapshot((prev) => {
          if (!prev) return prev;
          const newAnn: AnnouncementRecord = {
            id: String(row.id ?? ''),
            title: String(row.title ?? ''),
            content: String(row.content ?? ''),
            category: String(row.category ?? 'general') as AnnouncementRecord['category'],
            date: String(row.created_at ?? ''),
            isPinned: Boolean(row.is_pinned ?? false),
            views: Number(row.views ?? 0),
            sentViaWhatsApp: Boolean(row.sent_via_whatsapp ?? false),
            propertyId: row.property_id ? String(row.property_id) : null,
          };
          return { ...prev, announcements: [newAnn, ...prev.announcements] };
        });
      })

      // Notifications: prepend new ones
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const msg = String(row.message ?? '');
        const title = String(row.title ?? '');
        const type = String(row.type ?? '');
        if (type !== 'announcement' && type !== 'system' && !msg.includes(snapshot.tenant.name) && !title.includes(snapshot.tenant.name)) return;
        setSnapshot((prev) => {
          if (!prev) return prev;
          const newNotif: NotificationRecord = {
            id: String(row.id ?? ''),
            ownerId: String(row.owner_id ?? ''),
            propertyId: row.property_id ? String(row.property_id) : undefined,
            type: type as NotificationRecord['type'],
            title,
            message: msg,
            read: Boolean(row.read ?? false),
            createdAt: String(row.created_at ?? ''),
          };
          return { ...prev, notifications: [newNotif, ...prev.notifications].slice(0, 50) };
        });
      })

      // Tenant row updates (status, room, rent changes)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` }, () => {
        // Full reload only when the tenant's own record changes
        void load();
      })

      // Agreements
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements', filter: `tenant_id=eq.${tenantId}` }, () => {
        void supabaseLifecycleApi.getAgreements(tenantId)
          .then((agreements) => {
            setSnapshot((prev) => prev ? { ...prev, agreements } : prev);
          })
          .catch(() => {});
      })

      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Silent fallback: do not trigger reload on connection issues
        }
      });

    // 90-second fallback polling only if realtime has been completely silent
    const lastRefreshRef = { current: Date.now() };
    const fallbackTimer = setInterval(() => {
      if (Date.now() - lastRefreshRef.current >= 90_000) {
        lastRefreshRef.current = Date.now();
        void load();
      }
    }, 90_000);

    return () => {
      clearInterval(fallbackTimer);
      void supabase.removeChannel(channel);
    };
  }, [snapshot?.tenant.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values ────────────────────────────────────────────────────────
  const pendingPayments = useMemo(() => (snapshot?.payments ?? []).filter((p) => p.status !== 'paid'), [snapshot]);
  const openTickets = useMemo(() => (snapshot?.maintenance ?? []).filter((t) => t.status !== 'resolved' && t.status !== 'closed'), [snapshot]);
  const pinnedAnnouncements = useMemo(() => (snapshot?.announcements ?? []).filter((a) => a.isPinned), [snapshot]);
  const detailTicket = useMemo(() => snapshot?.maintenance.find((t) => t.id === detailTicketId) ?? null, [snapshot, detailTicketId]);
  const tenantUnreadCount = useMemo(
    () => (snapshot?.notifications ?? []).filter((n) => n.createdAt > notifLastSeen).length,
    [snapshot, notifLastSeen],
  );
  const paidPayments = useMemo(() => (snapshot?.payments ?? []).filter((p) => p.status === 'paid'), [snapshot]);

  // ── Onboarding wizard advance / dismiss ────────────────────────────────────
  const handleOnboardingAdvance = useCallback(() => {
    setOnboarding((prev) => {
      if (!prev) return null;
      const { step, agreement } = prev;
      const totalSteps: number = agreement ? 4 : 2;
      if (step < totalSteps) {
        // Skip step 3/4 if no agreement
        const next = (step + 1) as 1 | 2 | 3 | 4;
        return { ...prev, step: next };
      }
      return null; // done
    });
  }, []);

  const handleOnboardingDismiss = useCallback(() => {
    if (snapshot) localStorage.setItem(welcomeKey(snapshot.tenant.id), 'true');
    if (user?.id && !isDemo) {
      (async () => { try { await supabase.from('profiles').update({ first_login_completed_at: new Date().toISOString() }).eq('id', user.id); } catch {} })();
    }
    setOnboarding(null);
  }, [snapshot, user?.id, isDemo]);

  // Fired when step 1 or 2 completes — mark first login done on step 2 exit
  const handleOnboardingStepComplete = useCallback((step: number) => {
    if (step === 2) {
      if (snapshot) localStorage.setItem(welcomeKey(snapshot.tenant.id), 'true');
      if (user?.id && !isDemo) {
        (async () => { try { await supabase.from('profiles').update({ first_login_completed_at: new Date().toISOString() }).eq('id', user.id); } catch {} })();
      }
    }
    handleOnboardingAdvance();
  }, [snapshot, user?.id, isDemo, handleOnboardingAdvance]);

  // ── Maintenance submit ─────────────────────────────────────────────────────
  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    const issueFull = ticketForm.category ? `${ticketForm.category}: ${ticketForm.issue}` : ticketForm.issue;
    if (!ticketForm.issue.trim() || !ticketForm.description.trim()) return;
    setTicketForm((f) => ({ ...f, submitting: true }));
    try {
      const newTicket = await createTenantMaintenanceTicket({
        issue: issueFull.trim(),
        description: ticketForm.description.trim(),
        priority: ticketForm.priority,
        imageUrl: ticketForm.imageUrl || undefined,
      });
      // Optimistic update
      setSnapshot((prev) => prev ? { ...prev, maintenance: [newTicket, ...prev.maintenance] } : prev);
      setTicketForm({ category: '', issue: '', description: '', priority: 'medium', imageFile: null, imageUploading: false, imageUrl: '', submitting: false });
      setView('maintenance');
      toast.success('Request submitted.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request.');
      setTicketForm((f) => ({ ...f, submitting: false }));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB.'); return; }
    setTicketForm((f) => ({ ...f, imageFile: file, imageUploading: true }));
    try {
      const url = isDemo ? URL.createObjectURL(file) : await supabaseTenantDataApi.uploadMaintenanceImage(file);
      setTicketForm((f) => ({ ...f, imageUrl: url, imageUploading: false }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image upload failed.');
      setTicketForm((f) => ({ ...f, imageFile: null, imageUploading: false }));
    }
  };

  // ── Vacate submit ──────────────────────────────────────────────────────────
  const submitVacate = async (e: FormEvent) => {
    e.preventDefault();
    if (!vacateForm.date || !vacateForm.confirm) return;
    setVacateForm((f) => ({ ...f, submitting: true }));
    try {
      await submitTenantVacateRequest({ vacateDate: vacateForm.date, reason: vacateForm.reason });
      await load();
      setView('profile');
      toast.success('Vacate notice submitted. Your manager has been notified.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit notice.');
    } finally {
      setVacateForm((f) => ({ ...f, submitting: false }));
    }
  };

  // ── Agreement signing ──────────────────────────────────────────────────────
  const handleTenantSign = async () => {
    if (!tenantSignModal) return;
    const name = tenantSignatureName.trim();
    if (!name) { toast.error('Please provide your name.'); return; }
    setTenantSigning(true);
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      const updated = await supabaseLifecycleApi.signAgreement({
        agreementId: tenantSignModal.agreement.id,
        signatureName: name,
        role: 'tenant',
        deviceMetadata: ua,
      });
      setSnapshot((prev) => prev ? {
        ...prev,
        agreements: prev.agreements.map((a) => a.id === updated.id ? updated : a),
      } : prev);
      setTenantSignModal(null);
      setTenantSignatureName('');
      toast.success('Agreement signed successfully!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Signing failed');
    } finally {
      setTenantSigning(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render guards
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (err && !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-sm text-gray-700 mb-4">{err}</p>
          <button onClick={() => void load()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const { tenant, property, owner, ownerPaymentInfo, payments, maintenance, announcements, notifications, vacateRequest, documents, agreements } = snapshot;

  if (tenant.status === 'archived') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Deactivated</h2>
          <p className="text-sm text-gray-500 mb-6">Your tenant account has been archived. Please contact your property manager for assistance.</p>
          <button onClick={() => { void logout(); }} className="w-full py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isInactiveTenant = tenant.status === 'inactive';
  const visibleSidebarSections = isInactiveTenant
    ? SIDEBAR_SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter((i) => ['payments', 'documents'].includes(i.id)),
      })).filter((s) => s.items.length > 0)
    : SIDEBAR_SECTIONS;

  // ─── View: Home ────────────────────────────────────────────────────────────
  const currentPayment = pendingPayments[0] ?? null;

  const viewHome = (
    <div className="space-y-6 pb-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting()}, {tenant.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">
          {ownerPaymentInfo.pgName || property?.name} · Room {tenant.room}{tenant.bed ? `, Bed ${tenant.bed}` : ''}{tenant.floor ? ` · Floor ${tenant.floor}` : ''}
        </p>
      </div>

      {/* Pending Agreement Banner */}
      {agreements.some((a) => a.status === 'pending_tenant_signature' && !a.tenantSignedAt) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Agreement Pending Your Signature</p>
              <p className="text-xs text-blue-700 mt-0.5">Your rental agreement is ready. Please review and sign to complete your onboarding.</p>
            </div>
          </div>
          <button
            onClick={() => {
              const pending = agreements.find((a) => a.status === 'pending_tenant_signature' && !a.tenantSignedAt);
              if (pending) setMandatoryAgreement(pending);
            }}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            Review & Sign
          </button>
        </div>
      )}

      {/* 4 KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-5 border-l-4 border-l-purple-500">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-2">Monthly Rent</p>
              <p className="text-2xl font-bold text-gray-900">{fmtAmount(tenant.rent)}</p>
              <p className="text-xs text-gray-400 mt-1.5">Due on {tenant.rentDueDate}th every month</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 ml-3">
              <Home className="w-5 h-5 text-rose-400" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 border-l-4 border-l-amber-400">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-2">
                {new Date().toLocaleDateString('en-IN', { month: 'long' })} Status
              </p>
              {currentPayment ? (
                <>
                  <p className="text-2xl font-bold text-amber-600">{fmtAmount(currentPayment.totalAmount)} Due</p>
                  <p className="text-xs text-gray-400 mt-1.5">Due by {fmtDate(currentPayment.dueDate)}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-green-600">All Clear</p>
                  <p className="text-xs text-gray-400 mt-1.5">No pending payments</p>
                </>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 ml-3">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-2">Security Deposit</p>
              <p className="text-2xl font-bold text-gray-900">{fmtAmount(tenant.securityDeposit)}</p>
              <p className="text-xs text-gray-400 mt-1.5">Active tenancy</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 ml-3">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 border-l-4 border-l-blue-400">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-2">Staying Since</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(tenant.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400 mt-1.5">{stayingSince(tenant.joinDate)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ml-3">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Rent Status + Caretaker Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Rent Status</h3>
            {currentPayment ? (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">Pending</span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-700 rounded-full">Paid</span>
            )}
          </div>
          {currentPayment ? (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                <p className="text-xl font-bold text-amber-600">{fmtAmount(currentPayment.totalAmount)}</p>
                <p className="text-xs text-amber-600 mt-0.5">Due by {fmtDate(currentPayment.dueDate)}</p>
              </div>

              {/* QR code (if owner uploaded one) */}
              {ownerPaymentInfo.qrCodeUrl && (
                <div className="mb-3 flex flex-col items-center gap-2">
                  <img
                    src={ownerPaymentInfo.qrCodeUrl}
                    alt="Payment QR Code"
                    className="w-36 h-36 rounded-xl border border-gray-200 object-contain"
                  />
                  <p className="text-xs text-gray-400">Scan with any UPI app</p>
                </div>
              )}

              {ownerPaymentInfo.upiId && (
                <div className="space-y-2">
                  {/* UPI deep-link button (works on mobile) */}
                  <a
                    href={buildUpiLink(ownerPaymentInfo.upiId, currentPayment.totalAmount, owner?.name ?? 'Manager', paymentMonth(currentPayment)) ?? '#'}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #4F46E5, #5B21B6)' }}
                  >
                    <IndianRupee className="w-4 h-4" /> Pay via UPI
                  </a>
                  {/* Copy UPI ID */}
                  <button
                    onClick={() => copyUpiId(ownerPaymentInfo.upiId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {upiCopied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {upiCopied ? 'Copied!' : `Copy UPI ID: ${ownerPaymentInfo.upiId}`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">No pending payments</p>
            </div>
          )}
        </div>

        {(ownerPaymentInfo.ownerPhone || owner?.phone) ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Caretaker Contact</h3>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-700 flex-shrink-0">
                {(owner?.name ?? 'M').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{owner?.name ?? 'Property Manager'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ownerPaymentInfo.ownerPhone || owner?.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`tel:${ownerPaymentInfo.ownerPhone || owner?.phone}`}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call
              </a>
              <a
                href={`https://wa.me/${(ownerPaymentInfo.ownerPhone || owner?.phone || '').replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 border border-green-200 rounded-xl text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400">
            <Phone className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No contact info available</p>
          </div>
        )}
      </div>

      {/* Recent Announcements + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-900">Recent Announcements</h3>
            <button onClick={() => setView('announcements')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="flex gap-3 border-l-[3px] border-indigo-300 pl-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md capitalize ${
                        a.category === 'payment' ? 'bg-green-100 text-green-700'
                        : a.category === 'maintenance' ? 'bg-orange-100 text-orange-700'
                        : a.category === 'rules' ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>{a.category}</span>
                      <span className="text-xs text-gray-400">{fmtDate(a.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{a.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No announcements yet.</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Quick Access</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setView('payments')} className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-indigo-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Payments</span>
              {pendingPayments.length > 0
                ? <span className="text-xs text-amber-600 font-medium">{pendingPayments.length} pending</span>
                : <span className="text-xs text-gray-400">All clear</span>}
            </button>
            <button onClick={() => setView('documents')} className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Documents</span>
              <span className="text-xs text-gray-400">{documents.length} files</span>
            </button>
            <button onClick={() => setView('maintenance-new')} className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">New Request</span>
              {openTickets.length > 0
                ? <span className="text-xs text-orange-600 font-medium">{openTickets.length} open</span>
                : <span className="text-xs text-gray-400">No open tickets</span>}
            </button>
            <button onClick={() => setView('announcements')} className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Announcements</span>
              {tenantUnreadCount > 0
                ? <span className="text-xs text-indigo-600 font-medium">{tenantUnreadCount} new</span>
                : <span className="text-xs text-gray-400">All read</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── View: Payments ─────────────────────────────────────────────────────────
  const viewPayments = (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">View your payment history and manage pending payments</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <CreditCard className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {fmtAmount(paidPayments.reduce((s, p) => s + p.totalAmount, 0))}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <IndianRupee className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {fmtAmount(pendingPayments.reduce((s, p) => s + p.totalAmount, 0))}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500">Security Deposit</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{fmtAmount(tenant.securityDeposit)}</p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Month</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Base Rent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Extra Charges</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Paid On</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">No payment records yet.</p>
                  </td>
                </tr>
              )}
              {payments.map((p) => {
                // Base rent + extras derived from fields present on every PaymentRecord
                // (demo and live). Avoids depending on the partial `amount` field that
                // only the realtime delta-patch populates.
                const baseRent = p.monthlyRent ?? p.totalAmount;
                const extras = p.totalAmount - baseRent;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{paymentMonth(p)}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtAmount(baseRent)}</td>
                    <td className="px-4 py-3 text-gray-500">{extras > 0 ? fmtAmount(extras) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmtAmount(p.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.dueDate)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.paidDate ? fmtDate(p.paidDate) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.paymentMode?.toUpperCase() || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}>
                        {p.status === 'paid' ? 'Paid' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.status !== 'paid' && ownerPaymentInfo.upiId ? (
                        <a
                          href={buildUpiLink(ownerPaymentInfo.upiId, p.totalAmount, owner?.name ?? 'Manager', paymentMonth(p)) ?? '#'}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #4F46E5, #5B21B6)' }}
                        >
                          Pay Now
                        </a>
                      ) : p.status === 'paid' ? (
                        <button
                          onClick={() => handleOpenDocument(p)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Receipt
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── View: Maintenance list ─────────────────────────────────────────────────
  const viewMaintenance = (
    <div className="space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your maintenance requests</p>
        </div>
        <button
          onClick={() => setView('maintenance-new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #5B21B6)' }}
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <Wrench className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{maintenance.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{openTickets.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs text-gray-500">Resolved</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {maintenance.filter((t) => t.status === 'resolved' || t.status === 'closed').length}
          </p>
        </div>
      </div>

      {/* Maintenance table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {maintenance.length === 0 ? (
          <div className="text-center py-14">
            <Wrench className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400 mb-3">No maintenance requests yet.</p>
            <button onClick={() => setView('maintenance-new')} className="text-indigo-600 text-sm font-medium">
              Raise your first request →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Ticket ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {maintenance.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => { setDetailTicketId(t.id); setView('maintenance-detail'); }}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-indigo-600 font-semibold text-xs">TKT{String(idx + 1).padStart(4, '0')}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.issue}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs">
                      <p className="line-clamp-1">{t.description}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        t.priority === 'high' ? 'bg-red-100 text-red-700'
                        : t.priority === 'medium' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(t.status)}`}>
                        {t.status === 'in-progress' ? 'In Progress' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(t.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── View: Maintenance detail ───────────────────────────────────────────────
  const viewMaintenanceDetail = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('maintenance')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Request Details</h1>
      </div>
      {detailTicket ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">{detailTicket.issue}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusBadge(detailTicket.status)}`}>{detailTicket.status}</span>
            </div>
            <p className="text-sm text-gray-600">{detailTicket.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
              <span>{fmtDate(detailTicket.date)}</span>
              <span className={`font-medium ${detailTicket.priority === 'high' ? 'text-red-600' : detailTicket.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'}`}>
                {detailTicket.priority} priority
              </span>
            </div>
          </div>
          {(detailTicket.threads?.length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl">
              <p className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">Updates from Manager</p>
              <div className="divide-y divide-gray-100">
                {detailTicket.threads!.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">{entry.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(detailTicket.status === 'resolved' || detailTicket.status === 'closed') && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" /> This request has been {detailTicket.status}.
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">Ticket not found.</p>
      )}
    </div>
  );

  // ── View: New Maintenance Form ─────────────────────────────────────────────
  const viewMaintenanceNew = (
    <div className="space-y-5 pb-8">
      <div>
        <button onClick={() => setView('maintenance')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Maintenance Request</h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <form onSubmit={(e) => void submitTicket(e)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-800">Issue Title *</label>
            <input value={ticketForm.issue} onChange={(e) => setTicketForm((f) => ({ ...f, issue: e.target.value }))}
              className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g., AC not cooling properly" maxLength={120} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-800">Description *</label>
            <textarea value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Describe the issue in detail..." rows={4} maxLength={800} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-800">Priority *</label>
            <div className="flex gap-3">
              {(['low', 'medium', 'high'] as MaintenancePriority[]).map((p) => (
                <button key={p} type="button" onClick={() => setTicketForm((f) => ({ ...f, priority: p }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                    ticketForm.priority === p
                      ? p === 'high' ? 'border-red-500 bg-red-500 text-white'
                        : p === 'medium' ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-800">Photo (Optional)</label>
            {ticketForm.imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={ticketForm.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                <button type="button" onClick={() => setTicketForm((f) => ({ ...f, imageUrl: '', imageFile: null }))} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ) : (
              <button type="button" disabled={ticketForm.imageUploading} onClick={() => imageInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors disabled:opacity-50">
                {ticketForm.imageUploading
                  ? <><div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /><span className="text-sm">Uploading…</span></>
                  : <><Upload className="w-6 h-6" /><span className="text-sm font-medium">Click to upload or drag and drop</span><span className="text-xs">Optional — add a photo of the issue</span></>}
              </button>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageChange(e)} />
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">We typically respond within 24 hours. You'll get a WhatsApp update when status changes.</p>
          </div>

          <button type="submit" disabled={ticketForm.submitting || ticketForm.imageUploading}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #5B21B6)' }}>
            {ticketForm.submitting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
              : 'Submit Request →'}
          </button>
        </form>
      </div>
    </div>
  );

  // ── View: Announcements ────────────────────────────────────────────────────
  const viewAnnouncements = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Announcements</h1>
        {tenantUnreadCount > 0 && (
          <button
            onClick={() => { const now = new Date().toISOString(); localStorage.setItem(notifSeenKey(tenant.id), now); setNotifLastSeen(now); }}
            className="text-xs bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-full hover:bg-indigo-700"
          >
            {tenantUnreadCount} new
          </button>
        )}
      </div>

      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pinned</p>
          {pinnedAnnouncements.map((a) => (
            <div key={a.id} className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 bg-red-200 text-red-800 rounded-full flex-shrink-0">Pinned</span>
                <p className="text-sm font-semibold text-red-900">{a.title}</p>
              </div>
              <p className="text-sm text-red-800 mt-1">{a.content}</p>
              <p className="text-xs text-red-500 mt-2">{fmtDate(a.date)}</p>
            </div>
          ))}
        </div>
      )}

      {announcements.filter((a) => !a.isPinned).map((a) => (
        <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
              a.category === 'payment' ? 'bg-green-100 text-green-700'
              : a.category === 'maintenance' ? 'bg-orange-100 text-orange-700'
              : a.category === 'rules' ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
            }`}>{a.category}</span>
          </div>
          <p className="text-sm text-gray-600">{a.content}</p>
          <p className="text-xs text-gray-400 mt-2">{fmtDate(a.date)}</p>
        </div>
      ))}

      {announcements.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No announcements yet.</p>
        </div>
      )}
    </div>
  );

  // ── View: Documents ────────────────────────────────────────────────────────
  const ID_PROOF_TYPES = ['aadhaar_front', 'aadhaar_back', 'pan', 'passport', 'driving_license', 'photo'];
  const DOC_TYPE_DISPLAY: Record<string, string> = {
    aadhaar_front: 'Aadhaar (Front)', aadhaar_back: 'Aadhaar (Back)',
    pan: 'PAN Card', passport: 'Passport', driving_license: 'Driving License',
    photo: 'Profile Photo', other: 'Document',
  };
  const idProofDocs = documents.filter((d) => ID_PROOF_TYPES.includes(d.docType));
  const otherDocs = documents.filter((d) => !ID_PROOF_TYPES.includes(d.docType) && d.docType !== 'agreement' && d.docType !== 'receipt');

  const viewDocuments = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
      </div>

      {/* 1. Agreements */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Agreements</p>
            <p className="text-xs text-gray-500">{agreements.length} agreement{agreements.length !== 1 ? 's' : ''}</p>
          </div>
          {agreements.some((a) => a.status === 'pending_tenant_signature') && (
            <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Action Required</span>
          )}
        </div>
        {agreements.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No agreements available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {agreements.map((ag) => {
              const needsSign = ag.status === 'pending_tenant_signature' && !ag.tenantSignedAt;
              const isExecuted = ag.status === 'executed';
              const statusLabel: Record<string, string> = {
                draft: 'Draft', pending_owner_signature: 'Awaiting Owner',
                pending_tenant_signature: 'Sign Required', executed: 'Executed ✓',
                sent: 'Sent', signed: 'Signed', expired: 'Expired', archived: 'Archived', cancelled: 'Cancelled',
              };
              return (
                <div key={ag.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ag.agreementType === 'license' ? 'License Agreement' : ag.agreementType}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${needsSign ? 'text-blue-600' : isExecuted ? 'text-green-600' : 'text-gray-500'}`}>
                        {statusLabel[ag.status] ?? ag.status} · {new Date(ag.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {needsSign && (
                        <button
                          onClick={() => { setTenantSignModal({ agreement: ag }); setTenantSignatureName(tenant.name); }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Sign Now
                        </button>
                      )}
                      {ag.htmlContent && (
                        <button
                          onClick={() => { const win = window.open('', '_blank', 'width=900,height=700'); if (win && ag.htmlContent) { win.document.write(ag.htmlContent); win.document.close(); } }}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Download className="w-3.5 h-3.5" /> View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Receipts — only paid payments */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Receipts</p>
          <p className="text-xs text-gray-500">{paidPayments.length} paid payment{paidPayments.length !== 1 ? 's' : ''}</p>
        </div>
        {paidPayments.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No receipts yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paidPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{paymentMonth(p)}</p>
                  <p className="text-xs text-gray-500">{fmtAmount(p.totalAmount)} · {fmtDate(p.paidDate)}</p>
                </div>
                <button
                  onClick={() => handleOpenDocument(p)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" /> Receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Identity Documents */}
      {(tenant.idDocumentUrl || idProofDocs.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Identity Documents</p>
          </div>
          <div className="divide-y divide-gray-100">
            {tenant.idDocumentUrl && (
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-gray-900">{tenant.idType || 'ID Document'} {tenant.idNumber ? `· ${tenant.idNumber}` : ''}</p>
                <a href={tenant.idDocumentUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            )}
            {idProofDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-900">{doc.label || DOC_TYPE_DISPLAY[doc.docType] || doc.docType}</p>
                  <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Other Files */}
      {otherDocs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Other Files</p>
          </div>
          <div className="divide-y divide-gray-100">
            {otherDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-900">{doc.label || DOC_TYPE_DISPLAY[doc.docType] || doc.docType}</p>
                  <p className="text-xs text-gray-400">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── View: Profile ──────────────────────────────────────────────────────────
  const viewProfile = (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">View your personal and tenancy information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}>
              {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{tenant.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active Tenant</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Phone Number</p>
                <p className="text-sm text-indigo-600 font-medium">{tenant.phone ? `+${tenant.phone.replace(/^\+/, '')}` : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-indigo-600 font-medium">Email Address</p>
                <p className="text-sm text-indigo-600 font-medium">{user?.email || tenant.email || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Room & Tenancy */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Room & Tenancy Details</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              { label: 'Property', value: property?.name },
              { label: 'Room', value: tenant.room },
              { label: 'Bed', value: tenant.bed ? `Bed ${tenant.bed}` : '—' },
              { label: 'Floor', value: tenant.floor ? `Floor ${tenant.floor}` : '—' },
              { label: 'Monthly Rent', value: fmtAmount(tenant.rent) },
              { label: 'Security Deposit', value: fmtAmount(tenant.securityDeposit) },
              { label: 'Due Date', value: `${tenant.rentDueDate}th of every month` },
              { label: 'Joined', value: fmtDate(tenant.joinDate) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Emergency Contact</h3>
          {(tenant.parentName || tenant.parentPhone) ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact Name</p>
                <p className="font-semibold text-gray-900">{tenant.parentName} {tenant.guardianRelationship ? `(${tenant.guardianRelationship})` : ''}</p>
              </div>
              {tenant.parentPhone && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Contact Number</p>
                  <a href={`tel:${tenant.parentPhone}`} className="font-semibold text-gray-900">+{tenant.parentPhone.replace(/^\+/, '')}</a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No emergency contact added.</p>
          )}
        </div>

        {/* Verification */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Verification</h3>
          {(tenant.idType || tenant.idNumber) ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {tenant.idType && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">ID Type</p>
                  <p className="font-semibold text-gray-900">{tenant.idType}</p>
                </div>
              )}
              {tenant.idNumber && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">ID Number</p>
                  <p className="font-semibold text-gray-900 font-mono tracking-wider">
                    XXXX XXXX {tenant.idNumber.slice(-4)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No verification documents uploaded.</p>
          )}
        </div>
      </div>

      {/* Vacate section */}
      {vacateRequest ? (
        <div className={`rounded-xl p-4 border ${
          vacateRequest.status === 'pending' ? 'bg-amber-50 border-amber-200'
          : vacateRequest.status === 'confirmed' ? 'bg-blue-50 border-blue-200'
          : 'bg-green-50 border-green-200'
        }`}>
          <p className="text-sm font-semibold text-gray-900">Vacate Notice Submitted</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Planned move-out: {fmtDate(vacateRequest.plannedVacateDate)} · Status: <strong>{vacateRequest.status}</strong>
          </p>
        </div>
      ) : (
        ['active', 'payment_overdue'].includes(tenant.status) && (
          <button
            onClick={() => setView('vacate')}
            className="w-full py-3 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            Submit Vacate Notice
          </button>
        )
      )}

      <button
        onClick={() => { void logout(); }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors w-full"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );

  // ── View: Help & Rules ─────────────────────────────────────────────────────
  const viewHelp = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('home')} className="p-1.5 hover:bg-gray-100 rounded-lg lg:hidden">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Help & Rules</h1>
      </div>

      {ownerPaymentInfo.pgRules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">House Rules</p>
            <p className="text-xs text-gray-500">{ownerPaymentInfo.pgRules.length} rules</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {ownerPaymentInfo.pgRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700">{rule}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ownerPaymentInfo.pgRules.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No house rules have been added yet.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Contact Support</p>
        {ownerPaymentInfo.ownerPhone && (
          <a href={`tel:${ownerPaymentInfo.ownerPhone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
            <Phone className="w-4 h-4 text-gray-400" /> {ownerPaymentInfo.ownerPhone}
          </a>
        )}
        {owner?.email && (
          <a href={`mailto:${owner.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
            <MapPin className="w-4 h-4 text-gray-400" /> {owner.email}
          </a>
        )}
      </div>
    </div>
  );

  // ── View: Vacate ──────────────────────────────────────────────────────────
  const minVacateDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  const viewVacate = (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('profile')} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Submit Vacate Notice</h1>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Please read before submitting</p>
          <p className="text-xs text-amber-700 mt-1">
            Submitting this notice will alert your property manager. A minimum of 7 days notice is required.
          </p>
        </div>
      </div>
      <form onSubmit={(e) => void submitVacate(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Planned Move-Out Date *</label>
          <input type="date" value={vacateForm.date} min={minVacateDate}
            onChange={(e) => setVacateForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea value={vacateForm.reason} onChange={(e) => setVacateForm((f) => ({ ...f, reason: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="e.g. Relocating to another city for work" rows={3} maxLength={400} />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={vacateForm.confirm} onChange={(e) => setVacateForm((f) => ({ ...f, confirm: e.target.checked }))}
            className="w-4 h-4 mt-0.5 accent-red-600" />
          <span className="text-sm text-gray-700">
            I understand this notice is final. My manager will be notified immediately.
          </span>
        </label>
        <button type="submit" disabled={!vacateForm.date || !vacateForm.confirm || vacateForm.submitting}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
          {vacateForm.submitting ? 'Submitting…' : 'Submit Vacate Notice'}
        </button>
      </form>
    </div>
  );

  // ── View router ────────────────────────────────────────────────────────────
  const renderView = () => {
    switch (view) {
      case 'home': return viewHome;
      case 'payments': return viewPayments;
      case 'maintenance': return viewMaintenance;
      case 'maintenance-new': return viewMaintenanceNew;
      case 'maintenance-detail': return viewMaintenanceDetail;
      case 'announcements': return viewAnnouncements;
      case 'notifications': return viewAnnouncements;
      case 'documents': return viewDocuments;
      case 'profile': return viewProfile;
      case 'help': return viewHelp;
      case 'vacate': return viewVacate;
      default: return viewHome;
    }
  };

  const activeNavTab = activeTabFor(view);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {onboarding && !isInactiveTenant && (
        <OnboardingWizard
          state={onboarding}
          snapshot={snapshot}
          onAdvance={() => handleOnboardingStepComplete(onboarding.step)}
          onSigned={(updated) => {
            setSnapshot((prev) => prev ? {
              ...prev,
              agreements: prev.agreements.map((a) => a.id === updated.id ? updated : a),
            } : prev);
            handleOnboardingDismiss();
          }}
          onDismiss={handleOnboardingDismiss}
        />
      )}

      {/* Agreement signing modal */}
      {tenantSignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Sign Agreement</h3>
            <p className="text-xs text-gray-500">By typing your name below you are electronically signing this agreement.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                value={tenantSignatureName}
                onChange={(e) => setTenantSignatureName(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your full name"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setTenantSignModal(null); setTenantSignatureName(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => void handleTenantSign()} disabled={tenantSigning || !tenantSignatureName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                {tenantSigning ? 'Signing…' : 'Sign Agreement'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">

        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'}`}
        >
          {/* Header — logo + collapse toggle integrated */}
          <div className={`border-b border-gray-100 flex items-center flex-shrink-0 ${sidebarCollapsed ? 'justify-center px-0 py-4' : 'justify-between px-4 py-4'}`}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight">RentCare</p>
                  <p className="text-[11px] text-gray-400 leading-tight">Tenant Portal</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <button
              onClick={toggleSidebar}
              title="Toggle sidebar (Ctrl+B)"
              className={`p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Expand sidebar (Ctrl+B)"
              className="mx-auto mt-2 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {/* Tenant identity */}
          {!sidebarCollapsed ? (
            <div className="px-3 pt-2 pb-2">
              <div className="rounded-xl px-3 py-3 text-white" style={{ background: 'linear-gradient(135deg, #5B21B6 0%, #4F46E5 100%)' }}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight truncate">{tenant.name}</p>
                    <p className="text-[11px] text-white/70 truncate">Room {tenant.room}{tenant.bed ? `, Bed ${tenant.bed}` : ''}</p>
                  </div>
                </div>
                <p className="text-[11px] text-white/60 truncate">{ownerPaymentInfo.pgName || property?.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center pt-1 pb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}>
                {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>
          )}

          {/* Nav sections */}
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
            {visibleSidebarSections.map((section) => (
              <div key={section.heading}>
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{section.heading}</p>
                )}
                {section.items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeNavTab === id;
                  const badge = id === 'payments' && pendingPayments.length > 0
                    ? pendingPayments.length
                    : id === 'announcements' && tenantUnreadCount > 0
                    ? tenantUnreadCount
                    : null;
                  return (
                    <button
                      key={id}
                      onClick={() => setView(id)}
                      title={sidebarCollapsed ? label : undefined}
                      className={`w-full flex items-center rounded-xl text-sm font-medium transition-all mb-0.5 ${
                        sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                      } ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      {!sidebarCollapsed && (
                        <>
                          <span>{label}</span>
                          {badge !== null && (
                            <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                      {sidebarCollapsed && badge !== null && (
                        <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sign out */}
          <div className={`border-t border-gray-100 p-2 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <button
              onClick={() => { void logout(); }}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
              className={`flex items-center text-sm text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'gap-2.5 px-3 py-2.5 w-full'
              }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative flex flex-col w-64 bg-white h-full z-50 shadow-xl">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">RentCare</p>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {visibleSidebarSections.map((section) => (
                  <div key={section.heading}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">{section.heading}</p>
                    {section.items.map(({ id, label, icon: Icon }) => {
                      const isActive = activeNavTab === id;
                      return (
                        <button
                          key={id}
                          onClick={() => { setView(id); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                            isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
              <div className="px-4 py-4 border-t border-gray-100">
                <button onClick={() => { void logout(); }}
                  className="w-full flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {ownerPaymentInfo.pgName || property?.name || 'RentCare'}
              </span>
              {tenant.room && <span className="text-xs text-gray-500">· Room {tenant.room}</span>}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}>
                {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>
          </header>

          {/* Desktop top bar */}
          <header className="hidden lg:flex bg-white border-b border-gray-100 px-6 py-3.5 items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-800">{ownerPaymentInfo.pgName || property?.name}</span>
              {tenant.room && (
                <>
                  <span className="text-gray-300 mx-1">·</span>
                  <span className="text-gray-600">Room {tenant.room}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('announcements')}
                className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {tenantUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tenantUnreadCount > 9 ? '9+' : tenantUnreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #5B21B6, #4F46E5)' }}>
                  {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{tenant.name}</p>
                  <p className="text-xs text-indigo-500 font-medium leading-tight">tenant</p>
                </div>
              </div>
            </div>
          </header>

          {/* Demo Mode banner */}
          {isDemo && (
            <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-center gap-2 flex-shrink-0">
              <Shield className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <p className="text-xs text-amber-800 font-semibold">
                Demo Mode — sample data only. Nothing you do here is saved to any database.
              </p>
            </div>
          )}

          {/* Inactive banner */}
          {isInactiveTenant && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium truncate">Tenancy ended — payments & documents available</p>
              </div>
              <button onClick={() => { void logout(); }} className="text-xs text-amber-700 underline hover:text-amber-900 shrink-0">Sign out</button>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
            <div className="px-6 lg:px-8 py-6 w-full">
              {renderView()}
            </div>
          </main>

          {/* Mobile bottom tabs */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
            <div className="flex">
              {(isInactiveTenant ? BOTTOM_TABS.filter((t) => ['payments', 'documents'].includes(t.id)) : BOTTOM_TABS).map(({ id, label, icon: Icon }) => {
                const isActive = activeNavTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {id === 'payments' && pendingPayments.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {pendingPayments.length}
                        </span>
                      )}
                      {id === 'announcements' && tenantUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {tenantUnreadCount > 9 ? '9+' : tenantUnreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{label}</span>
                    {isActive && <div className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
      <PaymentDocumentDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        payment={selectedDocPayment}
        propertyName={property?.name ?? ''}
        ownerName={owner?.name}
      />
    </>
  );
}
