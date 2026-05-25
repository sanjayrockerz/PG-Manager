import { User, Phone, Mail, Calendar, Home, Bed, DoorOpen, CheckCircle2, Shield, AlertTriangle } from 'lucide-react';

export function TenantProfile() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-600 mt-1">View your personal and tenancy information</p>
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                PS
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Priya Sharma</p>
                <p className="text-sm text-gray-600">Tenant since Feb 2024</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Phone Number</p>
                  <p className="text-sm font-medium text-gray-900">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Email Address</p>
                  <p className="text-sm font-medium text-gray-900">priya.sharma@email.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Contact Name</p>
                <p className="text-sm font-medium text-gray-900">Rajesh Sharma (Father)</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1">Contact Number</p>
                <p className="text-sm font-medium text-gray-900">+91 98765 00000</p>
              </div>

              <div>
                <p className="text-xs text-gray-600 mb-1">Relationship</p>
                <p className="text-sm font-medium text-gray-900">Father</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Room & Tenancy Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room & Tenancy Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">PG Name</p>
                  <p className="text-sm font-medium text-gray-900">Green Valley PG</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DoorOpen className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Room Number</p>
                  <p className="text-sm font-medium text-gray-900">205</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Bed className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Bed</p>
                  <p className="text-sm font-medium text-gray-900">Bed A</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Floor</p>
                  <p className="text-sm font-medium text-gray-900">Floor 2</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Move-in Date</p>
                  <p className="text-sm font-medium text-gray-900">Feb 1, 2024</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Monthly Rent</p>
                  <p className="text-sm font-medium text-gray-900">₹6,000</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Security Deposit</p>
                  <p className="text-sm font-medium text-gray-900">₹12,000</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-xs text-gray-600 mb-0.5">Notice Period</p>
                  <p className="text-sm font-medium text-gray-900">30 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">ID Verification</span>
                </div>
                <span className="text-xs text-green-700">Verified</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Police Verification</span>
                </div>
                <span className="text-xs text-green-700">Completed</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">Background Check</span>
                </div>
                <span className="text-xs text-amber-700">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
