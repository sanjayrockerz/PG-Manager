import { TrendingUp, Clock, Users, Bed, CreditCard, Wrench, UserPlus, Building, ArrowRight, DollarSign, Home, AlertCircle, CheckCircle, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface DashboardV2Props {
  onNavigate: (screen: string) => void;
}

const stats = [
  {
    label: 'Monthly Revenue',
    value: '₹19,400',
    trend: '+98%',
    trendUp: true,
    icon: CreditCard,
    color: 'purple',
  },
  {
    label: 'Pending Payments',
    value: '₹19,800',
    subtitle: '2 invoices open',
    tag: '1 Overdue',
    tagColor: 'red',
    icon: Clock,
    color: 'red',
  },
  {
    label: 'Total Tenants',
    value: '4',
    subtitle: 'across properties',
    icon: Users,
    color: 'purple',
  },
  {
    label: 'Occupancy Rate',
    value: '71%',
    subtitle: '5/7 rooms occupied',
    icon: Bed,
    color: 'green',
  },
];

const revenueData = [
  { month: 'Jan', value: 12000, target: 15000 },
  { month: 'Feb', value: 14500, target: 15000 },
  { month: 'Mar', value: 13800, target: 16000 },
  { month: 'Apr', value: 16200, target: 16000 },
  { month: 'May', value: 19400, target: 18000 },
];

const occupancyData = [
  { property: 'Sunshine Residency', occupied: 3, total: 4, percentage: 75 },
  { property: 'Lakeview PG', occupied: 2, total: 3, percentage: 67 },
];

const recentPayments = [
  { tenant: 'Amit Kumar', amount: 8000, date: 'May 10', status: 'completed' },
  { tenant: 'Rahul Sharma', amount: 8200, date: 'May 11', status: 'completed' },
  { tenant: 'Vikash Singh', amount: 7500, date: 'May 15', status: 'pending' },
];

const upcomingDues = [
  { tenant: 'Priya Patel', amount: 8000, dueDate: 'May 20', daysLeft: 8 },
  { tenant: 'Suresh Kumar', amount: 7000, dueDate: 'May 22', daysLeft: 10 },
];

const maintenanceTickets = [
  { id: '#M001', issue: 'AC not working', priority: 'high', property: 'Sunshine Residency', room: '301' },
  { id: '#M002', issue: 'Water leakage', priority: 'medium', property: 'Lakeview PG', room: '202' },
];

const activities = [
  {
    type: 'payment',
    icon: CreditCard,
    color: 'green',
    title: 'Payment received',
    description: 'Amit Kumar paid ₹8,000',
    property: 'Sunshine PG',
    time: '2 hours ago',
  },
  {
    type: 'maintenance',
    icon: Wrench,
    color: 'amber',
    title: 'Maintenance request',
    description: 'AC not working - Room 101',
    property: 'Royal Boys Hostel',
    time: '5 hours ago',
  },
  {
    type: 'tenant',
    icon: UserPlus,
    color: 'blue',
    title: 'New tenant added',
    description: 'Rahul Sharma joined',
    property: 'Sunshine PG',
    time: '1 day ago',
  },
];

export function DashboardV2({ onNavigate }: DashboardV2Props) {
  const maxRevenue = Math.max(...revenueData.map((d) => Math.max(d.value, d.target)));

  const getIconColor = (color: string) => {
    switch (color) {
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'red':
        return 'bg-red-100 text-red-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'amber':
        return 'bg-amber-100 text-amber-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">Viewing all 2 properties</p>
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Demo data</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">Updated 2s ago</span>
            </div>
          </div>
        </div>

        {/* Building View Button - Small */}
        <Button
          onClick={() => onNavigate('building-view')}
          variant="outline"
          size="sm"
          className="border-purple-200 text-purple-600 hover:bg-purple-50"
        >
          <Building className="w-4 h-4 mr-2" />
          Building View
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.trend && (
                    <div className={`flex items-center gap-1 mt-1 ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trendUp ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span className="text-sm font-medium">{stat.trend}</span>
                    </div>
                  )}
                  {stat.subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                  {stat.tag && (
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                      stat.tagColor === 'red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {stat.tag}
                    </span>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${getIconColor(stat.color)}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900">Revenue Trend</h2>
              <p className="text-sm text-gray-500">Monthly collections vs target</p>
            </div>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Last 5 months
            </Button>
          </div>

          {/* Chart */}
          <div className="h-64">
            <div className="flex items-end justify-between h-full gap-2 pb-8">
              {revenueData.map((data, index) => {
                const valueHeight = (data.value / maxRevenue) * 100;
                const targetHeight = (data.target / maxRevenue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex gap-1 items-end" style={{ height: `${Math.max(valueHeight, targetHeight)}%` }}>
                      {/* Target bar (light) */}
                      <div
                        className="flex-1 bg-gray-200 rounded-t relative group cursor-pointer hover:bg-gray-300 transition-colors"
                        style={{ height: `${targetHeight}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          Target: ₹{data.target.toLocaleString()}
                        </div>
                      </div>
                      {/* Actual bar (purple gradient) */}
                      <div
                        className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t relative group cursor-pointer hover:from-purple-700 hover:to-purple-500 transition-colors"
                        style={{ height: `${valueHeight}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          ₹{data.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-600">{data.month}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-t from-purple-600 to-purple-400 rounded"></div>
                <span className="text-xs text-gray-600">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
                <span className="text-xs text-gray-600">Target</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-500">Latest events</p>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconColor(activity.color)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-600">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">{activity.property}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Secondary Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Occupancy by Property */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Occupancy by Property</h2>
          <div className="space-y-4">
            {occupancyData.map((property, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{property.property}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {property.occupied}/{property.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all"
                    style={{ width: `${property.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{property.percentage}% occupied</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Payments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Payments</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('payments')}>
              View all
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{payment.tenant}</p>
                  <p className="text-xs text-gray-500">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</p>
                  {payment.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Dues */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Upcoming Dues</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('payments')}>
              View all
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingDues.map((due, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{due.tenant}</p>
                  <p className="text-xs text-gray-500">Due: {due.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{due.amount.toLocaleString()}</p>
                  <p className="text-xs text-amber-600">{due.daysLeft} days left</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Maintenance Alerts */}
      {maintenanceTickets.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Active Maintenance Requests</h3>
                <p className="text-sm text-gray-600 mb-3">{maintenanceTickets.length} tickets need your attention</p>
                <div className="space-y-2">
                  {maintenanceTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className="text-gray-700">{ticket.issue}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-600">{ticket.property} - {ticket.room}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={() => onNavigate('maintenance')} className="bg-red-600 hover:bg-red-700">
              View Tickets
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
