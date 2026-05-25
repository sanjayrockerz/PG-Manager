import { useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface AllOwnersProps {
  onViewOwner: (ownerId: string) => void;
}

const stats = [
  { label: 'Total Users', value: '198' },
  { label: 'Active', value: '167' },
  { label: 'Free Tier', value: '156' },
  { label: 'Paid', value: '42' },
];

const filters = ['All', 'Free', 'Pro', 'Scale', 'Trial', 'Suspended'];

const owners = [
  {
    id: '1',
    name: 'Raj Mehta',
    email: 'raj@example.com',
    plan: 'Pro',
    city: 'Jaipur',
    properties: 2,
    tenants: 8,
    mrr: '₹3,000',
    lastActive: '2 hours ago',
    status: 'Active',
  },
  {
    id: '2',
    name: 'Anita Sharma',
    email: 'anita@example.com',
    plan: 'Scale',
    city: 'Bangalore',
    properties: 5,
    tenants: 24,
    mrr: '₹11,000',
    lastActive: '1 day ago',
    status: 'Active',
  },
  {
    id: '3',
    name: 'Vikram Patel',
    email: 'vikram@example.com',
    plan: 'Free',
    city: 'Mumbai',
    properties: 1,
    tenants: 0,
    mrr: '₹0',
    lastActive: '3 days ago',
    status: 'Trial',
  },
  {
    id: '4',
    name: 'Priya Singh',
    email: 'priya@example.com',
    plan: 'Pro',
    city: 'Delhi',
    properties: 3,
    tenants: 12,
    mrr: '₹3,000',
    lastActive: '5 hours ago',
    status: 'Active',
  },
  {
    id: '5',
    name: 'Suresh Kumar',
    email: 'suresh@example.com',
    plan: 'Free',
    city: 'Pune',
    properties: 1,
    tenants: 4,
    mrr: '₹0',
    lastActive: '2 weeks ago',
    status: 'Suspended',
  },
];

export function AllOwners({ onViewOwner }: AllOwnersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Pro':
        return 'bg-purple-100 text-purple-700';
      case 'Scale':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Trial':
        return 'bg-amber-100 text-amber-700';
      case 'Suspended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PG Owners</h1>
        <p className="text-sm text-gray-500 mt-1">All registered owners on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeFilter === filter
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tenants
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {owner.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{owner.name}</div>
                        <div className="text-sm text-gray-500">{owner.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(owner.plan)}`}>
                      {owner.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{owner.city}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{owner.properties}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{owner.tenants}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{owner.mrr}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{owner.lastActive}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(owner.status)}`}>
                      {owner.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewOwner(owner.id)}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {owners.map((owner) => (
          <Card key={owner.id} className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">
                  {owner.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{owner.name}</div>
                <div className="text-sm text-gray-500">{owner.email}</div>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(owner.plan)}`}>
                    {owner.plan}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(owner.status)}`}>
                    {owner.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="text-gray-500">City:</span> {owner.city}
              </div>
              <div>
                <span className="text-gray-500">Properties:</span> {owner.properties}
              </div>
              <div>
                <span className="text-gray-500">Tenants:</span> {owner.tenants}
              </div>
              <div>
                <span className="text-gray-500">MRR:</span> {owner.mrr}
              </div>
            </div>

            <Button
              onClick={() => onViewOwner(owner.id)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              View Details
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
