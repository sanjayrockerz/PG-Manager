import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Search, Eye, Edit, Trash, Phone, MapPin,
  IndianRupee, CheckCircle, XCircle, Save, AlertTriangle,
  Bed, FileText, Loader2, Calendar, Upload, Download,
  Clock, AlertCircle, Users, ShieldAlert, ChevronRight, Copy,
} from 'lucide-react';
import { validateTenantForm, type TenantFormErrors } from '../utils/validation';
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
  importTenantsFromCSV, isDemoModeEnabled, patchTenantCache, invalidateTenantCache
} from '../services/dataService';
import type { TenantRecord, TenantCreateInput, TenantStatus } from '../services/supabaseData';
import { TENANT_STATUS_LABELS, TENANT_STATUS_COLORS } from '../services/supabaseData';
import { downloadCSVTemplate } from '../services/csvImport';
import type { CSVImportResult } from '../services/supabaseData';

interface TenantsProps {
  onViewTenant: (tenantId: string) => void;
}

const makeEmptyForm = (defaultPropertyId = ''): TenantCreateInput => ({
  name: '', phone: '', alternatePhone: '', email: '',
  dob: '', gender: '',
  propertyId: defaultPropertyId,
  floor: 1, room: '', bed: '',
  monthlyRent: 0, securityDeposit: 0,
  rentDueDate: 1, billingCycle: 'monthly',
  parentName: '', parentPhone: '', guardianRelationship: 'parent',
  idType: 'Aadhaar', idNumber: '',
  joinDate: new Date().toISOString().split('T')[0], status: 'active',
});

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function computeDaysOverdue(rentDueDate: number): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), rentDueDate);
  if (thisMonth <= now) return Math.floor((now.getTime() - thisMonth.getTime()) / 86400000);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, rentDueDate);
  return Math.floor((now.getTime() - lastMonth.getTime()) / 86400000);
}

function StatusChip({ status, rentDueDate, vacateDate }: { status: TenantStatus; rentDueDate?: number; vacateDate?: string }) {
  const daysOverdue = status === 'payment_overdue' && rentDueDate ? computeDaysOverdue(rentDueDate) : null;
  const daysUntilVacate = vacateDate ? Math.ceil((new Date(vacateDate).getTime() - Date.now()) / 86400000) : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TENANT_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
          {TENANT_STATUS_LABELS[status] ?? status}
        </span>
        {daysOverdue !== null && daysOverdue > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
            {daysOverdue}d
          </span>
        )}
      </div>
      {(status === 'notice_submitted' || status === 'vacating') && daysUntilVacate !== null && (
        <span style={{ fontSize: 10, color: '#92400E' }}>
          {daysUntilVacate > 0 ? `Move-out in ${daysUntilVacate}d` : 'Move-out today'}
        </span>
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

  // Add modal — 3-step: Identity → Room+Finances → Guardian+Review
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addForm, setAddForm] = useState<TenantCreateInput>(() => makeEmptyForm(properties[0]?.id));
  const [addErrors, setAddErrors] = useState<TenantFormErrors>({});
  const [addLoading, setAddLoading] = useState(false);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TenantCreateInput>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<TenantRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Post-creation invite dialog
  const [inviteDialogTenant, setInviteDialogTenant] = useState<TenantRecord | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Bulk select
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTenants(selectedProperty);
      setTenants(data);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadTenants();

    if (isDemoModeEnabled()) return;

    const channel = supabase.channel(`tenants-rt-${selectedProperty}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const row = payload.new as Record<string, unknown>;
          if (selectedProperty !== 'all' && String(row.property_id) !== selectedProperty) return;
          const patch = {
            status: String(row.status) as TenantStatus,
            rent: Number(row.monthly_rent || row.rent || 0),
            room: String(row.room || '')
          };
          patchTenantCache(String(row.id), patch);
          setTenants((prev) => prev.map((t) => t.id === String(row.id) ? { ...t, ...patch } : t));
        } else {
          // INSERT or DELETE
          invalidateTenantCache(selectedProperty === 'all' ? undefined : selectedProperty);
          void loadTenants();
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedProperty, loadTenants]);



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
  }), [tenants, searchQuery, filterStatus, properties]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const allErrs = validateTenantForm(addForm as Parameters<typeof validateTenantForm>[0]);
    if (Object.keys(allErrs).length > 0) {
      setAddErrors(allErrs);
      toast.error('Please fix the highlighted fields');
      return;
    }
    setAddLoading(true);
    try {
      const created = await createTenantRecord({ ...addForm, idDocument: idDocFile ?? undefined });
      invalidateTenantCache(selectedProperty === 'all' ? undefined : selectedProperty);
      setTenants((prev) => [created, ...prev]);
      setAddOpen(false);
      setAddStep(1);
      setAddErrors({});
      setAddForm(makeEmptyForm(properties[0]?.id));
      setIdDocFile(null);
      setInviteDialogTenant(created);
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
      patchTenantCache(editingId, updated);
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

  const handleBulkMarkOverdue = async () => {
    const toUpdate = [...selectedTenantIds];
    setSelectedTenantIds(new Set());
    try {
      await Promise.all(toUpdate.map((id) => updateTenantRecord(id, { status: 'payment_overdue' })));
      await loadTenants();
      toast.success(`${toUpdate.length} tenant${toUpdate.length > 1 ? 's' : ''} marked as overdue`);
    } catch {
      toast.error('Some updates failed');
      await loadTenants();
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    setDeleteLoading(true);
    try {
      await deleteTenantRecord(deletingTenant.id);
      invalidateTenantCache(selectedProperty === 'all' ? undefined : selectedProperty);
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

  // ── Add wizard helpers ─────────────────────
  const selectedPropertyForAdd = properties.find((p) => p.id === addForm.propertyId);
  const occupancyMode = selectedPropertyForAdd?.occupancyMode ?? 'BED_BASED';
  const availableRooms = selectedPropertyForAdd?.rooms ?? [];
  const selectedRoom = availableRooms.find((r) => r.number === addForm.room);
  const availableBeds = selectedRoom
    ? Array.from({ length: selectedRoom.beds }, (_, i) => String(i + 1))
    : [];

  const fieldClass = (err?: string) =>
    `w-full h-10 px-3 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500
     ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`;

  const selectClass = (err?: string) =>
    `w-full h-10 px-3 text-sm rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-500 appearance-none
     ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`;

  const FieldError = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-xs text-red-600 font-medium mt-1">{msg}</p> : null;

  const WizardStepIndicator = () => (
    <div className="flex items-center gap-0 mb-4">
      {(['Basic', 'Guardian', 'Accommodation', 'Documents'] as const).map((label, i) => {
        const step = i + 1;
        const active = addStep === step;
        const done = addStep > step;
        return (
          <div key={label} className="flex items-center flex-1">
            <div className={`flex items-center gap-1 ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : step}
              </div>
              <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">{label}</span>
            </div>
            {i < 3 && <div className={`flex-1 h-px mx-1.5 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );

  // ── Add wizard steps ──────────────────────
  const renderAddStep = () => {
    switch (addStep) {
      case 1:
        return (
          <div className="flex flex-col gap-3.5">
            <WizardStepIndicator />
            <p className="text-sm font-semibold text-gray-900">Basic Info</p>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Full Name <span className="text-red-500">*</span></Label>
              <Input
                className={fieldClass(addErrors.name)}
                placeholder="e.g., Amit Kumar"
                value={addForm.name}
                onChange={(e) => { setAddForm({ ...addForm, name: e.target.value }); setAddErrors((prev) => ({ ...prev, name: undefined })); }}
              />
              <FieldError msg={addErrors.name} />
            </div>

            <InternationalPhoneField
              label="Phone"
              required
              value={addForm.phone}
              onChange={(v) => { setAddForm({ ...addForm, phone: v }); setAddErrors((prev) => ({ ...prev, phone: undefined })); }}
              invalid={Boolean(addErrors.phone)}
              errorText={addErrors.phone}
            />

            <InternationalPhoneField
              label="Alternate Phone"
              value={addForm.alternatePhone ?? ''}
              onChange={(v) => setAddForm({ ...addForm, alternatePhone: v })}
            />

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                className={fieldClass(addErrors.email)}
                placeholder="amit@example.com"
                value={addForm.email}
                onChange={(e) => { setAddForm({ ...addForm, email: e.target.value }); setAddErrors((prev) => ({ ...prev, email: undefined })); }}
              />
              <FieldError msg={addErrors.email} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Date of Birth</Label>
                <Input
                  type="date"
                  className={fieldClass()}
                  value={addForm.dob ?? ''}
                  onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Gender</Label>
                <select
                  className={selectClass()}
                  value={addForm.gender ?? ''}
                  onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col gap-3.5">
            <WizardStepIndicator />
            <p className="text-sm font-semibold text-gray-900">Guardian Details</p>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Guardian Name <span className="text-red-500">*</span></Label>
              <Input
                className={fieldClass(addErrors.parentName)}
                placeholder="e.g., Ramesh Kumar"
                value={addForm.parentName}
                onChange={(e) => { setAddForm({ ...addForm, parentName: e.target.value }); setAddErrors((prev) => ({ ...prev, parentName: undefined })); }}
              />
              <FieldError msg={addErrors.parentName} />
            </div>

            <InternationalPhoneField
              label="Guardian Phone"
              required
              value={addForm.parentPhone}
              onChange={(v) => { setAddForm({ ...addForm, parentPhone: v }); setAddErrors((prev) => ({ ...prev, parentPhone: undefined })); }}
              invalid={Boolean(addErrors.parentPhone)}
              errorText={addErrors.parentPhone}
            />

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Relationship</Label>
              <select
                className={selectClass()}
                value={addForm.guardianRelationship ?? 'parent'}
                onChange={(e) => setAddForm({ ...addForm, guardianRelationship: e.target.value })}
              >
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        );

      case 3: {
        const handlePropertyChange = (propertyId: string) => {
          setAddForm({ ...addForm, propertyId, room: '', bed: '', floor: 1, monthlyRent: 0 });
          setAddErrors((prev) => ({ ...prev, propertyId: undefined, room: undefined }));
        };

        const handleRoomChange = (roomNumber: string) => {
          const room = availableRooms.find((r) => r.number === roomNumber);
          setAddForm({
            ...addForm,
            room: roomNumber,
            bed: '',
            floor: room?.floor ?? addForm.floor,
            monthlyRent: room?.rent ?? addForm.monthlyRent,
          });
          setAddErrors((prev) => ({ ...prev, room: undefined }));
        };

        return (
          <div className="flex flex-col gap-3.5">
            <WizardStepIndicator />
            <p className="text-sm font-semibold text-gray-900">Accommodation</p>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Property <span className="text-red-500">*</span></Label>
              <select
                className={selectClass(addErrors.propertyId)}
                value={addForm.propertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
              >
                <option value="">Select a property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <FieldError msg={addErrors.propertyId} />
            </div>

            {/* Occupancy mode badge */}
            {selectedPropertyForAdd && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-md">
                <Bed className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="text-xs text-indigo-700 font-medium">
                  {occupancyMode === 'BED_BASED' ? 'Bed-based occupancy — select room then bed' : 'Room-based occupancy — one tenant per room'}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Room <span className="text-red-500">*</span></Label>
              {availableRooms.length > 0 ? (
                <select
                  className={selectClass(addErrors.room)}
                  value={addForm.room}
                  onChange={(e) => handleRoomChange(e.target.value)}
                >
                  <option value="">Select a room</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.number}>
                      {r.roomCode || r.number} — Floor {r.floor} · {r.type} · {r.beds} bed{r.beds > 1 ? 's' : ''} · ₹{r.rent.toLocaleString('en-IN')}
                      {r.status !== 'vacant' ? ` (${r.status})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className={fieldClass(addErrors.room)}
                  placeholder="e.g., 301"
                  value={addForm.room}
                  onChange={(e) => { setAddForm({ ...addForm, room: e.target.value }); setAddErrors((prev) => ({ ...prev, room: undefined })); }}
                />
              )}
              <FieldError msg={addErrors.room} />
            </div>

            {occupancyMode === 'BED_BASED' && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Bed</Label>
                {availableBeds.length > 0 ? (() => {
                  // Compute which bed codes are taken by active tenants in the same room
                  const occupiedBedCodes = new Set(
                    tenants
                      .filter((t) =>
                        t.propertyId === addForm.propertyId &&
                        t.room === addForm.room &&
                        ['active', 'payment_overdue', 'notice_submitted', 'vacating', 'pending_onboarding'].includes(t.status) &&
                        t.bed,
                      )
                      .map((t) => t.bed),
                  );
                  return (
                    <select
                      className={selectClass()}
                      value={addForm.bed}
                      onChange={(e) => setAddForm({ ...addForm, bed: e.target.value })}
                    >
                      <option value="">Select a bed</option>
                      {availableBeds.map((b) => {
                        const taken = occupiedBedCodes.has(b);
                        return (
                          <option key={b} value={b} disabled={taken}>
                            Bed {b}{taken ? ' (occupied)' : ' (available)'}
                          </option>
                        );
                      })}
                    </select>
                  );
                })() : (
                  <Input
                    className={fieldClass()}
                    placeholder="e.g., A or 1"
                    value={addForm.bed}
                    onChange={(e) => setAddForm({ ...addForm, bed: e.target.value })}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Monthly Rent (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  className={fieldClass(addErrors.monthlyRent)}
                  placeholder="8000"
                  value={addForm.monthlyRent || ''}
                  onChange={(e) => { setAddForm({ ...addForm, monthlyRent: parseInt(e.target.value) || 0 }); setAddErrors((prev) => ({ ...prev, monthlyRent: undefined })); }}
                />
                <FieldError msg={addErrors.monthlyRent} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Security Deposit (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  className={fieldClass(addErrors.securityDeposit)}
                  placeholder="16000"
                  value={addForm.securityDeposit || ''}
                  onChange={(e) => { setAddForm({ ...addForm, securityDeposit: parseInt(e.target.value) || 0 }); setAddErrors((prev) => ({ ...prev, securityDeposit: undefined })); }}
                />
                <FieldError msg={addErrors.securityDeposit} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Rent Due Day (1–28)</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  className={fieldClass(addErrors.rentDueDate)}
                  placeholder="1"
                  value={addForm.rentDueDate || ''}
                  onChange={(e) => setAddForm({ ...addForm, rentDueDate: parseInt(e.target.value) || 1 })}
                />
                <FieldError msg={addErrors.rentDueDate} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Billing Cycle</Label>
                <select
                  className={selectClass()}
                  value={addForm.billingCycle ?? 'monthly'}
                  onChange={(e) => setAddForm({ ...addForm, billingCycle: e.target.value })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half-Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">Join Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  className={fieldClass(addErrors.joinDate)}
                  value={addForm.joinDate}
                  onChange={(e) => setAddForm({ ...addForm, joinDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
      }

      case 4:
        return (
          <div className="flex flex-col gap-3.5">
            <WizardStepIndicator />
            <p className="text-sm font-semibold text-gray-900">ID &amp; Documents</p>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {([
                ['Name', addForm.name || '—'],
                ['Phone', addForm.phone || '—'],
                ['Email', addForm.email || '—'],
                ['DOB', addForm.dob || '—'],
                ['Guardian', addForm.parentName || '—'],
                ['Guardian Phone', addForm.parentPhone || '—'],
                ['Property', getPropertyName(addForm.propertyId) || '—'],
                ['Room', addForm.room
                  ? `${addForm.room}${addForm.bed && occupancyMode === 'BED_BASED' ? ` · Bed ${addForm.bed}` : ''}`
                  : '—'],
                ['Monthly Rent', addForm.monthlyRent ? fmt(addForm.monthlyRent) : '—'],
                ['Security Deposit', addForm.securityDeposit ? fmt(addForm.securityDeposit) : '₹0'],
                ['Join Date', addForm.joinDate || '—'],
                ['Billing', addForm.billingCycle ?? 'monthly'],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-xs font-medium text-gray-900 truncate">{val}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">ID Type <span className="text-red-500">*</span></Label>
                <select
                  className={selectClass(addErrors.idType)}
                  value={addForm.idType}
                  onChange={(e) => { setAddForm({ ...addForm, idType: e.target.value }); setAddErrors((prev) => ({ ...prev, idType: undefined })); }}
                >
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN">PAN</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
                <FieldError msg={addErrors.idType} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-semibold">ID Number <span className="text-red-500">*</span></Label>
                <Input
                  className={fieldClass(addErrors.idNumber)}
                  placeholder="e.g., 1234 5678 9012"
                  value={addForm.idNumber}
                  onChange={(e) => { setAddForm({ ...addForm, idNumber: e.target.value }); setAddErrors((prev) => ({ ...prev, idNumber: undefined })); }}
                />
                <FieldError msg={addErrors.idNumber} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">ID Document Upload (optional)</Label>
              <input
                ref={idDocInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setIdDocFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => idDocInputRef.current?.click()}
                  className="ds-btn ds-btn-secondary"
                  style={{ fontSize: 12, padding: '5px 10px', gap: 5 }}
                >
                  <Upload style={{ width: 12, height: 12 }} />
                  {idDocFile ? idDocFile.name : 'Choose File'}
                </button>
                {idDocFile && (
                  <button
                    type="button"
                    onClick={() => { setIdDocFile(null); if (idDocInputRef.current) idDocInputRef.current.value = ''; }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">Aadhaar, PAN, Passport, or Driving License. Accepted: JPG, PNG, PDF.</p>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">Status</Label>
              <select
                className={selectClass()}
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value as TenantStatus })}
              >
                <option value="active">Active</option>
                <option value="pending_onboarding">Pending Onboarding</option>
              </select>
            </div>

            <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">Rent invoice will be auto-generated. Agreement and documents can be attached from Tenant Detail.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNextStep = () => {
    const stepFields: Record<number, (keyof typeof addForm)[]> = {
      1: ['name', 'phone', 'email'],
      2: ['parentName', 'parentPhone'],
      3: ['propertyId', 'room', 'monthlyRent', 'securityDeposit'],
      4: ['idType', 'idNumber'],
    };
    const fields = stepFields[addStep] ?? [];
    const subset = Object.fromEntries(fields.map((f) => [f, addForm[f]]));
    const errs = validateTenantForm(subset as Parameters<typeof validateTenantForm>[0]);
    if (Object.keys(errs).length > 0) {
      setAddErrors(errs);
      return;
    }
    setAddErrors({});
    setAddStep((s) => s + 1);
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
          <p style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>{filterCounts.active}</span> active
            {overdueTenants.length > 0 && <>{' · '}<span style={{ color: '#DC2626', fontWeight: 600 }}>{overdueTenants.length}</span> overdue</>}
            {vacatingTenants.length > 0 && <>{' · '}<span style={{ color: '#D97706', fontWeight: 600 }}>{vacatingTenants.length}</span> vacating</>}
            {' · '}{tenants.length} total{' · '}
            <span style={{ fontWeight: 600, color: '#0A0A0B' }}>{fmt(activeInRoom.reduce((s, t) => s + t.rent, 0))}/mo</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FAF5FF] rounded-2xl border border-[#F3E8FF] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Tenants</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{filterCounts.all}</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#ECFDF5] rounded-2xl border border-[#A7F3D0] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-gray-500 font-medium">Active</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{activeInRoom.length}</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FEF2F2] rounded-2xl border border-[#FECACA] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-gray-500 font-medium">Inactive</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{filterCounts.inactive + filterCounts.archived}</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#EFF6FF] rounded-2xl border border-[#BFDBFE] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-gray-500 font-medium">Monthly Revenue</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{fmt(activeInRoom.reduce((s, t) => s + t.rent, 0))}</p>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Operational alerts (compact single-line) ───── */}
      {(overdueTenants.length > 0 || vacatingTenants.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {overdueTenants.length > 0 && (
            <div className="flex items-center justify-between rounded-lg"
              style={{ padding: '7px 12px', background: '#FEF2F2', border: '1px solid #FECACA', gap: 10 }}>
              <div className="flex items-center gap-2">
                <AlertCircle style={{ width: 13, height: 13, color: '#DC2626', flexShrink: 0 }} />
                <p style={{ fontSize: 12, fontWeight: 500, color: '#991B1B' }}>
                  <strong>{overdueTenants.length}</strong> overdue —{' '}
                  {overdueTenants.slice(0, 3).map((t) => t.name).join(', ')}{overdueTenants.length > 3 ? ` +${overdueTenants.length - 3}` : ''}
                </p>
              </div>
              <button onClick={() => setFilterStatus('payment_overdue')} className="ds-btn ds-btn-secondary flex-shrink-0"
                style={{ fontSize: 11, padding: '3px 8px', borderColor: '#FECACA', color: '#991B1B' }}>
                Filter
              </button>
            </div>
          )}
          {vacatingTenants.length > 0 && (
            <div className="flex items-center justify-between rounded-lg"
              style={{ padding: '7px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', gap: 10 }}>
              <div className="flex items-center gap-2">
                <Clock style={{ width: 13, height: 13, color: '#D97706', flexShrink: 0 }} />
                <p style={{ fontSize: 12, fontWeight: 500, color: '#92400E' }}>
                  <strong>{vacatingTenants.length}</strong> vacating —{' '}
                  {vacatingTenants.slice(0, 3).map((t) => `${t.name}${t.vacateDate ? ` (${new Date(t.vacateDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : ''}`).join(', ')}
                </p>
              </div>
              <button onClick={() => setFilterStatus('notice_submitted')} className="ds-btn ds-btn-secondary flex-shrink-0"
                style={{ fontSize: 11, padding: '3px 8px', borderColor: '#FDE68A', color: '#92400E' }}>
                Filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Filters + search (single row) ────── */}
      <div className="ds-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Filter + search merged */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="flex items-center gap-1.5" style={{ flexShrink: 0, overflowX: 'auto' }}>
            {(['all', 'active', 'payment_overdue', 'notice_submitted', 'vacating', 'inactive', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  border: `1px solid ${filterStatus === s ? '#6366F1' : '#E4E4E7'}`,
                  background: filterStatus === s ? '#6366F1' : '#fff',
                  color: filterStatus === s ? '#fff' : '#52525B',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'all' ? 'All' : TENANT_STATUS_LABELS[s as TenantStatus]}
                <span style={{ marginLeft: 4, opacity: 0.75, fontSize: 10 }}>
                  {filterCounts[s as keyof typeof filterCounts] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1, position: 'relative', minWidth: 140 }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#A1A1AA' }} />
            <Input
              type="text"
              placeholder="Search name, room, phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
            />
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedTenantIds.size > 0 && (
          <div style={{ padding: '7px 12px', background: '#EEF2FF', borderBottom: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#4338CA' }}>{selectedTenantIds.size} selected</span>
            <button onClick={() => void handleBulkMarkOverdue()} className="ds-btn ds-btn-secondary"
              style={{ fontSize: 11, padding: '3px 9px', color: '#DC2626', borderColor: '#FECACA' }}>
              Mark Overdue
            </button>
            <button onClick={() => setSelectedTenantIds(new Set())} className="ds-btn ds-btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}>
              Clear
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F1F1F3' }}>
                <th style={{ width: 36, padding: '8px 6px 8px 12px' }}>
                  <input
                    type="checkbox"
                    checked={selectedTenantIds.size === filteredTenants.length && filteredTenants.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTenantIds(new Set(filteredTenants.map((t) => t.id)));
                      else setSelectedTenantIds(new Set());
                    }}
                    style={{ cursor: 'pointer', accentColor: '#6366F1' }}
                  />
                </th>
                {['Tenant', 'Property', 'Room', 'Rent / Deposit', 'Since', 'Status', 'Docs', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px 14px', textAlign: 'center', fontSize: 13, color: '#A1A1AA' }}>
                    No tenants found
                  </td>
                </tr>
              ) : filteredTenants.map((tenant, i) => (
                <tr
                  key={tenant.id}
                  onClick={() => onViewTenant(tenant.id)}
                  style={{
                    borderBottom: i < filteredTenants.length - 1 ? '1px solid #F4F4F6' : 'none',
                    background: selectedTenantIds.has(tenant.id) ? '#F5F3FF' : tenant.status === 'payment_overdue' ? '#FFFAFA' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '7px 6px 7px 12px' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedTenantIds.has(tenant.id)}
                      onChange={(e) => {
                        const next = new Set(selectedTenantIds);
                        if (e.target.checked) next.add(tenant.id);
                        else next.delete(tenant.id);
                        setSelectedTenantIds(next);
                      }}
                      style={{ cursor: 'pointer', accentColor: '#6366F1' }}
                    />
                  </td>
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
                    <StatusChip status={tenant.status} rentDueDate={tenant.rentDueDate} vacateDate={tenant.vacateDate} />
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                    {!tenant.idDocumentUrl || !tenant.idNumber ? (
                      <span title="ID document missing" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#D97706' }}>
                        <ShieldAlert style={{ width: 13, height: 13 }} />
                      </span>
                    ) : (
                      <CheckCircle style={{ width: 13, height: 13, color: '#059669' }} />
                    )}
                  </td>
                  <td style={{ padding: '7px 12px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        title="View profile"
                        onClick={() => onViewTenant(tenant.id)}
                        className="ds-btn ds-btn-primary"
                        style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
                      >
                        <Eye style={{ width: 12, height: 12 }} /> View
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
        <div className="md:hidden flex flex-col gap-2" style={{ padding: 12 }}>
          {filteredTenants.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#A1A1AA', padding: '32px 0' }}>No tenants found</p>
          ) : filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              onClick={() => onViewTenant(tenant.id)}
              style={{
                border: `1px solid ${tenant.status === 'payment_overdue' ? '#FECACA' : '#E4E4E7'}`,
                borderRadius: 10, padding: '12px 14px',
                background: tenant.status === 'payment_overdue' ? '#FFFAFA' : '#fff',
                cursor: 'pointer',
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
                <StatusChip status={tenant.status} rentDueDate={tenant.rentDueDate} vacateDate={tenant.vacateDate} />
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

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) { setAddErrors({}); setAddStep(1); setIdDocFile(null); } }}>
        <DialogContent style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
          </DialogHeader>

          <div className="pt-1 pb-1">{renderAddStep()}</div>

          <DialogFooter style={{ gap: 8 }}>
            {addStep > 1 && (
              <Button variant="outline" onClick={() => { setAddStep(addStep - 1); setAddErrors({}); }}>Back</Button>
            )}
            {addStep < 4 ? (
              <Button onClick={handleNextStep} className="ds-btn ds-btn-primary">
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => void handleAdd()} loading={addLoading} className="ds-btn ds-btn-primary">
                {!addLoading && <Save className="w-3.5 h-3.5 mr-1.5" />}
                Add Tenant
              </Button>
            )}
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
            <Button onClick={() => void handleEdit()} loading={editLoading} className="ds-btn ds-btn-primary">
              {!editLoading && <Save style={{ width: 14, height: 14, marginRight: 6 }} />}
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
              <Button onClick={() => void handleImportCSV()} loading={importLoading} disabled={!importFile} className="ds-btn ds-btn-primary">
                {!importLoading && <Upload style={{ width: 14, height: 14, marginRight: 6 }} />}
                {importLoading ? 'Importing…' : 'Import Tenants'}
              </Button>
            )}
            {importResult && importResult.failed > 0 && (
              <button onClick={resetImport} className="ds-btn ds-btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>Try Again</button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tenant Invite Dialog ─────────────── */}
      <Dialog open={!!inviteDialogTenant} onOpenChange={(v) => { if (!v) { setInviteDialogTenant(null); setLinkCopied(false); } }}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>
              Tenant Added — Share Portal Access
            </DialogTitle>
            <DialogDescription>
              {inviteDialogTenant?.name} has been added. Share the portal link so they can set up their account.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4, paddingBottom: 4 }}>
            {/* Tenant summary */}
            <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E4E4E7', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Name', inviteDialogTenant?.name ?? '—'],
                ['Phone', inviteDialogTenant?.phone ?? '—'],
                ['Email', inviteDialogTenant?.email || '—'],
                ['Room', inviteDialogTenant?.room ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0B' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Portal link */}
            <div style={{ padding: '10px 14px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#4338CA', marginBottom: 6 }}>Portal Setup Link</p>
              <div className="flex items-center gap-2">
                <code style={{ flex: 1, fontSize: 12, color: '#3730A3', background: '#fff', border: '1px solid #C7D2FE', borderRadius: 6, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}
                </code>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.origin);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  }}
                  className="ds-btn ds-btn-secondary"
                  style={{ fontSize: 11, padding: '5px 10px', gap: 4, flexShrink: 0, borderColor: '#C7D2FE', color: linkCopied ? '#059669' : '#4338CA' }}
                >
                  {linkCopied ? <CheckCircle style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Instructions for {inviteDialogTenant?.name}</p>
              <ol style={{ fontSize: 11, color: '#B45309', lineHeight: 1.7, paddingLeft: 16, margin: 0 }}>
                <li>Open the link above on your phone or computer</li>
                <li>Select <strong>"Tenant Portal"</strong></li>
                <li>Sign in using your registered phone number: <strong>{inviteDialogTenant?.phone}</strong></li>
                <li>Enter the OTP and access your dashboard</li>
              </ol>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle style={{ width: 13, height: 13, color: '#059669', flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: '#52525B' }}>First rent invoice and security deposit record have been created automatically.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteDialogTenant(null); setLinkCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
