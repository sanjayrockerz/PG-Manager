import { useState } from 'react';
import { Building2, ChevronDown, PanelLeft, Menu, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isPlatformAdminRole } from '../utils/roles';
import { isDemoModeEnabled } from '../services/dataService';
import { NotificationBell } from './NotificationBell';
import { WorkspaceSelector } from './WorkspaceSelector';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  currentPage?: string;
  onNotificationClick?: () => void;
}

export function Header({ setSidebarOpen, sidebarCollapsed, onToggleSidebar, currentPage, onNotificationClick }: HeaderProps) {
  const { user } = useAuth();

  const isPlatformAdmin = isPlatformAdminRole(user?.role);
  const isDemoMode = isDemoModeEnabled();

  const showPropertySelector = currentPage !== 'properties' && user?.role !== 'tenant' && !isPlatformAdmin;

  const impersonatedOwnerId = typeof window !== 'undefined' ? localStorage.getItem('admin_impersonate_id') : null;

  const handleStopImpersonating = () => {
    localStorage.removeItem('admin_impersonate_id');
    window.location.href = '/';
  };

  /* ── User section ──────────────────────── */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  const handleSidebarToggle = () => {
    if (window.innerWidth >= 1024) {
      onToggleSidebar?.();
    } else {
      setSidebarOpen(true);
    }
  };

  return (
    <>
      {impersonatedOwnerId && (
        <div className="bg-blue-600 text-white text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-4 z-40 relative">
          <span>You are viewing this portal as an impersonated owner.</span>
          <button onClick={handleStopImpersonating} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors">
            Return to Admin
          </button>
        </div>
      )}
      <header
        className="flex-shrink-0 flex items-center justify-between z-30 pt-safe"
        style={{
          minHeight: 52,
          paddingLeft: 12,
          paddingRight: 16,
          background: '#FFFFFF',
          borderBottom: '1px solid #E4E4E7',
          gap: 12,
        }}
      >
      {/* ── Left: sidebar toggle + brand ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleSidebarToggle}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{ width: 32, height: 32, color: '#71717A', flexShrink: 0 }}
        >
          <Menu className="w-5 h-5 lg:hidden" />
          <PanelLeft style={{ width: 16, height: 16 }} className="hidden lg:block" />
        </button>

        <div className="flex items-center gap-2" style={{ color: '#0A0A0B', fontSize: 14, fontWeight: 600 }}>
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
          >
            <Building2 style={{ width: 12, height: 12, color: '#fff' }} />
          </div>
          <span className="hidden sm:block">RentCare</span>
        </div>
      </div>

      {/* ── Center: Search ──────────────────── */}
      <div className="flex-1 max-w-[480px] mx-auto hidden md:block">
        <div
          className="flex items-center gap-2.5 rounded-lg transition-all cursor-text"
          style={{
            height: 33,
            padding: '0 12px',
            background: '#F4F4F6',
            border: '1px solid transparent',
          }}
          onFocus={e => {
            const el = e.currentTarget;
            el.style.background = '#FFFFFF';
            el.style.borderColor = '#C7D2FE';
            el.style.boxShadow = '0 0 0 3px rgb(99 102 241 / 0.08)';
          }}
          onBlur={e => {
            const el = e.currentTarget;
            el.style.background = '#F4F4F6';
            el.style.borderColor = 'transparent';
            el.style.boxShadow = 'none';
          }}
          onClick={() => (document.querySelector('.header-search-input') as HTMLInputElement)?.focus()}
        >
          <Search style={{ width: 13, height: 13, color: '#A1A1AA', flexShrink: 0 }} />
          <input
            className="header-search-input flex-1 bg-transparent outline-none"
            placeholder="Search tenants, rooms, payments..."
            style={{ fontSize: 13, color: '#0A0A0B', border: 'none' }}
          />
        </div>
      </div>

      {/* ── Right: property selector + actions + user ── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Property / workspace switcher */}
        {showPropertySelector && <WorkspaceSelector />}

        {/* Demo mode badge */}
        {isDemoMode && (
          <div className="ml-0.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Demo
          </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: '#E4E4E7', margin: '0 2px' }} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="hidden md:flex items-center gap-2 rounded-lg hover:bg-zinc-50 transition-colors"
            style={{ padding: '4px 8px 4px 4px', border: '1px solid transparent', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
          >
            <div
              className="flex items-center justify-center rounded-lg text-white"
              style={{
                width: 26, height: 26,
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                flexShrink: 0,
              }}
            >
              {userInitials}
            </div>
            <div className="text-left hidden lg:block">
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0B', lineHeight: 1.2 }}>
                {user?.name?.split(' ')[0] || 'Account'}
              </p>
              <p style={{ fontSize: 11, color: '#A1A1AA', lineHeight: 1.2, textTransform: 'capitalize' }}>
                {user?.role || 'owner'}
              </p>
            </div>
            <ChevronDown style={{ width: 12, height: 12, color: '#A1A1AA' }} />
          </button>
        </div>
      </div>
      </header>
    </>
  );
}
