import { useState, useRef, useEffect } from 'react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, Shield, Lock, Building2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OTPLoginProps {
  onSwitchToSignup: () => void;
}

const OTP_LENGTH = Number((import.meta as any).env?.VITE_SUPABASE_OTP_LENGTH ?? 6);
const EMAIL_MAX_LENGTH = 254;
const OWNER_DEMO_EMAIL = 'owner.demo@pgmanager.app';
const ADMIN_DEMO_EMAIL = 'admin.demo@pgmanager.app';
const TENANT_DEMO_EMAIL = 'tenant.demo@pgmanager.app';
const EMPTY_OTP = Array.from({ length: OTP_LENGTH }, () => '');

export function OTPLogin({ onSwitchToSignup }: OTPLoginProps) {
  const { requestLoginOTP, loginWithOTP, signInWithGoogle, authError, isLoading } = useAuth();
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(EMPTY_OTP);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step, resendTimer]);

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

    const sent = await requestLoginOTP(cleanEmail);
    if (!sent) {
      setError(authError || 'Unable to send OTP. Please try again.');
      return;
    }

    setStep('otp');
    setResendTimer(30);
    setTimeout(() => otpInputs.current[0]?.focus(), 100);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const success = await signInWithGoogle();
    if (!success) {
      setError(authError || 'Unable to continue with Google.');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, OTP_LENGTH);
    if (!/^[0-9]+$/.test(pastedData)) {
      return;
    }

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < OTP_LENGTH) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
    otpInputs.current[nextIndex]?.focus();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('Please enter complete OTP');
      return;
    }

    const success = await loginWithOTP(email.trim().toLowerCase(), otpCode);
    if (success) {
      setStep('success');
      return;
    }

    setError(authError || 'Invalid OTP. Please try again.');
    setOtp([...EMPTY_OTP]);
    otpInputs.current[0]?.focus();
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) {
      return;
    }

    setError('');
    setOtp([...EMPTY_OTP]);

    const sent = await requestLoginOTP(email.trim().toLowerCase());
    if (!sent) {
      setError(authError || 'Unable to resend OTP right now.');
      return;
    }

    setResendTimer(30);
    otpInputs.current[0]?.focus();
  };

  const handleEditEmail = () => {
    setStep('email');
    setOtp([...EMPTY_OTP]);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full">
        {step === 'success' && (
          <div className="max-w-sm mx-auto text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4 border border-[#E5E7EB]">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-slate-900 text-xl font-semibold mb-1">Welcome back</h1>
              <p className="text-sm text-slate-600">Login successful. Redirecting...</p>
            </div>
          </div>
        )}

        {step === 'email' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 sm:p-8 md:p-10 bg-white">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">PG Manager</p>
                  <p className="text-xs text-slate-500">Property Operations Cloud</p>
                </div>
              </div>

              <div className="mb-6">
                <h1 className="text-slate-900 text-3xl font-semibold mb-2">Welcome Back</h1>
                <p className="text-sm text-slate-600">Sign in to manage tenants, payments, maintenance, and announcements from one dashboard.</p>
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
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={EMAIL_MAX_LENGTH}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                        placeholder="you@company.com"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                        <span>!</span> {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isValidEmail(email.trim())}
                    className="w-full py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
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

                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">Quick email presets</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {[OWNER_DEMO_EMAIL, ADMIN_DEMO_EMAIL, TENANT_DEMO_EMAIL].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEmail(preset)}
                        className="px-2.5 py-1 text-xs border border-[#E5E7EB] rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <a href={`/?email=${encodeURIComponent(ADMIN_DEMO_EMAIL)}`} className="text-[#6366F1] hover:text-[#4F46E5] underline">
                      Admin login link
                    </a>
                    <a href={`/?email=${encodeURIComponent(TENANT_DEMO_EMAIL)}`} className="text-[#6366F1] hover:text-[#4F46E5] underline">
                      Tenant login link
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 text-sm">
                  <button
                    onClick={onSwitchToSignup}
                    className="text-[#6366F1] hover:text-[#4F46E5] font-medium"
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => setError('Use email OTP to sign in. Password reset is not required for OTP flow.')}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-slate-50 px-3 py-2 text-slate-600">
                  <Shield className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Secure Login</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-slate-50 px-3 py-2 text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Encrypted Authentication</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#312E81] p-10 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200 mb-4">PG Manager Platform</p>
                <h2 className="text-3xl font-semibold leading-tight mb-4">Run your PG operations with confidence.</h2>
                <p className="text-indigo-100 text-sm leading-relaxed mb-7">
                  Centralize rent management, tenant lifecycle, maintenance workflows, and announcements in one modern SaaS workspace.
                </p>

                <div className="space-y-3">
                  {[
                    'Tenant onboarding and room allocation in minutes',
                    'Automated payment tracking with live status visibility',
                    'Maintenance and notices managed from one control center',
                  ].map((benefit) => (
                    <div key={benefit} className="flex items-start gap-2 text-sm text-indigo-50">
                      <Check className="w-4 h-4 mt-0.5 text-indigo-200" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={onSwitchToSignup}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#4F46E5] text-sm font-semibold hover:bg-indigo-50 transition-colors"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-indigo-200 mt-3">No setup fee. Built for modern PG teams.</p>
              </div>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="max-w-sm mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-4">
              <h1 className="text-slate-900 text-2xl font-semibold mb-1">Verify OTP</h1>
              <p className="text-slate-600 text-sm mb-1">Enter the {OTP_LENGTH}-digit code sent to</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-slate-900 text-sm font-semibold">{email}</p>
                <button onClick={handleEditEmail} className="text-slate-500 hover:text-slate-700 text-xs underline">
                  Edit
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 border border-[#E5E7EB]">
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 text-center block">Enter OTP</label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-10 h-11 text-center text-base font-semibold border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                      />
                    ))}
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1 animate-in fade-in slide-in-from-top-1">
                      <span>!</span> {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== OTP_LENGTH}
                  className="w-full py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                {resendTimer > 0 ? (
                  <p className="text-xs text-gray-600">
                    Resend OTP in <span className="font-medium text-slate-900">{resendTimer}s</span>
                  </p>
                ) : (
                  <button onClick={handleResendOTP} className="text-xs text-slate-700 hover:text-slate-900 font-medium underline">
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={handleEditEmail}
                className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs">Change Email</span>
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">Please enter the OTP sent to your registered email address</p>
          </div>
        )}
      </div>
    </div>
  );
}