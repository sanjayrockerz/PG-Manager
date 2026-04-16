import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Phone, Mail, Edit, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import { supabaseOwnerDataApi, supabasePropertyApi, TenantCreateInput, TenantRecord } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

interface TenantsProps {
  onViewTenant?: (tenantId: string) => void;
}

interface TenantFormState {
  name: string;
  phone: string;
  email: string;
  photo: File | null;
  propertyId: string;
  floor: number;
  room: string;
  bed: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDate: number;
  parentName: string;
  parentPhone: string;
  idType: string;
  idNumber: string;
  idDocument: File | null;
  customRoomNumber: string;
  customRoomBeds: number;
  customRoomType: 'single' | 'double' | 'triple';
  customBedLabel: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

const CUSTOM_ROOM_OPTION = '__custom_room__';
const CUSTOM_BED_OPTION = '__custom_bed__';
const PHONE_LENGTH = 10;
const NAME_MAX_LENGTH = 80;
const ID_NUMBER_MAX_LENGTH = 64;

const emptyForm = (): TenantFormState => ({
  name: '',
  phone: '',
  email: '',
  photo: null,
  propertyId: '',
  floor: 1,
  room: '',
  bed: '',
  monthlyRent: 0,
  securityDeposit: 0,
  rentDueDate: 5,
  parentName: '',
  parentPhone: '',
  idType: 'Aadhaar Card',
  idNumber: '',
  idDocument: null,
  customRoomNumber: '',
  customRoomBeds: 1,
  customRoomType: 'single',
  customBedLabel: '',
  joinDate: new Date().toISOString().split('T')[0],
  status: 'active',
});

export function Tenants({ onViewTenant }: TenantsProps) {
  const { selectedProperty, properties } = useProperty();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<TenantFormState>(emptyForm());

  const toDigits = (value: string, maxLength = PHONE_LENGTH): string => value.replace(/\D/g, '').slice(0, maxLength);
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const selectedPropertyRooms = useMemo(() => {
    const property = properties.find((entry) => entry.id === formData.propertyId);
    return property?.rooms ?? [];
  }, [formData.propertyId, properties]);

  const selectableRooms = useMemo(
    () => selectedPropertyRooms.filter((room) => room.floor === formData.floor),
    [selectedPropertyRooms, formData.floor],
  );

  const selectedRoom = useMemo(
    () => selectedPropertyRooms.find((room) => room.number === formData.room && room.floor === formData.floor),
    [selectedPropertyRooms, formData.room, formData.floor],
  );

  const isCustomRoomSelected = formData.room === CUSTOM_ROOM_OPTION;
  const isCustomBedSelected = formData.bed === CUSTOM_BED_OPTION;

  const resolvedRoomCapacity = useMemo(() => {
    if (isCustomRoomSelected) {
      return Math.max(1, Number(formData.customRoomBeds) || 1);
    }
    if (!selectedRoom) {
      return 0;
    }
    return selectedRoom.beds;
  }, [formData.customRoomBeds, isCustomRoomSelected, selectedRoom]);

  const availableBeds = useMemo(() => {
    if (resolvedRoomCapacity <= 0) {
      return [] as string[];
    }
    return Array.from({ length: resolvedRoomCapacity }, (_, index) => String(index + 1));
  }, [resolvedRoomCapacity]);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await supabaseOwnerDataApi.listTenants(selectedProperty);
      setTenants(list);
    } catch {
      setError('Unable to load tenants. Please check Supabase setup.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `tenants-${selectedProperty}`,
    tables: ['tenants', 'rooms', 'payments', 'notifications'],
    onChange: loadTenants,
  });

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return tenants;
    }
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(q)
      || tenant.room.toLowerCase().includes(q)
      || tenant.phone.includes(q)
      || tenant.email.toLowerCase().includes(q),
    );
  }, [searchQuery, tenants]);

  const availableFloors = useMemo(() => {
    if (!formData.propertyId) {
      return [1, 2, 3];
    }
    const property = properties.find((entry) => entry.id === formData.propertyId);
    if (!property) {
      return [1, 2, 3];
    }
    return Array.from({ length: property.floors }, (_, index) => index + 1);
  }, [formData.propertyId, properties]);

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((entry) => entry.id === propertyId);
    return property?.name ?? 'Unknown Property';
  };

  const openCreateModal = () => {
    const next = emptyForm();
    if (selectedProperty !== 'all') {
      next.propertyId = selectedProperty;
    }
    setFormData(next);
    setEditingTenant(null);
    setShowAddModal(true);
  };

  const openEditModal = (tenant: TenantRecord) => {
    const property = properties.find((entry) => entry.id === tenant.propertyId);
    const roomRecord = property?.rooms.find((room) => room.floor === tenant.floor && room.number === tenant.room);
    const inferredKnownBeds = roomRecord ? Array.from({ length: roomRecord.beds }, (_, index) => String(index + 1)) : [];
    const usesCustomBed = tenant.bed !== '' && !inferredKnownBeds.includes(tenant.bed);

    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      photo: null,
      propertyId: tenant.propertyId,
      floor: tenant.floor,
      room: roomRecord ? tenant.room : CUSTOM_ROOM_OPTION,
      bed: usesCustomBed ? CUSTOM_BED_OPTION : tenant.bed,
      monthlyRent: tenant.rent,
      securityDeposit: tenant.securityDeposit,
      rentDueDate: tenant.rentDueDate,
      parentName: tenant.parentName,
      parentPhone: tenant.parentPhone,
      idType: tenant.idType,
      idNumber: tenant.idNumber,
      idDocument: null,
      customRoomNumber: roomRecord ? '' : tenant.room,
      customRoomBeds: roomRecord?.beds ?? Math.max(1, Number(tenant.bed) || 1),
      customRoomType: roomRecord?.type ?? 'single',
      customBedLabel: usesCustomBed ? tenant.bed : '',
      joinDate: tenant.joinDate,
      status: tenant.status,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingTenant(null);
    setFormData(emptyForm());
  };

  const toTenantInput = (resolvedRoom: string, resolvedBed: string): TenantCreateInput => ({
    name: formData.name.trim(),
    phone: toDigits(formData.phone),
    email: formData.email.trim().toLowerCase(),
    propertyId: formData.propertyId,
    floor: formData.floor,
    room: resolvedRoom,
    bed: resolvedBed,
    monthlyRent: Number(formData.monthlyRent),
    securityDeposit: Number(formData.securityDeposit),
    rentDueDate: Number(formData.rentDueDate),
    parentName: formData.parentName.trim(),
    parentPhone: toDigits(formData.parentPhone),
    idType: formData.idType.trim(),
    idNumber: formData.idNumber.trim(),
    joinDate: formData.joinDate,
    status: formData.status,
    photo: formData.photo,
    idDocument: formData.idDocument,
  });

  const resolveRoomAndBed = (): {
    room: string;
    bed: string;
    roomBeds: number;
    shouldCreateCustomRoom: boolean;
    error?: string;
  } => {
    const isCustomRoom = formData.room === CUSTOM_ROOM_OPTION;
    const room = isCustomRoom ? formData.customRoomNumber.trim() : formData.room;

    if (!room) {
      return { room: '', bed: '', roomBeds: 0, shouldCreateCustomRoom: false, error: 'Room number is required.' };
    }

    const roomBeds = isCustomRoom
      ? Math.max(1, Number(formData.customRoomBeds) || 0)
      : (selectedRoom?.beds ?? 0);

    if (isCustomRoom && roomBeds <= 0) {
      return { room, bed: '', roomBeds: 0, shouldCreateCustomRoom: false, error: 'Custom room must have at least 1 bed.' };
    }

    const bed = formData.bed === CUSTOM_BED_OPTION ? formData.customBedLabel.trim() : formData.bed;
    if (!bed) {
      return { room, bed: '', roomBeds, shouldCreateCustomRoom: false, error: 'Bed value is required.' };
    }

    const bedAsNumber = Number(bed);
    if (Number.isFinite(bedAsNumber) && roomBeds > 0 && bedAsNumber > roomBeds) {
      return { room, bed, roomBeds, shouldCreateCustomRoom: false, error: 'Selected bed exceeds room bed capacity.' };
    }

    const matchingRoom = selectableRooms.find((entry) => entry.number.toLowerCase() === room.toLowerCase());
    return {
      room,
      bed,
      roomBeds,
      shouldCreateCustomRoom: isCustomRoom && !matchingRoom,
    };
  };

  const validateTenantForm = (): string => {
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = toDigits(formData.phone);
    const cleanParentPhone = toDigits(formData.parentPhone);

    if (!cleanName || cleanName.length < 2) return 'Enter a valid tenant name.';
    if (cleanName.length > NAME_MAX_LENGTH) return 'Tenant name is too long.';
    if (!cleanEmail || !isValidEmail(cleanEmail)) return 'Enter a valid tenant email address.';
    if (!cleanPhone || cleanPhone.length !== PHONE_LENGTH) return 'Enter a valid 10-digit tenant phone number.';
    if (!formData.propertyId) return 'Select a property before saving tenant.';
    if (formData.floor < 1) return 'Select a valid floor.';
    if (!formData.room) return 'Select room number.';
    if (!formData.bed) return 'Select bed.';
    if (!formData.monthlyRent || formData.monthlyRent <= 0) return 'Monthly rent must be greater than zero.';
    if (!formData.parentName.trim()) return 'Parent name is required.';
    if (!cleanParentPhone || cleanParentPhone.length !== PHONE_LENGTH) return 'Enter a valid 10-digit parent phone number.';
    if (!formData.idType.trim()) return 'ID type is required.';
    if (!formData.idNumber.trim()) return 'ID number is required.';
    if (formData.idNumber.trim().length > ID_NUMBER_MAX_LENGTH) return 'ID number is too long.';
    if (formData.rentDueDate < 1 || formData.rentDueDate > 31) return 'Rent due date must be between 1 and 31.';

    const allocation = resolveRoomAndBed();
    if (allocation.error) {
      return allocation.error;
    }

    const hasExistingIdDocument = Boolean(editingTenant?.idDocumentUrl);
    if (!formData.idDocument && !hasExistingIdDocument) {
      return 'ID document is compulsory. Upload an ID document before saving.';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateTenantForm();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const allocation = resolveRoomAndBed();
      if (allocation.error) {
        setError(allocation.error);
        toast.error(allocation.error);
        return;
      }

      if (allocation.shouldCreateCustomRoom) {
        await supabasePropertyApi.addRoom(formData.propertyId, {
          number: allocation.room,
          floor: formData.floor,
          type: formData.customRoomType,
          beds: allocation.roomBeds,
          rent: Number(formData.monthlyRent) || 0,
          status: 'vacant',
          occupiedBeds: 0,
        });
      }

      const payload = toTenantInput(allocation.room, allocation.bed);
      if (editingTenant) {
        await supabaseOwnerDataApi.updateTenant(editingTenant.id, payload);
        toast.success('Tenant updated');
      } else {
        await supabaseOwnerDataApi.createTenant(payload);
        toast.success('Tenant created');
      }
      closeModal();
      await loadTenants();
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Unable to save tenant. Please check required fields and try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) {
      return;
    }

    setError('');
    const previousTenants = tenants;
    setTenants((current) => current.filter((tenant) => tenant.id !== tenantId));
    try {
      await supabaseOwnerDataApi.deleteTenant(tenantId);
      toast.success('Tenant deleted');
    } catch {
      setError('Unable to delete tenant.');
      setTenants(previousTenants);
      toast.error('Failed to delete tenant');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Tenants</h1>
          <p className="text-gray-600 mt-1">Manage all your tenants</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Tenant stream" />
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Tenant</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, room, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                {selectedProperty === 'all' && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Room Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rent</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 8 : 7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Loading tenants...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 8 : 7} className="px-6 py-10 text-center text-sm text-gray-500">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        className="text-left"
                        onClick={() => onViewTenant && onViewTenant(tenant.id)}
                      >
                        <p className="text-sm font-semibold text-gray-900 hover:text-blue-600">{tenant.name}</p>
                        <p className="text-xs text-gray-500">{tenant.email}</p>
                      </button>
                    </td>
                    {selectedProperty === 'all' && (
                      <td className="px-6 py-4 text-sm text-gray-900">{getPropertyName(tenant.propertyId)}</td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-900">{tenant.room} / Bed {tenant.bed}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tenant.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Rs {tenant.rent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tenant.joinDate}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewTenant && onViewTenant(tenant.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(tenant)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit tenant"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => void handleDeleteTenant(tenant.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete tenant"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Name *</label>
                  <input required value={formData.name} maxLength={NAME_MAX_LENGTH} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Phone *</label>
                  <input required value={formData.phone} inputMode="numeric" maxLength={PHONE_LENGTH} onChange={(e) => setFormData({ ...formData, phone: toDigits(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-500">Email *</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-500">Property *</label>
                  <select
                    required
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, floor: 1, room: '', bed: '', customRoomNumber: '', customRoomBeds: 1, customRoomType: 'single', customBedLabel: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Floor *</label>
                  <select
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value), room: '', bed: '', customRoomNumber: '', customRoomBeds: 1, customRoomType: 'single', customBedLabel: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>Floor {floor}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Room Number *</label>
                  <select
                    required
                    value={formData.room}
                    onChange={(e) => {
                      const roomNumber = e.target.value;
                      if (roomNumber === CUSTOM_ROOM_OPTION) {
                        setFormData({
                          ...formData,
                          room: roomNumber,
                          bed: '',
                          customRoomNumber: '',
                          customRoomBeds: 1,
                          customRoomType: 'single',
                          customBedLabel: '',
                        });
                        return;
                      }

                      const room = selectableRooms.find((entry) => entry.number === roomNumber);
                      setFormData({
                        ...formData,
                        room: roomNumber,
                        bed: room ? '1' : '',
                        customRoomNumber: '',
                        customBedLabel: '',
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select room number</option>
                    {selectableRooms.map((room) => (
                      <option key={room.id} value={room.number}>
                        {room.number} ({room.type}, {room.beds} bed{room.beds > 1 ? 's' : ''})
                      </option>
                    ))}
                    <option value={CUSTOM_ROOM_OPTION}>Other (add new room)</option>
                  </select>
                  {formData.propertyId && selectableRooms.length === 0 && (
                    <p className="text-xs text-amber-600">No rooms available on this floor. Add rooms first from Properties.</p>
                  )}
                </div>

                {isCustomRoomSelected && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Custom Room Number *</label>
                      <input
                        required
                        value={formData.customRoomNumber}
                        onChange={(e) => setFormData({ ...formData, customRoomNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g. 305A"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Total Beds in New Room *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="20"
                        value={formData.customRoomBeds}
                        onChange={(e) => setFormData({ ...formData, customRoomBeds: Math.max(1, Number(e.target.value) || 1), bed: '', customBedLabel: '' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-500">Room Type *</label>
                      <select
                        value={formData.customRoomType}
                        onChange={(e) => setFormData({ ...formData, customRoomType: e.target.value as 'single' | 'double' | 'triple' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="triple">Triple</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Bed *</label>
                  <select
                    required
                    value={formData.bed}
                    onChange={(e) => setFormData({ ...formData, bed: e.target.value, customBedLabel: e.target.value === CUSTOM_BED_OPTION ? formData.customBedLabel : '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    disabled={!selectedRoom && !isCustomRoomSelected}
                  >
                    <option value="">Select bed</option>
                    {availableBeds.map((bed) => (
                      <option key={bed} value={bed}>Bed {bed}</option>
                    ))}
                    <option value={CUSTOM_BED_OPTION}>Other (type custom bed)</option>
                  </select>
                  {isCustomBedSelected && (
                    <input
                      required
                      value={formData.customBedLabel}
                      onChange={(e) => setFormData({ ...formData, customBedLabel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g. A1"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Monthly Rent *</label>
                  <input required type="number" min="0" value={formData.monthlyRent} onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Security Deposit</label>
                  <input type="number" min="0" value={formData.securityDeposit} onChange={(e) => setFormData({ ...formData, securityDeposit: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Rent Due Date</label>
                  <input type="number" min="1" max="31" value={formData.rentDueDate} onChange={(e) => setFormData({ ...formData, rentDueDate: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Parent Name *</label>
                  <input required value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Parent Phone *</label>
                  <input required value={formData.parentPhone} inputMode="numeric" maxLength={PHONE_LENGTH} onChange={(e) => setFormData({ ...formData, parentPhone: toDigits(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">ID Type *</label>
                  <input required value={formData.idType} onChange={(e) => setFormData({ ...formData, idType: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">ID Number *</label>
                  <input required value={formData.idNumber} maxLength={ID_NUMBER_MAX_LENGTH} onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Join Date *</label>
                  <input required type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-500">Profile Photo (optional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] ?? null })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-500">ID Document *</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFormData({ ...formData, idDocument: e.target.files?.[0] ?? null })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  {editingTenant?.idDocumentUrl && !formData.idDocument && (
                    <p className="text-xs text-gray-500">Existing ID document found. Upload a new file only if you want to replace it.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {isSaving ? 'Saving...' : editingTenant ? 'Update Tenant' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <button className="text-left" onClick={() => onViewTenant && onViewTenant(tenant.id)}>
                <p className="text-gray-900 font-medium">{tenant.name}</p>
                <p className="text-xs text-gray-500">{selectedProperty === 'all' ? getPropertyName(tenant.propertyId) : tenant.room}</p>
              </button>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {tenant.status}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{tenant.phone}</p>
              <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{tenant.email}</p>
              <p>Rent: Rs {tenant.rent.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}