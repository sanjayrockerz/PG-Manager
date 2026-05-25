import { User, Phone, Mail, Home, Bed, DoorOpen, Calendar, Shield, CreditCard } from 'lucide-react';

export function RentCareProfile() {
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your personal and tenancy information</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h2>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                PS
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">Priya Sharma</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 mt-1">
                  Active Tenant
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Phone Number</p>
                  <a href="tel:+919876543210" className="text-sm font-semibold text-[#4F46E5] hover:underline">
                    +91 98765 43210
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Email Address</p>
                  <a href="mailto:priya.sharma@email.com" className="text-sm font-semibold text-[#4F46E5] hover:underline">
                    priya.sharma@email.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Contact Name</p>
                <p className="text-sm font-semibold text-gray-900">Rajesh Sharma (Father)</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Contact Number</p>
                <p className="text-sm font-semibold text-gray-900">+91 98765 00000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Room & Tenancy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Room & Tenancy Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Property</p>
                  <p className="text-sm font-semibold text-gray-900">Green Valley PG</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DoorOpen className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Room</p>
                  <p className="text-sm font-semibold text-gray-900">205</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Bed className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Bed</p>
                  <p className="text-sm font-semibold text-gray-900">Bed A</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Floor</p>
                  <p className="text-sm font-semibold text-gray-900">Floor 2</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Monthly Rent</p>
                  <p className="text-sm font-semibold text-gray-900">₹6,000</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Security Deposit</p>
                  <p className="text-sm font-semibold text-gray-900">₹12,000</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Due Date</p>
                  <p className="text-sm font-semibold text-gray-900">5th of every month</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Joined</p>
                  <p className="text-sm font-semibold text-gray-900">Feb 1, 2024</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Verification</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">ID Type</p>
                <p className="text-sm font-semibold text-gray-900">Aadhaar Card</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">ID Number</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">XXXX XXXX 3211</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
