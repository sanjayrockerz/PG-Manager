import { useState } from 'react';
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
  | 'audit-logs';

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
    { label: 'USERS', items: [{ id: 'owners', label: 'All Owners', icon: Users }] },
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

function SidebarContent({ current, onNavigate, profileName, profileRole, notificationCount, onSignOut }: {
  current: AdminNavId;
  onNavigate: (id: AdminNavId) => void;
  profileName: string;
  profileRole: string;
  notificationCount: number;
  onSignOut: () => void;
}) {
  const groups = buildGroups(notificationCount);
  return (
    <div className="flex h-full flex-col bg-[#0B1120] text-white">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center text-sm font-bold shrink-0">R</div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight truncate">RentCare</p>
            <p className="text-[11px] text-slate-400 leading-tight">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div className="px-4 pb-4">
        <div className="rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED]/30 px-3.5 py-2.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center text-sm font-semibold shrink-0">
            {initials(profileName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{profileName}</p>
            <p className="text-[11px] text-[#A78BFA] leading-tight">{profileRole}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-500">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon, badge }) => {
                const active = current === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors relative ${
                      active ? 'bg-[#7C3AED] text-white font-medium' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="truncate">{label}</span>
                    {!!badge && badge > 0 && (
                      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-red-500/90 text-white'}`}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ current, onNavigate, profileName, profileRole, notificationCount = 0, children }: AdminLayoutProps) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <aside className="hidden lg:block w-[200px] shrink-0 border-r border-black/10">
        <SidebarContent
          current={current}
          onNavigate={handleNavigate}
          profileName={profileName}
          profileRole={profileRole}
          notificationCount={notificationCount}
          onSignOut={handleSignOut}
        />
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
