import { Home, CreditCard, Shield, Calendar, Check, Phone, MessageCircle, ArrowRight, Bell as BellIcon, FileText, Wrench, Book } from 'lucide-react';

interface RentCareDashboardProps {
  setActiveScreen: (screen: string) => void;
}

export function RentCareDashboard({ setActiveScreen }: RentCareDashboardProps) {
  const stats = [
    { label: 'Monthly Rent', value: '₹6,000', subtitle: 'Due on 5th every month', icon: Home, color: 'border-l-[#4F46E5] bg-purple-50', iconBg: 'bg-purple-100 text-purple-600' },
    { label: 'May Status', value: '₹6,450 Due', subtitle: 'Due by May 5, 2026', icon: CreditCard, color: 'border-l-amber-500 bg-amber-50', iconBg: 'bg-amber-100 text-amber-600' },
    { label: 'Security Deposit', value: '₹12,000', subtitle: 'Active tenancy', icon: Shield, color: 'border-l-green-500 bg-green-50', iconBg: 'bg-green-100 text-green-600' },
    { label: 'Staying Since', value: 'Feb 2024', subtitle: '15+ months', icon: Calendar, color: 'border-l-blue-500 bg-blue-50', iconBg: 'bg-blue-100 text-blue-600' },
  ];

  const announcements = [
    { id: 1, category: 'Maintenance', title: 'Water Supply Maintenance', preview: 'Water will be off tomorrow from 10 AM to 2 PM...', date: '2 days ago', unread: true },
    { id: 2, category: 'Payment', title: 'May Rent Reminder', preview: 'Friendly reminder that May rent is due on 5th...', date: '3 days ago', unread: true },
    { id: 3, category: 'Rules', title: 'Common Area Rules', preview: 'Please maintain cleanliness in common areas...', date: '1 week ago', unread: false },
  ];

  const quickAccess = [
    { label: 'Payments', sublabel: '1 pending', icon: CreditCard, color: 'bg-purple-100 text-purple-600', screen: 'payments' },
    { label: 'Maintenance', sublabel: '1 active', icon: Wrench, color: 'bg-amber-100 text-amber-600', screen: 'maintenance' },
    { label: 'Documents', sublabel: '4 files', icon: FileText, color: 'bg-green-100 text-green-600', screen: 'documents' },
    { label: 'House Rules', sublabel: 'View all', icon: Book, color: 'bg-blue-100 text-blue-600', screen: 'help' },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Good morning, Priya 👋</h1>
        <p className="text-gray-600 mt-1">Green Valley PG · Room 205, Bed A · Floor 2</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-white border-l-4 ${stat.color} rounded-xl p-4 shadow-sm`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rent Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Rent Status</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              Pending
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-lg font-bold text-amber-900">₹6,450</p>
                <p className="text-sm text-amber-700 mt-1">Due by May 5, 2026</p>
              </div>
            </div>
          </div>

          <button className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-semibold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2">
            Pay via UPI
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Caretaker Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Caretaker Contact</h2>

          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              RG
            </div>
            <div>
              <p className="font-semibold text-gray-900">Ramesh Gupta</p>
              <p className="text-sm text-gray-600">+91 97654 32100</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors">
              <Phone className="w-4 h-4" />
              Call
            </button>
            <button className="flex items-center justify-center gap-2 border border-green-500 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2.5 rounded-lg transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Announcements</h2>
            <button onClick={() => setActiveScreen('announcements')} className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-semibold flex items-center gap-1">
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="border-l-2 border-[#4F46E5] bg-purple-50 rounded-r-lg pl-3 pr-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    {announcement.category}
                  </span>
                  {announcement.unread && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                  <span className="text-xs text-gray-500">{announcement.date}</span>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{announcement.title}</p>
                <p className="text-xs text-gray-600">{announcement.preview}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Access</h2>

          <div className="grid grid-cols-2 gap-3">
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveScreen(item.screen)}
                  className="bg-white border border-gray-200 hover:shadow-md rounded-lg p-4 text-left transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.sublabel}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
