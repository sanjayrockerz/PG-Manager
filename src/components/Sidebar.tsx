import { useState } from 'react';
import { Home, Users, CreditCard, Wrench, Bell, Settings, X, Building2, Shield, UserCircle, ChevronDown, ChevronRight, LifeBuoy, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLocalization } from '../contexts/LocalizationContext';
import { isPlatformAdminRole, isScopedOwnerRole } from '../utils/roles';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  userRole?: 'owner' | 'owner_manager' | 'staff' | 'admin' | 'tenant' | 'super_admin' | 'platform_admin';
}

const ownerMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'announcements', label: 'Announcements', icon: Bell },
  { id: 'support', label: 'Support', icon: LifeBuoy },
];

const staffMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'announcements', label: 'Announcements', icon: Bell },
  { id: 'support', label: 'Support', icon: LifeBuoy },
];

const portalMenuItems = [
  { id: 'admin-section', label: 'Admin Panel', icon: Shield },
  { id: 'tenant-portal', label: 'Tenant Portal', icon: UserCircle },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  userRole = 'owner',
}: SidebarProps) {
  const [portalsExpanded, setPortalsExpanded] = useState(false);
  const { t } = useLocalization();

  const isPlatformAdmin = isPlatformAdminRole(userRole);
  const isScopedStaff = isScopedOwnerRole(userRole);

  const visibleMainMenuItems = userRole === 'owner'
    ? ownerMenuItems
    : (isScopedStaff ? staffMenuItems : []);

  const visiblePortalMenuItems = portalMenuItems.filter((item) => {
    if (item.id === 'admin-section') {
      return isPlatformAdmin;
    }
    if (item.id === 'tenant-portal') {
      return userRole === 'owner' || userRole === 'tenant' || isScopedStaff || isPlatformAdmin;
    }
    return false;
  });

  const showPortalSection = visiblePortalMenuItems.length > 0;

  const isPortalActive = activeTab === 'admin-section' || activeTab === 'tenant-portal';

  const groupedSections = [
    {
      title: 'Management',
      ids: ['dashboard', 'properties', 'tenants'],
    },
    {
      title: 'Finance',
      ids: ['payments'],
    },
    {
      title: 'Operations',
      ids: ['maintenance', 'announcements', 'support'],
    },
  ] as const;

  const getLocalizedLabel = (id: string, label: string): string => {
    if (id === 'dashboard') return t('nav.dashboard', label);
    if (id === 'properties') return t('nav.properties', label);
    if (id === 'tenants') return t('nav.tenants', label);
    if (id === 'payments') return t('nav.payments', label);
    if (id === 'maintenance') return t('nav.maintenance', label);
    if (id === 'announcements') return t('nav.announcements', label);
    if (id === 'support') return t('nav.support', label);
    return label;
  };

  const renderNavItem = (item: (typeof ownerMenuItems)[number], compact = false) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          setSidebarOpen(false);
        }}
        title={item.label}
        className={`w-full flex items-center gap-3 py-2.5 rounded-lg transition-colors ${compact ? 'justify-center px-2' : 'px-3'} ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <Icon className="w-4 h-4" />
        {!compact && <span className="text-sm">{getLocalizedLabel(item.id, item.label)}</span>}
      </button>
    );
  };

  const canShowSettings = userRole === 'owner' || isPlatformAdmin || userRole === 'tenant';

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
        w-60 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'} bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:transition-[width]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between border-b border-gray-200 ${sidebarCollapsed ? 'p-3' : 'p-4'}`}>
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg"></div>
              <span className={`text-sm font-semibold text-gray-900 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>PG Manager</span>
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:inline-flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
            {groupedSections.map((section) => {
              const sectionItems = section.ids
                .map((id) => visibleMainMenuItems.find((item) => item.id === id))
                .filter((item): item is (typeof ownerMenuItems)[number] => Boolean(item));

              if (sectionItems.length === 0) {
                return null;
              }

              return (
                <div key={section.title}>
                  {!sidebarCollapsed && (
                    <p className="px-3 pb-2 text-xs uppercase tracking-wide text-gray-400">{section.title}</p>
                  )}
                  <div className="space-y-1">
                    {sectionItems.map((item) => renderNavItem(item, sidebarCollapsed))}
                  </div>
                </div>
              );
            })}

            {showPortalSection && !sidebarCollapsed && (
              <>
                <div className="border-t border-gray-200 pt-4">
                  <p className="px-3 pb-2 text-xs uppercase tracking-wide text-gray-400">Portals</p>

                  <button
                    onClick={() => setPortalsExpanded(!portalsExpanded)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isPortalActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="flex-1 text-left text-sm">{t('nav.portalSections', 'Portal Sections')}</span>
                    {portalsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {portalsExpanded && (
                    <div className="mt-1 ml-3 space-y-1">
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
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.id === 'admin-section' ? t('nav.adminPanel', item.label) : t('nav.tenantPortal', item.label)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {showPortalSection && sidebarCollapsed && (
              <>
                <div className="my-2 border-t border-gray-200"></div>
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
                      title={item.label}
                      className={`w-full flex items-center justify-center px-2 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </>
            )}

            {canShowSettings && (
              <div className="border-t border-gray-200 pt-4">
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-xs uppercase tracking-wide text-gray-400">Settings</p>
                )}
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setSidebarOpen(false);
                  }}
                  title="Settings"
                  className={`w-full flex items-center gap-3 py-2.5 rounded-lg transition-colors ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Settings className="w-4 h-4" />
                  {!sidebarCollapsed && <span className="text-sm">{t('nav.settings', 'Settings')}</span>}
                </button>
              </div>
            )}
          </nav>

        </div>
      </aside>
    </>
  );
}
