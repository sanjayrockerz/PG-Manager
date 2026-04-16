import { useCallback, useEffect, useMemo, useState } from 'react';
import { HeadphonesIcon, MessageSquare, Plus, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketRecord,
  SupportTicketStatus,
  supabaseOwnerDataApi,
} from '../services/supabaseData';
import { useProperty } from '../contexts/PropertyContext';
import { LiveStatusBadge } from './LiveStatusBadge';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

const categoryOptions: SupportTicketCategory[] = ['billing', 'technical', 'operations', 'tenant', 'other'];
const priorityOptions: SupportTicketPriority[] = ['low', 'medium', 'high', 'urgent'];

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function Support() {
  const { selectedProperty, properties } = useProperty();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical' as SupportTicketCategory,
    priority: 'medium' as SupportTicketPriority,
    propertyId: selectedProperty === 'all' ? '' : selectedProperty,
  });

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const rows = await supabaseOwnerDataApi.listSupportTickets(selectedProperty);
      setTickets(rows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load support tickets.');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `owner-support-${selectedProperty}`,
    tables: ['support_tickets', 'support_ticket_comments'],
    onChange: loadTickets,
  });

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length,
  }), [tickets]);

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage('');

    try {
      await supabaseOwnerDataApi.createSupportTicket({
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        propertyId: formData.propertyId || null,
        visibility: formData.propertyId ? 'property' : 'owner',
      });

      setShowCreateModal(false);
      setFormData({
        subject: '',
        description: '',
        category: 'technical',
        priority: 'medium',
        propertyId: selectedProperty === 'all' ? '' : selectedProperty,
      });
      toast.success('Support ticket created');
      await loadTickets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create support ticket.');
      toast.error('Failed to create support ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicketStatus) => {
    setErrorMessage('');
    try {
      const updated = await supabaseOwnerDataApi.updateSupportTicketStatus(ticketId, status);
      setTickets((current) => current.map((ticket) => (ticket.id === ticketId ? updated : ticket)));
      toast.success('Support ticket updated');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update support ticket.');
      toast.error('Failed to update support ticket');
    }
  };

  const addComment = async (ticketId: string) => {
    const message = (commentDrafts[ticketId] ?? '').trim();
    if (!message) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await supabaseOwnerDataApi.addSupportTicketComment(ticketId, message, false);
      setCommentDrafts((current) => ({
        ...current,
        [ticketId]: '',
      }));
      toast.success('Comment added');
      await loadTickets();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add comment.');
      toast.error('Failed to add comment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Support</h1>
          <p className="text-gray-600 mt-1">Escalate billing or technical issues and track updates.</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Support stream" />
          </div>
        </div>
        <button
          onClick={() => {
            setFormData((current) => ({
              ...current,
              propertyId: selectedProperty === 'all' ? current.propertyId : selectedProperty,
            }));
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Raise Ticket
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Open</p>
          <p className="text-2xl text-red-700 mt-2">{stats.open}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">In Progress</p>
          <p className="text-2xl text-yellow-700 mt-2">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Resolved</p>
          <p className="text-2xl text-green-700 mt-2">{stats.resolved}</p>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            Loading support tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            No support tickets raised yet.
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <HeadphonesIcon className="w-4 h-4 text-blue-600" />
                    <p className="text-gray-900 font-semibold">{ticket.subject}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {ticket.category} • {ticket.priority} • Raised {formatDate(ticket.createdAt)}
                  </p>
                </div>

                <select
                  value={ticket.status}
                  onChange={(event) => void updateTicketStatus(ticket.id, event.target.value as SupportTicketStatus)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                {ticket.comments.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {ticket.comments.map((comment) => (
                      <div key={comment.id} className="text-sm text-gray-700">
                        <p>{comment.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(comment.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No comments yet.</p>
                )}

                <div className="flex items-center gap-2">
                  <input
                    value={commentDrafts[ticket.id] ?? ''}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => void addComment(ticket.id)}
                    disabled={isSaving}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(event) => event.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">Raise Support Ticket</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(event) => void submitTicket(event)} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Property</label>
                  <select
                    value={formData.propertyId}
                    onChange={(event) => setFormData((current) => ({ ...current, propertyId: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">General owner-level ticket</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value as SupportTicketCategory }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value as SupportTicketPriority }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Subject *</label>
                <input
                  required
                  value={formData.subject}
                  onChange={(event) => setFormData((current) => ({ ...current, subject: event.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Short summary of the issue"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Include details, impact, and desired resolution"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                  {isSaving ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
