import { useState } from 'react';
import { PortalSelector } from './components/PortalSelector';
import { RentCareApp } from './components/rentcare/RentCareApp';
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
import { AdminApp } from './components/admin/AdminApp';
import { OwnerLogin } from './components/owner/OwnerLogin';
import { OwnerSignup } from './components/owner/OwnerSignup';
import { Support } from './components/Support';
import { MainPortalV2App } from './components/v2/MainPortalV2App';

function MainPortalApp() {
  const { user, loginWithEmail, signupWithEmail, logout } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const handleViewTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handleBackToTenants = () => {
    setSelectedTenantId(null);
  };

  const handleLogin = async (email: string, password: string) => {
    await loginWithEmail(email, password);
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    await signupWithEmail(name, email, password);
  };

  const handleLogout = () => {
    logout();
  };

  // Show auth pages if not logged in
  if (!user) {
    if (showSignUp) {
      return <OwnerSignup onSwitchToLogin={() => setShowSignUp(false)} onSignup={handleSignup} />;
    }
    return <OwnerLogin onSwitchToSignup={() => setShowSignUp(true)} onLogin={handleLogin} />;
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
      case 'support':
        return <Support />;
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
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar for desktop */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedTenantId(null);
          }}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
          userPlan="free"
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            setSidebarOpen={setSidebarOpen}
            currentPage={activeTab}
            onNotificationClick={() => setActiveTab('notifications')}
          />

          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className={activeTab === 'mobile-mockup' ? '' : 'p-4 md:p-6 lg:p-8'}>
              {renderContent()}
            </div>
          </main>

          {/* Mobile bottom navigation */}
          <MobileNav activeTab={activeTab} setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedTenantId(null);
          }} />
        </div>
      </div>
    </PropertyProvider>
  );
}

function AppContent() {
  const [selectedPortal, setSelectedPortal] = useState<'main' | 'main-v1' | 'admin' | 'tenant' | null>(null);

  // Show portal selection screen
  if (!selectedPortal) {
    return <PortalSelector onSelectPortal={setSelectedPortal} />;
  }

  // Show RentCare (Tenant Portal)
  if (selectedPortal === 'tenant') {
    return <RentCareApp />;
  }

  // Show Admin Portal (RentCare Admin Console)
  if (selectedPortal === 'admin') {
    return <AdminApp onBackToHome={() => setSelectedPortal(null)} />;
  }

  // Show Main Portal Version 1 (Classic)
  if (selectedPortal === 'main-v1') {
    return (
      <AuthProvider>
        <MainPortalApp />
      </AuthProvider>
    );
  }

  // Show Main Portal Version 2 (New Comprehensive Design)
  return (
    <AuthProvider>
      <MainPortalV2App />
    </AuthProvider>
  );
}

export default function App() {
  return <AppContent />;
}