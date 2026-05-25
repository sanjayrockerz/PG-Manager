import { useState } from 'react';
import { Home, Users, CreditCard, Wrench, Bell, Settings as SettingsIcon, X, Building2, Headphones, LogOut, Zap, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onLogout?: () => void;
  userPlan?: 'free' | 'pro' | 'scale';
}

const getNavSections = (userPlan: 'free' | 'pro' | 'scale') => [
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'properties', label: 'Properties', icon: Building2 },
      { id: 'tenants', label: 'Tenants', icon: Users },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'announcements', label: 'Announcements', icon: Bell },
    ],
  },
  ...(userPlan === 'free' ? [{
    title: 'UPGRADE',
    items: [
      { id: 'pricing', label: 'Pricing', icon: DollarSign },
    ],
  }] : []),
  {
    title: 'SUPPORT',
    items: [
      { id: 'support', label: 'Support', icon: Headphones },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, onLogout, userPlan = 'free' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navSections = getNavSections(userPlan);

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        ${isCollapsed ? 'w-[70px]' : 'w-[230px]'} bg-white border-r border-[#E2E8F0]
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full relative">
          {/* Collapse Button (Desktop only) */}
          <div className="hidden md:block absolute -right-3 top-24 z-60">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-7 h-7 bg-white border-2 border-[#4F46E5] rounded-full
                flex items-center justify-center hover:bg-[#4F46E5] hover:text-white
                transition-all shadow-lg"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Logo */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 bg-[#4F46E5] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              {!isCollapsed && (
                <div>
                  <span className="font-bold text-gray-900">RentCare</span>
                  <p className="text-xs text-gray-500">Owner Portal</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.title} className="mb-6">
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
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
                          w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg
                          transition-all text-sm
                          ${isActive
                            ? 'bg-[#4F46E5] text-white font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                        title={isCollapsed ? item.label : ''}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Upgrade Card (only for free users) */}
          {userPlan === 'free' && !isCollapsed && (
            <div className="px-3 py-4 border-t border-gray-200">
              <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-lg p-3 text-white">
                <p className="text-sm font-medium mb-1">Upgrade to Pro</p>
                <p className="text-xs opacity-90 mb-3">Unlock all features</p>
                <button className="w-full bg-white text-[#4F46E5] py-2 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

          {/* Footer - Sign Out */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={onLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm`}
              title={isCollapsed ? 'Sign Out' : ''}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
