import {
  Activity, Bell, CreditCard, Home, LayoutGrid, LifeBuoy,
  LogOut, Settings, Shield, Users, Wrench, X,
  ChevronRight, Zap, UserCog,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isPlatformAdminRole } from '../utils/roles';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  userRole?: string;
}

type NavItem = { id: string; label: string; icon: typeof Home };

const ownerSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Management',
    items: [
      { id: 'dashboard',    label: 'Dashboard',    icon: Home },
      { id: 'properties',   label: 'Properties',   icon: LayoutGrid },
      { id: 'tenants',      label: 'Tenants',       icon: Users },
    ],
  },
  {
    title: 'Finance',
    items: [
      { id: 'payments', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'maintenance',   label: 'Maintenance',   icon: Wrench },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'audit-log',     label: 'Audit Log',     icon: Activity },
    ],
  },
  {
    title: 'Team',
    items: [
      { id: 'team',    label: 'Team Members', icon: UserCog },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: 'support', label: 'Support', icon: LifeBuoy },
    ],
  },
];

const adminSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Admin',
    items: [
      { id: 'admin-section', label: 'Admin Panel',   icon: Shield },
      { id: 'tenant-portal', label: 'Tenant Portal', icon: Users },
    ],
  },
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
  const { logout, user } = useAuth();

  const isPlatformAdmin = isPlatformAdminRole(userRole as any);
  const isTenant = userRole === 'tenant';
  const sections = isPlatformAdmin ? adminSections : ownerSections;
  const showSettings   = !isTenant;
  const showUpgradePro = !isPlatformAdmin && !isTenant;

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const toggleCollapse = () => {
    const next = !sidebarCollapsed;
    localStorage.setItem('sidebar_collapsed', String(next));
    setSidebarCollapsed(next);
  };

  const NavBtn = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <div className="relative group/nav">
        <button
          onClick={() => handleNav(item.id)}
          className={`ds-nav-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
          style={{ width: '100%' }}
          title={sidebarCollapsed ? item.label : undefined}
        >
          <Icon
            className="flex-shrink-0"
            style={{
              width: 15,
              height: 15,
              strokeWidth: isActive ? 2 : 1.75,
              color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-3)',
            }}
          />
          {!sidebarCollapsed && (
            <span style={{ fontSize: 13, letterSpacing: '-0.01em' }}>{item.label}</span>
          )}
        </button>

        {/* Collapsed tooltip */}
        {sidebarCollapsed && (
          <div
            className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
              px-2.5 py-1.5 rounded-md text-white whitespace-nowrap
              opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150"
            style={{
              fontSize: 12,
              fontWeight: 500,
              background: '#18181B',
              boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
            }}
          >
            {item.label}
          </div>
        )}
      </div>
    );
  };

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  const portalLabel = isPlatformAdmin ? 'Admin' : isTenant ? 'Tenant' : 'Owner';

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgb(0 0 0 / 0.3)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col overflow-hidden
          transform transition-all duration-250 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          width: sidebarCollapsed ? 52 : 220,
          background: '#FFFFFF',
          borderRight: '1px solid #E4E4E7',
        }}
      >
        {/* ── Logo ─────────────────────────────── */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            height: 52,
            padding: sidebarCollapsed ? '0 10px' : '0 14px',
            borderBottom: '1px solid #F1F1F3',
            gap: 10,
          }}
        >
          {/* Mark */}
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{
              width: 28,
              height: 28,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 1px 4px rgb(99 102 241 / 0.35)',
            }}
          >
            <LayoutGrid style={{ width: 14, height: 14, color: '#fff', strokeWidth: 2 }} />
          </div>

          {/* Wordmark */}
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                RentCare
              </p>
              <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{portalLabel} Portal</p>
            </div>
          )}

          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-zinc-100 text-zinc-400 flex-shrink-0"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>

          {/* Desktop collapse toggle */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors flex-shrink-0"
              style={{ width: 24, height: 24, color: '#A1A1AA' }}
              title="Collapse sidebar"
            >
              <ChevronRight style={{ width: 13, height: 13, transform: 'rotate(180deg)' }} />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors"
              style={{ width: 24, height: 24, color: '#A1A1AA', margin: '0 auto' }}
              title="Expand sidebar"
            >
              <ChevronRight style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>

        {/* ── Navigation ───────────────────────── */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ padding: sidebarCollapsed ? '10px 6px' : '10px 8px' }}
        >
          {sections.map((section, si) => (
            <div key={section.title} style={{ marginBottom: si < sections.length - 1 ? 20 : 0 }}>
              {!sidebarCollapsed && (
                <p
                  className="ds-section-label"
                  style={{ padding: '0 10px', marginBottom: 4 }}
                >
                  {section.title}
                </p>
              )}
              {sidebarCollapsed && si > 0 && (
                <div style={{ height: 1, background: '#F1F1F3', margin: '8px 4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.items.map(item => <NavBtn key={item.id} item={item} />)}
              </div>
            </div>
          ))}

          {/* Settings */}
          {showSettings && (
            <div style={{ marginTop: 20 }}>
              {!sidebarCollapsed && (
                <p className="ds-section-label" style={{ padding: '0 10px', marginBottom: 4 }}>
                  Preferences
                </p>
              )}
              {sidebarCollapsed && (
                <div style={{ height: 1, background: '#F1F1F3', margin: '8px 4px' }} />
              )}
              <NavBtn item={{ id: 'settings', label: 'Settings', icon: Settings }} />
            </div>
          )}
        </nav>

        {/* ── Bottom ───────────────────────────── */}
        <div
          style={{
            padding: sidebarCollapsed ? '10px 6px' : '10px 8px',
            borderTop: '1px solid #F1F1F3',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* Upgrade to Pro — shown only expanded */}
          {showUpgradePro && !sidebarCollapsed && (
            <button
              onClick={() => handleNav('pricing')}
              className="w-full text-left rounded-lg transition-opacity hover:opacity-90"
              style={{
                padding: '10px 12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
                marginBottom: 4,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap style={{ width: 13, height: 13, color: '#C7D2FE', strokeWidth: 2 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>Upgrade to Pro</span>
              </div>
              <p style={{ fontSize: 11, color: '#A5B4FC', lineHeight: 1.4 }}>
                Unlock advanced reports, automation and more.
              </p>
              <div
                className="mt-2.5 text-center rounded-md"
                style={{
                  padding: '5px 0',
                  background: 'rgba(255,255,255,0.15)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                Upgrade Now
              </div>
            </button>
          )}

          {/* User + Sign out */}
          <div className="relative group/signout">
            <button
              onClick={() => void logout()}
              className={`ds-nav-item hover:bg-red-50 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              style={{ color: '#A1A1AA', width: '100%' }}
              title={sidebarCollapsed ? 'Sign out' : undefined}
            >
              {!sidebarCollapsed ? (
                <>
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-md text-white"
                    style={{
                      width: 22,
                      height: 22,
                      background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {userInitials}
                  </div>
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{ fontSize: 13, color: '#52525B' }}
                  >
                    {user?.name || user?.email || 'Account'}
                  </span>
                  <LogOut style={{ width: 13, height: 13, color: '#A1A1AA', flexShrink: 0 }} />
                </>
              ) : (
                <LogOut style={{ width: 15, height: 15, color: '#A1A1AA' }} />
              )}
            </button>

            {sidebarCollapsed && (
              <div
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                  px-2.5 py-1.5 rounded-md text-white whitespace-nowrap
                  opacity-0 group-hover/signout:opacity-100 transition-opacity duration-150"
                style={{ fontSize: 12, fontWeight: 500, background: '#18181B' }}
              >
                Sign out
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
