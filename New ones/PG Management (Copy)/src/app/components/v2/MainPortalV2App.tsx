import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { OwnerLogin } from '../owner/OwnerLogin';
import { OwnerSignup } from '../owner/OwnerSignup';
import { Sidebar } from '../Sidebar';
import { HeaderV2 } from './HeaderV2';
import { MobileNav } from '../MobileNav';
import { DashboardV2 } from './DashboardV2';
import { BuildingView } from './BuildingView';
import { PropertiesV2 } from './PropertiesV2';
import { TenantsV2 } from './TenantsV2';
import { TenantDetailV2 } from './TenantDetailV2';
import { PaymentsV2 } from './PaymentsV2';
import { MaintenanceV2 } from './MaintenanceV2';
import { AnnouncementsV2 } from './AnnouncementsV2';
import { Support } from '../Support';
import { SettingsV2 } from './SettingsV2';
import { Notifications } from '../Notifications';
import { Pricing } from '../Pricing';

export function MainPortalV2App() {
  const { user, loginWithEmail, signupWithEmail, logout } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState('all');

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
      return <TenantDetailV2 tenantId={selectedTenantId} onBack={handleBackToTenants} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardV2 onNavigate={setActiveTab} />;
      case 'building-view':
        return <BuildingView />;
      case 'properties':
        return <PropertiesV2 onNavigate={setActiveTab} />;
      case 'tenants':
        return <TenantsV2 onViewTenant={handleViewTenant} />;
      case 'payments':
        return <PaymentsV2 />;
      case 'maintenance':
        return <MaintenanceV2 />;
      case 'announcements':
        return <AnnouncementsV2 />;
      case 'support':
        return <Support />;
      case 'settings':
        return <SettingsV2 />;
      case 'notifications':
        return <Notifications onBack={() => setActiveTab('dashboard')} />;
      case 'pricing':
        return <Pricing />;
      default:
        return <DashboardV2 onNavigate={setActiveTab} />;
    }
  };

  return (
    <PropertyProvider>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
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
          <HeaderV2
            setSidebarOpen={setSidebarOpen}
            currentPage={activeTab}
            onNotificationClick={() => setActiveTab('notifications')}
            selectedProperty={selectedProperty}
            onPropertyChange={setSelectedProperty}
          />

          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className={activeTab === 'building-view' ? '' : 'p-4 md:p-6 lg:p-8'}>
              {renderContent()}
            </div>
          </main>

          {/* Mobile bottom navigation */}
          <MobileNav
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setSelectedTenantId(null);
            }}
          />
        </div>
      </div>
    </PropertyProvider>
  );
}
