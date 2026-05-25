import { Check, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthWelcomeProps {
  onContinue: () => void;
}

export function AuthWelcome({ onContinue }: AuthWelcomeProps) {
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

          {/* Welcome Content */}
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to RentCare, Priya! 🎉
            </h2>
            <p className="text-gray-600 mb-8">
              Your account has been set up by Green Valley PG.
            </p>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 mb-8 text-left">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-purple-600 font-medium mb-1">Room</p>
                  <p className="text-gray-900 font-semibold">205</p>
                </div>
                <div>
                  <p className="text-purple-600 font-medium mb-1">Bed</p>
                  <p className="text-gray-900 font-semibold">Bed A</p>
                </div>
                <div>
                  <p className="text-purple-600 font-medium mb-1">Floor</p>
                  <p className="text-gray-900 font-semibold">Floor 2</p>
                </div>
                <div>
                  <p className="text-purple-600 font-medium mb-1">Monthly Rent</p>
                  <p className="text-gray-900 font-semibold">₹6,000</p>
                </div>
                <div className="col-span-2">
                  <p className="text-purple-600 font-medium mb-1">Due Date</p>
                  <p className="text-gray-900 font-semibold">5th of every month</p>
                </div>
                <div className="col-span-2">
                  <p className="text-purple-600 font-medium mb-1">Property</p>
                  <p className="text-gray-900 font-semibold">Green Valley PG</p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={onContinue}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Go to my Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Small Text */}
            <p className="text-xs text-gray-500 mt-6">
              Your payment history and documents will appear here as your PG manager updates them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
