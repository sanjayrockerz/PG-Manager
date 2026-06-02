import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Command, HelpCircle, Menu, Search, Building2 } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { isPlatformAdminRole } from '../utils/roles';
import { isDemoModeEnabled } from '../services/dataService';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  currentPage?: string;
  onNotificationClick?: () => void;
}

export function Header({ setSidebarOpen, currentPage, onNotificationClick }: HeaderProps) {
  const { properties, selectedProperty, setSelectedProperty } = useProperty();
  const { user } = useAuth();

  const isPlatformAdmin = isPlatformAdminRole(user?.role);
  const isDemoMode = isDemoModeEnabled();

  const showPropertySelector = currentPage !== 'properties' && user?.role !== 'tenant' && !isPlatformAdmin;

  /* ── Property dropdown ─────────────────── */
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const selectorRef = useRef<HTMLButtonElement>(null);

  const allOption = { id: 'all' as const, name: 'All Properties', count: properties.length };
  const items = [allOption, ...properties.map(p => ({ id: p.id, name: p.name, count: 1 }))];
  const selected = selectedProperty === 'all'
    ? allOption
    : items.find(p => p.id === selectedProperty) ?? allOption;

  const openDropdown = () => {
    if (selectorRef.current) {
      const r = selectorRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 240) });
    }
    setDropdownOpen(true);
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [dropdownOpen]);

  /* ── User section ──────────────────────── */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-4 sticky top-0 z-30"
      style={{
        height: 52,
        background: '#FFFFFF',
        borderBottom: '1px solid #E4E4E7',
        gap: 12,
      }}
    >
      {/* ── Left: hamburger + property switcher ── */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 transition-colors"
        >
          <Menu style={{ width: 16, height: 16 }} />
        </button>

        {showPropertySelector ? (
          <>
            <button
              ref={selectorRef}
              onClick={() => dropdownOpen ? setDropdownOpen(false) : openDropdown()}
              className="flex items-center gap-2 rounded-lg transition-all"
              style={{
                height: 32,
                padding: '0 10px',
                background: dropdownOpen ? '#F4F4F6' : '#FAFAFA',
                border: '1px solid #E4E4E7',
                color: '#0A0A0B',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                gap: 8,
              }}
            >
              <Building2 style={{ width: 13, height: 13, color: '#6366F1', flexShrink: 0 }} />
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name}
                {selected.count > 1 && (
                  <span style={{ color: '#A1A1AA', marginLeft: 4 }}>({selected.count})</span>
                )}
              </span>
              <ChevronDown
                style={{
                  width: 13, height: 13, color: '#A1A1AA', flexShrink: 0,
                  transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 9998 }}
                  onClick={() => setDropdownOpen(false)}
                />
                <div
                  className="fixed rounded-xl overflow-hidden"
                  style={{
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    minWidth: dropdownPos.width,
                    zIndex: 9999,
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    boxShadow: '0 8px 30px -6px rgb(0 0 0 / 0.14), 0 2px 8px -2px rgb(0 0 0 / 0.08)',
                    padding: '6px',
                  }}
                >
                  {items.map((item, idx) => {
                    const isSelected = selectedProperty === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedProperty(item.id);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-lg transition-colors"
                        style={{
                          padding: '7px 10px',
                          background: isSelected ? '#EEF2FF' : 'transparent',
                          color: isSelected ? '#4F46E5' : '#52525B',
                          fontSize: 13,
                          fontWeight: isSelected ? 500 : 400,
                          cursor: 'pointer',
                          border: 'none',
                          textAlign: 'left',
                          marginBottom: idx < items.length - 1 ? 1 : 0,
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F4F4F6';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-md"
                          style={{
                            width: 24, height: 24,
                            background: isSelected ? '#C7D2FE' : '#F4F4F6',
                          }}
                        >
                          <Building2 style={{ width: 12, height: 12, color: isSelected ? '#4F46E5' : '#A1A1AA' }} />
                        </div>
                        <span className="flex-1 truncate">{item.name}</span>
                        {isSelected && <Check style={{ width: 13, height: 13, color: '#6366F1', flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2" style={{ color: '#0A0A0B', fontSize: 14, fontWeight: 600 }}>
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              <Building2 style={{ width: 12, height: 12, color: '#fff' }} />
            </div>
            RentCare
          </div>
        )}
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
          <div
            className="hidden lg:flex items-center gap-1 flex-shrink-0"
            style={{ padding: '1px 6px', background: '#ECECEF', borderRadius: 5 }}
          >
            <Command style={{ width: 10, height: 10, color: '#A1A1AA' }} />
            <span style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 500 }}>K</span>
          </div>
        </div>
      </div>

      {/* ── Right: Actions + User ───────────── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Demo mode badge */}
        {isDemoMode && (
          <div className="mr-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Demo
          </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Help */}
        <button
          className="hidden md:flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
          style={{ width: 33, height: 33, color: '#71717A' }}
        >
          <HelpCircle style={{ width: 16, height: 16 }} />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: '#E4E4E7', margin: '0 4px' }} />

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
  );
}
