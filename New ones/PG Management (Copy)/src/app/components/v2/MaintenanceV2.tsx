"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import {
  Wrench,
  AlertCircle,
  Clock,
  CheckCircle,
  Plus,
  MessageCircle,
  MapPin,
  User,
  Phone,
  Calendar
} from 'lucide-react';

interface MaintenanceTicket {
  id: string;
  ticketId: string;
  issue: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'Open' | 'In Progress' | 'Resolved';
  source: 'WhatsApp' | 'Portal' | 'Manual';
  property: string;
  tenant: string;
  room: string;
  phone: string;
  date: string;
}

export function MaintenanceV2() {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
  const [showManualTicketModal, setShowManualTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    issue: '',
    description: '',
    priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
    property: '',
    tenant: '',
    room: '',
    phone: ''
  });
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([
    {
      id: '1',
      ticketId: 'MNT-2026-178',
      issue: 'AC not cooling properly',
      description: 'The AC unit in the bedroom is making strange noises and not cooling effectively.',
      priority: 'HIGH',
      status: 'Open',
      source: 'WhatsApp',
      property: 'Green Valley Apartments',
      tenant: 'Rajesh Kumar',
      room: 'A-201',
      phone: '+91 98765 43210',
      date: '2026-05-12'
    },
    {
      id: '2',
      ticketId: 'MNT-2026-177',
      issue: 'Leaking faucet in bathroom',
      description: 'Water is constantly dripping from the bathroom sink faucet.',
      priority: 'MEDIUM',
      status: 'In Progress',
      source: 'Portal',
      property: 'Sunrise Residency',
      tenant: 'Priya Sharma',
      room: 'B-102',
      phone: '+91 98765 43211',
      date: '2026-05-11'
    },
    {
      id: '3',
      ticketId: 'MNT-2026-176',
      issue: 'Door lock not working',
      description: 'The main door lock is jammed and difficult to open.',
      priority: 'HIGH',
      status: 'Open',
      source: 'Manual',
      property: 'Ocean View Plaza',
      tenant: 'Amit Patel',
      room: 'C-301',
      phone: '+91 98765 43212',
      date: '2026-05-10'
    },
    {
      id: '4',
      ticketId: 'MNT-2026-175',
      issue: 'Light bulb replacement needed',
      description: 'Two light bulbs in the living room need replacement.',
      priority: 'LOW',
      status: 'Resolved',
      source: 'WhatsApp',
      property: 'Green Valley Apartments',
      tenant: 'Sneha Reddy',
      room: 'A-203',
      phone: '+91 98765 43213',
      date: '2026-05-09'
    },
    {
      id: '5',
      ticketId: 'MNT-2026-174',
      issue: 'Ceiling fan making noise',
      description: 'The bedroom ceiling fan is making loud grinding noises when running.',
      priority: 'MEDIUM',
      status: 'In Progress',
      source: 'Portal',
      property: 'Sunrise Residency',
      tenant: 'Vikram Singh',
      room: 'B-105',
      phone: '+91 98765 43214',
      date: '2026-05-08'
    },
    {
      id: '6',
      ticketId: 'MNT-2026-173',
      issue: 'Water heater not heating',
      description: 'The geyser is not heating water properly since yesterday.',
      priority: 'HIGH',
      status: 'Open',
      source: 'WhatsApp',
      property: 'Ocean View Plaza',
      tenant: 'Anita Desai',
      room: 'C-304',
      phone: '+91 98765 43215',
      date: '2026-05-07'
    }
  ]);

  const filteredTickets = tickets.filter(
    ticket => filterStatus === 'All' || ticket.status === filterStatus
  );

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'border-l-red-500';
      case 'MEDIUM':
        return 'border-l-amber-500';
      case 'LOW':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700';
      case 'LOW':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'WhatsApp':
        return 'bg-green-100 text-green-700';
      case 'Portal':
        return 'bg-blue-100 text-blue-700';
      case 'Manual':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
        <Button
          onClick={() => setShowManualTicketModal(true)}
          className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Manual Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-6">
        {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-[#4F46E5] text-white'
                : 'bg-white text-gray-700 border border-[#E2E8F0] hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Ticket Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket.id}
            className={`border-[#E2E8F0] border-l-4 ${getPriorityColor(ticket.priority)} hover:shadow-lg transition-shadow`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{ticket.issue}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSourceBadgeColor(ticket.source)}`}>
                      {ticket.source}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium text-gray-700">ID:</span>
                      <span>{ticket.ticketId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{ticket.property}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{ticket.tenant}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium text-gray-700">Room:</span>
                      <span>{ticket.room}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{ticket.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(ticket.date).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 ml-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                    Update Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manual Ticket Modal */}
      <Dialog open={showManualTicketModal} onOpenChange={setShowManualTicketModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Manual Maintenance Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const newTicket: MaintenanceTicket = {
              id: String(tickets.length + 1),
              ticketId: `MNT-2026-${200 + tickets.length}`,
              issue: newTicketForm.issue,
              description: newTicketForm.description,
              priority: newTicketForm.priority,
              status: 'Open',
              source: 'Manual',
              property: newTicketForm.property,
              tenant: newTicketForm.tenant,
              room: newTicketForm.room,
              phone: newTicketForm.phone,
              date: new Date().toISOString().split('T')[0]
            };
            setTickets([newTicket, ...tickets]);
            toast.success('Maintenance ticket created successfully!');
            setShowManualTicketModal(false);
            setNewTicketForm({ issue: '', description: '', priority: 'MEDIUM', property: '', tenant: '', room: '', phone: '' });
          }} className="space-y-4">
            <div>
              <Label>Issue Title *</Label>
              <Input
                required
                placeholder="e.g., AC not cooling"
                value={newTicketForm.issue}
                onChange={(e) => setNewTicketForm({...newTicketForm, issue: e.target.value})}
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                required
                placeholder="Detailed description of the issue..."
                value={newTicketForm.description}
                onChange={(e) => setNewTicketForm({...newTicketForm, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority *</Label>
                <Select value={newTicketForm.priority} onValueChange={(val: any) => setNewTicketForm({...newTicketForm, priority: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property *</Label>
                <Input
                  required
                  placeholder="e.g., Green Valley"
                  value={newTicketForm.property}
                  onChange={(e) => setNewTicketForm({...newTicketForm, property: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tenant Name *</Label>
                <Input
                  required
                  placeholder="e.g., Rajesh Kumar"
                  value={newTicketForm.tenant}
                  onChange={(e) => setNewTicketForm({...newTicketForm, tenant: e.target.value})}
                />
              </div>
              <div>
                <Label>Room *</Label>
                <Input
                  required
                  placeholder="e.g., A-201"
                  value={newTicketForm.room}
                  onChange={(e) => setNewTicketForm({...newTicketForm, room: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                required
                type="tel"
                placeholder="+91 98765 43210"
                value={newTicketForm.phone}
                onChange={(e) => setNewTicketForm({...newTicketForm, phone: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowManualTicketModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA]">
                Create Ticket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
