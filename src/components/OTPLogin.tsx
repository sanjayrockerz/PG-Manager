import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Home, LayoutGrid, Mail, Phone, Shield, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { PortalType } from './PortalSelector';

interface OTPLoginProps {
  onSwitchToSignup: () => void;
  portalType?: PortalType;
  onBack?: () => void;
}

const EMAIL_MAX_LENGTH = 254;

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

const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  return raw.trim();
};

export function OTPLogin({ onSwitchToSignup, portalType, onBack }: OTPLoginProps) {
  const { sendLoginMagicLink, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, signInAsDemo, authError, isLoading } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneToken, setPhoneToken] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const isTenantPortal = portalType === 'tenant';

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const prefilledEmail = params.get('email')?.trim().toLowerCase() ?? '';
    if (prefilledEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefilledEmail)) {
      setEmail(prefilledEmail);
    }
  }, []);

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

  const handlePhoneSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(normalized)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    const sent = await sendPhoneOtp(normalized);
    if (sent) {
      setPhoneStep('verify');
    } else {
      setError(authError || 'Unable to send OTP. Check that Phone Auth is enabled in Supabase.');
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phoneToken.trim() || phoneToken.trim().length < 4) {
      setError('Enter the 6-digit OTP from your SMS.');
      return;
    }
    const success = await verifyPhoneOtp(normalizePhone(phone), phoneToken.trim());
    if (!success) {
      setError(authError || 'Invalid or expired OTP. Try again.');
    }
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
            <p className="text-sm text-slate-600">
              {isTenantPortal ? 'Use your registered email or phone number.' : 'Use Google or a secure email magic link.'}
            </p>
          </div>

          {/* Demo quick-access */}
          <button
            type="button"
            onClick={signInAsDemo}
            className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Try Demo — no login required
          </button>

          {/* Method tabs — only for tenant portal */}
          {isTenantPortal && (
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setError(''); setIsSent(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  loginMethod === 'email' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('phone'); setError(''); setPhoneStep('input'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  loginMethod === 'phone' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Phone className="w-4 h-4" /> Phone OTP
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            {/* Email login */}
            {loginMethod === 'email' && (
              <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
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
            )}

            {/* Phone OTP login */}
            {loginMethod === 'phone' && (
              <>
                {phoneStep === 'input' && (
                  <form onSubmit={(e) => void handlePhoneSend(e)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Mobile Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); if (error) setError(''); }}
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                          placeholder="98765 43210"
                          maxLength={15}
                        />
                      </div>
                      <p className="text-xs text-slate-400">Use the mobile number registered with your PG.</p>
                    </div>

                    {error && <p className="text-sm text-red-600">! {error}</p>}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-[#0284C7] text-white rounded-xl text-sm font-semibold hover:bg-[#0369A1] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Sending OTP…' : 'Send OTP'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </form>
                )}

                {phoneStep === 'verify' && (
                  <form onSubmit={(e) => void handlePhoneVerify(e)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Enter OTP</label>
                      <p className="text-xs text-slate-500">Sent to {normalizePhone(phone)}</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={phoneToken}
                        onChange={(e) => { setPhoneToken(e.target.value.replace(/\D/g, '').slice(0, 6)); if (error) setError(''); }}
                        className="w-full px-3 py-3 text-center text-xl font-mono tracking-[0.4em] border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>

                    {error && <p className="text-sm text-red-600">! {error}</p>}

                    <button
                      type="submit"
                      disabled={isLoading || phoneToken.length < 6}
                      className="w-full py-2.5 bg-[#0284C7] text-white rounded-xl text-sm font-semibold hover:bg-[#0369A1] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? 'Verifying…' : 'Verify & Sign In'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPhoneStep('input'); setPhoneToken(''); setError(''); }}
                      className="w-full text-sm text-slate-500 hover:text-slate-700"
                    >
                      Use a different number
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                onClick={onSwitchToSignup}
                className="text-[#6366F1] hover:text-[#4F46E5] font-medium"
              >
                Create account
              </button>
            </div>
          </div>
        </div>

        <div className={`hidden md:flex flex-col justify-between bg-gradient-to-br ${meta?.gradient ?? 'from-[#7C3AED] via-[#4F46E5] to-[#312E81]'} p-10 text-white`}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-4">RentCare Platform</p>
            <h2 className="text-3xl font-semibold leading-tight mb-4">
              {isTenantPortal
                ? 'Your complete resident experience.'
                : (meta ? `Sign in to ${meta.label}.` : 'Secure access for owners and teams.')}
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-7">
              {isTenantPortal
                ? 'Manage rent payments, raise maintenance requests, and stay updated with property announcements — all in one place.'
                : 'Magic-link authentication keeps sign-in simple while preserving role-based workspace routing.'}
            </p>
            <div className="space-y-3">
              {(isTenantPortal
                ? ['Email or phone OTP sign-in', 'View and pay rent', 'Raise maintenance tickets', 'Access agreements & receipts']
                : ['Google or email link login', 'No password reset friction', 'Works across local and production redirects']
              ).map((benefit) => (
                <div key={benefit} className="flex items-start gap-2 text-sm text-white/80">
                  <Check className="w-4 h-4 mt-0.5 text-white/60" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {isTenantPortal
              ? 'Your data is isolated to your tenancy. Owners cannot access your login.'
              : 'Authentication is handled by Supabase with secure session persistence.'}
          </div>
        </div>
      </div>
    </div>
  );
}
