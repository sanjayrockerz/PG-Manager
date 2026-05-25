import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Smartphone, Check } from 'lucide-react';

interface AuthOTPProps {
  phone: string;
  onVerify: () => void;
  onBack: () => void;
}

export function AuthOTP({ phone, onVerify, onBack }: AuthOTPProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(29);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);
  };

  const handleVerify = () => {
    if (otp.join('').length === 6) {
      // Simulate verification
      if (otp.join('') === '123456') {
        onVerify();
      } else {
        setError(true);
      }
    }
  };

  const handleResend = () => {
    setTimer(29);
    setOtp(['', '', '', '', '', '']);
    setError(false);
  };

  const maskedPhone = phone.slice(0, 5) + ' X' + phone.slice(-4);
  const isComplete = otp.every(digit => digit !== '');

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded" />
            </div>
            <span className="text-2xl font-bold text-white">RentCare</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Your PG, managed beautifully.
            </h1>
            <p className="text-xl text-purple-100 mb-12">
              Track rent, file complaints, get announcements — all from one place.
            </p>

            <div className="space-y-4">
              {[
                'Real-time rent tracking and payment history',
                'File maintenance requests in seconds',
                'Instant announcements from your PG'
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-white text-lg">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-purple-200 text-sm">Powered by RentCare</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-white flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded" />
            </div>
            <span className="text-2xl font-bold text-gray-900">RentCare</span>
          </div>

          {/* Back Button */}
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Form */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-8 h-8 text-[#4F46E5]" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your number</h2>
            <p className="text-gray-600 mb-8">
              OTP sent to +91 {maskedPhone}
            </p>

            {/* OTP Inputs */}
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg outline-none transition-all ${
                    error
                      ? 'border-red-500 bg-red-50'
                      : digit
                      ? 'border-[#4F46E5] bg-purple-50'
                      : 'border-gray-300 focus:border-[#4F46E5]'
                  }`}
                  maxLength={1}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-600 text-sm mb-4">Incorrect OTP. Please try again.</p>
            )}

            {/* Timer / Resend */}
            <div className="mb-6">
              {timer > 0 ? (
                <p className="text-gray-600 text-sm">
                  Resend OTP in <span className="font-semibold">0:{timer.toString().padStart(2, '0')}</span>
                </p>
              ) : (
                <button onClick={handleResend} className="text-[#4F46E5] font-semibold text-sm hover:underline">
                  Resend OTP
                </button>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={!isComplete}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg disabled:shadow-none"
            >
              Verify & Continue →
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Hint: Use OTP <span className="font-mono font-semibold">123456</span> for demo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
