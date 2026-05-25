import { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

const stats = [
  { label: 'Total', value: '12' },
  { label: 'Open', value: '3' },
  { label: 'In Progress', value: '2' },
  { label: 'Resolved', value: '7' },
];

const filters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

const tickets = [
  {
    id: 1,
    subject: 'Unable to send WhatsApp messages',
    description: 'Getting an error when trying to send rent reminders via WhatsApp. It was working fine yesterday.',
    category: 'Technical',
    priority: 'High',
    status: 'Open',
    created: '2 hours ago',
    lastReply: 'No reply yet',
  },
  {
    id: 2,
    subject: 'Question about Pro plan features',
    description: 'Want to understand what additional features I get with the Pro plan compared to Free.',
    category: 'Billing',
    priority: 'Medium',
    status: 'In Progress',
    created: '1 day ago',
    lastReply: '3 hours ago',
  },
  {
    id: 3,
    subject: 'How to add caretaker access?',
    description: 'Need help setting up caretaker account so they can manage daily operations.',
    category: 'Operations',
    priority: 'Low',
    status: 'Resolved',
    created: '3 days ago',
    lastReply: '2 days ago',
  },
];

export function Support() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const getPriorityColor = (priority: string) => {
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
      case 'Closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (showNewTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Support Ticket</h1>
            <p className="text-sm text-gray-500 mt-1">Get help from the RentCare team</p>
          </div>
          <Button variant="outline" onClick={() => setShowNewTicket(false)}>
            Cancel
          </Button>
        </div>

        <Card className="p-6">
          <form className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Brief description of your issue" />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Provide detailed information about your issue or question..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select id="category" className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Select category</option>
                  <option>Billing</option>
                  <option>Technical</option>
                  <option>Operations</option>
                  <option>Tenant Management</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <select id="priority" className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>

              <div>
                <Label htmlFor="property">Property (Optional)</Label>
                <select id="property" className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option>Select property</option>
                  <option>Sunshine PG</option>
                  <option>Royal Boys Hostel</option>
                </select>
              </div>
            </div>

            <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
              Submit Ticket
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (selectedTicket) {
    const ticket = tickets.find((t) => t.id === selectedTicket);
    if (!ticket) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-sm text-[#4F46E5] hover:text-[#4338CA] mb-2"
            >
              ← Back to all tickets
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-sm text-gray-500 mt-1">Ticket #{ticket.id}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-900 mt-1">{ticket.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{ticket.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{ticket.created}</p>
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">Conversation</h3>

              {/* Admin Reply Example */}
              {ticket.status === 'In Progress' && (
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">RC</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">RentCare Support</span>
                          <span className="text-xs text-gray-500">3 hours ago</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          Thank you for reaching out. We're looking into this issue and will get back to you shortly with a solution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reply Form */}
              <div className="space-y-3">
                <Label>Add Reply</Label>
                <Textarea rows={4} placeholder="Type your message..." />
                <Button className="bg-[#4F46E5] hover:bg-[#4338CA]">
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500 mt-1">Get help from the RentCare team</p>
        </div>
        <Button
          onClick={() => setShowNewTicket(true)}
          className="bg-[#4F46E5] hover:bg-[#4338CA]"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
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
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeFilter === filter
                ? 'bg-[#4F46E5] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">{ticket.subject}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {ticket.category}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Created {ticket.created} • Last reply: {ticket.lastReply}
                </div>
              </div>

              <Button
                onClick={() => setSelectedTicket(ticket.id)}
                variant="outline"
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
