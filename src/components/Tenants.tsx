import { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  Plus, Search, Eye, Edit, Trash, User, Phone, MapPin,
  IndianRupee, CheckCircle, XCircle, Save, AlertTriangle,
  Bed, FileText, Loader2, Calendar, Upload, Download,
  Clock, AlertCircle, Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { InternationalPhoneField } from './ui/InternationalPhoneField';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from './ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import {
  getTenants, createTenantRecord, updateTenantRecord, deleteTenantRecord,
  importTenantsFromCSV, isDemoModeEnabled,
} from '../services/dataService';
import type { TenantRecord, TenantCreateInput, TenantStatus } from '../services/supabaseData';
import { TENANT_STATUS_LABELS, TENANT_STATUS_COLORS } from '../services/supabaseData';
import { downloadCSVTemplate } from '../services/csvImport';
import type { CSVImportResult } from '../services/supabaseData';

interface TenantsProps {
  onViewTenant: (tenantId: string) => void;
}

const makeEmptyForm = (defaultPropertyId = ''): TenantCreateInput => ({
  name: '', phone: '', email: '', propertyId: defaultPropertyId,
  floor: 1, room: '', bed: '', monthlyRent: 0, securityDeposit: 0,
  rentDueDate: 1, parentName: '', parentPhone: '', idType: 'Aadhaar', idNumber: '',
  joinDate: new Date().toISOString().split('T')[0], status: 'active',
});

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function StatusChip({ status, joinDate }: { status: TenantStatus; joinDate?: string }) {
  const daysSinceJoin = joinDate ? Math.floor((Date.now() - new Date(joinDate).getTime()) / 86400000) : null;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TENANT_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {TENANT_STATUS_LABELS[status] ?? status}
      </span>
      {status === 'payment_overdue' && daysSinceJoin !== null && (
        <span style={{ fontSize: 10, color: '#991B1B', fontWeight: 600 }}>!</span>
      )}
    </div>
  );
}

export function Tenants({ onViewTenant }: TenantsProps) {
  const { properties, selectedProperty } = useProperty();

  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TenantStatus>('all');

  // CSV import
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add modal — simplified 3-step: Basic → Room+Finances → Review
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addForm, setAddForm] = useState<TenantCreateInput>(() => makeEmptyForm(properties[0]?.id));
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TenantCreateInput>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<TenantRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<TenantRecord | null>(null);

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  useEffect(() => {
    void loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty]);

  useRealtimeRefresh({
    key: `tenants-${selectedProperty}`,
    tables: ['tenants'],
    onChange: () => void loadTenants(),
    enabled: !isDemoModeEnabled(),
  });

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await getTenants(selectedProperty);
      setTenants(data);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const activeInRoom = useMemo(() =>
    tenants.filter((t) => ['active', 'payment_overdue', 'notice_submitted', 'vacating'].includes(t.status)),
  [tenants]);

  const overdueTenants = useMemo(() => tenants.filter((t) => t.status === 'payment_overdue'), [tenants]);
  const vacatingTenants = useMemo(() =>
    tenants.filter((t) => t.status === 'notice_submitted' || t.status === 'vacating'),
  [tenants]);

  const filteredTenants = useMemo(() => tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.room.includes(q) ||
      getPropertyName(t.propertyId).toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [tenants, searchQuery, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterCounts = useMemo(() => ({
    all: tenants.length,
    active: tenants.filter((t) => t.status === 'active').length,
    payment_overdue: overdueTenants.length,
    notice_submitted: tenants.filter((t) => t.status === 'notice_submitted').length,
    vacating: vacatingTenants.length,
    inactive: tenants.filter((t) => t.status === 'inactive').length,
    archived: tenants.filter((t) => t.status === 'archived').length,
  }), [tenants, overdueTenants, vacatingTenants]);

  const handleImportCSV = async () => {
    if (!importFile) { toast.error('Please select a CSV file'); return; }
    setImportLoading(true);
    try {
      const text = await importFile.text();
      const result = await importTenantsFromCSV(text, properties);
      setImportResult(result);
      if (result.succeeded > 0) {
        const fresh = await getTenants(selectedProperty);
        setTenants(fresh);
        toast.success(`Imported ${result.succeeded} tenant${result.succeeded > 1 ? 's' : ''} successfully`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} row${result.failed > 1 ? 's' : ''} failed — see details below`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email || !addForm.phone || !addForm.propertyId || !addForm.room) {
      toast.error('Please fill all required fields');
      return;
    }
    setAddLoading(true);
    try {
      const created = await createTenantRecord(addForm);
      setTenants((prev) => [created, ...prev]);
      setAddOpen(false);
      setAddStep(1);
      setAddForm(makeEmptyForm(properties[0]?.id));
      toast.success('Tenant added successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add tenant');
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (tenant: TenantRecord) => {
    setEditingId(tenant.id);
    setEditForm({
      name: tenant.name, email: tenant.email, phone: tenant.phone,
      propertyId: tenant.propertyId, floor: tenant.floor, room: tenant.room,
      bed: tenant.bed, monthlyRent: tenant.rent, securityDeposit: tenant.securityDeposit,
      rentDueDate: tenant.rentDueDate, parentName: tenant.parentName,
      parentPhone: tenant.parentPhone, idType: tenant.idType, idNumber: tenant.idNumber,
      joinDate: tenant.joinDate, status: tenant.status,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setEditLoading(true);
    try {
      const updated = await updateTenantRecord(editingId, editForm);
      setTenants((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      setEditOpen(false);
      setEditingId(null);
      toast.success('Tenant updated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    setDeleteLoading(true);
    try {
      await deleteTenantRecord(deletingTenant.id);
      setTenants((prev) => prev.filter((t) => t.id !== deletingTenant.id));
      setDeleteOpen(false);
      setDeletingTenant(null);
      toast.success('Tenant deleted successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete tenant');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Add wizard steps ──────────────────────
  const renderAddStep = () => {
    switch (addStep) {
      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Basic Information</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Full Name *</Label>
              <Input placeholder="e.g., Amit Kumar" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} style={{ height: 40 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Phone *</Label>
              <InternationalPhoneField value={addForm.phone} onChange={(v) => setAddForm({ ...addForm, phone: v })} required placeholder="9876543210" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Email *</Label>
              <Input type="email" placeholder="amit@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} style={{ height: 40 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Join Date</Label>
              <Input type="date" value={addForm.joinDate} onChange={(e) => setAddForm({ ...addForm, joinDate: e.target.value })} style={{ height: 40 }} />
            </div>
          </div>
        );

      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Room & Financials</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Property *</Label>
              <select
                value={addForm.propertyId}
                onChange={(e) => setAddForm({ ...addForm, propertyId: e.target.value })}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
              >
                <option value="">Select a property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Floor</Label>
                <Input type="number" min="0" value={addForm.floor} onChange={(e) => setAddForm({ ...addForm, floor: parseInt(e.target.value) || 0 })} style={{ height: 40 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Room *</Label>
                <Input placeholder="e.g., 301" value={addForm.room} onChange={(e) => setAddForm({ ...addForm, room: e.target.value })} style={{ height: 40 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Bed</Label>
                <Input placeholder="e.g., A" value={addForm.bed} onChange={(e) => setAddForm({ ...addForm, bed: e.target.value })} style={{ height: 40 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Monthly Rent (₹) *</Label>
                <Input type="number" placeholder="8000" value={addForm.monthlyRent || ''} onChange={(e) => setAddForm({ ...addForm, monthlyRent: parseInt(e.target.value) || 0 })} style={{ height: 40 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Security Deposit (₹)</Label>
                <Input type="number" placeholder="16000" value={addForm.securityDeposit || ''} onChange={(e) => setAddForm({ ...addForm, securityDeposit: parseInt(e.target.value) || 0 })} style={{ height: 40 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Due Day (1–28)</Label>
                <Input type="number" min="1" max="28" placeholder="1" value={addForm.rentDueDate || ''} onChange={(e) => setAddForm({ ...addForm, rentDueDate: parseInt(e.target.value) || 1 })} style={{ height: 40 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Label>
                <select
                  value={addForm.status}
                  onChange={(e) => setAddForm({ ...addForm, status: e.target.value as TenantStatus })}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
                >
                  <option value="active">Active</option>
                  <option value="pending_onboarding">Pending Onboarding</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', marginBottom: 4 }}>Review & Confirm</p>
            <div style={{ padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E4E4E7', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Name', addForm.name || '—'],
                ['Phone', addForm.phone || '—'],
                ['Email', addForm.email || '—'],
                ['Property', getPropertyName(addForm.propertyId) || '—'],
                ['Room', addForm.room ? `${addForm.room}${addForm.bed ? ` / Bed ${addForm.bed}` : ''}` : '—'],
                ['Monthly Rent', addForm.monthlyRent ? fmt(addForm.monthlyRent) : '—'],
                ['Security Deposit', addForm.securityDeposit ? fmt(addForm.securityDeposit) : '₹0'],
                ['Join Date', addForm.joinDate || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span style={{ fontSize: 12, color: '#71717A' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0B' }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#065F46' }}>Rent payment invoice will be auto-generated on save.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ds-card" style={{ height: 90, padding: 16 }}>
              <div style={{ height: 10, background: '#F4F4F6', borderRadius: 4, width: '50%', marginBottom: 8 }} />
              <div style={{ height: 22, background: '#F4F4F6', borderRadius: 4, width: '65%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Page header ─────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Tenants</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            {activeInRoom.length} active · {tenants.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetImport(); setImportOpen(true); }}
            className="ds-btn ds-btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            <Upload style={{ width: 13, height: 13 }} />
            Import
          </button>
          <button
            onClick={() => { setAddForm(makeEmptyForm(properties[0]?.id)); setAddStep(1); setAddOpen(true); }}
            className="ds-btn ds-btn-primary"
            style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Add Tenant
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Tenants', value: tenants.length.toString(), meta: `${properties.length} propert${properties.length === 1 ? 'y' : 'ies'}`, icon: Users, iconBg: '#EEF2FF', iconColor: '#6366F1' },
          { label: 'Active', value: filterCounts.active.toString(), meta: 'In residence', icon: CheckCircle, iconBg: '#ECFDF5', iconColor: '#059669' },
          { label: 'Overdue', value: overdueTenants.length.toString(), meta: overdueTenants.length > 0 ? 'Need collection' : 'All clear', icon: AlertCircle, iconBg: overdueTenants.length > 0 ? '#FEF2F2' : '#ECFDF5', iconColor: overdueTenants.length > 0 ? '#DC2626' : '#059669' },
          { label: 'Monthly Revenue', value: fmt(activeInRoom.reduce((s, t) => s + t.rent, 0)), meta: 'From active tenants', icon: IndianRupee, iconBg: '#ECFDF5', iconColor: '#059669' },
        ].map(({ label, value, meta, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="ds-card flex items-start justify-between" style={{ padding: '14px 16px', gap: 12 }}>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0B', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>{meta}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: iconBg }}>
              <Icon style={{ width: 16, height: 16, color: iconColor, strokeWidth: 1.75 }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Operational alerts ───────────────── */}
      {overdueTenants.length > 0 && (
        <div
          className="flex items-center justify-between rounded-xl"
          style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', gap: 12 }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
                {overdueTenants.length} tenant{overdueTenants.length > 1 ? 's' : ''} with overdue payments
              </p>
              <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 1 }}>
                {overdueTenants.slice(0, 3).map((t) => t.name).join(', ')}{overdueTenants.length > 3 ? ` +${overdueTenants.length - 3} more` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('payment_overdue')}
            className="ds-btn ds-btn-secondary flex-shrink-0"
            style={{ fontSize: 12, padding: '5px 10px', borderColor: '#FECACA', color: '#991B1B' }}
          >
            View Overdue
          </button>
        </div>
      )}

      {vacatingTenants.length > 0 && (
        <div
          className="flex items-center justify-between rounded-xl"
          style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', gap: 12 }}
        >
          <div className="flex items-center gap-3">
            <Clock style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                {vacatingTenants.length} tenant{vacatingTenants.length > 1 ? 's' : ''} vacating soon
              </p>
              <p style={{ fontSize: 12, color: '#B45309', marginTop: 1 }}>
                {vacatingTenants.slice(0, 3).map((t) => `${t.name}${t.vacateDate ? ` (${new Date(t.vacateDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : ''}`).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('notice_submitted')}
            className="ds-btn ds-btn-secondary flex-shrink-0"
            style={{ fontSize: 12, padding: '5px 10px', borderColor: '#FDE68A', color: '#92400E' }}
          >
            View Vacating
          </button>
        </div>
      )}

      {/* ── Filters + search ─────────────────── */}
      <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Filter row */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F6', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
          {(['all', 'active', 'payment_overdue', 'notice_submitted', 'vacating', 'inactive', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                border: `1px solid ${filterStatus === s ? '#6366F1' : '#E4E4E7'}`,
                background: filterStatus === s ? '#6366F1' : '#fff',
                color: filterStatus === s ? '#fff' : '#52525B',
                transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? 'All' : TENANT_STATUS_LABELS[s as TenantStatus]}
              <span style={{ marginLeft: 5, opacity: 0.75, fontSize: 11 }}>
                {filterCounts[s as keyof typeof filterCounts] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F6', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 26, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#A1A1AA' }} />
          <Input
            type="text"
            placeholder="Search by name, room, phone, or property…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36, height: 38, fontSize: 13 }}
          />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F1F1F3' }}>
                {['Tenant', 'Property', 'Room', 'Rent / Deposit', 'Since', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', fontSize: 13, color: '#A1A1AA' }}>
                    No tenants found
                  </td>
                </tr>
              ) : filteredTenants.map((tenant, i) => (
                <tr
                  key={tenant.id}
                  style={{
                    borderBottom: i < filteredTenants.length - 1 ? '1px solid #F4F4F6' : 'none',
                    background: tenant.status === 'payment_overdue' ? '#FFFAFA' : '#fff',
                  }}
                >
                  <td style={{ padding: '7px 12px' }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-md"
                        style={{ width: 26, height: 26, background: tenant.status === 'payment_overdue' ? '#FEF2F2' : '#EEF2FF' }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, color: tenant.status === 'payment_overdue' ? '#991B1B' : '#6366F1' }}>
                          {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{tenant.name}</p>
                        <p style={{ fontSize: 11, color: '#A1A1AA' }}>{tenant.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: '#71717A', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getPropertyName(tenant.propertyId)}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 13, color: '#52525B', whiteSpace: 'nowrap' }}>
                    {tenant.room}{tenant.bed ? ` · ${tenant.bed}` : ''}
                    {tenant.floor ? <span style={{ fontSize: 11, color: '#A1A1AA' }}> · F{tenant.floor}</span> : null}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{fmt(tenant.rent)}</p>
                    {tenant.securityDeposit > 0 && <p style={{ fontSize: 10, color: '#A1A1AA' }}>Dep: {fmt(tenant.securityDeposit)}</p>}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: '#71717A', whiteSpace: 'nowrap' }}>
                    {new Date(tenant.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <StatusChip status={tenant.status} joinDate={tenant.joinDate} />
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div className="flex items-center gap-1">
                      <button
                        title="View full profile"
                        onClick={() => onViewTenant(tenant.id)}
                        className="ds-btn ds-btn-primary"
                        style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
                      >
                        <Eye style={{ width: 12, height: 12 }} />
                        View
                      </button>
                      <button
                        title="Edit"
                        onClick={() => openEdit(tenant)}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0 }}
                      >
                        <Edit style={{ width: 12, height: 12 }} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => { setDeletingTenant(tenant); setDeleteOpen(true); }}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0, color: '#DC2626' }}
                      >
                        <Trash style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredTenants.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#A1A1AA', padding: '32px 0' }}>No tenants found</p>
          ) : filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              style={{
                border: `1px solid ${tenant.status === 'payment_overdue' ? '#FECACA' : '#E4E4E7'}`,
                borderRadius: 10, padding: '12px 14px',
                background: tenant.status === 'payment_overdue' ? '#FFFAFA' : '#fff',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{ width: 36, height: 36, background: tenant.status === 'payment_overdue' ? '#FEF2F2' : '#EEF2FF' }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: tenant.status === 'payment_overdue' ? '#991B1B' : '#6366F1' }}>
                      {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.name}</p>
                    <p style={{ fontSize: 11, color: '#A1A1AA' }}>{tenant.phone}</p>
                  </div>
                </div>
                <StatusChip status={tenant.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <div style={{ padding: '6px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Room</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0B' }}>{tenant.room}{tenant.bed ? ` · ${tenant.bed}` : ''}</p>
                </div>
                <div style={{ padding: '6px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                  <p style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Rent</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{fmt(tenant.rent)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewTenant(tenant.id)}
                  className="ds-btn ds-btn-primary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4 }}
                >
                  <Eye style={{ width: 12, height: 12 }} /> View
                </button>
                <button
                  onClick={() => openEdit(tenant)}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4 }}
                >
                  <Edit style={{ width: 12, height: 12 }} /> Edit
                </button>
                <button
                  onClick={() => { setDeletingTenant(tenant); setDeleteOpen(true); }}
                  className="ds-btn ds-btn-secondary"
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', justifyContent: 'center', gap: 4, color: '#DC2626' }}
                >
                  <Trash style={{ width: 12, height: 12 }} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Tenant Modal (3-step) ────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>Step {addStep} of 3</DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1, height: 3, borderRadius: 99,
                  background: s <= addStep ? '#6366F1' : '#E4E4E7',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          <div style={{ paddingTop: 4, paddingBottom: 4 }}>{renderAddStep()}</div>

          <DialogFooter style={{ gap: 8 }}>
            {addStep > 1 && (
              <Button variant="outline" onClick={() => setAddStep(addStep - 1)}>Back</Button>
            )}
            {addStep < 3 ? (
              <Button
                onClick={() => setAddStep(addStep + 1)}
                className="ds-btn ds-btn-primary"
                disabled={addStep === 1 && (!addForm.name || !addForm.phone || !addForm.email)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => void handleAdd()} disabled={addLoading} className="ds-btn ds-btn-primary">
                {addLoading ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14, marginRight: 6 }} />}
                Add Tenant
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Tenant Modal ────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {viewingTenant && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
              <div className="flex items-center gap-3" style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E4E4E7' }}>
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-xl"
                  style={{ width: 44, height: 44, background: '#EEF2FF' }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#6366F1' }}>
                    {viewingTenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0B' }}>{viewingTenant.name}</p>
                  <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>{viewingTenant.email}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusChip status={viewingTenant.status} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Phone', value: viewingTenant.phone, icon: Phone },
                  { label: 'Property', value: getPropertyName(viewingTenant.propertyId), icon: MapPin },
                  { label: 'Room', value: `${viewingTenant.room}${viewingTenant.bed ? ` · Bed ${viewingTenant.bed}` : ''}`, icon: Bed },
                  { label: 'Floor', value: `Floor ${viewingTenant.floor}`, icon: Bed },
                  { label: 'Monthly Rent', value: fmt(viewingTenant.rent), icon: IndianRupee },
                  { label: 'Security Deposit', value: fmt(viewingTenant.securityDeposit), icon: IndianRupee },
                  { label: 'Due Day', value: `${viewingTenant.rentDueDate}th of month`, icon: Calendar },
                  { label: 'Joined', value: new Date(viewingTenant.joinDate).toLocaleDateString('en-IN'), icon: Calendar },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F1F3' }}>
                    <p style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{value}</p>
                  </div>
                ))}
              </div>

              {(viewingTenant.parentName || viewingTenant.parentPhone) && (
                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F1F3' }}>
                  <p style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 6 }}>Guardian / Emergency Contact</p>
                  {viewingTenant.parentName && <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0B' }}>{viewingTenant.parentName}</p>}
                  {viewingTenant.parentPhone && <p style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{viewingTenant.parentPhone}</p>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => { if (viewingTenant) { openEdit(viewingTenant); setViewOpen(false); } }}
              className="ds-btn ds-btn-secondary"
            >
              <Edit style={{ width: 13, height: 13, marginRight: 6 }} /> Edit Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Tenant Modal ────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4, paddingBottom: 4 }}>
            {[
              { label: 'Full Name *', type: 'text', key: 'name' },
              { label: 'Email *', type: 'email', key: 'email' },
              { label: 'Room *', type: 'text', key: 'room' },
              { label: 'Monthly Rent (₹)', type: 'number', key: 'monthlyRent' },
            ].map(({ label, type, key }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Label style={{ fontSize: 12, fontWeight: 600 }}>{label}</Label>
                <Input
                  type={type}
                  value={(editForm as any)[key] ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, [key]: type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value })}
                  style={{ height: 40 }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Phone *</Label>
              <InternationalPhoneField value={editForm.phone ?? ''} onChange={(v) => setEditForm({ ...editForm, phone: v })} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Property *</Label>
              <select
                value={editForm.propertyId ?? ''}
                onChange={(e) => setEditForm({ ...editForm, propertyId: e.target.value })}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
              >
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ fontSize: 12, fontWeight: 600 }}>Status</Label>
              <select
                value={editForm.status ?? 'active'}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TenantStatus })}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, fontSize: 13, color: '#0A0A0B', background: '#fff' }}
              >
                {(['active', 'payment_overdue', 'notice_submitted', 'vacating', 'inactive', 'archived'] as const).map((s) => (
                  <option key={s} value={s}>{TENANT_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter style={{ gap: 8 }}>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleEdit()} disabled={editLoading} className="ds-btn ds-btn-primary">
              {editLoading ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14, marginRight: 6 }} />}
              Update Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ───────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: '#DC2626' }}>
              <AlertTriangle style={{ width: 18, height: 18 }} /> Delete Tenant?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingTenant?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleteLoading}
              style={{ background: '#DC2626', color: '#fff' }}
            >
              {deleteLoading ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : null}
              Delete Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── CSV Import Modal ─────────────────── */}
      <Dialog open={importOpen} onOpenChange={(v) => { if (!v) resetImport(); setImportOpen(v); }}>
        <DialogContent style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Bulk Import Tenants</DialogTitle>
            <DialogDescription>Upload a CSV file to add multiple tenants at once.</DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4, paddingBottom: 4 }}>
            <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1E40AF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download style={{ width: 13, height: 13 }} /> Step 1: Download Template
              </p>
              <p style={{ fontSize: 12, color: '#1D4ED8', marginBottom: 8 }}>Fill in the CSV template with your tenant data.</p>
              <button onClick={() => downloadCSVTemplate()} className="ds-btn ds-btn-secondary" style={{ fontSize: 12, padding: '5px 10px', gap: 5, borderColor: '#BFDBFE', color: '#1D4ED8' }}>
                <Download style={{ width: 12, height: 12 }} /> Download Template
              </button>
            </div>

            <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E4E4E7', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload style={{ width: 13, height: 13 }} /> Step 2: Upload CSV File
              </p>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }} />
              <div className="flex items-center gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="ds-btn ds-btn-secondary" style={{ fontSize: 12, padding: '5px 10px', gap: 5 }}>
                  <FileText style={{ width: 12, height: 12 }} /> {importFile ? importFile.name : 'Choose File'}
                </button>
                {importFile && <span style={{ fontSize: 11, color: '#A1A1AA' }}>{(importFile.size / 1024).toFixed(1)} KB</span>}
              </div>
            </div>

            {importResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Total', value: importResult.total, color: '#0A0A0B' },
                    { label: 'Imported', value: importResult.succeeded, color: '#059669' },
                    { label: 'Failed', value: importResult.failed, color: '#DC2626' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
                    </div>
                  ))}
                </div>
                {importResult.errors.length > 0 && (
                  <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>Validation Errors</p>
                    {importResult.errors.slice(0, 20).map((err, i) => (
                      <p key={i} style={{ fontSize: 11, color: '#B91C1C', marginBottom: 2 }}>
                        Row {err.row} · <strong>{err.field}</strong>: {err.message}
                      </p>
                    ))}
                    {importResult.errors.length > 20 && <p style={{ fontSize: 11, color: '#991B1B', fontWeight: 500 }}>+{importResult.errors.length - 20} more errors…</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter style={{ gap: 8 }}>
            <Button variant="outline" onClick={() => { resetImport(); setImportOpen(false); }}>Close</Button>
            {!importResult && (
              <Button onClick={() => void handleImportCSV()} disabled={!importFile || importLoading} className="ds-btn ds-btn-primary">
                {importLoading ? <Loader2 style={{ width: 14, height: 14, marginRight: 6 }} className="animate-spin" /> : <Upload style={{ width: 14, height: 14, marginRight: 6 }} />}
                {importLoading ? 'Importing…' : 'Import Tenants'}
              </Button>
            )}
            {importResult && importResult.failed > 0 && (
              <button onClick={resetImport} className="ds-btn ds-btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>Try Again</button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
