import { LayoutDashboard, CreditCard, Wrench, Bell, FileText, User, HelpCircle, LogOut, X } from 'lucide-react';

interface RentCareSidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function RentCareSidebar({ activeScreen, setActiveScreen, sidebarOpen, setSidebarOpen }: RentCareSidebarProps) {
  const menuSections = [
    {
      label: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      label: 'FINANCE',
      items: [
        { id: 'payments', label: 'Payments', icon: CreditCard }
      ]
    },
    {
      label: 'OPERATIONS',
      items: [
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
        { id: 'announcements', label: 'Announcements', icon: Bell }
      ]
    },
    {
      label: 'MY ACCOUNT',
      items: [
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'help', label: 'Help & Rules', icon: HelpCircle }
      ]
    }
  ];

  const handleNavClick = (screen: string) => {
    setActiveScreen(screen);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white">
      {/* Logo and Profile */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">RentCare</h1>
              <p className="text-xs text-gray-500">Tenant Portal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tenant Profile Card */}
        <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white/30">
              PS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate">Priya Sharma</p>
              <p className="text-purple-200 text-xs">Room 205</p>
            </div>
          </div>
          <p className="text-white text-sm">Green Valley PG</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {menuSections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-bold text-gray-500 mb-2 px-2">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#4F46E5] text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[240px] border-r border-gray-200 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside className="w-[280px] h-full" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
