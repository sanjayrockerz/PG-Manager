import { useState, useRef, useEffect } from 'react';
import { Smartphone, ArrowRight, ArrowLeft, CheckCircle2, User, Building2, Sparkles, Mail, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OTPSignupProps {
  onSwitchToLogin: () => void;
}

const OTP_LENGTH = Number((import.meta as any).env?.VITE_SUPABASE_OTP_LENGTH ?? 6);
const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;
const EMPTY_OTP = Array.from({ length: OTP_LENGTH }, () => '');

export function OTPSignup({ onSwitchToLogin }: OTPSignupProps) {
  const { requestSignupOTP, signupWithOTP, signInWithGoogle, authError, isLoading } = useAuth();
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });
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

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateDetails = () => {
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phoneNumber.replace(/\D/g, '');

    if (!cleanName) {
      setError('Full name is required.');
      return false;
    }
    if (cleanName.length < 2) {
      setError('Full name must be at least 2 characters.');
      return false;
    }
    if (cleanName.length > NAME_MAX_LENGTH) {
      setError('Full name is too long.');
      return false;
    }
    if (!cleanEmail) {
      setError('Email address is required.');
      return false;
    }
    if (cleanEmail.length > EMAIL_MAX_LENGTH) {
      setError('Email address is too long.');
      return false;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return false;
    }

    return true;
  };

  const sendSignupOtp = async (): Promise<boolean> => {
    return requestSignupOTP({
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phoneNumber.replace(/\D/g, ''),
    });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const success = await signInWithGoogle();
    if (!success) {
      setError(authError || 'Unable to continue with Google.');
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateDetails()) {
      return;
    }

    const sent = await sendSignupOtp();
    if (!sent) {
      setError(authError || 'Unable to send OTP. Please verify details and try again.');
      return;
    }

    setStep('otp');
    setResendTimer(30);
    setTimeout(() => otpInputs.current[0]?.focus(), 100);
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

    const success = await signupWithOTP(formData.email.trim().toLowerCase(), otpCode);
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

    const sent = await sendSignupOtp();
    if (!sent) {
      setError(authError || 'Unable to resend OTP right now.');
      return;
    }

    setResendTimer(30);
    otpInputs.current[0]?.focus();
  };

  const handleBackToDetails = () => {
    setStep('details');
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
                <Sparkles className="w-7 h-7 text-[#6366F1]" />
              </div>
              <h1 className="text-slate-900 text-xl font-semibold mb-1">Account created</h1>
              <p className="text-sm text-slate-600">Setting up your dashboard...</p>
            </div>
          </div>
        )}

        {step === 'details' && (
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
                <h1 className="text-slate-900 text-3xl font-semibold mb-2">Create Account</h1>
                <p className="text-sm text-slate-600">Start your PG management workspace with secure onboarding and a real-time SaaS dashboard.</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        maxLength={NAME_MAX_LENGTH}
                        className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        maxLength={EMAIL_MAX_LENGTH}
                        className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                        placeholder="owner@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone number</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 text-sm font-medium">+91</span>
                        <div className="w-px h-4 bg-gray-300"></div>
                      </div>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="w-full pl-24 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                        placeholder="9876543210"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                      <span>!</span> {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
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
                        <ArrowRight className="w-5 h-5" />
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

                <div className="flex items-center justify-between mt-4 text-sm">
                  <p className="text-slate-500">Already have an account?</p>
                  <button
                    onClick={onSwitchToLogin}
                    className="text-[#6366F1] hover:text-[#4F46E5] font-medium"
                  >
                    Sign In
                  </button>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">By signing up, you agree to our terms and privacy policy</p>
            </div>

            <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#312E81] p-10 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200 mb-4">PG Manager Platform</p>
                <h2 className="text-3xl font-semibold leading-tight mb-4">Launch your PG SaaS operations fast.</h2>
                <p className="text-indigo-100 text-sm leading-relaxed mb-7">
                  Build a reliable tenant experience with payments, maintenance updates, and announcements all managed in one place.
                </p>

                <div className="space-y-3">
                  {[
                    'Real-time operations dashboard for owners and admins',
                    'Integrated tenant portal for complaints and payment tracking',
                    'Secure, scalable workflows built for modern PG teams',
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
                  onClick={onSwitchToLogin}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#4F46E5] text-sm font-semibold hover:bg-indigo-50 transition-colors"
                >
                  <span>Back to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-indigo-200 mt-3">Professional onboarding for PG teams.</p>
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
                <p className="text-slate-900 text-sm font-semibold">{formData.email}</p>
                <button onClick={handleBackToDetails} className="text-slate-500 hover:text-slate-700 text-xs underline">
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <CheckCircle2 className="w-5 h-5" />
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
                onClick={handleBackToDetails}
                className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs">Back to Details</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}