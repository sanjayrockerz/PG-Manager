import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PropertyProvider } from './contexts/PropertyContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { Dashboard } from './components/Dashboard';
import { Tenants } from './components/Tenants';
import { TenantDetail } from './components/TenantDetail';
import { Payments } from './components/Payments';
import { Maintenance } from './components/Maintenance';
import { Announcements } from './components/Announcements';
import { Settings } from './components/Settings';
import { Properties } from './components/Properties';
import { BuildingView } from './components/BuildingView';
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
import { AdminLogin } from './components/AdminLogin';
import { OTPSignup } from './components/OTPSignup';
import { PortalSelector, type PortalType } from './components/PortalSelector';
import { Pricing } from './components/Pricing';
import { PageFrame } from './components/ui/PageFrame';
import { AcceptInvite } from './components/AcceptInvite';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { DateRangeProvider } from './contexts/DateRangeContext';
import { isPlatformAdminRole } from './utils/roles';
import { hasPermission, TAB_PERMISSION_MAP, getDefaultTab } from './utils/permissions';
import { PageGuard } from './guards/PageGuard';

const PORTAL_STORAGE_KEY = 'rentcare:selected-portal';

const readInviteToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token')?.trim();
  return token ? token : null;
};

const isAcceptInviteRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/accept-invite');
};

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
  const { user, isLoading, isSuspended } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(() => (
    readStoredPortal() ?? (readInviteToken() ? 'owner' : null)
  ));
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
      // Reset portal selection on logout so selector is always shown again
      setSelectedPortal(readInviteToken() ? 'owner' : null);
      writeStoredPortal(null);
      return;
    }

    // Clear stored portal after the user is loaded — routing is now determined by role.
    writeStoredPortal(null);

    if (user.role === 'tenant' && activeTab !== 'tenant-portal') {
      setActiveTab('tenant-portal');
      setSelectedTenantId(null);
      return;
    }

    if (isPlatformAdminRole(user.role) && activeTab !== 'admin-section') {
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

  if (isAcceptInviteRoute()) {
    return <AcceptInvite />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-5">
          <div className="relative w-16 h-16 mx-auto">
            {/* Pulsing Outer Glow */}
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse" />
            {/* Logo box */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-2xl text-white font-black tracking-tight">RC</span>
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-800">RentCare</h2>
            <p className="text-xs text-zinc-400 font-medium">Securing session...</p>
          </div>
          {/* Progress track */}
          <div className="w-28 h-1 bg-zinc-200 rounded-full overflow-hidden mx-auto relative">
            <div className="h-full bg-indigo-600 rounded-full w-12 animate-loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span style={{ fontSize: 28 }}>🔒</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your account has been suspended. Please contact RentCare support to resolve this.
          </p>
          <a
            href="mailto:support@rentcare.app"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Contact Support
          </a>
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

    // Admin Portal uses an isolated email+password sign-in — no Google/magic-link/OTP.
    if (selectedPortal === 'admin') {
      return (
        <AdminLogin
          onBack={() => {
            setSelectedPortal(null);
            writeStoredPortal(null);
          }}
        />
      );
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
      case 'building-view':
        return (
          <PageGuard action="page:properties">
            <BuildingView
              onTenantClick={(tenantId) => {
                setActiveTabWithRoleGuard('tenants');
                setSelectedTenantId(tenantId);
              }}
              onNavigate={setActiveTab}
            />
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
            <Payments onNavigate={setActiveTab} />
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
            onNavigate={(tab, entityId) => {
              setActiveTabWithRoleGuard(tab);
              if (tab === 'tenants' && entityId) {
                setSelectedTenantId(entityId);
              }
            }}
          />
        );
      case 'support':
        return (
          <PageGuard action="page:support">
            <Support />
          </PageGuard>
        );
      case 'audit-log':
        return (
          <PageGuard action="page:dashboard">
            <AuditLog onBack={() => setActiveTab('dashboard')} />
          </PageGuard>
        );
      case 'team':
        return (
          <PageGuard action="team:manage">
            <TeamMembers />
          </PageGuard>
        );
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

  // Platform admins get a full-screen admin portal — no owner sidebar/header overlay
  if (isPlatformAdminRole(user.role) && activeTab === 'admin-section') {
    return (
      <PropertyProvider>
        <WorkspaceProvider>
          <PageGuard action="page:admin-section">
            <AdminSection />
          </PageGuard>
        </WorkspaceProvider>
      </PropertyProvider>
    );
  }

  // Tenants get a full-screen tenant portal — no owner sidebar/header overlay
  if (user.role === 'tenant' && activeTab === 'tenant-portal') {
    return (
      <PageGuard action="page:tenant-portal">
        <TenantPortal />
      </PageGuard>
    );
  }

  return (
    <PropertyProvider>
      <WorkspaceProvider>
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
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => {
              const next = !sidebarCollapsed;
              localStorage.setItem('sidebar_collapsed', String(next));
              setSidebarCollapsed(next);
            }}
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
      </WorkspaceProvider>
    </PropertyProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocalizationProvider>
        <DateRangeProvider>
          <AppContent />
        </DateRangeProvider>
      </LocalizationProvider>
    </AuthProvider>
  );
}