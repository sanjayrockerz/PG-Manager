import { Menu, Bell, Search, Building2, ChevronDown, LogOut } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationRecord, supabaseNotificationApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { isPlatformAdminRole } from '../utils/roles';
import { isDemoModeEnabled } from '../services/dataService';
import { ModeToggle } from './ModeToggle';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  currentPage?: string;
  onNotificationClick?: () => void;
}

export function Header({ setSidebarOpen, currentPage, onNotificationClick }: HeaderProps) {
  const { properties, selectedProperty, setSelectedProperty } = useProperty();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const isPlatformAdmin = isPlatformAdminRole(user?.role);
  const isDemoMode = isDemoModeEnabled();
  const configuredAdminEmail = String((import.meta as any).env?.VITE_MODE_TOGGLE_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const userEmail = String(user?.email ?? '').trim().toLowerCase();
  const canToggleMode = isPlatformAdmin || (configuredAdminEmail ? userEmail === configuredAdminEmail : true);
  
  const currentProperty = selectedProperty === 'all'
    ? null
    : properties.find(p => p.id === selectedProperty);

  // Hide property selector on properties page and tenant portal role.
  const showPropertySelector = currentPage !== 'properties' && user?.role !== 'tenant' && !isPlatformAdmin;

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      void logout();
    }
  };

  const handleNotificationClick = () => {
    // On mobile, navigate to notifications screen
    if (window.innerWidth < 768 && onNotificationClick) {
      onNotificationClick();
    } else {
      // On desktop, toggle dropdown
      setShowNotifications(!showNotifications);
    }
  };

  const loadNotifications = useCallback(async () => {
    if (isDemoMode || !user || user.role === 'tenant') {
      setNotifications([]);
      return;
    }

    try {
      const rows = await supabaseNotificationApi.listForCurrentUser();
      setNotifications(rows);
    } catch {
      setNotifications([]);
    }
  }, [isDemoMode, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (showNotifications) {
      void loadNotifications();
    }
  }, [showNotifications, loadNotifications]);

  useRealtimeRefresh({
    key: 'header-notifications',
    tables: ['notifications'],
    onChange: loadNotifications,
    enabled: !isDemoMode && !!user && user.role !== 'tenant',
  });

  const unreadCount = useMemo(() => notifications.filter((entry) => !entry.read).length, [notifications]);

  const formatRelativeTime = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const markAllRead = async () => {
    try {
      await supabaseNotificationApi.markAllAsRead();
      setNotifications((current) => current.map((entry) => ({ ...entry, read: true })));
    } catch {
      // Silent failure keeps the bell usable.
    }
  };

  const openNotification = async (notificationId: string) => {
    const target = notifications.find((entry) => entry.id === notificationId);
    if (target && !target.read) {
      setNotifications((current) =>
        current.map((entry) =>
          entry.id === notificationId ? { ...entry, read: true } : entry,
        ),
      );
      try {
        await supabaseNotificationApi.markAsRead(notificationId);
      } catch {
        void loadNotifications();
      }
    }

    setShowNotifications(false);
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          {showPropertySelector && (
            <div className="relative min-w-[220px]">
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="appearance-none w-full border border-gray-300 bg-white rounded-lg px-3 py-2.5 pr-20 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Properties ({properties.length})</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
                <Building2 className="w-4 h-4" />
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}

          {showPropertySelector && currentProperty && (
            <div className="hidden xl:flex items-center gap-2 text-xs text-gray-500">
              <span>{currentProperty.city}</span>
              <span>•</span>
              <span>{currentProperty.totalRooms} rooms</span>
            </div>
          )}
        </div>

        <div className="order-3 w-full md:order-none md:flex-1 md:max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants, rooms, payments"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 ml-auto">
        <ModeToggle canToggle={canToggleMode} />
        {isDemoMode && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Demo Mode Enabled
          </span>
        )}
        {user?.role !== 'tenant' && (
          <div className="relative">
          <button
            onClick={handleNotificationClick}
            className="relative p-2.5 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Notifications Dropdown Menu */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Notifications</p>
                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => void markAllRead()}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications yet</p>
                  ) : (
                    notifications.slice(0, 6).map((notification) => (
                      <button
                        key={notification.id}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${notification.read ? '' : 'bg-gray-50'}`}
                        onClick={() => void openNotification(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notification.read ? 'bg-gray-300' : 'bg-indigo-600'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(notification.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-200">
                  <button
                    onClick={onNotificationClick}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        )}
        
        <div className="relative pl-2 md:pl-3 border-l border-gray-200">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1.5 transition-colors"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ') || 'Manager'}</p>
            </div>
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">{user?.name?.[0] || 'A'}</span>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email || user?.phone}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}