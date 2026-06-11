import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Home, LayoutGrid, Mail, Shield,
  Building2, KeyRound, Send,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { PortalType } from './PortalSelector';

interface OTPLoginProps {
  onSwitchToSignup: () => void;
  portalType?: PortalType;
  onBack?: () => void;
}

const EMAIL_MAX_LENGTH = 254;

// ─── Tenant Portal Login ──────────────────────────────────────────────────────
// Premium split-panel magic-link-only login. No Google, no Phone OTP, no signup.

function TenantLogin({ onBack }: { onBack?: () => void }) {
  const { sendLoginMagicLink, authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  useEffect(() => { if (authError) setError(authError); }, [authError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pre = params.get('email')?.trim().toLowerCase() ?? '';
    if (pre && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pre)) setEmail(pre);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError('Please enter a valid email address.');
      return;
    }
    const sent = await sendLoginMagicLink(cleaned);
    if (sent) {
      setIsSent(true);
    } else {
      // Friendly tenant-specific error
      const raw = authError || '';
      if (raw.toLowerCase().includes('not found') || raw.toLowerCase().includes('user')) {
        setError('No account found for this email. Please contact your property manager to set up your account.');
      } else {
        setError(raw || 'Unable to send sign-in link. Please try again.');
      }
    }
  };

  const features = [
    'Real-time rent tracking and payment history',
    'File maintenance requests in seconds',
    'Instant announcements from your PG',
    'View and sign agreements digitally',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — gradient brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 50%, #0891B2 100%)' }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">RentCare</span>
          </div>

          <h1 className="text-3xl font-bold leading-snug mb-5">
            Your PG, managed<br />beautifully.
          </h1>
          <p className="text-white/75 text-sm leading-relaxed mb-10">
            Track rent, file complaints, get announcements —<br />all from one place.
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

      {/* Right panel — login card */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
            >
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">RentCare</span>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-8 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}

          {!isSent ? (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0891B2, #0EA5E9)' }}
                  >
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Tenant Portal</p>
                    <p className="text-xs text-gray-500">For Residents</p>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome Back</h2>
                <p className="text-lg font-medium text-gray-700 mb-4">Your Stay. Simplified.</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your account is automatically created by your property manager.
                  Enter your registered email to receive a secure sign-in link.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700" htmlFor="tenant-email">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="tenant-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                        maxLength={EMAIL_MAX_LENGTH}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all bg-gray-50 focus:bg-white"
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #4F46E5)' }}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
                  A secure sign-in link will be sent to your email.
                  <br />No password needed.
                </p>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-2.5 mt-5 px-1">
                <KeyRound className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your data is isolated to your tenancy only. Sign-in links expire after 1 hour.
                </p>
              </div>
            </>
          ) : (
            /* ── Sent state ── */
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-5">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-1">
                A sign-in link was sent to
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-6">{email.trim().toLowerCase()}</p>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-left space-y-3 mb-6">
                {[
                  'Open the email from RentCare',
                  'Click the "Sign in to RentCare" button',
                  'You\'ll be taken straight to your portal',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 font-semibold text-xs">
                      {i + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setIsSent(false); setEmail(''); setError(''); }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Owner / Admin Portal Login ───────────────────────────────────────────────

const portalMeta: Record<PortalType, { label: string; desc: string; icon: typeof LayoutGrid; gradient: string }> = {
  owner: {
    label: 'Main Portal',
    desc: 'Owner & Manager Dashboard',
    icon: LayoutGrid,
    gradient: 'from-[#7C3AED] via-[#4F46E5] to-[#312E81]',
  },
  admin: {
    label: 'Admin Portal',
    desc: 'Super Admin Dashboard',
    icon: Shield,
    gradient: 'from-[#EC4899] via-[#BE185D] to-[#831843]',
  },
  tenant: {
    label: 'Tenant Portal',
    desc: 'For Residents',
    icon: Home,
    gradient: 'from-[#0EA5E9] via-[#0284C7] to-[#0D9488]',
  },
};

export function OTPLogin({ onSwitchToSignup, portalType, onBack }: OTPLoginProps) {
  const { sendLoginMagicLink, signInWithGoogle, authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  // Hooks must come before any conditional returns (Rules of Hooks)
  useEffect(() => { if (authError) setError(authError); }, [authError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pre = params.get('email')?.trim().toLowerCase() ?? '';
    if (pre && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pre)) setEmail(pre);
  }, []);

  // ── Tenant portal uses the dedicated premium component ──────────────────────
  if (portalType === 'tenant') {
    return <TenantLogin onBack={onBack} />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError('Please enter a valid email address.');
      return;
    }
    const sent = await sendLoginMagicLink(cleaned);
    if (sent) setIsSent(true);
    else setError(authError || 'Unable to send sign-in link. Please try again.');
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const success = await signInWithGoogle();
    if (!success) setError(authError || 'Unable to continue with Google.');
  };

  const meta = portalType ? portalMeta[portalType] : null;
  const PortalIcon = meta?.icon;

  return (
    <div className="min-h-screen bg-[#F0EFFF] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm">
        <div className="p-6 sm:p-8 md:p-10 bg-white">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#7C3AED] mb-6 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to portal selector
            </button>
          )}

          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta ? `bg-gradient-to-br ${meta.gradient}` : 'bg-[#EEF2FF]'}`}>
              {PortalIcon ? <PortalIcon className="w-5 h-5 text-white" /> : <LayoutGrid className="w-5 h-5 text-[#6366F1]" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{meta ? meta.label : 'RentCare'}</p>
              <p className="text-xs text-slate-500">{meta ? meta.desc : 'Property Operations Cloud'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-slate-900 text-3xl font-semibold mb-2">Sign In</h1>
            <p className="text-sm text-slate-600">Use Google or a secure email magic link.</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="owner-email">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="owner-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    maxLength={EMAIL_MAX_LENGTH}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">! {error}</p>}

              {isSent && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Sign-in link sent to {email.trim().toLowerCase()}. Check your inbox.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Sending…' : 'Send Magic Link'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E5E7EB]" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-500">or</span></div>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isLoading}
                className="w-full py-2.5 border border-[#E5E7EB] text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Continue with Google
              </button>
            </form>

            {/* Only owner portal can self-register */}
            {portalType !== 'admin' && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <button
                  onClick={onSwitchToSignup}
                  className="text-[#6366F1] hover:text-[#4F46E5] font-medium"
                >
                  Create account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`hidden md:flex flex-col justify-between bg-gradient-to-br ${meta?.gradient ?? 'from-[#7C3AED] via-[#4F46E5] to-[#312E81]'} p-10 text-white`}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-4">RentCare Platform</p>
            <h2 className="text-3xl font-semibold leading-tight mb-4">
              {meta ? `Sign in to ${meta.label}.` : 'Secure access for owners and teams.'}
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-7">
              Magic-link authentication keeps sign-in simple while preserving role-based workspace routing.
            </p>
            <div className="space-y-3">
              {['Google or email link login', 'No password reset friction', 'Works across local and production redirects'].map((benefit) => (
                <div key={benefit} className="flex items-start gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 mt-0.5 text-white/60" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Authentication is handled by Supabase with secure session persistence.
          </div>
        </div>
      </div>
    </div>
  );
}
