import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PropertyProvider } from './contexts/PropertyContext';
import { Dashboard } from './components/Dashboard';
import { Tenants } from './components/Tenants';
import { TenantDetail } from './components/TenantDetail';
import { Payments } from './components/Payments';
import { Maintenance } from './components/Maintenance';
import { Announcements } from './components/Announcements';
import { Settings } from './components/Settings';
import { Properties } from './components/Properties';
import { Notifications } from './components/Notifications';
import { Pricing } from './components/Pricing';
import { Subscriptions } from './components/Subscriptions';
import { Support } from './components/Support';
import { AdminSection } from './components/AdminSection';
import { TenantPortal } from './components/TenantPortal';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { OTPLogin } from './components/OTPLogin';
import { OTPSignup } from './components/OTPSignup';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { isPlatformAdminRole, isScopedOwnerRole } from './utils/roles';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role === 'tenant' && activeTab !== 'tenant-portal') {
      setActiveTab('tenant-portal');
      setSelectedTenantId(null);
    }

    if (isPlatformAdminRole(user.role) && activeTab !== 'admin-section' && activeTab !== 'tenant-portal') {
      setActiveTab('admin-section');
      setSelectedTenantId(null);
    }

  }, [user, activeTab]);

  const setActiveTabWithRoleGuard = (tab: string) => {
    if (!user) {
      setActiveTab(tab);
      return;
    }

    if (tab === 'admin-section' && !isPlatformAdminRole(user.role)) {
      setActiveTab('dashboard');
      setSelectedTenantId(null);
      return;
    }

    if (user.role === 'tenant') {
      setActiveTab('tenant-portal');
      setSelectedTenantId(null);
      return;
    }

    if (isPlatformAdminRole(user.role)) {
      if (tab === 'admin-section' || tab === 'tenant-portal' || tab === 'settings') {
        setActiveTab(tab);
      } else {
        setActiveTab('admin-section');
      }
      setSelectedTenantId(null);
      return;
    }

    if (isScopedOwnerRole(user.role)) {
      const allowedTabs = new Set(['dashboard', 'properties', 'tenants', 'payments', 'maintenance', 'announcements', 'support', 'tenant-portal', 'notifications']);
      setActiveTab(allowedTabs.has(tab) ? tab : 'dashboard');
      setSelectedTenantId(null);
      return;
    }

    setActiveTab(tab);
    setSelectedTenantId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Loading account...</p>
        </div>
      </div>
    );
  }

  const handleViewTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handleBackToTenants = () => {
    setSelectedTenantId(null);
  };

  // Show auth pages if not logged in
  if (!user) {
    if (showSignUp) {
      return <OTPSignup onSwitchToLogin={() => setShowSignUp(false)} />;
    }
    return <OTPLogin onSwitchToSignup={() => setShowSignUp(true)} />;
  }

  const renderContent = () => {
    // If viewing tenant detail, show that
    if (activeTab === 'tenants' && selectedTenantId) {
      return <TenantDetail tenantId={selectedTenantId} onBack={handleBackToTenants} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'properties':
        return <Properties />;
      case 'tenants':
        return <Tenants onViewTenant={handleViewTenant} />;
      case 'payments':
        return <Payments />;
      case 'maintenance':
        return <Maintenance />;
      case 'announcements':
        return <Announcements />;
      case 'settings':
        return <Settings />;
      case 'notifications':
        return <Notifications onBack={() => setActiveTab('dashboard')} />;
      case 'pricing':
        return <Pricing />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'support':
        return <Support />;
      case 'admin-dashboard':
        return isPlatformAdminRole(user.role) ? <AdminSection view="dashboard" onNavigate={(v) => setActiveTab(`admin-${v}`)} /> : <Dashboard />;
      case 'admin-owners':
        return isPlatformAdminRole(user.role) ? <AdminSection view="owners" onNavigate={(v) => setActiveTab(`admin-${v}`)} /> : <Dashboard />;
      case 'admin-subscriptions':
        return isPlatformAdminRole(user.role) ? <AdminSection view="subscriptions" onNavigate={(v) => setActiveTab(`admin-${v}`)} /> : <Dashboard />;
      case 'admin-support':
        return isPlatformAdminRole(user.role) ? <AdminSection view="support" onNavigate={(v) => setActiveTab(`admin-${v}`)} /> : <Dashboard />;
      case 'admin-activity':
        return isPlatformAdminRole(user.role) ? <AdminSection view="activity" onNavigate={(v) => setActiveTab(`admin-${v}`)} /> : <Dashboard />;
      case 'tenant-portal':
        return <TenantPortal />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <PropertyProvider>
      <div className="flex h-screen bg-slate-100 overflow-hidden">
        {/* Sidebar for desktop */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTabWithRoleGuard}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userRole={user.role}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            setSidebarOpen={setSidebarOpen} 
            currentPage={activeTab}
            onNotificationClick={() => setActiveTabWithRoleGuard('notifications')}
          />
          
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="p-4 md:p-6 lg:p-8">
              {renderContent()}
            </div>
          </main>

          {/* Mobile bottom navigation */}
          <MobileNav activeTab={activeTab} setActiveTab={setActiveTabWithRoleGuard} userRole={user.role} />
        </div>
      </div>
    </PropertyProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocalizationProvider>
        <AppContent />
      </LocalizationProvider>
    </AuthProvider>
  );
}