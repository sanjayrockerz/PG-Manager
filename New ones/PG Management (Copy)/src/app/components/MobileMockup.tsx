import { useState, useMemo } from 'react';
import { 
  Home, 
  Users, 
  CreditCard, 
  Wrench, 
  Bell, 
  Settings, 
  Building2,
  ChevronRight,
  DollarSign,
  User,
  Search,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  IndianRupee,
  MoreVertical,
  ChevronLeft,
  MapPin,
  Download,
  Send,
  Receipt,
  FileText,
  Shield,
  BarChart3,
  Database,
  HeadphonesIcon,
  Activity,
  Zap,
  BookOpen,
  Calendar,
  Info,
  Key,
  LogOut,
  Eye,
  UserCheck
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { mockTenants, mockPayments, mockMaintenanceRequests, filterByProperty } from '../utils/mockData';

type MockupView = 
  | 'home' 
  | 'tenants' 
  | 'tenant-detail' 
  | 'properties' 
  | 'payments' 
  | 'maintenance' 
  | 'settings'
  | 'admin'
  | 'admin-users'
  | 'admin-subscriptions'
  | 'admin-analytics'
  | 'admin-support'
  | 'tenant-portal'
  | 'tenant-profile'
  | 'tenant-payments'
  | 'tenant-maintenance'
  | 'tenant-announcements';

export function MobileMockup() {
  const [currentView, setCurrentView] = useState<MockupView>('home');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'documents' | 'history'>('payments');
  
  const { properties, selectedProperty } = useProperty();

  // Filter data
  const filteredTenants = useMemo(() => filterByProperty(mockTenants, selectedProperty), [selectedProperty]);
  const filteredPayments = useMemo(() => filterByProperty(mockPayments, selectedProperty), [selectedProperty]);
  const filteredMaintenance = useMemo(() => filterByProperty(mockMaintenanceRequests, selectedProperty), [selectedProperty]);

  // Calculate stats
  const totalTenants = filteredTenants.filter(t => t.status === 'active').length;
  const monthlyRevenue = filteredPayments
    .filter(p => p.status === 'paid' && new Date(p.date).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = filteredPayments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);
  const occupancyRate = 92;

  const renderPhoneFrame = (content: React.ReactNode) => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">📱 Mobile Experience</h2>
          <p className="text-purple-200">Fully functional iOS-style app</p>
        </div>

        {/* Phone Frame */}
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-[3.5rem] blur-2xl opacity-30"></div>
          
          {/* Phone Container */}
          <div className="relative w-[375px] h-[812px] bg-gradient-to-b from-gray-900 to-black rounded-[3rem] p-3 shadow-2xl border border-gray-700">
            {/* Screen */}
            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
              {/* Status Bar */}
              <div className="bg-gradient-to-b from-white to-gray-50 px-6 pt-3 pb-2 flex items-center justify-between text-xs z-20">
                <span className="font-semibold text-gray-900">9:41</span>
                <div className="flex items-center gap-1">
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <path d="M0 2C0 0.895431 0.895431 0 2 0H14C15.1046 0 16 0.895431 16 2V10C16 11.1046 15.1046 12 14 12H2C0.895431 12 0 11.1046 0 10V2Z" fill="black"/>
                  </svg>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                {content}
              </div>

              {/* Bottom Navigation - Only show on main screens */}
              {['home', 'tenants', 'payments', 'maintenance', 'settings'].includes(currentView) && (
                <div className="bg-white border-t border-gray-200 px-6 py-2">
                  <div className="flex items-center justify-around">
                    <button
                      onClick={() => setCurrentView('home')}
                      className={`flex flex-col items-center gap-1 py-2 transition-all ${
                        currentView === 'home' ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <Home className={`w-6 h-6 ${currentView === 'home' ? 'fill-blue-600' : ''}`} />
                      <span className="text-[10px] font-medium">Home</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('tenants')}
                      className={`flex flex-col items-center gap-1 py-2 transition-all ${
                        currentView === 'tenants' ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <Users className={`w-6 h-6 ${currentView === 'tenants' ? 'fill-blue-600' : ''}`} />
                      <span className="text-[10px] font-medium">Tenants</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('payments')}
                      className={`flex flex-col items-center gap-1 py-2 transition-all ${
                        currentView === 'payments' ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 ${currentView === 'payments' ? 'fill-blue-600' : ''}`} />
                      <span className="text-[10px] font-medium">Payments</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('maintenance')}
                      className={`flex flex-col items-center gap-1 py-2 transition-all ${
                        currentView === 'maintenance' ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <Wrench className={`w-6 h-6 ${currentView === 'maintenance' ? 'fill-blue-600' : ''}`} />
                      <span className="text-[10px] font-medium">Service</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('settings')}
                      className={`flex flex-col items-center gap-1 py-2 transition-all ${
                        currentView === 'settings' ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <Settings className={`w-6 h-6 ${currentView === 'settings' ? 'fill-blue-600' : ''}`} />
                      <span className="text-[10px] font-medium">More</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Info Text */}
        <div className="mt-6 text-center text-sm text-purple-200 max-w-md">
          <p className="mb-2">✨ Tap and explore the full mobile experience</p>
          <p className="text-xs opacity-75">All features working with real data</p>
        </div>
      </div>
    );
  };

  // Home Screen
  const renderHome = () => (
    <div className="min-h-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 pb-20">
      {/* Header */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-white/80 text-sm font-medium">Good Evening 👋</p>
            <h1 className="text-white text-2xl font-bold mt-1">PG Manager</h1>
          </div>
          <div className="relative">
            <button className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30">
              <Bell className="w-5 h-5 text-white" />
            </button>
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
          </div>
        </div>

        {/* Property Selector */}
        <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs">Current Property</p>
                <p className="text-white font-semibold">
                  {selectedProperty === 'all' 
                    ? 'All Properties' 
                    : properties.find(p => p.id === selectedProperty)?.name || 'Select'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/50" />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-300" />
              </div>
            </div>
            <p className="text-white/70 text-xs mb-1">Revenue</p>
            <p className="text-white text-xl font-bold">₹{(monthlyRevenue / 1000).toFixed(1)}K</p>
            <p className="text-green-300 text-xs mt-1">+8% this month</p>
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-400/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-300" />
              </div>
            </div>
            <p className="text-white/70 text-xs mb-1">Tenants</p>
            <p className="text-white text-xl font-bold">{totalTenants}</p>
            <p className="text-blue-300 text-xs mt-1">{occupancyRate}% occupied</p>
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-300" />
              </div>
            </div>
            <p className="text-white/70 text-xs mb-1">Pending</p>
            <p className="text-white text-xl font-bold">₹{(pendingAmount / 1000).toFixed(1)}K</p>
            <p className="text-yellow-300 text-xs mt-1">{filteredPayments.filter(p => p.status === 'pending').length} dues</p>
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-400/20 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-orange-300" />
              </div>
            </div>
            <p className="text-white/70 text-xs mb-1">Requests</p>
            <p className="text-white text-xl font-bold">{filteredMaintenance.filter(m => m.status === 'open').length}</p>
            <p className="text-orange-300 text-xs mt-1">Active issues</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 pb-6">
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          <button className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 hover:scale-105 transition-transform active:scale-95">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Add Tenant</span>
          </button>
          
          <button className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 hover:scale-105 transition-transform active:scale-95">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Payment</span>
          </button>
          
          <button className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 hover:scale-105 transition-transform active:scale-95">
              <Send className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Announce</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('properties')}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 hover:scale-105 transition-transform active:scale-95">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-medium">Buildings</span>
          </button>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-bold">Recent Activity</h3>
            <button className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          
          <div className="space-y-3">
            {filteredPayments.slice(0, 3).map((payment, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payment.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {payment.status === 'paid' 
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : <Clock className="w-5 h-5 text-yellow-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm">{payment.tenant}</p>
                  <p className="text-gray-500 text-xs">{payment.room} • ₹{payment.amount.toLocaleString()}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  payment.status === 'paid' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Tenants List Screen
  const renderTenants = () => (
    <div className="min-h-full bg-gray-50 pb-20">
      {/* Header with Search */}
      <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
        <h1 className="text-gray-900 text-2xl font-bold mb-4">Tenants</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            className="w-full pl-11 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-medium whitespace-nowrap">
            All ({totalTenants})
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">
            Paid ({filteredPayments.filter(p => p.status === 'paid').length})
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">
            Pending ({filteredPayments.filter(p => p.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Tenants List */}
      <div className="p-4 space-y-3">
        {filteredTenants.filter(t => t.status === 'active').map((tenant) => {
          const payment = filteredPayments.find(p => p.tenant === tenant.name);
          return (
            <button
              key={tenant.id}
              onClick={() => {
                setSelectedTenantId(tenant.id);
                setCurrentView('tenant-detail');
              }}
              className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow active:scale-98"
            >
              <div className="flex items-center gap-4">
                {/* Avatar with gradient */}
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg">
                  {tenant.name.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <p className="text-gray-900 font-semibold">{tenant.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500 text-sm">{tenant.room}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500 text-sm">₹{tenant.rent.toLocaleString()}/mo</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    payment?.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : payment?.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {payment?.status || 'N/A'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* FAB */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95 z-10">
        <Plus className="w-6 h-6 text-white" />
      </button>
    </div>
  );

  // Tenant Detail Screen
  const renderTenantDetail = () => {
    const tenant = filteredTenants.find(t => t.id === selectedTenantId);
    if (!tenant) return null;

    const tenantPayments = filteredPayments.filter(p => p.tenant === tenant.name);

    return (
      <div className="min-h-full bg-gray-50">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 px-6 pt-6 pb-20">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('tenants')}
              className="w-10 h-10 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30">
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Profile */}
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/30 shadow-2xl">
              {tenant.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h1 className="text-white text-2xl font-bold">{tenant.name}</h1>
            <p className="text-white/80 text-sm mt-1">Room {tenant.room}</p>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30 hover:scale-110 transition-transform active:scale-95">
                <Phone className="w-5 h-5 text-white" />
              </button>
              <button className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30 hover:scale-110 transition-transform active:scale-95">
                <MessageSquare className="w-5 h-5 text-white" />
              </button>
              <button className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/30 hover:scale-110 transition-transform active:scale-95">
                <Mail className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-6 -mt-12 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-lg">
              <p className="text-gray-500 text-xs mb-1">Rent</p>
              <p className="text-gray-900 font-bold text-lg">₹{tenant.rent.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-lg">
              <p className="text-gray-500 text-xs mb-1">Status</p>
              <p className="text-green-600 font-bold text-lg">Paid</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-lg">
              <p className="text-gray-500 text-xs mb-1">Since</p>
              <p className="text-gray-900 font-bold text-lg">6 mo</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4">
          <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'documents'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-6">
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900 font-bold">Payment History</h3>
                <button className="text-blue-600 text-sm font-medium">Download</button>
              </div>
              
              {tenantPayments.slice(0, 6).map((payment, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-900 font-semibold">
                      {new Date(payment.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      payment.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">₹{payment.amount.toLocaleString()}</span>
                    <span className="text-gray-400 text-xs">{new Date(payment.date).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-semibold">Aadhar Card</p>
                    <p className="text-gray-500 text-xs">PDF • 2.4 MB</p>
                  </div>
                  <button>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-semibold">Agreement</p>
                    <p className="text-gray-500 text-xs">PDF • 1.8 MB</p>
                  </div>
                  <button>
                    <Download className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium text-sm">Rent paid for March</p>
                  <p className="text-gray-500 text-xs mt-1">2 days ago</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium text-sm">Maintenance request resolved</p>
                  <p className="text-gray-500 text-xs mt-1">1 week ago</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Payments Screen
  const renderPayments = () => (
    <div className="min-h-full bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-6 pt-6 pb-8">
        <h1 className="text-white text-2xl font-bold mb-6">Payments</h1>
        
        {/* Revenue Card */}
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
          <p className="text-white/80 text-sm mb-2">Total Revenue (March)</p>
          <p className="text-white text-4xl font-bold mb-4">₹{(monthlyRevenue / 1000).toFixed(1)}K</p>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-white/70 text-xs mb-1">Paid</p>
              <p className="text-white text-lg font-bold">{filteredPayments.filter(p => p.status === 'paid').length}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-xs mb-1">Pending</p>
              <p className="text-white text-lg font-bold">{filteredPayments.filter(p => p.status === 'pending').length}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-xs mb-1">Overdue</p>
              <p className="text-white text-lg font-bold">{filteredPayments.filter(p => p.status === 'overdue').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-6 py-4 flex gap-2 overflow-x-auto">
        <button className="px-4 py-2 bg-green-600 text-white rounded-full text-xs font-medium whitespace-nowrap shadow-lg">
          All Payments
        </button>
        <button className="px-4 py-2 bg-white text-gray-700 rounded-full text-xs font-medium whitespace-nowrap shadow-sm">
          This Month
        </button>
        <button className="px-4 py-2 bg-white text-gray-700 rounded-full text-xs font-medium whitespace-nowrap shadow-sm">
          Pending
        </button>
      </div>

      {/* Payments List */}
      <div className="px-6 pb-6 space-y-3">
        {filteredPayments.slice(0, 10).map((payment, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                payment.status === 'paid'
                  ? 'bg-green-100'
                  : payment.status === 'pending'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}>
                {payment.status === 'paid' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : payment.status === 'pending' ? (
                  <Clock className="w-6 h-6 text-yellow-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              
              <div className="flex-1 text-left">
                <p className="text-gray-900 font-semibold">{payment.tenant}</p>
                <p className="text-gray-500 text-sm">{payment.room} • {new Date(payment.date).toLocaleDateString('en-IN')}</p>
              </div>

              <div className="text-right">
                <p className="text-gray-900 font-bold">₹{payment.amount.toLocaleString()}</p>
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  payment.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : payment.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {payment.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Maintenance Screen
  const renderMaintenance = () => (
    <div className="min-h-full bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-600 to-red-700 px-6 pt-6 pb-8">
        <h1 className="text-white text-2xl font-bold mb-6">Maintenance</h1>
        
        {/* Stats Card */}
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-white text-2xl font-bold">{filteredMaintenance.filter(m => m.status === 'open').length}</p>
              <p className="text-white/80 text-xs mt-1">Open</p>
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">{filteredMaintenance.filter(m => m.status === 'in-progress').length}</p>
              <p className="text-white/80 text-xs mt-1">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">{filteredMaintenance.filter(m => m.status === 'resolved').length}</p>
              <p className="text-white/80 text-xs mt-1">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-6 py-4 flex gap-2 overflow-x-auto">
        <button className="px-4 py-2 bg-orange-600 text-white rounded-full text-xs font-medium whitespace-nowrap shadow-lg">
          All Requests
        </button>
        <button className="px-4 py-2 bg-white text-gray-700 rounded-full text-xs font-medium whitespace-nowrap shadow-sm">
          Open
        </button>
        <button className="px-4 py-2 bg-white text-gray-700 rounded-full text-xs font-medium whitespace-nowrap shadow-sm">
          Urgent
        </button>
      </div>

      {/* Requests List */}
      <div className="px-6 pb-6 space-y-3">
        {filteredMaintenance.map((request, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                request.status === 'resolved'
                  ? 'bg-green-100'
                  : request.status === 'in-progress'
                  ? 'bg-blue-100'
                  : 'bg-yellow-100'
              }`}>
                <Wrench className={`w-5 h-5 ${
                  request.status === 'resolved'
                    ? 'text-green-600'
                    : request.status === 'in-progress'
                    ? 'text-blue-600'
                    : 'text-yellow-600'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-semibold mb-1">{request.issue}</p>
                <p className="text-gray-500 text-sm">{request.tenant} • {request.room}</p>
              </div>

              <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                request.priority === 'high'
                  ? 'bg-red-100 text-red-700'
                  : request.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {request.priority}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                request.status === 'resolved'
                  ? 'bg-green-100 text-green-700'
                  : request.status === 'in-progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {request.status}
              </span>
              <button className="text-blue-600 text-sm font-medium">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB for WhatsApp */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95 z-10">
        <MessageSquare className="w-6 h-6 text-white" />
      </button>
    </div>
  );

  // Properties Screen
  const renderProperties = () => (
    <div className="min-h-full bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-gray-900 text-xl font-bold">Properties</h1>
          <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Properties List */}
      <div className="p-6 space-y-4">
        {properties.map((property) => (
          <div
            key={property.id}
            className="bg-white rounded-2xl overflow-hidden shadow-sm"
          >
            {/* Property Image Placeholder */}
            <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="w-16 h-16 text-white/30" />
              </div>
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-lg px-3 py-1 rounded-full">
                <p className="text-white text-xs font-semibold">{property.floors} Floors</p>
              </div>
            </div>

            {/* Property Details */}
            <div className="p-4">
              <h3 className="text-gray-900 font-bold text-lg mb-1">{property.name}</h3>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                <MapPin className="w-4 h-4" />
                <span>{property.city}, {property.state}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Total Rooms</p>
                  <p className="text-gray-900 font-bold">{property.totalRooms}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Occupied</p>
                  <p className="text-green-600 font-bold">{Math.floor(property.totalRooms * 0.8)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">Available</p>
                  <p className="text-blue-600 font-bold">{property.totalRooms - Math.floor(property.totalRooms * 0.8)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Settings Screen
  const renderSettings = () => (
    <div className="min-h-full bg-gray-50 pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 pt-6 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-white/30">
            OP
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">Owner Name</h2>
            <p className="text-white/70 text-sm">owner@pgmanager.com</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="p-6 space-y-6">
        {/* Property Settings */}
        <div>
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">Property</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">Manage Properties</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-green-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">Payment Settings</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Communication */}
        <div>
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">Communication</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">WhatsApp Integration</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">PG Rules (Chatbot)</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">Announcements</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* App Settings */}
        <div>
          <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-3">App</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">Notifications</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:scale-98 transition-transform">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left text-gray-900 font-medium">Account</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button className="w-full bg-red-50 text-red-600 rounded-2xl p-4 font-semibold hover:bg-red-100 active:scale-98 transition-all">
          Logout
        </button>
      </div>
    </div>
  );

  // Render the appropriate view
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return renderHome();
      case 'tenants':
        return renderTenants();
      case 'tenant-detail':
        return renderTenantDetail();
      case 'payments':
        return renderPayments();
      case 'maintenance':
        return renderMaintenance();
      case 'properties':
        return renderProperties();
      case 'settings':
        return renderSettings();
      default:
        return renderHome();
    }
  };

  return renderPhoneFrame(renderView());
}