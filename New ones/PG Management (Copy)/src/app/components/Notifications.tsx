import { ArrowLeft } from 'lucide-react';

interface NotificationsProps {
  onBack?: () => void;
}

export function Notifications({ onBack }: NotificationsProps) {
  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: 'payment',
      title: 'Payment Received',
      message: 'Amit Kumar paid ₹5,000 for Room 101',
      time: '5 minutes ago',
      read: false,
    },
    {
      id: 2,
      type: 'maintenance',
      title: 'New Maintenance Request',
      message: 'Priya Sharma reported AC not working in Room 205',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      type: 'tenant',
      title: 'New Tenant Added',
      message: 'Rahul Verma checked in to Room 303',
      time: '3 hours ago',
      read: true,
    },
    {
      id: 4,
      type: 'payment',
      title: 'Payment Overdue',
      message: 'Neha Gupta\'s rent is 2 days overdue',
      time: '1 day ago',
      read: true,
    },
    {
      id: 5,
      type: 'announcement',
      title: 'Announcement Posted',
      message: 'Electricity maintenance scheduled for tomorrow',
      time: '2 days ago',
      read: true,
    },
    {
      id: 6,
      type: 'maintenance',
      title: 'Maintenance Completed',
      message: 'WiFi router issue in Room 102 has been resolved',
      time: '2 days ago',
      read: true,
    },
    {
      id: 7,
      type: 'payment',
      title: 'Payment Reminder',
      message: 'Rent due for 5 tenants in 2 days',
      time: '3 days ago',
      read: true,
    },
    {
      id: 8,
      type: 'tenant',
      title: 'Tenant Check-out',
      message: 'Sanjay Patel checked out from Room 204',
      time: '4 days ago',
      read: true,
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 md:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-0.5">{unreadCount} unread notifications</p>
          </div>
          {unreadCount > 0 && (
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.read ? 'bg-gray-300' : 'bg-blue-600'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{notification.time}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state if no notifications */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🔔</span>
          </div>
          <p className="text-gray-900 font-medium">No notifications</p>
          <p className="text-sm text-gray-600 mt-1">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}