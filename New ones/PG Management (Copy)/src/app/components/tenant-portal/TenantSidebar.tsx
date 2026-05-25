import {
  LayoutDashboard,
  CreditCard,
  Wrench,
  Bell,
  FileText,
  User,
  HelpCircle,
  LogOut,
  X
} from 'lucide-react';

interface TenantSidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function TenantSidebar({ activeScreen, setActiveScreen, sidebarOpen, setSidebarOpen }: TenantSidebarProps) {
  const menuItems = [
    { id: 'overview', section: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]},
    { id: 'finance', section: 'Finance', items: [
      { id: 'payments', label: 'Payments', icon: CreditCard }
    ]},
    { id: 'operations', section: 'Operations', items: [
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'announcements', label: 'Announcements', icon: Bell }
    ]},
    { id: 'account', section: 'My Account', items: [
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'help', label: 'Help & Rules', icon: HelpCircle }
    ]}
  ];

  const handleNavClick = (screen: string) => {
    setActiveScreen(screen);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white">
      {/* Logo and tenant info */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">RentCare</h1>
            <p className="text-xs text-gray-500 mt-0.5">Tenant Portal</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tenant info card */}
        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              PS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Priya Sharma</p>
              <p className="text-xs text-gray-600">Room 205</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">Green Valley PG</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {menuItems.map((section) => (
            <div key={section.id}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                {section.section}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Sign out button */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-[230px] border-r border-gray-200 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside className="w-[280px] h-full" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
