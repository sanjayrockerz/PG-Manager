import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent } from './ui/sheet';
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
  getTeamMembers,
} from '../services/dataService';
import type { TeamMemberRecord } from '../services/supabaseData';
import type {
  MaintenanceTicketRecord, MaintenancePriority,
  MaintenanceStatus, MaintenanceSource, MaintenanceThreadEntry,
} from '../services/supabaseData';

// ─── Constants ────────────────────────────────────────────────────────────────

// Status config uses inline style objects so we can reference design tokens at runtime.
// Priority/source configs use inline styles too for the same reason.
const STATUS_CONFIG: Record<MaintenanceStatus, {
  label: string;
  badge: string;  // ds-badge-* class
  dotColor: string;
  borderColor: string;
}> = {
  open:          { label: 'Open',        badge: 'ds-badge-danger',  dotColor: 'var(--ds-danger)',  borderColor: 'var(--ds-danger)' },
  assigned:      { label: 'Assigned',    badge: 'ds-badge-accent',  dotColor: 'var(--ds-accent)',  borderColor: 'var(--ds-accent)' },
  'in-progress': { label: 'In Progress', badge: 'ds-badge-warning', dotColor: 'var(--ds-warning)', borderColor: 'var(--ds-warning)' },
  waiting:       { label: 'Waiting',     badge: 'ds-badge-neutral', dotColor: '#60A5FA',            borderColor: '#60A5FA' },
  resolved:      { label: 'Resolved',    badge: 'ds-badge-success', dotColor: 'var(--ds-success)', borderColor: 'var(--ds-success)' },
  closed:        { label: 'Closed',      badge: 'ds-badge-neutral', dotColor: 'var(--ds-text-3)',  borderColor: 'var(--ds-border)' },
};

const PRIORITY_CONFIG: Record<MaintenancePriority, { label: string; badge: string }> = {
  high:   { label: 'HIGH', badge: 'ds-badge-danger' },
  medium: { label: 'MED',  badge: 'ds-badge-warning' },
  low:    { label: 'LOW',  badge: 'ds-badge-success' },
};

const SOURCE_LABELS: Record<MaintenanceSource, string> = {
  manual:        'Manual',
  portal:        'Tenant Portal',
  admin_created: 'Admin',
  whatsapp:      'WhatsApp',
  staff_created: 'Staff',
};

const SOURCE_BADGES: Record<MaintenanceSource, string> = {
  manual:        'ds-badge-accent',
  portal:        'ds-badge-accent',
  admin_created: 'ds-badge-accent',
  whatsapp:      'ds-badge-success',
  staff_created: 'ds-badge-warning',
};

type FilterStatus = 'all' | MaintenanceStatus;

// ─── Urgency Scoring ──────────────────────────────────────────────────────────
// Score considers priority weight + age bonus + status multiplier
function urgencyScore(ticket: MaintenanceTicketRecord): number {
  const priorityWeight: Record<MaintenancePriority, number> = { high: 30, medium: 20, low: 10 };
  const ageDays = Math.floor((Date.now() - new Date(ticket.date).getTime()) / 86400000);
  const ageBonus = ageDays > 30 ? 30 : ageDays > 15 ? 20 : ageDays > 7 ? 10 : 5;
  const statusMultiplier = ticket.status === 'open' ? 2 : ticket.status === 'in-progress' ? 1.5 : ticket.status === 'waiting' ? 1.2 : 0;
  return (priorityWeight[ticket.priority] + ageBonus) * statusMultiplier;
}

function ageLabel(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function urgencyBadge(score: number): { label: string; bg: string; color: string } {
  if (score >= 90) return { label: 'Critical', bg: '#FEF2F2', color: '#991B1B' };
  if (score >= 60) return { label: 'High',     bg: '#FFFBEB', color: '#92400E' };
  if (score >= 30) return { label: 'Medium',   bg: '#F0F9FF', color: '#0369A1' };
  return               { label: 'Low',      bg: '#F0FDF4', color: '#15803D' };
}

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
                      <span className={`ds-badge ${STATUS_CONFIG[t.statusTransition.from]?.badge ?? 'ds-badge-neutral'}`} style={{ fontSize: 9 }}>
                        {STATUS_CONFIG[t.statusTransition.from]?.label}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className={`ds-badge ${STATUS_CONFIG[t.statusTransition.to]?.badge ?? 'ds-badge-neutral'}`} style={{ fontSize: 9 }}>
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
            loading={sending}
            disabled={!message.trim()}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3"
          >
            {!sending && <Send className="w-3 h-3 mr-1" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Transition Dropdown ───────────────────────────────────────────────

const VALID_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open:          ['assigned', 'in-progress', 'waiting', 'resolved', 'closed'],
  assigned:      ['in-progress', 'waiting', 'resolved', 'closed', 'open'],
  'in-progress': ['waiting', 'resolved', 'closed', 'assigned', 'open'],
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
        className={`ds-badge ${cfg.badge} ${transitions.length > 0 ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
        style={{ gap: '6px', padding: '4px 10px', fontSize: 11 }}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dotColor, flexShrink: 0, display: 'inline-block' }} />}
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
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: nc.dotColor, flexShrink: 0, display: 'inline-block' }} />
                <span className="font-medium" style={{ color: 'var(--ds-text-1)', fontSize: 12 }}>{nc.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Ticket Row ───────────────────────────────────────────────────────────────

interface TicketRowProps {
  ticket: MaintenanceTicketRecord;
  propertyName: string;
  onStatusUpdate: (id: string, status: MaintenanceStatus) => void;
  onView: (id: string) => void;
}

function TicketRow({ ticket, propertyName, onStatusUpdate, onView, highlight }: TicketRowProps & { highlight?: boolean }) {
  const pCfg = PRIORITY_CONFIG[ticket.priority];
  const sCfg = STATUS_CONFIG[ticket.status];
  const ub = urgencyBadge(urgencyScore(ticket));

  return (
    <div
      className={`ds-card transition-shadow hover:shadow-sm ${highlight ? '' : ''}`}
      style={{
        borderLeft: `3px solid ${sCfg.borderColor}`,
        ...(highlight ? { background: 'var(--ds-warning-subtle)', borderColor: 'var(--ds-warning-border)' } : {}),
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Urgency badge */}
        <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ub.bg, color: ub.color }}>
          {ub.label.toUpperCase()}
        </span>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-900 truncate">{ticket.issue}</span>
            <span className="text-[10px] text-zinc-400">{ticket.ticketId}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: '#FFFBEB', color: '#92400E' }}>
              {ageLabel(ticket.date)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.tenant}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{propertyName} · Room {ticket.room}</span>
            <span className={`ds-badge ${pCfg.badge}`} style={{ fontSize: 9, padding: '1px 5px' }}>{pCfg.label}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusDropdown current={ticket.status} ticketId={ticket.id} onUpdate={(s) => onStatusUpdate(ticket.id, s)} />
        </div>

        {/* View */}
        <button
          onClick={() => onView(ticket.id)}
          className="ds-btn ds-btn-secondary flex-shrink-0"
          style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
          title="View ticket detail"
        >
          <Eye style={{ width: 12, height: 12 }} /> View
        </button>
      </div>
    </div>
  );
}

// ─── Ticket Detail Sheet ──────────────────────────────────────────────────────

function TicketDetailSheet({
  ticket,
  propertyName,
  open,
  onClose,
  onStatusUpdate,
}: {
  ticket: MaintenanceTicketRecord | null;
  propertyName: string;
  open: boolean;
  onClose: () => void;
  onStatusUpdate: (id: string, status: MaintenanceStatus) => void;
}) {
  if (!ticket) return null;

  const sCfg = STATUS_CONFIG[ticket.status];
  const pCfg = PRIORITY_CONFIG[ticket.priority];
  const ub = urgencyBadge(urgencyScore(ticket));

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto p-0">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F1F3' }}>
            <div className="flex items-start gap-3 mb-3">
              <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: ub.bg, color: ub.color, marginTop: 3 }}>
                {ub.label.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B', lineHeight: 1.3 }}>{ticket.issue}</h2>
                <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>{ticket.ticketId} · {ageLabel(ticket.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusDropdown current={ticket.status} ticketId={ticket.id} onUpdate={(s) => onStatusUpdate(ticket.id, s)} />
              <span className={`ds-badge ${pCfg.badge}`}>{pCfg.label} priority</span>
              <span style={{ fontSize: 11, color: '#71717A' }}>{propertyName} · Room {ticket.room}</span>
            </div>
          </div>

          {/* Detail grid */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F1F3' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Tenant', ticket.tenant],
                ['Room', ticket.room],
                ticket.phone ? ['Phone', ticket.phone] : null,
                ticket.assignedTo ? ['Assigned To', ticket.assignedTo] : null,
                ['Source', ticket.source],
                ['Reported', new Date(ticket.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
                ticket.resolvedAt ? ['Resolved', new Date(ticket.resolvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] : null,
              ].filter(Boolean).map((entry) => {
                const [label, value] = entry as [string, string];
                return (
                  <div key={label} style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: '#A1A1AA', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>{value}</p>
                  </div>
                );
              })}
            </div>

            {ticket.description && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', marginBottom: 6 }}>Description</p>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                  {ticket.description}
                </p>
              </div>
            )}
          </div>

          {/* Thread */}
          <div style={{ padding: '16px 24px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare style={{ width: 13, height: 13 }} /> Thread
            </p>
            <ThreadTimeline ticketId={ticket.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Maintenance Component ───────────────────────────────────────────────

export function Maintenance() {
  const { properties, selectedProperty } = useProperty();
  const [tickets, setTickets] = useState<MaintenanceTicketRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null);
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
      const [data, members] = await Promise.all([
        getMaintenanceTickets(selectedProperty),
        getTeamMembers(),
      ]);
      setTickets(data);
      setTeamMembers(members);
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
    tables: ['maintenance_tickets', 'maintenance_threads'],
    onChange: () => void load(),
    enabled: !isDemoModeEnabled(),
  });

  const filteredTickets = tickets.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus,
  );

  // "Needs Attention First" — top 3 active tickets by urgency score
  const attentionTickets = [...tickets]
    .filter((t) => t.status !== 'resolved' && t.status !== 'closed')
    .sort((a, b) => urgencyScore(b) - urgencyScore(a))
    .slice(0, 3);

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
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-2">
          <div className="space-y-2">
            <div className="h-6 w-36 premium-shimmer rounded-lg" />
            <div className="h-4 w-44 premium-shimmer rounded-md" />
          </div>
          <div className="h-9 w-28 premium-shimmer rounded-lg" />
        </div>

        {/* Stats Bar Skeleton */}
        <div className="ds-card flex gap-2 p-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-7 w-20 premium-shimmer rounded-lg flex-shrink-0" />
          ))}
        </div>

        {/* Attention Panel Skeleton */}
        <div className="rounded-xl border border-zinc-200 p-4 space-y-3 bg-[#FFFBEB]/30">
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 premium-shimmer rounded" />
            <div className="h-3.5 w-24 premium-shimmer rounded" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="h-5 w-14 premium-shimmer rounded" />
                <div className="h-4 w-1/2 premium-shimmer rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Ticket List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-zinc-200 rounded-xl p-4 bg-white flex items-center justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 premium-shimmer rounded" />
                  <div className="h-4 w-1/3 premium-shimmer rounded" />
                  <div className="h-3.5 w-16 premium-shimmer rounded" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3.5 w-20 premium-shimmer rounded" />
                  <div className="h-3.5 w-32 premium-shimmer rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 premium-shimmer rounded-full" />
                <div className="h-7 w-16 premium-shimmer rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Maintenance</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            {stats.open + stats['in-progress']} active · {stats.resolved} resolved · {stats.total} total
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="ds-btn ds-btn-primary"
          style={{ fontSize: 12, padding: '6px 14px', gap: 6 }}
        >
          <Plus style={{ width: 13, height: 13 }} /> New Ticket
        </button>
      </div>

      {/* Stats bar */}
      <div className="ds-card flex items-center gap-px overflow-x-auto" style={{ padding: '8px 12px' }}>
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

      {/* Needs Attention First */}
      {attentionTickets.length > 0 && filterStatus === 'all' && (
        <div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #FDE68A', background: '#FFFBEB' }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid #FDE68A' }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Needs Attention First
                </p>
              </div>
              <p style={{ fontSize: 11, color: '#B45309' }}>Sorted by urgency</p>
            </div>
            <div className="divide-y divide-amber-100">
              {attentionTickets.map((ticket) => {
                const ub = urgencyBadge(urgencyScore(ticket));
                return (
                  <div key={ticket.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ub.bg, color: ub.color }}>
                      {ub.label.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ticket.issue}
                      </p>
                      <p style={{ fontSize: 11, color: '#92400E' }}>
                        {ticket.tenant} · Room {ticket.room} · {ageLabel(ticket.date)}
                      </p>
                    </div>
                    <span className={`ds-badge ${STATUS_CONFIG[ticket.status]?.badge ?? 'ds-badge-neutral'}`} style={{ fontSize: 10 }}>
                      {STATUS_CONFIG[ticket.status]?.label ?? ticket.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ticket list */}
      <div className="space-y-2">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Wrench className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No {filterStatus === 'all' ? '' : filterStatus + ' '}tickets</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isHighAttention = attentionTickets.some((t) => t.id === ticket.id);
            return (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                propertyName={getPropertyName(ticket.propertyId)}
                onStatusUpdate={handleStatusUpdate}
                onView={setDrawerTicketId}
                highlight={isHighAttention && filterStatus === 'all'}
              />
            );
          })
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Tenant *</Label>
                <Input placeholder="Tenant name" value={createForm.tenant} onChange={(e) => setCreateForm({ ...createForm, tenant: e.target.value })} className="h-9 text-sm" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Room *</Label>
                <Input placeholder="e.g., 201" value={createForm.room} onChange={(e) => setCreateForm({ ...createForm, room: e.target.value })} className="h-9 text-sm" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Phone</Label>
                <Input type="tel" placeholder="+91 98765 43210" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700">Assign To</Label>
                {teamMembers.length > 0 ? (
                  <select
                    value={createForm.assignedTo}
                    onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })}
                    className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                ) : (
                  <Input placeholder="Staff name" value={createForm.assignedTo} onChange={(e) => setCreateForm({ ...createForm, assignedTo: e.target.value })} className="h-9 text-sm" />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" loading={createSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {!createSaving && <Save className="w-3.5 h-3.5 mr-1.5" />}
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket detail sheet */}
      <TicketDetailSheet
        ticket={tickets.find((t) => t.id === drawerTicketId) ?? null}
        propertyName={drawerTicketId ? getPropertyName(tickets.find((t) => t.id === drawerTicketId)?.propertyId ?? '') : ''}
        open={!!drawerTicketId}
        onClose={() => setDrawerTicketId(null)}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
