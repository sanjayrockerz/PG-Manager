import { useState, useRef, useEffect } from 'react';
import { Smartphone, ArrowRight, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OTPLoginProps {
  onSwitchToSignup: () => void;
}

export function OTPLogin({ onSwitchToSignup }: OTPLoginProps) {
  const { loginWithOTP, isLoading } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for resend OTP
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, resendTimer]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.length !== 10 || !/^[0-9]{10}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    // Simulate sending OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStep('otp');
    setResendTimer(30);
    
    // Focus first OTP input
    setTimeout(() => otpInputs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
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
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^[0-9]+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputs.current[nextIndex]?.focus();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    // Demo: accept any 6-digit OTP
    const success = await loginWithOTP(phoneNumber, otpCode);
    
    if (success) {
      setStep('success');
      // Auto-redirect after success animation
      setTimeout(() => {
        // The auth context will handle showing the dashboard
      }, 1500);
    } else {
      setError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setError('');
    setOtp(['', '', '', '', '', '']);
    setResendTimer(30);
    
    // Simulate resending OTP
    await new Promise(resolve => setTimeout(resolve, 500));
    alert('OTP resent successfully!');
    otpInputs.current[0]?.focus();
  };

  const handleEditPhone = () => {
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Success State */}
        {step === 'success' && (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-2xl mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-white mb-2">Welcome Back!</h1>
              <p className="text-white/80">Login successful. Redirecting...</p>
            </div>
          </div>
        )}

        {/* Phone Number Input */}
        {step === 'phone' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Logo & Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6 transform hover:scale-105 transition-transform">
                <Smartphone className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="text-white mb-3">Welcome to RentCare</h1>
              <p className="text-white/80 text-lg">Enter your phone number to get started</p>
            </div>

            {/* Login Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-gray-600 font-medium">+91</span>
                      <div className="w-px h-6 bg-gray-300"></div>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full pl-20 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || phoneNumber.length !== 10}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-medium hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Get OTP</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">New to RentCare?</span>
                </div>
              </div>

              <button
                onClick={onSwitchToSignup}
                className="w-full py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-medium hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                Create Account
              </button>
            </div>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-white/80">
              <Shield className="w-4 h-4" />
              <p className="text-sm">Secure OTP Authentication</p>
            </div>
          </div>
        )}

        {/* OTP Verification */}
        {step === 'otp' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6">
                <Shield className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="text-white mb-3">Verify OTP</h1>
              <p className="text-white/80 text-lg mb-2">
                Enter the 6-digit code sent to
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-white font-medium">+91 {phoneNumber}</p>
                <button
                  onClick={handleEditPhone}
                  className="text-white/80 hover:text-white text-sm underline"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* OTP Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-700 text-center block">Enter OTP</label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    ))}
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1 animate-in fade-in slide-in-from-top-1">
                      <span>⚠️</span> {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-medium hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
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
                  <p className="text-sm text-gray-600">
                    Resend OTP in <span className="font-medium text-indigo-600">{resendTimer}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={handleEditPhone}
                className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Change Phone Number</span>
              </button>
            </div>

            {/* Helper Text */}
            <p className="mt-6 text-center text-sm text-white/80">
              Please enter the OTP sent to your registered mobile number
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
