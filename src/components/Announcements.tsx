import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Bell, Pin, Edit, MessageCircle, Eye, Save, Trash, Loader2,
  Users, CheckCircle2, Clock, AlertCircle, Radio, X, ChevronDown, ChevronUp,
  Send, Megaphone,
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  isDemoModeEnabled,
  getAnnouncements,
  createAnnouncementRecord,
  updateAnnouncementRecord,
  deleteAnnouncementRecord,
  toggleAnnouncementPinRecord,
  getWhatsAppQueue,
} from '../services/dataService';
import type { AnnouncementRecord, AnnouncementCategory, WhatsAppQueueEntry } from '../services/supabaseData';

type FilterCat = 'all' | AnnouncementCategory;

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  maintenance: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  payment:     { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  rules:       { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  general:     { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
};

const CATEGORY_LABEL: Record<string, string> = {
  maintenance: 'Maintenance',
  payment: 'Payment',
  rules: 'Rules & Policy',
  general: 'General',
};

const WA_STATUS_CONFIG: Record<WhatsAppQueueEntry['status'], { label: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  queued:    { label: 'Queued',    color: '#A1A1AA', icon: Clock },
  sending:   { label: 'Sending',   color: '#F59E0B', icon: Radio },
  delivered: { label: 'Delivered', color: '#10B981', icon: CheckCircle2 },
  failed:    { label: 'Failed',    color: '#EF4444', icon: AlertCircle },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface WhatsAppStatusBadgeProps {
  entry: WhatsAppQueueEntry;
}

function WhatsAppStatusBadge({ entry }: WhatsAppStatusBadgeProps) {
  const cfg = WA_STATUS_CONFIG[entry.status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      <Icon className="w-3 h-3" />
      WhatsApp · {cfg.label}
      {entry.status === 'delivered' && entry.recipientCount > 0 && (
        <span style={{ opacity: 0.7 }}>· {entry.sentCount}/{entry.recipientCount}</span>
      )}
      {entry.status === 'queued' && entry.recipientCount > 0 && (
        <span style={{ opacity: 0.7 }}>· {entry.recipientCount} recipients</span>
      )}
    </span>
  );
}

interface AnnouncementCardProps {
  ann: AnnouncementRecord;
  waEntry?: WhatsAppQueueEntry;
  isPinnedSection: boolean;
  onPin: (ann: AnnouncementRecord) => void;
  onEdit: (ann: AnnouncementRecord) => void;
  onDelete: (ann: AnnouncementRecord) => void;
}

function AnnouncementCard({ ann, waEntry, isPinnedSection, onPin, onEdit, onDelete }: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const catStyle = CATEGORY_COLOR[ann.category] ?? { bg: '#F4F4F6', text: '#52525B', border: '#E4E4E7' };
  const isLong = ann.content.length > 120;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderLeft: isPinnedSection ? '3px solid #6366F1' : '1px solid #E4E4E7',
        borderRadius: 8,
        padding: '10px 14px',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {CATEGORY_LABEL[ann.category] ?? ann.category}
            </span>
            {ann.isPinned && <Pin style={{ width: 11, height: 11, color: '#6366F1' }} />}
            {(waEntry || ann.sentViaWhatsApp) && <MessageCircle style={{ width: 11, height: 11, color: '#16A34A' }} />}
            {ann.propertyId && <Users style={{ width: 11, height: 11, color: '#A1A1AA' }} />}
            <span style={{ fontSize: 11, color: '#A1A1AA', marginLeft: 'auto' }}>{formatDate(ann.date)}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', lineHeight: 1.4 }}>{ann.title}</p>
          <p
            style={{
              fontSize: 12, color: '#71717A', marginTop: 2, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: expanded || !isLong ? undefined : 2,
              WebkitBoxOrient: 'vertical', overflow: expanded || !isLong ? 'visible' : 'hidden',
            } as React.CSSProperties}
          >
            {ann.content}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(v => !v)} style={{ fontSize: 11, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0' }}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onPin(ann)} style={{ padding: '5px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: ann.isPinned ? '#6366F1' : '#A1A1AA' }} title={ann.isPinned ? 'Unpin' : 'Pin'}>
            <Pin style={{ width: 13, height: 13 }} />
          </button>
          <button onClick={() => onEdit(ann)} style={{ padding: '5px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1' }} title="Edit">
            <Edit style={{ width: 13, height: 13 }} />
          </button>
          <button onClick={() => onDelete(ann)} style={{ padding: '5px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }} title="Delete">
            <Trash style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Announcements() {
  const { properties, selectedProperty } = useProperty();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [waQueue, setWaQueue] = useState<WhatsAppQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FilterCat>('all');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    category: 'general' as AnnouncementCategory,
    isPinned: false,
    propertyId: '',
    sendViaWhatsApp: false,
  });
  const [createSaving, setCreateSaving] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<AnnouncementRecord | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAnn, setDeletingAnn] = useState<AnnouncementRecord | null>(null);

  // WhatsApp queue panel
  const [showWaPanel, setShowWaPanel] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, queue] = await Promise.all([
        getAnnouncements(selectedProperty),
        getWhatsAppQueue(selectedProperty === 'all' ? undefined : selectedProperty),
      ]);
      setAnnouncements(data);
      setWaQueue(queue);
    } catch {
      toast.error('Failed to load announcements');
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
    key: 'announcements',
    tables: ['announcements'],
    onChange: () => void load(),
    enabled: !isDemoModeEnabled(),
  });

  const filtered = announcements.filter(
    (a) => filterCategory === 'all' || a.category === filterCategory,
  );
  const pinned = filtered.filter((a) => a.isPinned);
  const regular = filtered.filter((a) => !a.isPinned);

  const waQueuedCount = waQueue.filter((e) => e.status === 'queued' || e.status === 'sending').length;

  const getWaEntry = (ann: AnnouncementRecord) => waQueue.find((e) => e.announcementId === ann.id);

  const handleTogglePin = async (ann: AnnouncementRecord) => {
    const next = !ann.isPinned;
    setAnnouncements((as) => as.map((a) => a.id === ann.id ? { ...a, isPinned: next } : a));
    try {
      await toggleAnnouncementPinRecord(ann.id, next);
    } catch (err) {
      setAnnouncements((as) => as.map((a) => a.id === ann.id ? { ...a, isPinned: ann.isPinned } : a));
      toast.error(err instanceof Error ? err.message : 'Failed to update pin');
    }
  };

  const resetCreateForm = () => setCreateForm({ title: '', content: '', category: 'general', isPinned: false, propertyId: '', sendViaWhatsApp: false });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setCreateSaving(true);
    try {
      const created = await createAnnouncementRecord({
        title: createForm.title.trim(),
        content: createForm.content.trim(),
        category: createForm.category,
        isPinned: createForm.isPinned,
        sendViaWhatsApp: createForm.sendViaWhatsApp,
        propertyId: createForm.propertyId || null,
      });
      setAnnouncements((as) => [created, ...as]);
      if (createForm.sendViaWhatsApp) {
        // reload queue to get new entry
        const queue = await getWhatsAppQueue(createForm.propertyId || undefined);
        setWaQueue(queue);
        toast.success('Announcement published · WhatsApp broadcast queued');
      } else {
        toast.success('Announcement published');
      }
      setCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnn) return;
    setEditSaving(true);
    try {
      const updated = await updateAnnouncementRecord(editingAnn.id, {
        title: editingAnn.title,
        content: editingAnn.content,
        category: editingAnn.category,
        isPinned: editingAnn.isPinned,
      });
      setAnnouncements((as) => as.map((a) => a.id === updated.id ? updated : a));
      setEditOpen(false);
      setEditingAnn(null);
      toast.success('Announcement updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAnn) return;
    try {
      await deleteAnnouncementRecord(deletingAnn.id);
      setAnnouncements((as) => as.filter((a) => a.id !== deletingAnn.id));
      setDeleteOpen(false);
      setDeletingAnn(null);
      toast.success('Announcement deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  const targetPropertyName = createForm.propertyId
    ? (properties.find((p) => p.id === createForm.propertyId)?.name ?? 'Selected property')
    : 'All properties';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6366F1' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-wrap">
        <div>
          <h1 className="ds-page-title">Announcements</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>Broadcast updates to tenants across your properties</p>
        </div>
        <div className="flex items-center gap-2">
          {waQueue.length > 0 && (
            <button
              onClick={() => setShowWaPanel((v) => !v)}
              className="relative flex items-center gap-2 rounded-lg transition-all"
              style={{
                height: 36, padding: '0 12px',
                background: showWaPanel ? '#F0FDF4' : '#FAFAFA',
                border: showWaPanel ? '1px solid #86EFAC' : '1px solid #E4E4E7',
                color: '#16A34A', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Queue
              {waQueuedCount > 0 && (
                <span className="flex items-center justify-center rounded-full text-white" style={{ minWidth: 18, height: 18, background: '#10B981', fontSize: 10, fontWeight: 700, padding: '0 4px' }}>
                  {waQueuedCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg text-white transition-all"
            style={{ height: 36, padding: '0 14px', background: '#4F46E5', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>
      </div>

      {/* WhatsApp Queue Panel */}
      {showWaPanel && waQueue.length > 0 && (
        <div
          className="rounded-xl"
          style={{ background: '#FFFFFF', border: '1px solid #E4E4E7' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-green-100">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>WhatsApp Broadcast Queue</span>
              <span style={{ fontSize: 11, color: '#A1A1AA' }}>{waQueue.length} broadcast{waQueue.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowWaPanel(false)} className="rounded-md hover:bg-zinc-100 p-1 transition-colors">
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="divide-y divide-green-50">
            {waQueue.map((entry) => {
              const cfg = WA_STATUS_CONFIG[entry.status];
              const Icon = cfg.icon;
              const ann = announcements.find((a) => a.id === entry.announcementId);
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${cfg.color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0B' }} className="truncate">
                      {ann?.title ?? 'Announcement'}
                    </p>
                    <p style={{ fontSize: 11, color: '#A1A1AA' }}>
                      {entry.recipientCount} recipient{entry.recipientCount !== 1 ? 's' : ''}
                      {entry.status === 'delivered' && ` · ${entry.sentCount} delivered`}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: `${cfg.color}18`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#A1A1AA', flexShrink: 0 }}>
                    {new Date(entry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter chips + stats inline */}
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>
          {announcements.length} total · {announcements.filter(a => a.isPinned).length} pinned · {announcements.filter(a => a.sentViaWhatsApp).length} via WhatsApp
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'maintenance', 'payment', 'rules', 'general'] as FilterCat[]).map((c) => {
          const count = c === 'all' ? announcements.length : announcements.filter((a) => a.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: filterCategory === c ? '#4F46E5' : '#FFFFFF',
                color: filterCategory === c ? '#FFFFFF' : '#52525B',
                border: filterCategory === c ? '1px solid #4F46E5' : '1px solid #E4E4E7',
              }}
            >
              {c === 'all' ? 'All' : CATEGORY_LABEL[c]}
              <span
                className="rounded-full px-1.5"
                style={{
                  background: filterCategory === c ? 'rgba(255,255,255,0.25)' : '#F4F4F6',
                  color: filterCategory === c ? '#fff' : '#71717A',
                  fontSize: 10,
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: '#A1A1AA' }}>
          <Bell className="w-10 h-10 mb-3 opacity-30" />
          <p style={{ fontSize: 14 }}>No announcements found</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Create one to broadcast to your tenants</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-4 h-4" style={{ color: '#7C3AED' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Pinned</span>
              </div>
              <div className="space-y-3">
                {pinned.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    ann={a}
                    waEntry={getWaEntry(a)}
                    isPinnedSection
                    onPin={handleTogglePin}
                    onEdit={(ann) => { setEditingAnn(ann); setEditOpen(true); }}
                    onDelete={(ann) => { setDeletingAnn(ann); setDeleteOpen(true); }}
                  />
                ))}
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="w-4 h-4 text-zinc-400" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>All Announcements</span>
                </div>
              )}
              <div className="space-y-3">
                {regular.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    ann={a}
                    waEntry={getWaEntry(a)}
                    isPinnedSection={false}
                    onPin={handleTogglePin}
                    onEdit={(ann) => { setEditingAnn(ann); setEditOpen(true); }}
                    onDelete={(ann) => { setDeletingAnn(ann); setDeleteOpen(true); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreateForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>
              New Announcement
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Title *</Label>
              <Input
                placeholder="e.g., Water supply maintenance on Tuesday"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Message *</Label>
              <textarea
                placeholder="Detailed announcement message for tenants..."
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                rows={4}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Category</Label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as AnnouncementCategory })}
                  className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="payment">Payment</option>
                  <option value="rules">Rules & Policy</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Target Audience</Label>
                <select
                  value={createForm.propertyId}
                  onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value })}
                  className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All properties</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.isPinned}
                  onChange={(e) => setCreateForm({ ...createForm, isPinned: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#3F3F46' }}>Pin announcement</span>
              </label>
            </div>

            {/* WhatsApp broadcast toggle */}
            <div
              className="rounded-xl p-4 transition-all"
              style={{
                background: createForm.sendViaWhatsApp ? '#F0FDF4' : '#FAFAFA',
                border: createForm.sendViaWhatsApp ? '1px solid #86EFAC' : '1px solid #E4E4E7',
              }}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.sendViaWhatsApp}
                  onChange={(e) => setCreateForm({ ...createForm, sendViaWhatsApp: e.target.checked })}
                  className="w-4 h-4 accent-green-600 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#15803D' }}>Send via WhatsApp</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#52525B', marginTop: 3 }}>
                    Broadcast to all active tenants
                    {createForm.propertyId ? ` in ${targetPropertyName}` : ' across all properties'}
                  </p>
                  {createForm.sendViaWhatsApp && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-green-100">
                      <Send className="w-3 h-3 text-green-700" />
                      <span style={{ fontSize: 11, color: '#15803D', fontWeight: 500 }}>
                        Message will be queued immediately after publishing
                      </span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSaving} style={{ background: '#4F46E5', color: '#fff' }}>
                {createSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {createForm.sendViaWhatsApp ? 'Publish & Broadcast' : 'Publish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>Edit Announcement</DialogTitle>
          </DialogHeader>
          {editingAnn && (
            <form onSubmit={(e) => void handleEdit(e)} className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Title *</Label>
                <Input
                  value={editingAnn.title}
                  onChange={(e) => setEditingAnn({ ...editingAnn, title: e.target.value })}
                  className="h-10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Message *</Label>
                <textarea
                  value={editingAnn.content}
                  onChange={(e) => setEditingAnn({ ...editingAnn, content: e.target.value })}
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label style={{ fontSize: 12, fontWeight: 600, color: '#3F3F46' }}>Category</Label>
                <select
                  value={editingAnn.category}
                  onChange={(e) => setEditingAnn({ ...editingAnn, category: e.target.value as AnnouncementCategory })}
                  className="w-full h-10 px-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="payment">Payment</option>
                  <option value="rules">Rules & Policy</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingAnn.isPinned}
                  onChange={(e) => setEditingAnn({ ...editingAnn, isPinned: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#3F3F46' }}>Pin announcement</span>
              </label>
              <DialogFooter className="gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editSaving} style={{ background: '#4F46E5', color: '#fff' }}>
                  {editSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#EF4444' }} className="flex items-center gap-2">
              <Trash className="w-4 h-4" /> Delete Announcement?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>"{deletingAnn?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
