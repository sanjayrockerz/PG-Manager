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
import { Support } from './components/Support';
import { AuditLog } from './components/AuditLog';
import { TeamMembers } from './components/TeamMembers';
import { AdminSection } from './components/AdminSection';
import { TenantPortal } from './components/TenantPortal';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { OTPLogin } from './components/OTPLogin';
import { OTPSignup } from './components/OTPSignup';
import { PortalSelector, type PortalType } from './components/PortalSelector';
import { Pricing } from './components/Pricing';
import { PageFrame } from './components/ui/PageFrame';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { isPlatformAdminRole } from './utils/roles';
import { hasPermission, TAB_PERMISSION_MAP, getDefaultTab } from './utils/permissions';
import { PageGuard } from './guards/PageGuard';

const PORTAL_STORAGE_KEY = 'rentcare:selected-portal';

const readStoredPortal = (): PortalType | null => {
  try {
    const v = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (v === 'owner' || v === 'admin' || v === 'tenant') {
      return v;
    }
  } catch {
    // ignore
  }
  return null;
};

const writeStoredPortal = (portal: PortalType | null): void => {
  try {
    if (portal) {
      localStorage.setItem(PORTAL_STORAGE_KEY, portal);
    } else {
      localStorage.removeItem(PORTAL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
};

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(readStoredPortal);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const handlePortalSelect = (portal: PortalType) => {
    setSelectedPortal(portal);
    writeStoredPortal(portal);
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    // Clear stored portal after the user is loaded — routing is now determined by role.
    writeStoredPortal(null);

    if (user.role === 'tenant' && activeTab !== 'tenant-portal') {
      setActiveTab('tenant-portal');
      setSelectedTenantId(null);
      return;
    }

    if (isPlatformAdminRole(user.role) && activeTab !== 'admin-section' && activeTab !== 'tenant-portal') {
      setActiveTab('admin-section');
      setSelectedTenantId(null);
      return;
    }

    // If user selected a portal but logged in with a mismatched role, silently correct it.
    if (selectedPortal === 'admin' && !isPlatformAdminRole(user.role) && user.role !== 'tenant') {
      setActiveTab('dashboard');
      setSelectedTenantId(null);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setActiveTabWithRoleGuard = (tab: string) => {
    if (!user) {
      setActiveTab(tab);
      return;
    }

    // Tabs not in the permission map (notifications, pricing) are always accessible
    const requiredAction = TAB_PERMISSION_MAP[tab];
    if (!requiredAction) {
      setActiveTab(tab);
      setSelectedTenantId(null);
      return;
    }

    if (hasPermission(user.role, requiredAction)) {
      setActiveTab(tab);
      setSelectedTenantId(null);
      return;
    }

    // Denied: redirect to the role's natural landing page
    setActiveTab(getDefaultTab(user.role));
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
    // Step 1: no portal selected — show the portal selector
    if (!selectedPortal) {
      return <PortalSelector onSelect={handlePortalSelect} />;
    }

    // Step 2: portal selected — show login with portal context
    if (showSignUp) {
      return (
        <OTPSignup
          onSwitchToLogin={() => setShowSignUp(false)}
        />
      );
    }
    return (
      <OTPLogin
        onSwitchToSignup={() => setShowSignUp(true)}
        portalType={selectedPortal}
        onBack={() => {
          setSelectedPortal(null);
          writeStoredPortal(null);
          setShowSignUp(false);
        }}
      />
    );
  }

  const renderContent = () => {
    if (activeTab === 'tenants' && selectedTenantId) {
      return (
        <PageGuard action="page:tenants">
          <TenantDetail tenantId={selectedTenantId} onBack={handleBackToTenants} />
        </PageGuard>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <PageGuard action="page:dashboard">
            <Dashboard onNavigate={setActiveTab} />
          </PageGuard>
        );
      case 'properties':
        return (
          <PageGuard action="page:properties">
            <Properties onNavigate={setActiveTab} />
          </PageGuard>
        );
      case 'tenants':
        return (
          <PageGuard action="page:tenants">
            <Tenants onViewTenant={handleViewTenant} />
          </PageGuard>
        );
      case 'payments':
        return (
          <PageGuard action="page:payments">
            <Payments />
          </PageGuard>
        );
      case 'maintenance':
        return (
          <PageGuard action="page:maintenance">
            <Maintenance />
          </PageGuard>
        );
      case 'announcements':
        return (
          <PageGuard action="page:announcements">
            <Announcements />
          </PageGuard>
        );
      case 'settings':
        return (
          <PageGuard action="page:settings">
            <Settings />
          </PageGuard>
        );
      case 'notifications':
        return (
          <Notifications
            onBack={() => setActiveTab('dashboard')}
            onNavigate={(tab) => setActiveTabWithRoleGuard(tab)}
          />
        );
      case 'support':
        return (
          <PageGuard action="page:support">
            <Support />
          </PageGuard>
        );
      case 'audit-log':
        return <AuditLog onBack={() => setActiveTab('dashboard')} />;
      case 'team':
        return <TeamMembers />;
      case 'pricing':
        return <Pricing />;
      case 'admin-section':
        return (
          <PageGuard action="page:admin-section">
            <AdminSection />
          </PageGuard>
        );
      case 'tenant-portal':
        return (
          <PageGuard action="page:tenant-portal">
            <TenantPortal />
          </PageGuard>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <PropertyProvider>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        {/* Sidebar for desktop */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTabWithRoleGuard}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
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
            <PageFrame>
              {renderContent()}
            </PageFrame>
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