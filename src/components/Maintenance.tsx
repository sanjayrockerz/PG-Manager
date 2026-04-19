import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, AlertCircle, CheckCircle, Clock, Wrench, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import { MaintenanceTicketRecord, supabaseOwnerDataApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';
import {
  DEFAULT_COUNTRY_CODE,
  SUPPORTED_PHONE_COUNTRIES,
  formatStoredPhone,
  getPhoneCountry,
  getPhoneDropdownLabel,
  sanitizePhoneLocal,
  validatePhoneForCountry,
} from '../utils/phone';

export function Maintenance() {
  const { selectedProperty, properties } = useProperty();
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicketRecord | null>(null);
  const [newNote, setNewNote] = useState('');
  const [tickets, setTickets] = useState<MaintenanceTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    tenant: '',
    propertyId: '',
    room: '',
    issue: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    phoneCountryCode: DEFAULT_COUNTRY_CODE,
    phone: '',
  });

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await supabaseOwnerDataApi.listMaintenanceTickets(selectedProperty);
      setTickets(list);
    } catch {
      setError('Unable to load maintenance tickets.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `maintenance-${selectedProperty}`,
    tables: ['maintenance_tickets', 'maintenance_notes', 'notifications'],
    onChange: loadTickets,
  });

  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => (filterStatus === 'all' ? true : ticket.status === filterStatus)),
    [tickets, filterStatus],
  );

  const stats = useMemo(() => ({
    total: tickets.length,
    pending: tickets.filter((ticket) => ticket.status === 'open').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'in-progress').length,
    completed: tickets.filter((ticket) => ticket.status === 'resolved').length,
  }), [tickets]);

  const maintenancePhoneCountry = getPhoneCountry(formData.phoneCountryCode);

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((entry) => entry.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const handleUpdateStatus = (ticket: MaintenanceTicketRecord) => {
    setSelectedTicket(ticket);
    setNewNote('');
    setShowUpdateModal(true);
  };

  const handleStatusChange = async (newStatus: 'open' | 'in-progress' | 'resolved') => {
    if (!selectedTicket) {
      return;
    }

    setError('');
    try {
      const updated = await supabaseOwnerDataApi.updateMaintenanceStatus(selectedTicket.id, newStatus);
      setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      setSelectedTicket(updated);
      toast.success(`Ticket moved to ${newStatus}`);
    } catch {
      setError('Unable to update ticket status.');
      toast.error('Failed to update ticket status');
    }
  };

  const handleAddNote = async () => {
    if (!selectedTicket || !newNote.trim()) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await supabaseOwnerDataApi.addMaintenanceNote(selectedTicket.id, newNote.trim());
      const refreshed = await supabaseOwnerDataApi.listMaintenanceTickets(selectedProperty);
      setTickets(refreshed);
      const current = refreshed.find((ticket) => ticket.id === selectedTicket.id) ?? null;
      setSelectedTicket(current);
      setNewNote('');
      toast.success('Note added');
    } catch {
      setError('Unable to add note.');
      toast.error('Failed to add note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const cleanedPhone = formData.phone.replace(/\D/g, '');
      if (cleanedPhone) {
        const phoneValidation = validatePhoneForCountry(formData.phoneCountryCode, cleanedPhone);
        if (!phoneValidation.valid) {
          setError(phoneValidation.error ?? 'Tenant phone number is invalid.');
          setIsSaving(false);
          return;
        }
      }

      await supabaseOwnerDataApi.createMaintenanceTicket({
        tenant: formData.tenant,
        propertyId: formData.propertyId,
        room: formData.room,
        issue: formData.issue,
        description: formData.description,
        priority: formData.priority,
        source: 'manual',
        phone: cleanedPhone ? formatStoredPhone(formData.phoneCountryCode, cleanedPhone) : '',
      });

      setShowAddModal(false);
      setFormData({
        tenant: '',
        propertyId: selectedProperty === 'all' ? '' : selectedProperty,
        room: '',
        issue: '',
        description: '',
        priority: 'medium',
        phoneCountryCode: DEFAULT_COUNTRY_CODE,
        phone: '',
      });
      await loadTickets();
      toast.success('Ticket created');
    } catch {
      setError('Unable to create ticket.');
      toast.error('Failed to create ticket');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage maintenance requests</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Maintenance stream" />
          </div>
        </div>
        <button
          onClick={() => {
            setFormData((prev) => ({ ...prev, propertyId: selectedProperty === 'all' ? prev.propertyId : selectedProperty }));
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5" />
          <span>Manual Ticket</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'open', 'in-progress', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {status === 'all' ? 'All' : status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-sm">No maintenance tickets found.</div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${ticket.priority === 'high' ? 'bg-red-50' : ticket.priority === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                      <Wrench className={`w-5 h-5 ${ticket.priority === 'high' ? 'text-red-600' : ticket.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-gray-900">{ticket.issue}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${ticket.priority === 'high' ? 'bg-red-100 text-red-700' : ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {ticket.source === 'whatsapp' ? 'WhatsApp' : 'Manual'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div><span className="text-gray-500">Ticket ID: </span><span className="text-gray-900 font-mono">{ticket.ticketId}</span></div>
                        {selectedProperty === 'all' && <div><span className="text-gray-500">Property: </span><span className="text-gray-900">{getPropertyName(ticket.propertyId)}</span></div>}
                        <div><span className="text-gray-500">Tenant: </span><span className="text-gray-900">{ticket.tenant}</span></div>
                        <div><span className="text-gray-500">Room: </span><span className="text-gray-900">{ticket.room}</span></div>
                        {ticket.phone && <div><span className="text-gray-500">Phone: </span><span className="text-gray-900">{ticket.phone}</span></div>}
                        <div><span className="text-gray-500">Date: </span><span className="text-gray-900">{ticket.date}</span></div>
                      </div>

                      {ticket.notes.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-2">Notes:</p>
                          {ticket.notes.map((note, index) => (
                            <p key={`${ticket.id}-note-${index}`} className="text-xs text-gray-700 mb-1">{note}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className={`px-3 py-1 rounded-lg text-sm text-center whitespace-nowrap ${ticket.status === 'open' ? 'bg-red-100 text-red-700' : ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {ticket.status === 'in-progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                  <button onClick={() => handleUpdateStatus(ticket)} className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-700">
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <h2 className="text-lg font-medium text-gray-900">Create Manual Ticket</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-md p-2 transition-colors hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateTicket(e)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Property *</label>
                  <select required value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2">
                    <option value="">Select Property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Tenant Name *</label>
                  <input required value={formData.tenant} onChange={(e) => setFormData({ ...formData, tenant: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="John Doe" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Room Number *</label>
                  <input required value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="101" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Priority *</label>
                  <select required value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })} className="w-full rounded-lg border border-gray-300 px-4 py-2">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-700">Tenant Phone</label>
                  <div className="group flex items-center rounded-xl border border-gray-300 bg-white transition-shadow focus-within:ring-2 focus-within:ring-indigo-200">
                    <select
                      value={formData.phoneCountryCode}
                      onChange={(e) => setFormData({
                        ...formData,
                        phoneCountryCode: e.target.value,
                        phone: sanitizePhoneLocal(formData.phone, e.target.value),
                      })}
                      className="w-44 rounded-l-xl border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
                    >
                      {SUPPORTED_PHONE_COUNTRIES.map((entry) => (
                        <option key={entry.code} value={entry.code}>{getPhoneDropdownLabel(entry)}</option>
                      ))}
                    </select>
                    <span className="border-r border-gray-200 bg-gray-50 px-2 py-2 text-sm font-medium text-gray-700">
                      {maintenancePhoneCountry.flag} {maintenancePhoneCountry.code}
                    </span>
                    <input
                      value={formData.phone}
                      inputMode="numeric"
                      maxLength={maintenancePhoneCountry.localDigits}
                      onChange={(e) => setFormData({
                        ...formData,
                        phone: sanitizePhoneLocal(e.target.value, formData.phoneCountryCode),
                      })}
                      className="w-full rounded-r-xl border-0 px-4 py-2 focus:outline-none"
                      placeholder={maintenancePhoneCountry.placeholder}
                    />
                  </div>
                  <p className="text-xs text-gray-500">Optional. If provided, enter a valid {maintenancePhoneCountry.country} mobile number.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Issue Title *</label>
                <input required value={formData.issue} onChange={(e) => setFormData({ ...formData, issue: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="e.g., AC not working" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Description *</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" rows={4} placeholder="Detailed description of issue" />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
                  {isSaving ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpdateModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUpdateModal(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Update Ticket Status</h2>
                <p className="mt-1 text-sm text-gray-600">Ticket #{selectedTicket.ticketId} - {selectedTicket.tenant}</p>
              </div>
              <button onClick={() => setShowUpdateModal(false)} className="rounded-md p-2 transition-colors hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Current Status</label>
                <div className="flex gap-2">
                  {['open', 'in-progress', 'resolved'].map((status) => (
                    <button
                      key={status}
                      onClick={() => void handleStatusChange(status as 'open' | 'in-progress' | 'resolved')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${selectedTicket.status === status ? status === 'open' ? 'bg-red-100 text-red-700 border-2 border-red-600' : status === 'in-progress' ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-600' : 'bg-green-100 text-green-700 border-2 border-green-600' : 'bg-gray-100 text-gray-700 border-2 border-transparent'}`}
                    >
                      {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Add Note</label>
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Add update note..." />
                  <button onClick={() => void handleAddNote()} disabled={!newNote.trim() || isSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Add Note'}
                </button>
              </div>

              {selectedTicket.notes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Ticket Notes</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg bg-gray-50 p-3">
                    {selectedTicket.notes.map((note, index) => (
                      <p key={`${selectedTicket.id}-timeline-${index}`} className="text-sm text-gray-700">{note}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-200 pt-4">
                <button onClick={() => setShowUpdateModal(false)} className="rounded-lg bg-gray-100 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-200">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}