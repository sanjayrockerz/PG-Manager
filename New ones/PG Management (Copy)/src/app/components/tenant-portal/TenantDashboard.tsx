import { Home, Calendar, Shield, Clock, CreditCard, Phone, MessageCircle, Bell, FileText, Wrench, Book } from 'lucide-react';

interface TenantDashboardProps {
  setActiveScreen: (screen: string) => void;
}

export function TenantDashboard({ setActiveScreen }: TenantDashboardProps) {
  const stats = [
    { label: 'Monthly Rent', value: '₹6,000', icon: Home, color: 'bg-blue-500' },
    { label: 'This Month', value: 'Pending', icon: CreditCard, color: 'bg-amber-500' },
    { label: 'Security Deposit', value: '₹12,000', icon: Shield, color: 'bg-green-500' },
    { label: 'Staying Since', value: 'Feb 2024', icon: Calendar, color: 'bg-purple-500' },
  ];

  const announcements = [
    { id: 1, title: 'Water Supply Timing Change', date: '2 days ago', category: 'Maintenance' },
    { id: 2, title: 'Monthly Rent Due - May 2026', date: '5 days ago', category: 'Payment' },
  ];

  const quickAccess = [
    { label: 'Payments', icon: CreditCard, color: 'bg-green-50 text-green-600', screen: 'payments' },
    { label: 'Maintenance', icon: Wrench, color: 'bg-orange-50 text-orange-600', screen: 'maintenance' },
    { label: 'Documents', icon: FileText, color: 'bg-blue-50 text-blue-600', screen: 'documents' },
    { label: 'House Rules', icon: Book, color: 'bg-purple-50 text-purple-600', screen: 'help' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, Priya 👋</h1>
        <p className="text-sm text-gray-600 mt-1">Here's what's happening with your stay today</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rent Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rent Status</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-1">Payment Pending</p>
                <p className="text-sm text-amber-700">May 2026 rent of ₹6,450 is due on May 10, 2026</p>
              </div>
            </div>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors">
            Pay via UPI
          </button>
        </div>

        {/* Caretaker Contact */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Caretaker Contact</h2>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
              RG
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Ramesh Gupta</p>
              <p className="text-sm text-gray-600">Caretaker</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2.5 rounded-lg transition-colors">
              <Phone className="w-4 h-4" />
              Call
            </button>
            <button className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Second row - two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
            <button
              onClick={() => setActiveScreen('announcements')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-l-2 border-indigo-500 pl-3 py-2">
                <p className="text-sm font-medium text-gray-900 mb-1">{announcement.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{announcement.date}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-indigo-600 font-medium">{announcement.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>

          <div className="grid grid-cols-2 gap-3">
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveScreen(item.screen)}
                  className={`${item.color} rounded-lg p-4 text-left hover:opacity-80 transition-opacity`}
                >
                  <Icon className="w-6 h-6 mb-2" />
                  <p className="text-sm font-medium">{item.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
