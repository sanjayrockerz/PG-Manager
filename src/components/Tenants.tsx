import { useEffect, useRef, useState } from 'react';
import {
  Plus, Search, Eye, Edit, Trash, User, Phone, MapPin,
  IndianRupee, CheckCircle, XCircle, Save, AlertTriangle,
  Bed, FileText, Loader2, Calendar, Upload, Download,
  Clock, Archive, AlertCircle,
} from 'lucide-react';
import { Card } from './ui/card';
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
  importTenantsFromCSV,
} from '../services/dataService';
import type { TenantRecord, TenantCreateInput, TenantStatus } from '../services/supabaseData';
import { TENANT_STATUS_LABELS, TENANT_STATUS_COLORS } from '../services/supabaseData';
import { downloadCSVTemplate } from '../services/csvImport';
import type { CSVImportResult } from '../services/supabaseData';

interface TenantsProps {
  onViewTenant: (tenantId: string) => void;
}

const makeEmptyForm = (defaultPropertyId = ''): TenantCreateInput => ({
  name: '',
  phone: '',
  email: '',
  propertyId: defaultPropertyId,
  floor: 1,
  room: '',
  bed: '',
  monthlyRent: 0,
  securityDeposit: 0,
  rentDueDate: 1,
  parentName: '',
  parentPhone: '',
  idType: 'Aadhaar',
  idNumber: '',
  joinDate: new Date().toISOString().split('T')[0],
  status: 'active',
});

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

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addSection, setAddSection] = useState(1);
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

  const filteredTenants = tenants.filter((t) => {
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
  });

  const activeInRoom = tenants.filter((t) =>
    ['active', 'payment_overdue', 'notice_submitted', 'vacating'].includes(t.status),
  );

  const stats = [
    { label: 'Total Tenants', value: tenants.length, icon: User, color: 'from-purple-500 to-pink-500' },
    { label: 'Active', value: activeInRoom.length, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { label: 'Pending Action', value: tenants.filter((t) => t.status === 'payment_overdue' || t.status === 'notice_submitted').length, icon: AlertCircle, color: 'from-amber-500 to-orange-500' },
    {
      label: 'Monthly Revenue',
      value: `₹${activeInRoom.reduce((s, t) => s + t.rent, 0).toLocaleString()}`,
      icon: IndianRupee,
      color: 'from-blue-500 to-cyan-500',
    },
  ];

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
      setAddSection(1);
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
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      propertyId: tenant.propertyId,
      floor: tenant.floor,
      room: tenant.room,
      bed: tenant.bed,
      monthlyRent: tenant.rent,
      securityDeposit: tenant.securityDeposit,
      rentDueDate: tenant.rentDueDate,
      parentName: tenant.parentName,
      parentPhone: tenant.parentPhone,
      idType: tenant.idType,
      idNumber: tenant.idNumber,
      joinDate: tenant.joinDate,
      status: tenant.status,
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

  const renderAddSection = () => {
    switch (addSection) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g., Amit Kumar"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email *</Label>
              <Input
                type="email"
                placeholder="amit@example.com"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Phone *</Label>
              <InternationalPhoneField
                value={addForm.phone}
                onChange={(v) => setAddForm({ ...addForm, phone: v })}
                required
                placeholder="9876543210"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Property & Room</h3>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Property *</Label>
              <select
                value={addForm.propertyId}
                onChange={(e) => setAddForm({ ...addForm, propertyId: e.target.value })}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Floor</Label>
                <Input
                  type="number"
                  min="0"
                  value={addForm.floor}
                  onChange={(e) => setAddForm({ ...addForm, floor: parseInt(e.target.value) || 0 })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Room Number *</Label>
                <Input
                  placeholder="e.g., 301"
                  value={addForm.room}
                  onChange={(e) => setAddForm({ ...addForm, room: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Bed</Label>
                <Input
                  placeholder="e.g., A"
                  value={addForm.bed}
                  onChange={(e) => setAddForm({ ...addForm, bed: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Monthly Rent (₹) *</Label>
                <Input
                  type="number"
                  placeholder="8000"
                  value={addForm.monthlyRent || ''}
                  onChange={(e) => setAddForm({ ...addForm, monthlyRent: parseInt(e.target.value) || 0 })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Security Deposit (₹)</Label>
                <Input
                  type="number"
                  placeholder="16000"
                  value={addForm.securityDeposit || ''}
                  onChange={(e) => setAddForm({ ...addForm, securityDeposit: parseInt(e.target.value) || 0 })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Rent Due Date (day of month)</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  placeholder="1"
                  value={addForm.rentDueDate || ''}
                  onChange={(e) => setAddForm({ ...addForm, rentDueDate: parseInt(e.target.value) || 1 })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Join Date</Label>
                <Input
                  type="date"
                  value={addForm.joinDate}
                  onChange={(e) => setAddForm({ ...addForm, joinDate: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value as TenantStatus })}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active</option>
                <option value="pending_onboarding">Pending Onboarding</option>
              </select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Guardian / Emergency Contact</h3>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Guardian Name</Label>
              <Input
                placeholder="e.g., Rajesh Kumar"
                value={addForm.parentName}
                onChange={(e) => setAddForm({ ...addForm, parentName: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Guardian Phone</Label>
              <InternationalPhoneField
                value={addForm.parentPhone}
                onChange={(v) => setAddForm({ ...addForm, parentPhone: v })}
                placeholder="9876543210"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">ID Proof</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">ID Type</Label>
                <select
                  value={addForm.idType}
                  onChange={(e) => setAddForm({ ...addForm, idType: e.target.value })}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="DrivingLicense">Driving License</option>
                  <option value="VoterID">Voter ID</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">ID Number</Label>
                <Input
                  placeholder="1234 5678 9012"
                  value={addForm.idNumber}
                  onChange={(e) => setAddForm({ ...addForm, idNumber: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Review & Submit</h3>
            <div className="space-y-3 text-sm">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                <p className="font-semibold text-gray-800 mb-2">Personal</p>
                <p className="text-gray-700"><span className="font-medium">Name:</span> {addForm.name || '—'}</p>
                <p className="text-gray-700"><span className="font-medium">Email:</span> {addForm.email || '—'}</p>
                <p className="text-gray-700"><span className="font-medium">Phone:</span> {addForm.phone || '—'}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <p className="font-semibold text-gray-800 mb-2">Property</p>
                <p className="text-gray-700"><span className="font-medium">Property:</span> {getPropertyName(addForm.propertyId) || '—'}</p>
                <p className="text-gray-700"><span className="font-medium">Room:</span> {addForm.room || '—'}{addForm.bed ? ` / Bed ${addForm.bed}` : ''}</p>
                <p className="text-gray-700"><span className="font-medium">Monthly Rent:</span> ₹{addForm.monthlyRent.toLocaleString()}</p>
              </div>
              {(addForm.parentName || addForm.idNumber) && (
                <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                  <p className="font-semibold text-gray-800 mb-2">Other</p>
                  {addForm.parentName && <p className="text-gray-700"><span className="font-medium">Guardian:</span> {addForm.parentName}</p>}
                  {addForm.idNumber && <p className="text-gray-700"><span className="font-medium">ID:</span> {addForm.idType} — {addForm.idNumber}</p>}
                </div>
              )}
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">Review the details above and click "Add Tenant" to save.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-blue-50 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Tenants
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage all your tenants and their information</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => { resetImport(); setImportOpen(true); }}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 h-12 md:h-10 flex-1 md:flex-none"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="font-semibold">Import CSV</span>
            </Button>
            <Button
              onClick={() => {
                setAddForm(makeEmptyForm(properties[0]?.id));
                setAddSection(1);
                setAddOpen(true);
              }}
              className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 h-12 md:h-10 flex-1 md:flex-none"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="font-semibold">Add Tenant</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
              <div className="relative p-4 md:p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {stat.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'active', 'payment_overdue', 'notice_submitted', 'vacating', 'inactive', 'archived'] as const).map((s) => {
          const count = s === 'all' ? tenants.length : tenants.filter((t) => t.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                filterStatus === s
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {s === 'all' ? 'All' : TENANT_STATUS_LABELS[s as TenantStatus]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filterStatus === s ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
        <Input
          type="text"
          placeholder="Search by name, room, phone, email, or property..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 md:h-11 border-2 border-purple-100 focus:border-purple-400 shadow-md rounded-xl"
        />
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden border-0 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Property</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Room</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Rent</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-purple-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm">
                            {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{getPropertyName(tenant.propertyId)}</td>
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-bold">{tenant.room}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tenant.phone}</div>
                      <div className="text-xs text-gray-500">{tenant.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-700">₹{tenant.rent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{tenant.joinDate}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${TENANT_STATUS_COLORS[tenant.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TENANT_STATUS_LABELS[tenant.status] ?? tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setViewingTenant(tenant); setViewOpen(true); }} className="h-9 w-9 p-0 rounded-full hover:bg-purple-100">
                          <Eye className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(tenant)} className="h-9 w-9 p-0 rounded-full hover:bg-blue-100">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeletingTenant(tenant); setDeleteOpen(true); }} className="h-9 w-9 p-0 rounded-full hover:bg-red-100">
                          <Trash className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredTenants.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No tenants found</div>
        ) : filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {tenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{tenant.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{tenant.email}</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${TENANT_STATUS_COLORS[tenant.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TENANT_STATUS_LABELS[tenant.status] ?? tenant.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600">Property</p>
                    <p className="font-semibold text-gray-900 truncate">{getPropertyName(tenant.propertyId)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                    <Bed className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600">Room</p>
                      <p className="font-bold text-gray-900">{tenant.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <IndianRupee className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600">Rent</p>
                      <p className="font-bold text-green-700">₹{tenant.rent.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{tenant.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Joined</p>
                    <p className="font-semibold text-gray-900">{tenant.joinDate}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => { setViewingTenant(tenant); setViewOpen(true); }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md h-11"
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                <Button
                  onClick={() => openEdit(tenant)}
                  variant="outline"
                  className="border-2 border-blue-300 hover:bg-blue-50 h-11"
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  onClick={() => { setDeletingTenant(tenant); setDeleteOpen(true); }}
                  variant="outline"
                  className="border-2 border-red-300 hover:bg-red-50 text-red-600 h-11"
                >
                  <Trash className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Tenant Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Add New Tenant
            </DialogTitle>
            <DialogDescription>Section {addSection} of 6</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  s <= addSection ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="py-4">{renderAddSection()}</div>

          <DialogFooter className="gap-2">
            {addSection > 1 && (
              <Button variant="outline" onClick={() => setAddSection(addSection - 1)}>
                Previous
              </Button>
            )}
            {addSection < 6 ? (
              <Button
                onClick={() => setAddSection(addSection + 1)}
                className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9]"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={() => void handleAdd()}
                disabled={addLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {addLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Add Tenant
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tenant Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Tenant Details
            </DialogTitle>
          </DialogHeader>
          {viewingTenant && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-purple-100 via-blue-50 to-purple-50 rounded-2xl border-2 border-purple-200">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-2xl">
                    {viewingTenant.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{viewingTenant.name}</h3>
                  <p className="text-gray-700 mt-1">{viewingTenant.email}</p>
                  <span className={`inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-bold ${TENANT_STATUS_COLORS[viewingTenant.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TENANT_STATUS_LABELS[viewingTenant.status] ?? viewingTenant.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5" /> Contact
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Phone:</span><p className="font-semibold text-gray-900">{viewingTenant.phone}</p></div>
                    <div><span className="text-gray-600">Email:</span><p className="font-semibold text-gray-900">{viewingTenant.email}</p></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Property
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Property:</span><p className="font-semibold text-gray-900">{getPropertyName(viewingTenant.propertyId)}</p></div>
                    <div><span className="text-gray-600">Floor / Room / Bed:</span><p className="font-semibold text-gray-900">Floor {viewingTenant.floor} · Room {viewingTenant.room}{viewingTenant.bed ? ` · Bed ${viewingTenant.bed}` : ''}</p></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5" /> Financial
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Monthly Rent:</span><p className="font-bold text-green-700 text-lg">₹{viewingTenant.rent.toLocaleString()}</p></div>
                    <div><span className="text-gray-600">Security Deposit:</span><p className="font-semibold text-gray-900">₹{viewingTenant.securityDeposit.toLocaleString()}</p></div>
                    <div><span className="text-gray-600">Due Day:</span><p className="font-semibold text-gray-900">{viewingTenant.rentDueDate}th of month</p></div>
                  </div>
                </div>

                {(viewingTenant.parentName || viewingTenant.parentPhone) && (
                  <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200">
                    <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Guardian
                    </h4>
                    <div className="space-y-2 text-sm">
                      {viewingTenant.parentName && <div><span className="text-gray-600">Name:</span><p className="font-semibold text-gray-900">{viewingTenant.parentName}</p></div>}
                      {viewingTenant.parentPhone && <div><span className="text-gray-600">Phone:</span><p className="font-semibold text-gray-900">{viewingTenant.parentPhone}</p></div>}
                    </div>
                  </div>
                )}

                {(viewingTenant.idType || viewingTenant.idNumber) && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" /> ID Proof
                    </h4>
                    <div className="space-y-2 text-sm">
                      {viewingTenant.idType && <div><span className="text-gray-600">Type:</span><p className="font-semibold text-gray-900">{viewingTenant.idType}</p></div>}
                      {viewingTenant.idNumber && <div><span className="text-gray-600">Number:</span><p className="font-semibold text-gray-900">{viewingTenant.idNumber}</p></div>}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" /> More
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-600">Joined:</span><p className="font-semibold text-gray-900">{viewingTenant.joinDate}</p></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (viewingTenant) { openEdit(viewingTenant); setViewOpen(false); }
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Edit className="w-4 h-4 mr-2" /> Edit Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit Tenant
            </DialogTitle>
            <DialogDescription>Update tenant information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Full Name *</Label>
              <Input value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-11" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Email *</Label>
                <Input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Phone *</Label>
                <InternationalPhoneField
                  value={editForm.phone ?? ''}
                  onChange={(v) => setEditForm({ ...editForm, phone: v })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Property *</Label>
                <select
                  value={editForm.propertyId ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, propertyId: e.target.value })}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Room *</Label>
                <Input value={editForm.room ?? ''} onChange={(e) => setEditForm({ ...editForm, room: e.target.value })} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Monthly Rent (₹)</Label>
                <Input type="number" value={editForm.monthlyRent ?? ''} onChange={(e) => setEditForm({ ...editForm, monthlyRent: parseInt(e.target.value) || 0 })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <select
                  value={editForm.status ?? 'active'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TenantStatus })}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {(['active', 'payment_overdue', 'notice_submitted', 'vacating', 'inactive', 'archived'] as const).map((s) => (
                    <option key={s} value={s}>{TENANT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Guardian Phone</Label>
              <InternationalPhoneField
                value={editForm.parentPhone ?? ''}
                onChange={(v) => setEditForm({ ...editForm, parentPhone: v })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void handleEdit()}
              disabled={editLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {editLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Delete Tenant?
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Modal */}
      <Dialog open={importOpen} onOpenChange={(v) => { if (!v) { resetImport(); } setImportOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <Upload className="w-6 h-6 text-purple-600" /> Bulk Import Tenants
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple tenants at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Download template */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Step 1: Download Template
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Download the CSV template with required columns and fill in your tenant data.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSVTemplate()}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" /> Download CSV Template
              </Button>
            </div>

            {/* Step 2: Upload file */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Step 2: Upload CSV File
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] ?? null);
                  setImportResult(null);
                }}
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {importFile ? importFile.name : 'Choose File'}
                </Button>
                {importFile && (
                  <span className="text-sm text-gray-600">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            </div>

            {/* Import result */}
            {importResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-green-600">Imported</p>
                    <p className="text-2xl font-bold text-green-700">{importResult.succeeded}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-xs text-red-600">Failed</p>
                    <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm font-semibold text-red-800 mb-2">Validation Errors</p>
                    <div className="space-y-1">
                      {importResult.errors.slice(0, 20).map((err, i) => (
                        <p key={i} className="text-xs text-red-700">
                          Row {err.row} · <span className="font-medium">{err.field}</span>: {err.message}
                        </p>
                      ))}
                      {importResult.errors.length > 20 && (
                        <p className="text-xs text-red-600 font-medium">+{importResult.errors.length - 20} more errors…</p>
                      )}
                    </div>
                  </div>
                )}

                {importResult.succeeded > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-semibold">
                      ✓ {importResult.succeeded} tenant{importResult.succeeded > 1 ? 's' : ''} added successfully!
                    </p>
                    <p className="text-xs text-green-600 mt-1">Pending payments have been auto-generated for each imported tenant.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { resetImport(); setImportOpen(false); }}>
              Close
            </Button>
            {!importResult && (
              <Button
                onClick={() => void handleImportCSV()}
                disabled={!importFile || importLoading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {importLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {importLoading ? 'Importing…' : 'Import Tenants'}
              </Button>
            )}
            {importResult && importResult.failed > 0 && (
              <Button
                onClick={resetImport}
                variant="outline"
                className="border-purple-300 text-purple-700"
              >
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
