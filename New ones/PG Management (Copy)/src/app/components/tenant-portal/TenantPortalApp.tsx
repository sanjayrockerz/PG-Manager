import { useState } from 'react';
import { TenantSidebar } from './TenantSidebar';
import { TenantHeader } from './TenantHeader';
import { TenantDashboard } from './TenantDashboard';
import { TenantPayments } from './TenantPayments';
import { TenantMaintenance } from './TenantMaintenance';
import { NewMaintenanceRequest } from './NewMaintenanceRequest';
import { TenantAnnouncements } from './TenantAnnouncements';
import { TenantDocuments } from './TenantDocuments';
import { TenantProfile } from './TenantProfile';
import { TenantHelp } from './TenantHelp';

export function TenantPortalApp() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <TenantDashboard setActiveScreen={setActiveScreen} />;
      case 'payments':
        return <TenantPayments />;
      case 'maintenance':
        return <TenantMaintenance setActiveScreen={setActiveScreen} />;
      case 'new-maintenance':
        return <NewMaintenanceRequest setActiveScreen={setActiveScreen} />;
      case 'announcements':
        return <TenantAnnouncements />;
      case 'documents':
        return <TenantDocuments />;
      case 'profile':
        return <TenantProfile />;
      case 'help':
        return <TenantHelp />;
      default:
        return <TenantDashboard setActiveScreen={setActiveScreen} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <TenantSidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TenantHeader setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}
