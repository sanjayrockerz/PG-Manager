import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Home, LayoutGrid, Mail, Shield } from 'lucide-react';
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

export function OTPLogin({ onSwitchToSignup, portalType, onBack }: OTPLoginProps) {
  const { sendLoginMagicLink, signInWithGoogle, authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const prefilledEmail = params.get('email')?.trim().toLowerCase() ?? '';
    if (prefilledEmail && isValidEmail(prefilledEmail)) {
      setEmail(prefilledEmail);
    }
  }, []);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateEmailInput = (value: string): string => {
    const cleaned = value.trim().toLowerCase();
    if (!cleaned) {
      return 'Email address is required.';
    }
    if (cleaned.length > EMAIL_MAX_LENGTH) {
      return 'Email address is too long.';
    }
    if (!isValidEmail(cleaned)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const validationError = validateEmailInput(cleanEmail);
    if (validationError) {
      setError(validationError);
      return;
    }

    const sent = await sendLoginMagicLink(cleanEmail);
    if (!sent) {
      setError(authError || 'Unable to send sign-in link. Please try again.');
      return;
    }

    setIsSent(true);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const success = await signInWithGoogle();
    if (!success) {
      setError(authError || 'Unable to continue with Google.');
    }
  };

  const meta = portalType ? portalMeta[portalType] : null;
  const PortalIcon = meta?.icon;

  return (
    <div className="min-h-screen bg-[#F0EFFF] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm">
        <div className="p-6 sm:p-8 md:p-10 bg-white">
          {/* Back button */}
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
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                    maxLength={EMAIL_MAX_LENGTH}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span>!</span> {error}
                </p>
              )}

              {isSent && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Sign-in link sent to {email.trim().toLowerCase()}. Open your email and click the link to continue.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? 'Sending link...' : 'Send Magic Link'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E7EB]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isLoading}
                className="w-full py-2.5 border border-[#E5E7EB] text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue with Google
              </button>
            </form>

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
              {meta ? `Sign in to ${meta.label}.` : 'Secure access for owners and teams.'}
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-7">
              Magic-link authentication keeps sign-in simple while preserving role-based workspace routing.
            </p>

            <div className="space-y-3">
              {[
                'Google or email link login',
                'No password reset friction',
                'Works across local and production redirects',
              ].map((benefit) => (
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
