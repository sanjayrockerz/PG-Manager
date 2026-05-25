import {
  TrendingUp,
  Users,
  UserCheck,
  TrendingDown,
  Building2,
  UserCircle,
  AlertCircle,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../ui/card';

const stats = [
  { label: 'MRR', value: '₹68,000', trend: '+18%', trendUp: true, icon: TrendingUp, color: 'purple' },
  { label: 'Paying Customers', value: '42', subtitle: '+12 this month', icon: UserCheck, color: 'blue' },
  { label: 'Free Users', value: '156', subtitle: '21% conversion rate', icon: Users, color: 'gray' },
  { label: 'Churn Rate', value: '2.3%', trend: '↓ good', trendUp: false, icon: TrendingDown, color: 'amber' },
];

const platformStats = [
  { label: 'Total Properties', value: '89', subtitle: 'across platform', icon: Building2, color: 'blue' },
  { label: 'Total Tenants', value: '634', subtitle: 'across platform', icon: UserCircle, color: 'purple' },
  { label: 'Open Support Tickets', value: '7', subtitle: 'needs attention', icon: AlertCircle, color: 'red' },
  { label: 'WhatsApp Messages', value: '1,247', subtitle: 'this month', icon: MessageCircle, color: 'green' },
];

const activities = [
  { type: 'signup', color: 'green', text: 'New signup:', name: 'Raj Mehta', time: '2 hours ago' },
  { type: 'upgrade', color: 'purple', text: 'Plan upgrade:', name: 'Anita Sharma → Scale', time: '5 hours ago' },
  { type: 'cancel', color: 'red', text: 'Subscription cancelled:', name: 'Vikram Patel', time: '1 day ago' },
  { type: 'ticket', color: 'amber', text: 'New support ticket:', name: 'Payment issue #47', time: '1 day ago' },
  { type: 'failed', color: 'red', text: 'Payment failed:', name: 'Suresh Kumar ₹1,500', time: '2 days ago' },
];

export function AdminDashboard() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            purple: 'bg-purple-100 text-purple-600',
            blue: 'bg-blue-100 text-blue-600',
            gray: 'bg-gray-100 text-gray-600',
            amber: 'bg-amber-100 text-amber-600',
          }[stat.color];

          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.trend && (
                    <p className={`text-sm mt-1 ${stat.trendUp ? 'text-green-600' : 'text-amber-600'}`}>
                      {stat.trend}
                    </p>
                  )}
                  {stat.subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformStats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
            red: 'bg-red-100 text-red-600',
            green: 'bg-green-100 text-green-600',
          }[stat.color];

          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Activity</h2>
          <button className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
            View all activity
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {activities.map((activity, index) => {
            const colorClasses = {
              green: 'bg-green-100 text-green-600',
              purple: 'bg-purple-100 text-purple-600',
              red: 'bg-red-100 text-red-600',
              amber: 'bg-amber-100 text-amber-600',
            }[activity.color];

            return (
              <div key={index} className="flex items-center gap-3 py-2">
                <div className={`w-2 h-2 rounded-full ${colorClasses.replace('text-', 'bg-')}`}></div>
                <p className="text-sm flex-1">
                  <span className="text-gray-600">{activity.text}</span>{' '}
                  <span className="font-medium text-gray-900">{activity.name}</span>
                </p>
                <p className="text-xs text-gray-400">{activity.time}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
