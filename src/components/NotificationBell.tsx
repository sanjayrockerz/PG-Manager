import { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck, Wrench, IndianRupee, Users, Megaphone, Info } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationEngine';
import type { NotificationRecord, NotificationType } from '../services/supabaseData';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeIcon: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  maintenance: Wrench,
  payment: IndianRupee,
  tenant: Users,
  announcement: Megaphone,
  occupancy: Info,
  system: Info,
};

const typeColor: Record<NotificationType, string> = {
  maintenance: 'bg-orange-100 text-orange-600',
  payment: 'bg-green-100 text-green-600',
  tenant: 'bg-purple-100 text-purple-600',
  announcement: 'bg-blue-100 text-blue-600',
  occupancy: 'bg-gray-100 text-gray-600',
  system: 'bg-gray-100 text-gray-600',
};

interface NotificationItemProps {
  notification: NotificationRecord;
  onRead: (id: string) => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const Icon = typeIcon[notification.type] ?? Info;
  const color = typeColor[notification.type] ?? 'bg-gray-100 text-gray-600';

  return (
    <button
      onClick={() => !notification.read && onRead(notification.id)}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 border-b border-zinc-100 last:border-0 ${
        notification.read ? 'opacity-60' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold text-zinc-900 leading-tight ${notification.read ? '' : ''}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{notification.message}</p>
        <p className="text-[10px] text-zinc-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    const all = getNotifications();
    setNotifications(all.slice(0, 50));
    setUnread(getUnreadCount());
  };

  useEffect(() => {
    refresh();

    const handler = () => refresh();
    window.addEventListener('pg:notifications:updated', handler);
    window.addEventListener('owner-data-updated', handler);
    return () => {
      window.removeEventListener('pg:notifications:updated', handler);
      window.removeEventListener('owner-data-updated', handler);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleRead = (id: string) => {
    markNotificationRead(id);
    refresh();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    refresh();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors"
        style={{ width: 33, height: 33, color: '#71717A' }}
      >
        <Bell style={{ width: 16, height: 16 }} />
        {unread > 0 && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              top: 5, right: 5,
              minWidth: unread > 9 ? 14 : 8,
              height: unread > 9 ? 14 : 8,
              background: '#EF4444',
              borderRadius: '999px',
              border: '1.5px solid #FFFFFF',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              padding: unread > 9 ? '0 2px' : 0,
            }}
          >
            {unread > 9 ? '9+' : ''}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 rounded-xl overflow-hidden"
          style={{
            top: 38,
            width: 'min(320px, calc(100vw - 24px))',
            zIndex: 9999,
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            boxShadow: '0 8px 30px -6px rgb(0 0 0 / 0.16), 0 2px 8px -2px rgb(0 0 0 / 0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Notifications</span>
              {unread > 0 && (
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18 }}
                >
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-md hover:bg-zinc-100 transition-colors"
                  style={{ padding: '3px 6px', fontSize: 11, color: '#6366F1', fontWeight: 500 }}
                >
                  <CheckCheck style={{ width: 12, height: 12 }} />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors"
                style={{ width: 26, height: 26, color: '#A1A1AA' }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p style={{ fontSize: 12 }}>No notifications yet</p>
                <p style={{ fontSize: 11, marginTop: 2 }}>Events will appear here automatically</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={handleRead} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 text-center">
              <p style={{ fontSize: 11, color: '#A1A1AA' }}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {unread > 0 ? ` · ${unread} unread` : ' · all read'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
