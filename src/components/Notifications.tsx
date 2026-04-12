import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { NotificationRecord, supabaseNotificationApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

interface NotificationsProps {
  onBack?: () => void;
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

const notificationTypeClass: Record<NotificationRecord['type'], string> = {
  payment: 'bg-green-500',
  maintenance: 'bg-orange-500',
  tenant: 'bg-blue-500',
  announcement: 'bg-violet-500',
};

export function Notifications({ onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const rows = await supabaseNotificationApi.listForCurrentUser();
      setNotifications(rows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'notifications-page',
    tables: ['notifications'],
    onChange: loadNotifications,
  });

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const markAllRead = async () => {
    try {
      await supabaseNotificationApi.markAllAsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    } catch {
      // Keep UX non-blocking if marking fails.
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    );

    try {
      await supabaseNotificationApi.markAsRead(notificationId);
    } catch {
      void loadNotifications();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 md:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-0.5">{unreadCount} unread notifications</p>
            <div className="mt-2">
              <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Notification stream" />
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => void loadNotifications()}
              className="mt-2 text-sm text-red-700 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!errorMessage && isLoading && (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {!errorMessage && !isLoading && notifications.length > 0 && (
        <div className="divide-y divide-gray-200">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => void markAsRead(notification.id)}
              className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.read ? 'bg-gray-300' : notificationTypeClass[notification.type]}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state if no notifications */}
      {!errorMessage && !isLoading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-500">
            <Bell className="w-7 h-7" />
          </div>
          <p className="text-gray-900 font-medium">No notifications</p>
          <p className="text-sm text-gray-600 mt-1">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}