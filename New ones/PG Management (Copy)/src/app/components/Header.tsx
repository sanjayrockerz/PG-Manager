import { Menu, Bell, Search, Building2, ChevronDown, LogOut } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

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
  
  const currentProperty = selectedProperty === 'all' 
    ? null 
    : properties.find(p => p.id === selectedProperty);

  // Hide property selector on properties page
  const showPropertySelector = currentPage !== 'properties';

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
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
      message: 'Electricity maintenance scheduled',
      time: '2 days ago',
      read: true,
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Property Selector Dropdown */}
        {showPropertySelector && (
          <div className="relative">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="appearance-none bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-blue-300 transition-colors"
            >
              <option value="all">All Properties ({properties.length})</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        )}

        {/* Property Info Badge */}
        {showPropertySelector && currentProperty && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs text-gray-600">{currentProperty.city}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600">{currentProperty.floors} Floors</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600">{currentProperty.totalRooms} Rooms</span>
          </div>
        )}
        
        <div className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants, rooms..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={handleNotificationClick}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
                    <button className="text-xs text-blue-600 hover:text-blue-700">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${notification.read ? '' : 'bg-blue-50'}`}
                      onClick={onNotificationClick}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notification.read ? 'bg-gray-300' : 'bg-blue-600'}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-200">
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="relative pl-3 border-l border-gray-200">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 transition-colors"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500">Manager</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white">{user?.name?.[0] || 'A'}</span>
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
                  <p className="text-xs text-gray-500">+91 {user?.phone}</p>
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
    </header>
  );
}