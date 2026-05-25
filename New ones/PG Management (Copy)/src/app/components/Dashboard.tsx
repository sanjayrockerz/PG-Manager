import { Users, Bed, CreditCard, AlertCircle, TrendingUp, TrendingDown, IndianRupee, Clock } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useProperty } from '../contexts/PropertyContext';
import { mockTenants, mockRooms, mockPayments, mockMaintenanceRequests, filterByProperty } from '../utils/mockData';
import { useMemo } from 'react';

export function Dashboard() {
  const { selectedProperty, properties } = useProperty();
  
  // Filter data based on selected property
  const filteredTenants = useMemo(() => filterByProperty(mockTenants, selectedProperty), [selectedProperty]);
  const filteredRooms = useMemo(() => filterByProperty(mockRooms, selectedProperty), [selectedProperty]);
  const filteredPayments = useMemo(() => filterByProperty(mockPayments, selectedProperty), [selectedProperty]);
  const filteredMaintenance = useMemo(() => filterByProperty(mockMaintenanceRequests, selectedProperty), [selectedProperty]);
  
  // Calculate stats based on filtered data
  const totalTenants = filteredTenants.filter(t => t.status === 'active').length;
  const occupiedRooms = filteredRooms.filter(r => r.status === 'occupied').length;
  const totalRooms = selectedProperty === 'all' 
    ? properties.reduce((sum, p) => sum + p.totalRooms, 0)
    : properties.find(p => p.id === selectedProperty)?.totalRooms || filteredRooms.length;
  const monthlyRevenue = filteredPayments
    .filter(p => p.status === 'paid' && new Date(p.date).getMonth() === 11) // December
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = filteredPayments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingIssues = filteredMaintenance.filter(m => m.status === 'open').length;
  
  // Helper to get property name
  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };
  
  const stats = [
    {
      label: 'Monthly Revenue',
      value: `₹${monthlyRevenue.toLocaleString()}`,
      change: '+8%',
      trend: 'up',
      icon: CreditCard,
      color: 'purple',
    },
    {
      label: 'Pending Payments',
      value: `₹${pendingAmount.toLocaleString()}`,
      change: `${filteredPayments.filter(p => p.status === 'pending' || p.status === 'overdue').length} dues`,
      trend: 'down',
      icon: Clock,
      color: 'red',
    },
    {
      label: 'Total Tenants',
      value: totalTenants.toString(),
      change: '+12%',
      trend: 'up',
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Occupancy Rate',
      value: `${Math.round((occupiedRooms / totalRooms) * 100)}%`,
      change: `${occupiedRooms}/${totalRooms} rooms`,
      trend: 'up',
      icon: Bed,
      color: 'green',
    },
  ];

  const recentPayments = filteredPayments.slice(0, 5);
  
  // Generate recent activity from actual data
  const recentActivity = [
    ...filteredPayments.slice(0, 2).map((payment, idx) => ({
      id: `payment-${idx}`,
      action: 'Payment received',
      detail: `${payment.tenant} - ${payment.room}`,
      property: selectedProperty === 'all' ? getPropertyName(payment.propertyId) : null,
      time: '2 hours ago',
    })),
    ...filteredMaintenance.slice(0, 2).map((request, idx) => ({
      id: `maintenance-${idx}`,
      action: 'Maintenance request',
      detail: `${request.issue} - ${request.room}`,
      property: selectedProperty === 'all' ? getPropertyName(request.propertyId) : null,
      time: `${idx + 1} day ago`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {selectedProperty === 'all' 
            ? `Viewing all ${properties.length} properties` 
            : `Viewing ${properties.find(p => p.id === selectedProperty)?.name || 'property'}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            red: 'bg-red-50 text-red-600',
          };
          
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Tenant</th>
                  {selectedProperty === 'all' && <th className="px-6 py-3 text-left text-xs text-gray-600">Property</th>}
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Room</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Amount</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentPayments.length > 0 ? (
                  recentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.tenant}</td>
                      {selectedProperty === 'all' && (
                        <td className="px-6 py-4 text-sm text-gray-600">{getPropertyName(payment.propertyId)}</td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.room}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">₹{payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex px-3 py-1 rounded-full text-xs
                          ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                          ${payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${payment.status === 'overdue' ? 'bg-red-100 text-red-700' : ''}
                        `}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={selectedProperty === 'all' ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                      No payment records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6 space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="w-2 h-2 mt-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.detail}</p>
                  {activity.property && (
                    <p className="text-xs text-gray-500">{activity.property}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Occupancy Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Occupancy Overview</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">Chart visualization would go here</p>
        </div>
      </div>
    </div>
  );
}