import {
  Activity, Bell, CreditCard, Home, LayoutGrid, LifeBuoy,
  LogOut, Settings, Shield, Users, Wrench, X, Zap, UserCog,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { isPlatformAdminRole } from '../utils/roles';
import { hasPermission, hasWorkspacePermission } from '../utils/permissions';

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
      { id: 'team', label: 'Team Members', icon: UserCog },
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
      { id: 'admin-section', label: 'Admin Panel', icon: Shield },
    ],
  },
];

const EXPANDED_W = 256;
const COLLAPSED_W = 72;

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
  const { navWorkspaceRole } = useWorkspace();

  const isPlatformAdmin = isPlatformAdminRole(userRole as any);
  const isTenant        = userRole === 'tenant';

  // Settings is visible to workspace owners (via profiles.role) AND managers
  // (via workspace role). Managers see a restricted Settings with only workspace tabs.
  const showSettings = !isTenant && (
    hasPermission(userRole, 'page:settings') ||
    hasWorkspacePermission(navWorkspaceRole, 'settings:workspace')
  );
  const showUpgradePro = !isPlatformAdmin && !isTenant;

  const filteredOwnerSections = ownerSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      switch (item.id) {
        case 'properties':    return hasPermission(userRole, 'page:properties')    || hasWorkspacePermission(navWorkspaceRole, 'page:properties');
        case 'tenants':       return hasPermission(userRole, 'page:tenants')       || hasWorkspacePermission(navWorkspaceRole, 'page:tenants');
        case 'payments':      return hasPermission(userRole, 'page:payments')      || hasWorkspacePermission(navWorkspaceRole, 'page:payments');
        case 'maintenance':   return hasPermission(userRole, 'page:maintenance')   || hasWorkspacePermission(navWorkspaceRole, 'page:maintenance');
        case 'announcements': return hasPermission(userRole, 'page:announcements') || hasWorkspacePermission(navWorkspaceRole, 'page:announcements');
        case 'support':       return hasPermission(userRole, 'page:support')       || hasWorkspacePermission(navWorkspaceRole, 'page:support');
        case 'audit-log':     return hasPermission(userRole, 'page:dashboard')     || navWorkspaceRole === 'workspace_owner';
        case 'team':
          // Only workspace_owner and manager may see Team Members.
          // Editors/viewers are excluded even though profiles.role='owner' after acceptance —
          // workspace role is authoritative here, not profile role.
          return hasWorkspacePermission(navWorkspaceRole, 'team:view');
        default:              return true;
      }
    }),
  })).filter((section) => section.items.length > 0);

  const sections = isPlatformAdmin ? adminSections : filteredOwnerSections;

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  // Role chip shown under user name in the bottom bar (expanded mode only)
  const workspaceRoleLabel: string = (() => {
    switch (navWorkspaceRole) {
      case 'workspace_owner': return '';   // Owners need no label
      case 'manager':         return 'Manager';
      case 'editor':          return 'Editor';
      case 'viewer':          return 'Viewer';
      default:                return '';
    }
  })();

  const NavBtn = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <div className="relative group/nav">
        <button
          onClick={() => handleNav(item.id)}
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
          className={`ds-nav-item ${isActive ? 'active' : ''}`}
          style={{
            width: '100%',
            justifyContent: sidebarCollapsed ? 'center' : undefined,
            paddingLeft:    sidebarCollapsed ? 0 : undefined,
            paddingRight:   sidebarCollapsed ? 0 : undefined,
          }}
        >
          <Icon
            className="flex-shrink-0"
            style={{
              width: 16, height: 16,
              strokeWidth: isActive ? 2 : 1.75,
              color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-3)',
            }}
          />
          <span
            style={{
              fontSize: 13,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity:  sidebarCollapsed ? 0 : 1,
              maxWidth: sidebarCollapsed ? 0 : 160,
              transition: 'opacity 180ms ease, max-width 250ms cubic-bezier(0.4,0,0.2,1)',
              display: 'block',
            }}
          >
            {item.label}
          </span>
        </button>

        {/* Tooltip — collapsed mode only */}
        {sidebarCollapsed && (
          <div
            role="tooltip"
            className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50
              px-2.5 py-1.5 rounded-md text-white whitespace-nowrap
              opacity-0 group-hover/nav:opacity-100 transition-opacity duration-150"
            style={{ fontSize: 12, fontWeight: 500, background: '#18181B', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)' }}
          >
            {item.label}
            <div
              className="absolute right-full top-1/2 -translate-y-1/2"
              style={{ borderWidth: '4px 4px 4px 0', borderStyle: 'solid', borderColor: 'transparent #18181B transparent transparent' }}
            />
          </div>
        )}
      </div>
    );
  };

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
          flex flex-col flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          width: sidebarCollapsed ? COLLAPSED_W : EXPANDED_W,
          transition: 'width 250ms cubic-bezier(0.4,0,0.2,1), transform 250ms ease',
          background: '#FFFFFF',
          borderRight: '1px solid #E4E4E7',
          overflow: 'hidden',
        }}
      >
        {/* Mobile-only close strip */}
        <div
          className="lg:hidden flex items-center justify-between flex-shrink-0"
          style={{ height: 48, padding: '0 14px', borderBottom: '1px solid #F1F1F3' }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center rounded-md hover:bg-zinc-100"
            style={{ width: 28, height: 28, color: '#A1A1AA' }}
            aria-label="Close sidebar"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ padding: '10px 8px' }}
          aria-label="Main navigation"
        >
          {sections.map((section, si) => (
            <div key={section.title} style={{ marginBottom: si < sections.length - 1 ? 20 : 0 }}>
              <p
                className="ds-section-label"
                style={{
                  padding: '0 10px', marginBottom: 4,
                  opacity: sidebarCollapsed ? 0 : 1,
                  transition: 'opacity 150ms ease',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  height: sidebarCollapsed ? 0 : undefined,
                  marginTop: sidebarCollapsed ? 0 : undefined,
                }}
              >
                {section.title}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.items.map((item) => <NavBtn key={item.id} item={item} />)}
              </div>
            </div>
          ))}

          {showSettings && (
            <div style={{ marginTop: 20 }}>
              <p
                className="ds-section-label"
                style={{
                  padding: '0 10px', marginBottom: 4,
                  opacity: sidebarCollapsed ? 0 : 1,
                  transition: 'opacity 150ms ease',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  height: sidebarCollapsed ? 0 : undefined,
                }}
              >
                Preferences
              </p>
              <NavBtn item={{ id: 'settings', label: 'Settings', icon: Settings }} />
            </div>
          )}
        </nav>

        {/* Bottom — user + sign out */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #F1F1F3', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Upgrade to Pro — expanded + owner only */}
          {showUpgradePro && !sidebarCollapsed && navWorkspaceRole === 'workspace_owner' && (
            <button
              onClick={() => handleNav('pricing')}
              className="w-full text-left rounded-lg transition-opacity hover:opacity-90"
              style={{ padding: '10px 12px', background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', marginBottom: 4 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap style={{ width: 13, height: 13, color: '#C7D2FE', strokeWidth: 2 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>Upgrade to Pro</span>
              </div>
              <p style={{ fontSize: 11, color: '#A5B4FC', lineHeight: 1.4 }}>
                Unlock advanced reports, automation and more.
              </p>
              <div className="mt-2.5 text-center rounded-md" style={{ padding: '5px 0', background: 'rgba(255,255,255,0.15)', fontSize: 11, fontWeight: 600, color: '#ffffff' }}>
                Upgrade Now
              </div>
            </button>
          )}

          {/* Sign out / user row */}
          <div className="relative group/signout">
            <button
              onClick={() => void logout()}
              aria-label="Sign out"
              className="ds-nav-item hover:bg-red-50 w-full"
              style={{
                color: '#A1A1AA',
                justifyContent: sidebarCollapsed ? 'center' : undefined,
                paddingLeft:  sidebarCollapsed ? 0 : undefined,
                paddingRight: sidebarCollapsed ? 0 : undefined,
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-md text-white"
                style={{ width: 22, height: 22, background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontSize: 10, fontWeight: 700 }}
              >
                {userInitials}
              </div>
              <div
                style={{
                  overflow: 'hidden',
                  opacity:  sidebarCollapsed ? 0 : 1,
                  maxWidth: sidebarCollapsed ? 0 : 140,
                  transition: 'opacity 180ms ease, max-width 250ms cubic-bezier(0.4,0,0.2,1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1,
                }}
              >
                <span style={{ fontSize: 13, color: '#52525B', whiteSpace: 'nowrap' }}>
                  {user?.name || user?.email || 'Account'}
                </span>
                {workspaceRoleLabel && (
                  <span style={{ fontSize: 10, color: '#6366F1', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                    {workspaceRoleLabel}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && (
                <LogOut style={{ width: 13, height: 13, color: '#A1A1AA', flexShrink: 0 }} />
              )}
            </button>

            {sidebarCollapsed && (
              <div
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50
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
