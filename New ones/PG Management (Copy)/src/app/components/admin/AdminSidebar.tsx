import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  Headphones,
  Settings,
  FileText,
  LogOut,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
}

const navSections = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'USERS',
    items: [
      { id: 'owners', label: 'All Owners', icon: Users },
    ],
  },
  {
    title: 'REVENUE',
    items: [
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { id: 'transactions', label: 'Transactions', icon: Receipt },
    ],
  },
  {
    title: 'INSIGHTS',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { id: 'support', label: 'Support Tickets', icon: Headphones },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Platform Settings', icon: Settings },
      { id: 'audit', label: 'Audit Log', icon: FileText },
    ],
  },
];

export function AdminSidebar({
  activeScreen,
  setActiveScreen,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
}: AdminSidebarProps) {
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
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 bg-[#0F172A] flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">R</span>
              </div>
              <div>
                <div className="text-white font-bold">RentCare</div>
                <div className="text-gray-400 text-xs">Admin Console</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin Profile Card */}
          <div className="bg-[#1E293B] rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">K</span>
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Khush Goyal</div>
                <div className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full inline-block mt-1">
                  Super Admin
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveScreen(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg
                        transition-colors text-left
                        ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-300 hover:bg-[#1E293B] hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
