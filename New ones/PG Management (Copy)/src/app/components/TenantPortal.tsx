import { useState } from 'react';
import { 
  User,
  CreditCard,
  Wrench,
  Bell,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Home,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Send,
  Info,
  Building2,
  TrendingUp
} from 'lucide-react';

type TenantView = 
  | 'dashboard'
  | 'profile'
  | 'payments'
  | 'maintenance'
  | 'maintenance-new'
  | 'announcements'
  | 'documents';

interface TenantProfile {
  name: string;
  email: string;
  phone: string;
  roomNumber: string;
  bedNumber: string;
  floor: number;
  propertyName: string;
  propertyAddress: string;
  rent: number;
  deposit: number;
  checkInDate: string;
  agreementEnd: string;
  emergencyContact: string;
  emergencyPhone: string;
}

interface Payment {
  id: string;
  month: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
  paymentMethod?: string;
}

interface MaintenanceRequest {
  id: string;
  issue: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  date: string;
  resolvedDate?: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  important: boolean;
}

// Mock tenant data
const mockTenant: TenantProfile = {
  name: 'Rahul Verma',
  email: 'rahul.verma@example.com',
  phone: '+91 98765 43210',
  roomNumber: 'A-101',
  bedNumber: 'B1',
  floor: 1,
  propertyName: 'Sunrise PG',
  propertyAddress: '123 MG Road, Bangalore, Karnataka',
  rent: 8500,
  deposit: 17000,
  checkInDate: '2023-06-15',
  agreementEnd: '2024-06-14',
  emergencyContact: 'Suresh Verma (Father)',
  emergencyPhone: '+91 98765 00000'
};

const mockPayments: Payment[] = [
  {
    id: '1',
    month: 'April 2024',
    amount: 8500,
    status: 'pending',
    date: '',
    dueDate: '2024-04-05',
    paymentMethod: ''
  },
  {
    id: '2',
    month: 'March 2024',
    amount: 8500,
    status: 'paid',
    date: '2024-03-02',
    dueDate: '2024-03-05',
    paymentMethod: 'UPI'
  },
  {
    id: '3',
    month: 'February 2024',
    amount: 8500,
    status: 'paid',
    date: '2024-02-01',
    dueDate: '2024-02-05',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: '4',
    month: 'January 2024',
    amount: 8500,
    status: 'paid',
    date: '2024-01-03',
    dueDate: '2024-01-05',
    paymentMethod: 'UPI'
  }
];

const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    issue: 'AC not cooling',
    description: 'The air conditioner in my room is not cooling properly since yesterday',
    status: 'in-progress',
    priority: 'high',
    date: '2024-04-01'
  },
  {
    id: '2',
    issue: 'WiFi connection issue',
    description: 'Unable to connect to WiFi in room A-101',
    status: 'resolved',
    priority: 'medium',
    date: '2024-03-28',
    resolvedDate: '2024-03-29'
  },
  {
    id: '3',
    issue: 'Bathroom tap leaking',
    description: 'Small water leak from the bathroom tap',
    status: 'resolved',
    priority: 'low',
    date: '2024-03-20',
    resolvedDate: '2024-03-22'
  }
];

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Water Supply Maintenance',
    message: 'Water supply will be temporarily unavailable on Sunday (April 7) from 9 AM to 12 PM for tank cleaning.',
    date: '2024-04-02',
    important: true
  },
  {
    id: '2',
    title: 'New Washing Machine Installed',
    message: 'A new washing machine has been installed on the ground floor. Please maintain cleanliness.',
    date: '2024-03-30',
    important: false
  },
  {
    id: '3',
    title: 'Monthly Rent Payment Reminder',
    message: 'Gentle reminder: April rent is due by 5th April. Please make timely payments to avoid late fees.',
    date: '2024-03-28',
    important: true
  },
  {
    id: '4',
    title: 'Visitor Policy Update',
    message: 'All visitors must register at the reception. Visitor hours: 9 AM to 9 PM.',
    date: '2024-03-25',
    important: false
  }
];

export function TenantPortal() {
  const [currentView, setCurrentView] = useState<TenantView>('dashboard');

  // Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Welcome, {mockTenant.name.split(' ')[0]} 👋</h1>
        <p className="text-gray-600 mt-1">Your tenant portal</p>
      </div>

      {/* Room Info Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Your Room</p>
              <p className="text-gray-900 text-xl font-semibold">{mockTenant.roomNumber}</p>
              <p className="text-gray-600 text-sm mt-1">Bed {mockTenant.bedNumber} • Floor {mockTenant.floor}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-sm">Monthly Rent</p>
            <p className="text-gray-900 text-xl font-semibold">₹{mockTenant.rent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setCurrentView('payments')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
        >
          <div className="p-3 rounded-lg bg-green-50 text-green-600 w-fit mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">Payments</p>
          <p className="text-gray-600 text-sm mb-2">View payment history</p>
          <span className="text-yellow-600 text-xs font-semibold">1 Pending</span>
        </button>

        <button
          onClick={() => setCurrentView('maintenance')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all text-left"
        >
          <div className="p-3 rounded-lg bg-orange-50 text-orange-600 w-fit mb-3">
            <Wrench className="w-6 h-6" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">Maintenance</p>
          <p className="text-gray-600 text-sm mb-2">Report issues</p>
          <span className="text-blue-600 text-xs font-semibold">1 Active</span>
        </button>

        <button
          onClick={() => setCurrentView('announcements')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
        >
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 w-fit mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">Announcements</p>
          <p className="text-gray-600 text-sm mb-2">Latest updates</p>
          <span className="text-red-600 text-xs font-semibold">2 Important</span>
        </button>

        <button
          onClick={() => setCurrentView('documents')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
        >
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600 w-fit mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-gray-900 font-semibold mb-1">Documents</p>
          <p className="text-gray-600 text-sm mb-2">Agreements & docs</p>
          <span className="text-gray-600 text-xs font-semibold">3 Files</span>
        </button>
      </div>

      {/* Payment Status */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-yellow-100">
            <AlertCircle className="w-5 h-5 text-yellow-700" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-semibold mb-1">April Rent Pending</p>
            <p className="text-gray-600 text-sm mb-3">Due by 5th April 2024</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs">Amount Due</p>
                <p className="text-gray-900 text-xl font-semibold">₹{mockTenant.rent.toLocaleString()}</p>
              </div>
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                Pay Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900">Recent Announcements</h2>
          <button 
            onClick={() => setCurrentView('announcements')}
            className="text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            View All
          </button>
        </div>
        <div className="p-6 space-y-4">
          {mockAnnouncements.slice(0, 2).map((announcement) => (
            <div key={announcement.id} className="flex items-start gap-3">
              {announcement.important && (
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              )}
              <div className="flex-1">
                <p className="text-gray-900 font-semibold text-sm">{announcement.title}</p>
                <p className="text-gray-600 text-sm mt-1">{announcement.message}</p>
                <p className="text-gray-400 text-xs mt-2">
                  {new Date(announcement.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Profile
  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Personal information (read-only)</p>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Contact Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-600 text-xs">Phone Number</p>
              <p className="text-gray-900">{mockTenant.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-600 text-xs">Email</p>
              <p className="text-gray-900">{mockTenant.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Property Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-600 text-xs">Property Name</p>
              <p className="text-gray-900">{mockTenant.propertyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-gray-600 text-xs">Address</p>
              <p className="text-gray-900">{mockTenant.propertyAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenancy Information */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Tenancy Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs">Monthly Rent</p>
              <p className="text-gray-900 text-xl font-semibold">₹{mockTenant.rent.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-xs">Security Deposit</p>
              <p className="text-gray-900 text-xl font-semibold">₹{mockTenant.deposit.toLocaleString()}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600 text-xs">Check-in Date</p>
                <p className="text-gray-900">
                  {new Date(mockTenant.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-gray-600 text-xs">Agreement End Date</p>
                <p className="text-gray-900">
                  {new Date(mockTenant.agreementEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-gray-900 font-semibold mb-4">Emergency Contact</h3>
        <div className="space-y-3">
          <div>
            <p className="text-gray-600 text-xs">Contact Person</p>
            <p className="text-gray-900">{mockTenant.emergencyContact}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Phone Number</p>
            <p className="text-gray-900">{mockTenant.emergencyPhone}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Payments
  const renderPayments = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">Payment history & dues</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-gray-600 text-sm mb-2">Payment Summary</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-gray-900 text-3xl font-semibold">₹{mockTenant.rent.toLocaleString()}</p>
            <p className="text-gray-600 text-sm mt-1">Monthly Rent</p>
          </div>
          <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-semibold">
            1 Pending
          </span>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Payment History</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {mockPayments.map((payment) => (
            <div key={payment.id} className="p-6">
              <div className="flex items-center gap-4 mb-3">
                <div className={`p-3 rounded-lg ${
                  payment.status === 'paid' ? 'bg-green-50 text-green-600' :
                  payment.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {payment.status === 'paid' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : payment.status === 'pending' ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-gray-900 font-semibold">{payment.month}</p>
                  <p className="text-gray-600 text-sm">
                    {payment.status === 'paid' 
                      ? `Paid on ${new Date(payment.date).toLocaleDateString('en-IN')}`
                      : `Due: ${new Date(payment.dueDate).toLocaleDateString('en-IN')}`
                    }
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-gray-900 font-semibold">₹{payment.amount.toLocaleString()}</p>
                  <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>

              {payment.status === 'pending' && (
                <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Pay Now
                </button>
              )}

              {payment.status === 'paid' && payment.paymentMethod && (
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-gray-600 text-xs">Payment Method: {payment.paymentMethod}</span>
                  <button className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700">
                    <Download className="w-4 h-4" />
                    Receipt
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Maintenance
  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1">Report and track issues</p>
        </div>
        <button
          onClick={() => setCurrentView('maintenance-new')}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <p className="text-gray-900 text-2xl font-semibold">{mockMaintenanceRequests.filter(r => r.status === 'open').length}</p>
          <p className="text-gray-600 text-sm mt-1">Open</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <p className="text-gray-900 text-2xl font-semibold">{mockMaintenanceRequests.filter(r => r.status === 'in-progress').length}</p>
          <p className="text-gray-600 text-sm mt-1">In Progress</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <p className="text-gray-900 text-2xl font-semibold">{mockMaintenanceRequests.filter(r => r.status === 'resolved').length}</p>
          <p className="text-gray-600 text-sm mt-1">Resolved</p>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">My Requests</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {mockMaintenanceRequests.map((request) => (
            <div key={request.id} className="p-6">
              <div className="flex items-start gap-4 mb-3">
                <div className={`p-3 rounded-lg ${
                  request.status === 'resolved' ? 'bg-green-50 text-green-600' :
                  request.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                  'bg-yellow-50 text-yellow-600'
                }`}>
                  <Wrench className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-gray-900 font-semibold">{request.issue}</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      request.priority === 'high' ? 'bg-red-100 text-red-700' :
                      request.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {request.priority}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                  <p className="text-gray-400 text-xs">
                    Reported: {new Date(request.date).toLocaleDateString('en-IN')}
                    {request.resolvedDate && ` • Resolved: ${new Date(request.resolvedDate).toLocaleDateString('en-IN')}`}
                  </p>
                </div>
              </div>

              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                request.status === 'resolved' ? 'bg-green-100 text-green-700' :
                request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // New Maintenance Request
  const renderMaintenanceNew = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setCurrentView('maintenance')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Maintenance
        </button>
        <h1 className="text-gray-900">New Request</h1>
        <p className="text-gray-600 mt-1">Report a maintenance issue</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium text-sm">Quick Response</p>
            <p className="text-blue-700 text-xs mt-1">We typically respond to maintenance requests within 24 hours</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-2 text-sm">Issue Title</label>
          <input
            type="text"
            placeholder="e.g., AC not working"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2 text-sm">Description</label>
          <textarea
            rows={4}
            placeholder="Describe the issue in detail..."
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2 text-sm">Priority</label>
          <div className="grid grid-cols-3 gap-3">
            <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all">
              Low
            </button>
            <button className="px-4 py-2.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-all">
              Medium
            </button>
            <button className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-all">
              High
            </button>
          </div>
        </div>

        <button className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 mt-6">
          <Send className="w-5 h-5" />
          Submit Request
        </button>
      </div>
    </div>
  );

  // Announcements
  const renderAnnouncements = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-gray-900">Announcements</h1>
        <p className="text-gray-600 mt-1">Latest updates from property management</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Total Announcements</p>
            <p className="text-gray-900 text-3xl font-semibold mt-1">{mockAnnouncements.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {mockAnnouncements.map((announcement) => (
          <div key={announcement.id} className={`bg-white rounded-xl p-6 border ${
            announcement.important ? 'border-red-200 bg-red-50' : 'border-gray-200'
          }`}>
            <div className="flex items-start gap-3">
              {announcement.important && (
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-gray-900 font-semibold">{announcement.title}</p>
                  {announcement.important && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold whitespace-nowrap">
                      Important
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-3">{announcement.message}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-400 text-xs">
                    {new Date(announcement.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Documents
  const renderDocuments = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-1">Your agreements and documents</p>
      </div>

      {/* Agreement */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Agreement</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-semibold">Rental Agreement</p>
              <p className="text-gray-600 text-sm">PDF • 2.4 MB</p>
            </div>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ID Proof */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">ID Proof</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-semibold">Aadhar Card</p>
              <p className="text-gray-600 text-sm">PDF • 1.8 MB</p>
            </div>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render the appropriate view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'profile':
        return renderProfile();
      case 'payments':
        return renderPayments();
      case 'maintenance':
        return renderMaintenance();
      case 'maintenance-new':
        return renderMaintenanceNew();
      case 'announcements':
        return renderAnnouncements();
      case 'documents':
        return renderDocuments();
      default:
        return renderDashboard();
    }
  };

  return (
    <div>
      {renderView()}
    </div>
  );
}
