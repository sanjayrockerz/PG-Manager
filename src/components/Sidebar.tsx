import { useState } from 'react';
import { Home, Users, CreditCard, Wrench, Bell, Settings, X, Building2, DollarSign, Smartphone, Shield, UserCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userRole?: 'owner' | 'admin' | 'tenant' | 'super_admin';
}

const ownerMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'announcements', label: 'Announcements', icon: Bell },
  { id: 'mobile-mockup', label: 'Mobile Preview', icon: Smartphone },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
];

const portalMenuItems = [
  { id: 'admin-section', label: 'Admin Panel', icon: Shield },
  { id: 'tenant-portal', label: 'Tenant Portal', icon: UserCircle },
];

export function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, userRole = 'owner' }: SidebarProps) {
  const [portalsExpanded, setPortalsExpanded] = useState(false);

  const visibleMainMenuItems = userRole === 'owner' ? ownerMenuItems : [];

  const visiblePortalMenuItems = portalMenuItems.filter((item) => {
    if (item.id === 'admin-section') {
      return userRole === 'admin' || userRole === 'super_admin';
    }
    if (item.id === 'tenant-portal') {
      return userRole === 'tenant' || userRole === 'admin' || userRole === 'super_admin';
    }
    return false;
  });

  const showPortalSection = visiblePortalMenuItems.length > 0;

  const isPortalActive = activeTab === 'admin-section' || activeTab === 'tenant-portal';

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
              <span className="font-semibold">PG Manager</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Main Menu Items */}
            {visibleMainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-colors
                    ${isActive 
                      ? 'bg-gray-100 text-gray-900 font-semibold' 
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {showPortalSection && (
              <>
                {/* Divider */}
                <div className="my-2 border-t border-gray-200"></div>

                {/* Portals Section with Submenu */}
                <div>
                  <button
                    onClick={() => setPortalsExpanded(!portalsExpanded)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-colors
                      ${isPortalActive
                        ? 'bg-gray-100 text-gray-900 font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="flex-1 text-left">Portal Sections</span>
                    {portalsExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Submenu */}
                  {portalsExpanded && (
                    <div className="mt-1 ml-4 space-y-1">
                      {visiblePortalMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setSidebarOpen(false);
                            }}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                              transition-colors text-sm
                              ${isActive 
                                ? 'bg-gray-100 text-gray-900 font-semibold' 
                                : 'text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Settings at bottom of menu */}
            <button
              onClick={() => {
                setActiveTab('settings');
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-colors
                ${activeTab === 'settings'
                  ? 'bg-gray-100 text-gray-900 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Footer */}
          {userRole === 'owner' && (
            <div className="p-4 border-t border-gray-200">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-4 text-white">
                <p className="text-sm">Upgrade to Pro</p>
                <p className="text-xs opacity-90 mt-1">Get unlimited features</p>
                <button className="mt-3 w-full bg-white text-blue-600 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                  Upgrade Now
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
