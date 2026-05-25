import { useState } from 'react';
import { Card } from '../ui/card';

const stats = [
  { label: 'Total', value: '47' },
  { label: 'Open', value: '7' },
  { label: 'In Progress', value: '12' },
  { label: 'Avg Response', value: '4hrs' },
];

const filters = ['All', 'Open', 'In Progress', 'Resolved', 'Urgent'];

const tickets = [
  {
    id: 1,
    owner: { name: 'Raj Mehta', email: 'raj@example.com', avatar: 'RM' },
    subject: 'Payment gateway not working',
    description: 'Unable to receive payments from tenants since yesterday. Getting timeout errors.',
    category: 'Technical',
    priority: 'Urgent',
    status: 'Open',
    created: '2 hours ago',
    lastReply: '1 hour ago',
    priorityColor: 'red',
  },
  {
    id: 2,
    owner: { name: 'Anita Sharma', email: 'anita@example.com', avatar: 'AS' },
    subject: 'How to add new property?',
    description: 'Need help adding a third property to my account.',
    category: 'Support',
    priority: 'Medium',
    status: 'In Progress',
    created: '5 hours ago',
    lastReply: '3 hours ago',
    priorityColor: 'blue',
  },
  {
    id: 3,
    owner: { name: 'Vikram Patel', email: 'vikram@example.com', avatar: 'VP' },
    subject: 'Billing issue - double charged',
    description: 'I was charged twice for the same month subscription.',
    category: 'Billing',
    priority: 'High',
    status: 'Open',
    created: '1 day ago',
    lastReply: '5 hours ago',
    priorityColor: 'amber',
  },
];

export function SupportTickets() {
  const [activeFilter, setActiveFilter] = useState('All');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'border-red-500';
      case 'High':
        return 'border-amber-500';
      case 'Medium':
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-700';
      case 'High':
        return 'bg-amber-100 text-amber-700';
      case 'Medium':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-red-100 text-red-700';
      case 'In Progress':
        return 'bg-amber-100 text-amber-700';
      case 'Resolved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
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

      {/* Filters */}
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

      {/* Ticket Cards */}
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className={`p-4 border-l-4 ${getPriorityColor(ticket.priority)}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Left side - Owner info and content */}
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">{ticket.owner.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{ticket.owner.name}</div>
                    <div className="text-sm text-gray-500">{ticket.owner.email}</div>
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{ticket.subject}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-1">{ticket.description}</p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {ticket.category}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Created {ticket.created} • Last reply {ticket.lastReply}
                </div>
              </div>

              {/* Right side - Action button */}
              <div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm whitespace-nowrap">
                  View & Reply →
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
