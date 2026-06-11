import { useState, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  CreditCard,
  FileClock,
  HeadphonesIcon,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings as SettingsIcon,
  Users,
  X,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type AdminNavId =
  | 'dashboard'
  | 'owners'
  | 'subscriptions'
  | 'transactions'
  | 'analytics'
  | 'support'
  | 'platform-settings'
  | 'audit-logs'
  | 'team-management';

interface AdminNavItem {
  id: AdminNavId;
  label: string;
  icon: typeof LayoutGrid;
  badge?: number;
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

interface AdminLayoutProps {
  current: AdminNavId;
  onNavigate: (id: AdminNavId) => void;
  profileName: string;
  profileRole: string;
  notificationCount?: number;
  children: React.ReactNode;
}

function buildGroups(notificationCount: number): AdminNavGroup[] {
  return [
    { label: 'OVERVIEW', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }] },
    {
      label: 'USERS',
      items: [
        { id: 'owners', label: 'All Owners', icon: Users },
        { id: 'team-management', label: 'Team Invites', icon: Activity },
      ],
    },
    {
      label: 'REVENUE',
      items: [
        { id: 'subscriptions', label: 'Subscriptions', icon: Package },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
      ],
    },
    { label: 'INSIGHTS', items: [{ id: 'analytics', label: 'Analytics', icon: BarChart3 }] },
    {
      label: 'SUPPORT',
      items: [
        { id: 'support', label: 'Support Tickets', icon: HeadphonesIcon, badge: notificationCount },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        { id: 'platform-settings', label: 'Platform Settings', icon: SettingsIcon },
        { id: 'audit-logs', label: 'Audit Log', icon: FileClock },
      ],
    },
  ];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function SidebarContent({ current, onNavigate, profileName, profileRole, notificationCount, onSignOut, collapsed = false }: {
  current: AdminNavId;
  onNavigate: (id: AdminNavId) => void;
  profileName: string;
  profileRole: string;
  notificationCount: number;
  onSignOut: () => void;
  collapsed?: boolean;
}) {
  const groups = buildGroups(notificationCount);
  return (
    <div className="flex h-full flex-col bg-[#0B1120] text-white">
      {/* Brand */}
      <div className={`pt-5 pb-4 transition-all duration-300 ${collapsed ? 'px-2 flex justify-center' : 'px-5'}`}>
        <div className={`flex items-center transition-all duration-300 ${collapsed ? 'gap-0' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center text-sm font-bold shrink-0">R</div>
          <div className={`min-w-0 transition-all duration-300 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-[15px] font-semibold leading-tight truncate">RentCare</p>
            <p className="text-[11px] text-slate-400 leading-tight">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div className={`pb-4 transition-all duration-300 ${collapsed ? 'px-2 flex justify-center' : 'px-4'}`}>
        <div className={`group relative rounded-xl transition-all duration-300 ${
          collapsed ? 'bg-transparent border-transparent px-0 py-0 gap-0' : 'bg-[#7C3AED]/20 border border-[#7C3AED]/30 px-3.5 py-2.5 gap-3'
        } flex items-center w-full`}>
          <div className="w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center text-sm font-semibold shrink-0 cursor-default">
            {initials(profileName)}
          </div>
          <div className={`min-w-0 transition-all duration-300 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-sm font-medium leading-tight truncate">{profileName}</p>
            <p className="text-[11px] text-[#A78BFA] leading-tight">{profileRole}</p>
          </div>

          {/* Tooltip for profile card */}
          {collapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 text-xs text-white rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <p className="font-semibold text-slate-200">{profileName}</p>
              <p className="text-[10px] text-slate-400">{profileRole}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-1 transition-all duration-300 space-y-5 ${
        collapsed ? 'px-2 overflow-y-visible' : 'px-3 overflow-y-auto'
      }`}>
        {groups.map((group, groupIdx) => (
          <div key={group.label} className="relative">
            {collapsed ? (
              groupIdx > 0 && <div className="border-t border-slate-800/80 my-3 mx-1" />
            ) : (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{group.label}</p>
            )}
            <div className={collapsed ? "space-y-2" : "space-y-0.5"}>
              {group.items.map(({ id, label, icon: Icon, badge }) => {
                const active = current === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={`group w-full flex items-center transition-all duration-300 relative ${
                      collapsed ? 'justify-center p-2 rounded-lg gap-0' : 'gap-2.5 px-2.5 py-2 rounded-lg text-sm'
                    } ${
                      active ? 'bg-[#7C3AED] text-white font-medium' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className={`truncate whitespace-nowrap transition-all duration-300 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{label}</span>
                    
                    {/* Badge */}
                    {!!badge && badge > 0 && (
                      collapsed ? (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-[#0B1120]" />
                      ) : (
                        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-all duration-300 ${active ? 'bg-white/20 text-white' : 'bg-red-500/90 text-white'}`}>
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-700/85 text-xs text-white rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 flex items-center gap-2">
                        <span>{label}</span>
                        {!!badge && badge > 0 && (
                          <span className="bg-red-500/95 text-[10px] font-bold px-1.5 py-0.25 rounded-full text-white">
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div className={`pb-4 pt-2 border-t border-white/5 transition-all duration-300 ${collapsed ? 'px-2 flex justify-center' : 'px-3'}`}>
        <button
          onClick={onSignOut}
          className={`group w-full flex items-center text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all relative ${
            collapsed ? 'justify-center p-2 rounded-lg gap-0' : 'gap-2.5 px-2.5 py-2 rounded-lg text-sm'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className={`truncate whitespace-nowrap transition-all duration-300 overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Sign Out</span>

          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-700/85 text-xs text-rose-300 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ current, onNavigate, profileName, profileRole, notificationCount = 0, children }: AdminLayoutProps) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = () => {
    setMobileOpen(false);
    void logout();
  };

  const handleNavigate = (id: AdminNavId) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <div className="flex h-screen bg-[#F4F5F9] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:block shrink-0 border-r border-black/10 transition-all duration-300 ease-in-out relative ${
        collapsed ? 'w-[56px]' : 'w-[220px]'
      }`}>
        <SidebarContent
          current={current}
          onNavigate={handleNavigate}
          profileName={profileName}
          profileRole={profileRole}
          notificationCount={notificationCount}
          onSignOut={handleSignOut}
          collapsed={collapsed}
        />
        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-7 -right-3 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-[#0B1120] text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-md focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] shadow-2xl">
            <div className="flex justify-end px-3 pt-3 bg-[#0B1120]">
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-44px)]">
              <SidebarContent
                current={current}
                onNavigate={handleNavigate}
                profileName={profileName}
                profileRole={profileRole}
                notificationCount={notificationCount}
                onSignOut={handleSignOut}
              />
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar — matching reference */}
        <header className="h-14 shrink-0 bg-white border-b border-gray-200 px-5 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex items-center gap-3">
            <p className="text-[15px] font-semibold text-gray-900">RentCare Admin</p>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              All systems operational
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
            <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-xs font-semibold text-white shrink-0">
                {initials(profileName)}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-tight truncate max-w-[140px]">{profileName}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{profileRole}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
