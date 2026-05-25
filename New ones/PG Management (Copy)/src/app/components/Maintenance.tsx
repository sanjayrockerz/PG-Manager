import { useState, useMemo } from 'react';
import { Plus, AlertCircle, CheckCircle, Clock, Wrench, MessageCircle, X } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { mockMaintenanceRequests as allRequests, filterByProperty, mockTenants } from '../utils/mockData';

interface MaintenanceTicket {
  id: string;
  ticketId: string;
  tenant: string;
  propertyId: string;
  room: string;
  issue: string;
  description: string;
  source: 'whatsapp' | 'manual';
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  date: string;
  phone?: string;
  notes?: string[];
}

export function Maintenance() {
  const { selectedProperty, properties } = useProperty();
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [newNote, setNewNote] = useState('');

  // Form state for manual ticket creation
  const [formData, setFormData] = useState({
    tenant: '',
    propertyId: '',
    room: '',
    issue: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Initialize tickets with WhatsApp source
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    return allRequests.map((req, index) => ({
      id: req.id,
      ticketId: `TKT${String(1000 + index).slice(-4)}`,
      tenant: req.tenant,
      propertyId: req.propertyId,
      room: req.room,
      issue: req.issue,
      description: `Issue reported: ${req.issue}`,
      source: 'whatsapp' as const,
      status: req.status,
      priority: req.priority,
      date: req.date,
      phone: mockTenants.find(t => t.name === req.tenant)?.phone,
      notes: [],
    }));
  });

  // Filter maintenance tickets by property
  const propertyFilteredTickets = useMemo(() => filterByProperty(tickets, selectedProperty), [tickets, selectedProperty]);

  const filteredTickets = propertyFilteredTickets.filter(ticket => 
    filterStatus === 'all' ? true : ticket.status === filterStatus
  );

  const stats = {
    total: propertyFilteredTickets.length,
    pending: propertyFilteredTickets.filter(r => r.status === 'open').length,
    inProgress: propertyFilteredTickets.filter(r => r.status === 'in-progress').length,
    completed: propertyFilteredTickets.filter(r => r.status === 'resolved').length,
  };

  // Helper to get property name
  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const handleUpdateStatus = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setNewNote('');
    setShowUpdateModal(true);
  };

  const handleStatusChange = (newStatus: 'open' | 'in-progress' | 'resolved') => {
    if (!selectedTicket) return;

    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === selectedTicket.id
          ? { ...ticket, status: newStatus }
          : ticket
      )
    );
    setSelectedTicket({ ...selectedTicket, status: newStatus });
  };

  const handleAddNote = () => {
    if (!selectedTicket || !newNote.trim()) return;

    const timestamp = new Date().toLocaleString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const noteWithTimestamp = `[${timestamp}] ${newNote.trim()}`;

    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === selectedTicket.id
          ? { ...ticket, notes: [...(ticket.notes || []), noteWithTimestamp] }
          : ticket
      )
    );

    setSelectedTicket({
      ...selectedTicket,
      notes: [...(selectedTicket.notes || []), noteWithTimestamp]
    });

    setNewNote('');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();

    const newTicket: MaintenanceTicket = {
      id: `ticket-${Date.now()}`,
      ticketId: `TKT${String(1000 + tickets.length).slice(-4)}`,
      tenant: formData.tenant,
      propertyId: formData.propertyId,
      room: formData.room,
      issue: formData.issue,
      description: formData.description,
      source: 'manual',
      status: 'open',
      priority: formData.priority,
      date: new Date().toISOString().split('T')[0],
      notes: [],
    };

    setTickets([newTicket, ...tickets]);
    setShowAddModal(false);
    
    // Reset form
    setFormData({
      tenant: '',
      propertyId: '',
      room: '',
      issue: '',
      description: '',
      priority: 'medium',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1">Track and manage maintenance requests via WhatsApp</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Manual Ticket</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Requests</p>
              <p className="text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Open</p>
              <p className="text-gray-900 mt-2">{stats.pending}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-gray-900 mt-2">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Resolved</p>
              <p className="text-gray-900 mt-2">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'open', 'in-progress', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                ${filterStatus === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {status === 'all' ? 'All' : 
               status === 'open' ? 'Open' :
               status === 'in-progress' ? 'In Progress' : 
               status === 'resolved' ? 'Resolved' : 
               status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className={`
                    p-3 rounded-lg flex-shrink-0
                    ${ticket.priority === 'high' ? 'bg-red-50' : ''}
                    ${ticket.priority === 'medium' ? 'bg-yellow-50' : ''}
                    ${ticket.priority === 'low' ? 'bg-blue-50' : ''}
                  `}>
                    <Wrench className={`
                      w-5 h-5
                      ${ticket.priority === 'high' ? 'text-red-600' : ''}
                      ${ticket.priority === 'medium' ? 'text-yellow-600' : ''}
                      ${ticket.priority === 'low' ? 'text-blue-600' : ''}
                    `} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-gray-900">{ticket.issue}</h3>
                      <span className={`
                        px-2 py-1 rounded text-xs
                        ${ticket.priority === 'high' ? 'bg-red-100 text-red-700' : ''}
                        ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${ticket.priority === 'low' ? 'bg-blue-100 text-blue-700' : ''}
                      `}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {ticket.source === 'whatsapp' ? 'WhatsApp' : 'Manual'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Ticket ID: </span>
                        <span className="text-gray-900 font-mono">{ticket.ticketId}</span>
                      </div>
                      {selectedProperty === 'all' && (
                        <div>
                          <span className="text-gray-500">Property: </span>
                          <span className="text-gray-900">{getPropertyName(ticket.propertyId)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Tenant: </span>
                        <span className="text-gray-900">{ticket.tenant}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Room: </span>
                        <span className="text-gray-900">{ticket.room}</span>
                      </div>
                      {ticket.phone && (
                        <div>
                          <span className="text-gray-500">Phone: </span>
                          <span className="text-gray-900">{ticket.phone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Date: </span>
                        <span className="text-gray-900">{ticket.date}</span>
                      </div>
                    </div>

                    {/* Display notes if any */}
                    {ticket.notes && ticket.notes.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-2">Notes:</p>
                        {ticket.notes.map((note, index) => (
                          <p key={index} className="text-xs text-gray-700 mb-1">{note}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className={`
                  px-3 py-1 rounded-lg text-sm text-center whitespace-nowrap
                  ${ticket.status === 'open' ? 'bg-red-100 text-red-700' : ''}
                  ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${ticket.status === 'resolved' ? 'bg-green-100 text-green-700' : ''}
                `}>
                  {ticket.status === 'in-progress' ? 'In Progress' : 
                   ticket.status === 'open' ? 'Open' :
                   ticket.status === 'resolved' ? 'Resolved' :
                   ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
                
                {ticket.status !== 'resolved' && (
                  <button 
                    onClick={() => handleUpdateStatus(ticket)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Manual Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-gray-900">Create Manual Ticket</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Property *</label>
                  <select
                    required
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Tenant Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.tenant}
                    onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="101"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Priority *</label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Issue Title *</label>
                <input
                  type="text"
                  required
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., AC not working"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Detailed description of the issue..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdateModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowUpdateModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-gray-900">Update Ticket Status</h2>
                <p className="text-sm text-gray-600 mt-1">Ticket #{selectedTicket.ticketId} - {selectedTicket.tenant}</p>
              </div>
              <button onClick={() => setShowUpdateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Current Status */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Current Status</label>
                <div className="flex gap-2">
                  {['open', 'in-progress', 'resolved'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status as 'open' | 'in-progress' | 'resolved')}
                      className={`
                        flex-1 px-4 py-2 rounded-lg text-sm transition-colors
                        ${selectedTicket.status === status
                          ? status === 'open' ? 'bg-red-100 text-red-700 border-2 border-red-600'
                          : status === 'in-progress' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-600'
                          : 'bg-green-100 text-green-700 border-2 border-green-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issue Details */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm text-gray-700 mb-2">Issue Details</h3>
                <p className="text-gray-900">{selectedTicket.issue}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedTicket.description}</p>
              </div>

              {/* Add Note */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Add Note (Optional)</label>
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Add update notes..."
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Existing Notes */}
              {selectedTicket.notes && selectedTicket.notes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Previous Notes</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTicket.notes.map((note, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
