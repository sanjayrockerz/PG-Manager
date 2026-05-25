import { useState } from 'react';
import { 
  Shield,
  Users,
  BarChart3,
  HeadphonesIcon,
  Search,
  Plus,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Eye,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  CreditCard,
  Activity
} from 'lucide-react';

type AdminView = 
  | 'dashboard'
  | 'users'
  | 'user-detail'
  | 'subscriptions'
  | 'analytics'
  | 'support';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  properties: number;
  tenants: number;
  status: 'active' | 'suspended' | 'trial';
  joinedDate: string;
  revenue: number;
}

interface SupportTicket {
  id: string;
  user: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  date: string;
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 98765 43210',
    plan: 'pro',
    properties: 3,
    tenants: 45,
    status: 'active',
    joinedDate: '2024-01-15',
    revenue: 15000
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+91 98765 43211',
    plan: 'basic',
    properties: 1,
    tenants: 12,
    status: 'active',
    joinedDate: '2024-02-20',
    revenue: 3000
  },
  {
    id: '3',
    name: 'Amit Patel',
    email: 'amit@example.com',
    phone: '+91 98765 43212',
    plan: 'enterprise',
    properties: 8,
    tenants: 150,
    status: 'active',
    joinedDate: '2023-11-10',
    revenue: 45000
  },
  {
    id: '4',
    name: 'Sneha Singh',
    email: 'sneha@example.com',
    phone: '+91 98765 43213',
    plan: 'free',
    properties: 1,
    tenants: 5,
    status: 'trial',
    joinedDate: '2024-03-25',
    revenue: 0
  },
  {
    id: '5',
    name: 'Vikram Malhotra',
    email: 'vikram@example.com',
    phone: '+91 98765 43214',
    plan: 'basic',
    properties: 2,
    tenants: 20,
    status: 'suspended',
    joinedDate: '2024-01-05',
    revenue: 5000
  }
];

const mockTickets: SupportTicket[] = [
  {
    id: '1',
    user: 'Rajesh Kumar',
    subject: 'Payment gateway not working',
    status: 'open',
    priority: 'high',
    date: '2024-04-01'
  },
  {
    id: '2',
    user: 'Priya Sharma',
    subject: 'How to add multiple properties?',
    status: 'in-progress',
    priority: 'medium',
    date: '2024-03-31'
  },
  {
    id: '3',
    user: 'Amit Patel',
    subject: 'Feature request: Bulk SMS',
    status: 'resolved',
    priority: 'low',
    date: '2024-03-28'
  }
];

export function AdminSection() {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Calculate stats
  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter(u => u.status === 'active').length;
  const totalRevenue = mockUsers.reduce((sum, u) => sum + u.revenue, 0);
  const totalProperties = mockUsers.reduce((sum, u) => sum + u.properties, 0);
  const totalTenants = mockUsers.reduce((sum, u) => sum + u.tenants, 0);

  // Admin Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Admin Panel</h1>
        <p className="text-gray-600 mt-1">SaaS platform management & analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-gray-900 mt-2">{totalUsers}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+12 this month</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-sm">Monthly Revenue</p>
              <p className="text-gray-900 mt-2">₹{(totalRevenue / 1000).toFixed(0)}K</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+18%</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-sm">Total Properties</p>
              <p className="text-gray-900 mt-2">{totalProperties}</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Across platform</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-sm">Active Users</p>
              <p className="text-gray-900 mt-2">{activeUsers}</p>
              <div className="flex items-center gap-1 mt-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600">{Math.round((activeUsers / totalUsers) * 100)}% active</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setCurrentView('users')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Users</p>
              <p className="text-gray-600 text-sm">Manage PG owners</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('subscriptions')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Subscriptions</p>
              <p className="text-gray-600 text-sm">Plans & billing</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('analytics')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Analytics</p>
              <p className="text-gray-600 text-sm">Platform insights</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('support')}
          className="bg-white rounded-xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <HeadphonesIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Support</p>
              <p className="text-gray-600 text-sm">Help tickets</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-gray-900 text-sm font-medium">New user registered</p>
              <p className="text-gray-600 text-sm">Sneha Singh • 2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-gray-900 text-sm font-medium">Payment received</p>
              <p className="text-gray-600 text-sm">Rajesh Kumar - Pro Plan • 5 hours ago</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-gray-900 text-sm font-medium">Support ticket created</p>
              <p className="text-gray-600 text-sm">Payment gateway issue • 1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Users Management
  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage all PG owners</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm whitespace-nowrap">
          All ({totalUsers})
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm whitespace-nowrap hover:bg-gray-200">
          Active ({activeUsers})
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm whitespace-nowrap hover:bg-gray-200">
          Trial ({mockUsers.filter(u => u.status === 'trial').length})
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm whitespace-nowrap hover:bg-gray-200">
          Enterprise
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600">User</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Plan</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Properties</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Tenants</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Revenue</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-900 font-medium">{user.name}</p>
                      <p className="text-gray-600 text-sm">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      user.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                      user.plan === 'basic' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{user.properties}</td>
                  <td className="px-6 py-4 text-gray-900">{user.tenants}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">₹{(user.revenue / 1000).toFixed(1)}K</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' :
                      user.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setCurrentView('user-detail');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // User Detail
  const renderUserDetail = () => {
    const user = mockUsers.find(u => u.id === selectedUserId);
    if (!user) return null;

    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setCurrentView('users')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Users
          </button>
          <h1 className="text-gray-900">{user.name}</h1>
          <p className="text-gray-600 mt-1">{user.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <p className="text-gray-600 text-sm">Properties</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold">{user.properties}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <p className="text-gray-600 text-sm">Tenants</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold">{user.tenants}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <p className="text-gray-600 text-sm">Revenue</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold">₹{(user.revenue / 1000).toFixed(0)}K</p>
          </div>
        </div>

        {/* User Details */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900">User Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-600 text-sm">Email</p>
                <p className="text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-600 text-sm">Phone</p>
                <p className="text-gray-900">{user.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-600 text-sm">Plan</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                  user.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                  user.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                  user.plan === 'basic' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {user.plan.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center gap-2">
            <Eye className="w-6 h-6 text-blue-600" />
            <span className="text-gray-900 text-sm">View Account</span>
          </button>

          <button className="bg-white rounded-xl p-4 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all flex flex-col items-center gap-2">
            <Mail className="w-6 h-6 text-green-600" />
            <span className="text-gray-900 text-sm">Send Email</span>
          </button>

          <button className="bg-white rounded-xl p-4 border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all flex flex-col items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-yellow-600" />
            <span className="text-gray-900 text-sm">Verify User</span>
          </button>

          <button className="bg-white rounded-xl p-4 border border-gray-200 hover:border-red-300 hover:shadow-md transition-all flex flex-col items-center gap-2">
            <Ban className="w-6 h-6 text-red-600" />
            <span className="text-gray-900 text-sm">Suspend</span>
          </button>
        </div>
      </div>
    );
  };

  // Subscriptions
  const renderSubscriptions = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Subscriptions</h1>
        <p className="text-gray-600 mt-1">Plans & billing overview</p>
      </div>

      {/* Revenue Card */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <p className="text-gray-600 text-sm mb-2">Monthly Recurring Revenue</p>
        <p className="text-gray-900 text-3xl font-semibold mb-4">₹{(totalRevenue / 1000).toFixed(1)}K</p>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-gray-600">Growth</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-green-600 font-semibold">+18%</p>
            </div>
          </div>
          <div>
            <p className="text-gray-600">Churn Rate</p>
            <p className="text-gray-900 font-semibold mt-1">2.3%</p>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div>
        <h2 className="text-gray-900 mb-4">Plan Distribution</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <p className="text-gray-600 text-sm">Enterprise</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">{mockUsers.filter(u => u.plan === 'enterprise').length}</p>
            <p className="text-gray-600 text-sm">₹45K MRR</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <p className="text-gray-600 text-sm">Pro</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">{mockUsers.filter(u => u.plan === 'pro').length}</p>
            <p className="text-gray-600 text-sm">₹15K MRR</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <p className="text-gray-600 text-sm">Basic</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">{mockUsers.filter(u => u.plan === 'basic').length}</p>
            <p className="text-gray-600 text-sm">₹8K MRR</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <p className="text-gray-600 text-sm">Free Trial</p>
            </div>
            <p className="text-gray-900 text-2xl font-semibold mb-1">{mockUsers.filter(u => u.plan === 'free').length}</p>
            <p className="text-gray-600 text-sm">₹0 MRR</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600">User</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Plan</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Amount</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockUsers.filter(u => u.revenue > 0).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{user.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      user.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">₹{user.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Analytics
  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Platform insights & metrics</p>
      </div>

      {/* Growth Metrics */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          <div>
            <p className="text-gray-600 text-sm">Overall Growth</p>
            <p className="text-gray-900 text-2xl font-semibold">+24.5%</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm">Compared to last month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">New Users</p>
          <p className="text-gray-900 text-2xl font-semibold mb-2">+12</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+8% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Churn Rate</p>
          <p className="text-gray-900 text-2xl font-semibold mb-2">2.3%</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>-0.5% improvement</span>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Platform Statistics</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Properties</span>
              <span className="text-gray-900 font-semibold">{totalProperties}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Total Tenants</span>
              <span className="text-gray-900 font-semibold">{totalTenants}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '82%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">Active Sessions</span>
              <span className="text-gray-900 font-semibold">{Math.floor(totalUsers * 0.6)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Support Tickets
  const renderSupport = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Support</h1>
        <p className="text-gray-600 mt-1">Manage help tickets</p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm whitespace-nowrap">
          All ({mockTickets.length})
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm whitespace-nowrap hover:bg-gray-200">
          Open ({mockTickets.filter(t => t.status === 'open').length})
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm whitespace-nowrap hover:bg-gray-200">
          In Progress
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm whitespace-nowrap hover:bg-gray-200">
          Resolved
        </button>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Subject</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">User</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Priority</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900 font-medium">{ticket.subject}</td>
                  <td className="px-6 py-4 text-gray-900">{ticket.user}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ticket.priority === 'high' ? 'bg-red-100 text-red-700' :
                      ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{new Date(ticket.date).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render the appropriate view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUsers();
      case 'user-detail':
        return renderUserDetail();
      case 'subscriptions':
        return renderSubscriptions();
      case 'analytics':
        return renderAnalytics();
      case 'support':
        return renderSupport();
      default:
        return renderDashboard();
    }
  };

  return (
    <div>
      {renderView()}
    </div>
  );
}
