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
import { MobileMockup } from './components/MobileMockup';
import { AdminSection } from './components/AdminSection';
import { TenantPortal } from './components/TenantPortal';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { OTPLogin } from './components/OTPLogin';
import { OTPSignup } from './components/OTPSignup';

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

    if ((user.role === 'admin' || user.role === 'super_admin') && activeTab !== 'admin-section' && activeTab !== 'tenant-portal') {
      setActiveTab('admin-section');
      setSelectedTenantId(null);
    }

    if (user.role === 'owner' && (activeTab === 'admin-section' || activeTab === 'tenant-portal')) {
      setActiveTab('dashboard');
      setSelectedTenantId(null);
    }
  }, [user, activeTab]);

  const setActiveTabWithRoleGuard = (tab: string) => {
    if (!user) {
      setActiveTab(tab);
      return;
    }

    if (user.role === 'tenant') {
      setActiveTab('tenant-portal');
      setSelectedTenantId(null);
      return;
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      if (tab === 'admin-section' || tab === 'tenant-portal' || tab === 'settings') {
        setActiveTab(tab);
      } else {
        setActiveTab('admin-section');
      }
      setSelectedTenantId(null);
      return;
    }

    if (user.role === 'owner' && (tab === 'admin-section' || tab === 'tenant-portal')) {
      setActiveTab('dashboard');
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
      case 'mobile-mockup':
        return <MobileMockup />;
      case 'pricing':
        return <Pricing />;
      case 'admin-section':
        return <AdminSection />;
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
            <div className={activeTab === 'mobile-mockup' ? '' : 'p-4 md:p-6 lg:p-8'}>
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
      <AppContent />
    </AuthProvider>
  );
}