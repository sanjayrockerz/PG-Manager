import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import {
  Wrench, AlertCircle, Clock, CheckCircle, Plus, MessageSquare,
  ChevronDown, ArrowRight, User, Phone, MapPin, Calendar,
  Save, Loader2, X, Lock, Send, Eye, EyeOff,
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  isDemoModeEnabled,
  getMaintenanceTickets,
  createMaintenanceTicketRecord,
  updateMaintenanceStatusRecord,
  addMaintenanceThreadEntry,
  getMaintenanceThreads,
} from '../services/dataService';
import type {
  MaintenanceTicketRecord, MaintenancePriority,
  MaintenanceStatus, MaintenanceSource, MaintenanceThreadEntry,
} from '../services/supabaseData';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; dot: string; border: string }> = {
  open:         { label: 'Open',        color: 'bg-red-50 text-red-700',    dot: 'bg-red-500',    border: 'border-l-red-500' },
  'in-progress':{ label: 'In Progress', color: 'bg-amber-50 text-amber-700',dot: 'bg-amber-500',  border: 'border-l-amber-500' },
  waiting:      { label: 'Waiting',     color: 'bg-blue-50 text-blue-700',  dot: 'bg-blue-400',   border: 'border-l-blue-400' },
  resolved:     { label: 'Resolved',    color: 'bg-green-50 text-green-700',dot: 'bg-green-500',  border: 'border-l-green-500' },
  closed:       { label: 'Closed',      color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400',   border: 'border-l-gray-400' },
};

const PRIORITY_CONFIG: Record<MaintenancePriority, { label: string; color: string }> = {
  high:   { label: 'HIGH',   color: 'bg-red-100 text-red-700' },
  medium: { label: 'MED',    color: 'bg-amber-100 text-amber-700' },
  low:    { label: 'LOW',    color: 'bg-green-100 text-green-700' },
};

const SOURCE_LABELS: Record<MaintenanceSource, string> = {
  manual:        'Manual',
  portal:        'Tenant Portal',
  admin_created: 'Admin',
  whatsapp:      'WhatsApp',
  staff_created: 'Staff',
};

const SOURCE_COLORS: Record<MaintenanceSource, string> = {
  manual:        'bg-purple-50 text-purple-600',
  portal:        'bg-blue-50 text-blue-600',
  admin_created: 'bg-indigo-50 text-indigo-600',
  whatsapp:      'bg-green-50 text-green-700',
  staff_created: 'bg-orange-50 text-orange-600',
};

type FilterStatus = 'all' | MaintenanceStatus;

// ─── Thread Timeline ──────────────────────────────────────────────────────────

function ThreadTimeline({ ticketId }: { ticketId: string }) {
  const [threads, setThreads] = useState<MaintenanceThreadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await getMaintenanceThreads(ticketId);
      setThreads(data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener('owner-data-updated', handler);
    return () => window.removeEventListener('owner-data-updated', handler);
  }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads.length]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const entry = await addMaintenanceThreadEntry(ticketId, message, isInternal);
      setThreads((prev) => [...prev, entry]);
      setMessage('');
      toast.success(isInternal ? 'Internal note added' : 'Update posted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>;

  return (
    <div className="flex flex-col gap-0">
      {/* Thread entries */}
      <div className="space-y-0 max-h-64 overflow-y-auto border border-zinc-100 rounded-lg bg-zinc-50 px-3 py-2">
        {threads.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No updates yet</p>
        ) : (
          threads.map((t, i) => (
            <div key={t.id} className={`relative flex gap-3 py-2 ${i < threads.length - 1 ? 'border-b border-zinc-100' : ''}`}>
              {/* Actor dot */}
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  t.actorRole === 'system' ? 'bg-zinc-200 text-zinc-500' :
                  t.actorRole === 'owner'  ? 'bg-indigo-100 text-indigo-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {t.actorRole === 'system' ? '⚙' : t.actorName[0].toUpperCase()}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-zinc-800">{t.actorName}</span>
                  {t.statusTransition && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${STATUS_CONFIG[t.statusTransition.from]?.color}`}>
                        {STATUS_CONFIG[t.statusTransition.from]?.label}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${STATUS_CONFIG[t.statusTransition.to]?.color}`}>
                        {STATUS_CONFIG[t.statusTransition.to]?.label}
                      </span>
                    </span>
                  )}
                  {t.isInternal && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 font-semibold">
                      Internal
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-400 ml-auto">{formatTime(t.createdAt)}</span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{t.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <textarea
            className="flex-1 text-xs px-3 py-2 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
            rows={2}
            placeholder={isInternal ? 'Add internal note (visible to staff only)…' : 'Post an update…'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleSend(); }}
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsInternal((v) => !v)}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
              isInternal ? 'bg-yellow-50 text-yellow-700' : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            {isInternal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {isInternal ? 'Internal note' : 'Public update'}
          </button>
          <Button
            size="sm"
            onClick={() => void handleSend()}
            disabled={!message.trim() || sending}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Transition Dropdown ───────────────────────────────────────────────

const VALID_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open:          ['in-progress', 'waiting', 'resolved', 'closed'],
  'in-progress': ['waiting', 'resolved', 'closed', 'open'],
  waiting:       ['in-progress', 'resolved', 'closed'],
  resolved:      ['closed', 'open'],
  closed:        ['open'],
};

interface StatusDropdownProps {
  current: MaintenanceStatus;
  ticketId: string;
  onUpdate: (newStatus: MaintenanceStatus) => void;
}

function StatusDropdown({ current, ticketId, onUpdate }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const transitions = VALID_TRANSITIONS[current] ?? [];
  const cfg = STATUS_CONFIG[current];

  const handleSelect = async (next: MaintenanceStatus) => {
    setOpen(false);
    setSaving(true);
    try {
      await updateMaintenanceStatusRecord(ticketId, next);
      onUpdate(next);
      toast.success(`Status → ${STATUS_CONFIG[next].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving || transitions.length === 0}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${cfg.color} ${
          transitions.length > 0 ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
        }`}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />}
        {cfg.label}
        {transitions.length > 0 && <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 rounded-lg overflow-hidden z-50"
          style={{
            minWidth: 140,
            background: '#fff',
            border: '1px solid #E4E4E7',
            boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.12)',
          }}
        >
          {transitions.map((next) => {
            const nc = STATUS_CONFIG[next];
            return (
              <button
                key={next}
                onClick={() => void handleSelect(next)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-50 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${nc.dot}`} />
                <span className="font-medium text-zinc-800">{nc.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Ticket Row (collapsible) ─────────────────────────────────────────────────

interface TicketRowProps {
  ticket: MaintenanceTicketRecord;
  propertyName: string;
  onStatusUpdate: (id: string, status: MaintenanceStatus) => void;
}

function TicketRow({ ticket, propertyName, onStatusUpdate }: TicketRowProps) {
  const [expanded, setExpanded] = useState(false);
  const pCfg = PRIORITY_CONFIG[ticket.priority];
  const sCfg = STATUS_CONFIG[ticket.status];

  return (
    <div className={`border border-zinc-200 rounded-xl overflow-hidden transition-shadow hover:shadow-sm border-l-4 ${sCfg.border}`}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left flex items-center gap-3 px-4 py-3 bg-white hover:bg-zinc-50 transition-colors"
      >
        {/* Priority dot */}
        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${pCfg.color}`}>
          {pCfg.label}
        </span>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-900 truncate">{ticket.issue}</span>
            <span className="text-[10px] text-zinc-400">{ticket.ticketId}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${SOURCE_COLORS[ticket.source] ?? 'bg-gray-50 text-gray-500'}`}>
              {SOURCE_LABELS[ticket.source] ?? ticket.source}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />{ticket.tenant}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{propertyName} · Room {ticket.room}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(ticket.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
            {ticket.updatedAt && ticket.updatedAt !== ticket.date && (
              <span className="text-zinc-400">
                Updated {new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
          <StatusDropdown
            current={ticket.status}
            ticketId={ticket.id}
            onUpdate={(s) => onStatusUpdate(ticket.id, s)}
          />
        </div>

        {/* Expand chevron */}
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4 space-y-4">
          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">Description</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{ticket.description}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-zinc-400 mb-0.5">Tenant</p>
              <p className="font-semibold text-zinc-800">{ticket.tenant}</p>
            </div>
            <div>
              <p className="text-zinc-400 mb-0.5">Room</p>
              <p className="font-semibold text-zinc-800">{ticket.room}</p>
            </div>
            {ticket.phone && (
              <div>
                <p className="text-zinc-400 mb-0.5">Phone</p>
                <p className="font-semibold text-zinc-800">{ticket.phone}</p>
              </div>
            )}
            {ticket.assignedTo && (
              <div>
                <p className="text-zinc-400 mb-0.5">Assigned To</p>
                <p className="font-semibold text-zinc-800">{ticket.assignedTo}</p>
              </div>
            )}
            {ticket.resolvedAt && (
              <div>
                <p className="text-zinc-400 mb-0.5">Resolved</p>
                <p className="font-semibold text-green-700">
                  {new Date(ticket.resolvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            )}
          </div>

          {/* Thread */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Thread
            </p>
            <ThreadTimeline ticketId={ticket.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Maintenance Component ───────────────────────────────────────────────

export function Maintenance() {
  const { properties, selectedProperty } = useProperty();
  const [tickets, setTickets] = useState<MaintenanceTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    tenant: '',
    propertyId: '',
    room: '',
    issue: '',
    description: '',
    priority: 'medium' as MaintenancePriority,
    source: 'manual' as MaintenanceSource,
    phone: '',
    assignedTo: '',
  });
  const [createSaving, setCreateSaving] = useState(false);

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMaintenanceTickets(selectedProperty);
      setTickets(data);
    } catch {
      toast.error('Failed to load maintenance tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [selectedProperty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener('owner-data-updated', handler);
    return () => window.removeEventListener('owner-data-updated', handler);
  }, [selectedProperty]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeRefresh({
    key: 'maintenance',
    tables: ['maintenance_tickets', 'maintenance_notes'],
    onChange: () => void load(),
    enabled: !isDemoModeEnabled(),
  });

  const filteredTickets = tickets.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus,
  );

  const stats: Record<string, number> = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    'in-progress': tickets.filter((t) => t.status === 'in-progress').length,
    waiting: tickets.filter((t) => t.status === 'waiting').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  };

  const handleStatusUpdate = (id: string, status: MaintenanceStatus) => {
    setTickets((ts) => ts.map((t) =>
      t.id === id ? { ...t, status, updatedAt: new Date().toISOString(), resolvedAt: (status === 'resolved' || status === 'closed') ? new Date().toISOString() : t.resolvedAt } : t,
    ));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.issue || !createForm.propertyId || !createForm.tenant || !createForm.room) {
      toast.error('Issue, property, tenant and room are required');
      return;
    }
    setCreateSaving(true);
    try {
      const ticket = await createMaintenanceTicketRecord({
        tenant: createForm.tenant,
        propertyId: createForm.propertyId,
        room: createForm.room,
        issue: createForm.issue,
        description: createForm.description,
        priority: createForm.priority,
        source: createForm.source,
        phone: createForm.phone || undefined,
        assignedTo: createForm.assignedTo || undefined,
      });
      setTickets((ts) => [ticket, ...ts]);
      setCreateOpen(false);
      setCreateForm({ tenant: '', propertyId: '', room: '', issue: '', description: '', priority: 'medium', source: 'manual', phone: '', assignedTo: '' });
      toast.success(`Ticket ${ticket.ticketId} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setCreateSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-zinc-100 bg-white">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Maintenance</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {stats.open + stats['in-progress']} active · {stats.resolved} resolved · {stats.total} total
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Ticket
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-px px-6 py-3 border-b border-zinc-100 overflow-x-auto">
        {([
          { key: 'all',         label: 'All',         count: stats.total,             color: 'text-zinc-700' },
          { key: 'open',        label: 'Open',        count: stats.open,              color: 'text-red-600' },
          { key: 'in-progress', label: 'In Progress', count: stats['in-progress'],    color: 'text-amber-600' },
          { key: 'waiting',     label: 'Waiting',     count: stats.waiting,           color: 'text-blue-600' },
          { key: 'resolved',    label: 'Resolved',    count: stats.resolved,          color: 'text-green-600' },
          { key: 'closed',      label: 'Closed',      count: stats.closed,            color: 'text-zinc-400' },
        ] as const).map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key as FilterStatus)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterStatus === key
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <span>{label}</span>
            <span className={`font-bold ${filterStatus === key ? 'text-indigo-600' : color}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="px-6 py-4 space-y-2">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Wrench className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No {filterStatus === 'all' ? '' : filterStatus + ' '}tickets</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              propertyName={getPropertyName(ticket.propertyId)}
              onStatusUpdate={handleStatusUpdate}
            />
          ))
        )}
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-500" /> New Maintenance Ticket
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-700">Issue Title *</Label>
              <Input placeholder="e.g., AC not cooling" value={createForm.issue} onChange={(e) => setCreateForm({ ...createForm, issue: e.target.value })} className="h-9 text-sm" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-700">Description</Label>
              <textarea
                placeholder="Detailed description…"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Priority *</Label>
                <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as MaintenancePriority })} className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Source</Label>
                <select value={createForm.source} onChange={(e) => setCreateForm({ ...createForm, source: e.target.value as MaintenanceSource })} className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
                  <option value="manual">Manual</option>
                  <option value="admin_created">Admin</option>
                  <option value="staff_created">Staff</option>
                  <option value="portal">Tenant Portal</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-700">Property *</Label>
              <select value={createForm.propertyId} onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value })} className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" required>
                <option value="">Select property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Tenant *</Label>
                <Input placeholder="Tenant name" value={createForm.tenant} onChange={(e) => setCreateForm({ ...createForm, tenant: e.target.value })} className="h-9 text-sm" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Room *</Label>
                <Input placeholder="e.g., 201" value={createForm.room} onChange={(e) => setCreateForm({ ...createForm, room: e.target.value })} className="h-9 text-sm" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Phone</Label>
                <Input type="tel" placeholder="+91 98765 43210" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Assign To</Label>
                <Input placeholder="Staff name or team" value={createForm.assignedTo} onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {createSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
