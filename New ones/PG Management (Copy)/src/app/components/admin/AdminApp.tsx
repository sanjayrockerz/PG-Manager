import { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminMobileNav } from './AdminMobileNav';
import { AdminDashboard } from './AdminDashboard';
import { AllOwners } from './AllOwners';
import { UserDetail } from './UserDetail';
import { Subscriptions } from './Subscriptions';
import { Transactions } from './Transactions';
import { Analytics } from './Analytics';
import { SupportTickets } from './SupportTickets';
import { PlatformSettings } from './PlatformSettings';
import { AuditLog } from './AuditLog';

interface AdminAppProps {
  onBackToHome: () => void;
}

export function AdminApp({ onBackToHome }: AdminAppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const handleLogin = (email: string, password: string) => {
    // In a real app, this would validate credentials
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveScreen('dashboard');
    setSelectedOwnerId(null);
  };

  const handleViewOwner = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
  };

  const handleBackToOwners = () => {
    setSelectedOwnerId(null);
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} onBackToHome={onBackToHome} />;
  }

  // Render content based on active screen
  const renderContent = () => {
    // If viewing user detail from owners screen
    if (activeScreen === 'owners' && selectedOwnerId) {
      return <UserDetail ownerId={selectedOwnerId} onBack={handleBackToOwners} />;
    }

    switch (activeScreen) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'owners':
        return <AllOwners onViewOwner={handleViewOwner} />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'transactions':
        return <Transactions />;
      case 'analytics':
        return <Analytics />;
      case 'support':
        return <SupportTickets />;
      case 'settings':
        return <PlatformSettings />;
      case 'audit':
        return <AuditLog />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeScreen={activeScreen}
        setActiveScreen={(screen) => {
          setActiveScreen(screen);
          setSelectedOwnerId(null);
        }}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <AdminMobileNav
          activeScreen={activeScreen}
          setActiveScreen={(screen) => {
            setActiveScreen(screen);
            setSelectedOwnerId(null);
          }}
        />
      </div>
    </div>
  );
}
