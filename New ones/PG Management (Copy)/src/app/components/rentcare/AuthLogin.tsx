import { useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';

interface AuthLoginProps {
  onSendOTP: (phone: string) => void;
}

export function AuthLogin({ onSendOTP }: AuthLoginProps) {
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) {
      onSendOTP(phone);
    }
  };

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

          {/* Top Right Link - Desktop */}
          <div className="hidden lg:block text-right mb-8">
            <a href="#" className="text-sm text-gray-600 hover:text-[#4F46E5]">
              Are you a PG Owner? Sign in →
            </a>
          </div>

          {/* Form */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back 👋</h2>
            <p className="text-gray-600 mb-8">Enter your mobile number to continue</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#4F46E5] focus-within:border-[#4F46E5] transition-all">
                  <div className="flex items-center gap-2 px-4 bg-gray-50 border-r border-gray-300">
                    <span className="text-xl">🇮🇳</span>
                    <span className="text-gray-600 font-medium">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3 outline-none text-base"
                    maxLength={10}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phone.length !== 10}
                className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
              >
                Send OTP
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 border-t border-gray-300" />
              <span className="text-sm text-gray-500">or</span>
              <div className="flex-1 border-t border-gray-300" />
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-900">
                <strong>Don't have an account?</strong> Your PG owner adds you automatically. You'll receive a WhatsApp message with login instructions.
              </p>
            </div>

            {/* Support Link */}
            <div className="mt-6 text-center">
              <a href="mailto:support@rentcare.in" className="text-sm text-gray-600 hover:text-[#4F46E5]">
                Need help? <span className="font-semibold">support@rentcare.in</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
