import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Phone, Mail, Edit, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import { type TenantCreateInput, type TenantRecord } from '../services/supabaseData';
import {
  addRoomToProperty,
  createTenantRecord,
  deleteTenantRecord,
  getTenants,
  isDemoModeEnabled,
  updateTenantRecord,
} from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';
import {
  DEFAULT_COUNTRY_CODE,
  formatStoredPhone,
  parseStoredPhone,
  sanitizePhoneLocal,
  validatePhoneForCountry,
} from '../utils/phone';
import { InternationalPhoneField } from './ui/InternationalPhoneField';

interface TenantsProps {
  onViewTenant?: (tenantId: string) => void;
}

interface TenantFormState {
  name: string;
  phoneCountryCode: string;
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
  parentPhoneCountryCode: string;
  parentPhone: string;
  idType: string;
  idTypeOther: string;
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
const NAME_MAX_LENGTH = 80;
const ID_NUMBER_MAX_LENGTH = 64;

const ID_TYPE_OPTIONS = ['Aadhaar', 'Driving License', 'PAN', 'Passport', 'Other'] as const;

type TenantField =
  | 'name'
  | 'phone'
  | 'email'
  | 'propertyId'
  | 'floor'
  | 'room'
  | 'customRoomNumber'
  | 'customRoomBeds'
  | 'bed'
  | 'customBedLabel'
  | 'monthlyRent'
  | 'securityDeposit'
  | 'rentDueDate'
  | 'parentName'
  | 'parentPhone'
  | 'idType'
  | 'idTypeOther'
  | 'idNumber'
  | 'joinDate';

const VALIDATION_FIELD_ORDER: TenantField[] = [
  'name',
  'phone',
  'email',
  'propertyId',
  'floor',
  'room',
  'customRoomNumber',
  'customRoomBeds',
  'bed',
  'customBedLabel',
  'monthlyRent',
  'securityDeposit',
  'rentDueDate',
  'parentName',
  'parentPhone',
  'idType',
  'idTypeOther',
  'idNumber',
  'joinDate',
];

const parseCurrencyInputValue = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return 0;
  }
  return Number(digits.replace(/^0+(?=\d)/, ''));
};

const normalizeIdTypeForForm = (rawValue: string): { option: string; otherValue: string } => {
  const normalized = rawValue.trim();
  const byOption = ID_TYPE_OPTIONS.find((option) => option.toLowerCase() === normalized.toLowerCase());
  if (byOption) {
    return {
      option: byOption,
      otherValue: '',
    };
  }

  if (normalized.toLowerCase().includes('aadhaar') || normalized.toLowerCase().includes('aadhar')) {
    return { option: 'Aadhaar', otherValue: '' };
  }
  if (normalized.toLowerCase().includes('driving')) {
    return { option: 'Driving License', otherValue: '' };
  }
  if (normalized.toLowerCase() === 'pan' || normalized.toLowerCase().includes('pan card')) {
    return { option: 'PAN', otherValue: '' };
  }
  if (normalized.toLowerCase().includes('passport')) {
    return { option: 'Passport', otherValue: '' };
  }

  return {
    option: 'Other',
    otherValue: normalized,
  };
};

const emptyForm = (): TenantFormState => ({
  name: '',
  phoneCountryCode: DEFAULT_COUNTRY_CODE,
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
  parentPhoneCountryCode: DEFAULT_COUNTRY_CODE,
  parentPhone: '',
  idType: 'Aadhaar',
  idTypeOther: '',
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
  const isDemoMode = isDemoModeEnabled();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<TenantFormState>(emptyForm());
  const [touchedFields, setTouchedFields] = useState<Partial<Record<TenantField, boolean>>>({});

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const getResolvedIdType = (): string => {
    if (formData.idType === 'Other') {
      return formData.idTypeOther.trim();
    }
    return formData.idType.trim();
  };

  const validatePhoneByCountry = (countryCode: string, localNumber: string): string => {
    const result = validatePhoneForCountry(countryCode, localNumber);
    return result.valid ? '' : (result.error ?? 'Phone number is invalid.');
  };

  const touchField = (field: TenantField) => {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const touchAllFields = () => {
    const nextTouched: Partial<Record<TenantField, boolean>> = {};
    VALIDATION_FIELD_ORDER.forEach((field) => {
      nextTouched[field] = true;
    });
    setTouchedFields(nextTouched);
  };

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

  const loadTenants = useCallback(async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError('');
    try {
      const list = await getTenants(selectedProperty);
      setTenants(list);
    } catch {
      setError('Unable to load tenants.');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadTenants(true);
  }, [loadTenants, selectedProperty]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `tenants-${selectedProperty}`,
    tables: ['tenants', 'rooms', 'payments', 'notifications'],
    onChange: () => loadTenants(false),
    enabled: !isDemoMode,
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
    setError('');
    setTouchedFields({});
    setFormData(next);
    setEditingTenant(null);
    setShowAddModal(true);
  };

  const openEditModal = (tenant: TenantRecord) => {
    const property = properties.find((entry) => entry.id === tenant.propertyId);
    const roomRecord = property?.rooms.find((room) => room.floor === tenant.floor && room.number === tenant.room);
    const inferredKnownBeds = roomRecord ? Array.from({ length: roomRecord.beds }, (_, index) => String(index + 1)) : [];
    const usesCustomBed = tenant.bed !== '' && !inferredKnownBeds.includes(tenant.bed);
    const phone = parseStoredPhone(tenant.phone);
    const parentPhone = parseStoredPhone(tenant.parentPhone);
    const idTypeState = normalizeIdTypeForForm(tenant.idType);

    setError('');
    setTouchedFields({});
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      phoneCountryCode: phone.countryCode,
      phone: sanitizePhoneLocal(phone.localNumber, phone.countryCode),
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
      parentPhoneCountryCode: parentPhone.countryCode,
      parentPhone: sanitizePhoneLocal(parentPhone.localNumber, parentPhone.countryCode),
      idType: idTypeState.option,
      idTypeOther: idTypeState.otherValue,
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
    setTouchedFields({});
  };

  const toTenantInput = (resolvedRoom: string, resolvedBed: string): TenantCreateInput => ({
    name: formData.name.trim(),
    phone: formatStoredPhone(formData.phoneCountryCode, formData.phone),
    email: formData.email.trim().toLowerCase(),
    propertyId: formData.propertyId,
    floor: formData.floor,
    room: resolvedRoom,
    bed: resolvedBed,
    monthlyRent: Number(formData.monthlyRent),
    securityDeposit: Number(formData.securityDeposit),
    rentDueDate: Number(formData.rentDueDate),
    parentName: formData.parentName.trim(),
    parentPhone: formatStoredPhone(formData.parentPhoneCountryCode, formData.parentPhone),
    idType: getResolvedIdType(),
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

  const validateTenantForm = (): Partial<Record<TenantField, string>> => {
    const validationErrors: Partial<Record<TenantField, string>> = {};
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      validationErrors.name = 'Enter a valid tenant name.';
    } else if (cleanName.length > NAME_MAX_LENGTH) {
      validationErrors.name = 'Tenant name is too long.';
    } else if (/\d/.test(cleanName)) {
      validationErrors.name = 'Tenant name cannot include digits.';
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      validationErrors.email = 'Enter a valid tenant email address.';
    }

    const tenantPhoneError = validatePhoneByCountry(formData.phoneCountryCode, formData.phone);
    if (tenantPhoneError) {
      validationErrors.phone = tenantPhoneError;
    }

    if (!formData.propertyId) {
      validationErrors.propertyId = 'Select a property before saving tenant.';
    }

    if (formData.floor < 1) {
      validationErrors.floor = 'Select a valid floor.';
    }

    if (!formData.room) {
      validationErrors.room = 'Select room number.';
    }

    if (formData.room === CUSTOM_ROOM_OPTION && !formData.customRoomNumber.trim()) {
      validationErrors.customRoomNumber = 'Custom room number is required.';
    }

    if (formData.room === CUSTOM_ROOM_OPTION && (!Number.isFinite(formData.customRoomBeds) || formData.customRoomBeds < 1)) {
      validationErrors.customRoomBeds = 'Custom room must have at least 1 bed.';
    }

    if (!formData.bed) {
      validationErrors.bed = 'Select bed.';
    }

    if (formData.bed === CUSTOM_BED_OPTION && !formData.customBedLabel.trim()) {
      validationErrors.customBedLabel = 'Custom bed label is required.';
    }

    if (!formData.monthlyRent || Number(formData.monthlyRent) <= 0) {
      validationErrors.monthlyRent = 'Monthly rent must be greater than zero.';
    }

    if (Number(formData.securityDeposit) < 0) {
      validationErrors.securityDeposit = 'Security deposit cannot be negative.';
    }

    if (formData.rentDueDate < 1 || formData.rentDueDate > 31) {
      validationErrors.rentDueDate = 'Rent due date must be between 1 and 31.';
    }

    const cleanParentName = formData.parentName.trim();
    if (!cleanParentName) {
      validationErrors.parentName = 'Parent name is required.';
    } else if (/\d/.test(cleanParentName)) {
      validationErrors.parentName = 'Parent name cannot include digits.';
    }

    const parentPhoneError = validatePhoneByCountry(formData.parentPhoneCountryCode, formData.parentPhone);
    if (parentPhoneError) {
      validationErrors.parentPhone = parentPhoneError;
    }

    const resolvedIdType = getResolvedIdType();
    if (!formData.idType) {
      validationErrors.idType = 'ID type is required.';
    }
    if (formData.idType === 'Other' && !formData.idTypeOther.trim()) {
      validationErrors.idTypeOther = 'Custom ID type is required when Other is selected.';
    }

    const idNumber = formData.idNumber.trim();
    if (!idNumber) {
      validationErrors.idNumber = 'ID number is required.';
    } else if (idNumber.length > ID_NUMBER_MAX_LENGTH) {
      validationErrors.idNumber = 'ID number is too long.';
    } else {
      const normalizedType = resolvedIdType.toLowerCase();
      if (normalizedType === 'aadhaar' && !/^\d{12}$/.test(idNumber)) {
        validationErrors.idNumber = 'Aadhaar number must be exactly 12 digits.';
      } else if (normalizedType === 'pan' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(idNumber)) {
        validationErrors.idNumber = 'PAN format must be like ABCDE1234F.';
      } else if (normalizedType === 'passport' && !/^[A-Z][0-9]{7}$/i.test(idNumber)) {
        validationErrors.idNumber = 'Passport format must be like A1234567.';
      } else if (normalizedType === 'driving license' && !/^[A-Z0-9-]{6,20}$/i.test(idNumber)) {
        validationErrors.idNumber = 'Driving License must be 6-20 letters/numbers.';
      }
    }

    if (!formData.joinDate) {
      validationErrors.joinDate = 'Join date is required.';
    }

    const allocation = resolveRoomAndBed();
    if (allocation.error) {
      if (!validationErrors.room && allocation.error.toLowerCase().includes('room')) {
        validationErrors.room = allocation.error;
      } else if (!validationErrors.bed && allocation.error.toLowerCase().includes('bed')) {
        validationErrors.bed = allocation.error;
      } else if (!validationErrors.room) {
        validationErrors.room = allocation.error;
      }
    }

    return validationErrors;
  };

  const getFirstValidationError = (validationErrors: Partial<Record<TenantField, string>>): string => {
    for (const field of VALIDATION_FIELD_ORDER) {
      const message = validationErrors[field];
      if (message) {
        return message;
      }
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateTenantForm();
    const validationError = getFirstValidationError(validationErrors);
    if (validationError) {
      touchAllFields();
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
        await addRoomToProperty(formData.propertyId, {
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
        await updateTenantRecord(editingTenant.id, payload);
        toast.success('Tenant updated');
      } else {
        await createTenantRecord(payload);
        toast.success('Tenant created');
      }
      closeModal();
      await loadTenants(false);
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
      await deleteTenantRecord(tenantId);
      toast.success('Tenant deleted');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to delete tenant.';
      setError(message);
      setTenants(previousTenants);
      toast.error(message);
    }
  };

  const tenantFieldErrors = validateTenantForm();
  const hasFieldValue = (field: TenantField): boolean => {
    switch (field) {
      case 'name':
        return formData.name.trim().length > 0;
      case 'phone':
        return formData.phone.trim().length > 0;
      case 'email':
        return formData.email.trim().length > 0;
      case 'propertyId':
        return formData.propertyId.trim().length > 0;
      case 'room':
        return formData.room.trim().length > 0;
      case 'customRoomNumber':
        return formData.customRoomNumber.trim().length > 0;
      case 'bed':
        return formData.bed.trim().length > 0;
      case 'customBedLabel':
        return formData.customBedLabel.trim().length > 0;
      case 'monthlyRent':
        return Number.isFinite(formData.monthlyRent) && formData.monthlyRent !== 0;
      case 'securityDeposit':
        return Number.isFinite(formData.securityDeposit) && formData.securityDeposit !== 0;
      case 'rentDueDate':
        return Number.isFinite(formData.rentDueDate);
      case 'parentName':
        return formData.parentName.trim().length > 0;
      case 'parentPhone':
        return formData.parentPhone.trim().length > 0;
      case 'idType':
        return formData.idType.trim().length > 0;
      case 'idTypeOther':
        return formData.idTypeOther.trim().length > 0;
      case 'idNumber':
        return formData.idNumber.trim().length > 0;
      case 'joinDate':
        return formData.joinDate.trim().length > 0;
      case 'floor':
      case 'customRoomBeds':
        return true;
      default:
        return false;
    }
  };

  const getFieldError = (field: TenantField): string => {
    const shouldShow = Boolean(touchedFields[field]) || hasFieldValue(field);
    return shouldShow ? tenantFieldErrors[field] ?? '' : '';
  };
  const getInputClass = (field: TenantField): string => {
    if (getFieldError(field)) {
      return 'w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200';
    }
    return 'w-full px-4 py-2 border border-gray-300 rounded-lg';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all your tenants</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label={isDemoMode ? 'Demo data' : 'Tenant stream'} />
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, room, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-auto">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`${selectedProperty === 'all' ? 'w-[20%]' : 'w-[24%]'} px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500`}>Tenant</th>
                {selectedProperty === 'all' && <th className="w-[17%] px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Property</th>}
                <th className={`${selectedProperty === 'all' ? 'w-[12%]' : 'w-[14%]'} px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500`}>Room Number</th>
                <th className={`${selectedProperty === 'all' ? 'w-[20%]' : 'w-[26%]'} px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500`}>Contact</th>
                <th className={`${selectedProperty === 'all' ? 'w-[10%]' : 'w-[11%]'} px-6 py-3 text-right text-xs uppercase tracking-wide text-gray-500`}>Rent</th>
                <th className={`${selectedProperty === 'all' ? 'w-[9%]' : 'w-[10%]'} px-6 py-3 text-right text-xs uppercase tracking-wide text-gray-500`}>Join Date</th>
                <th className={`${selectedProperty === 'all' ? 'w-[6%]' : 'w-[7%]'} px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500`}>Status</th>
                <th className={`${selectedProperty === 'all' ? 'w-[6%]' : 'w-[8%]'} px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 8 : 7} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading tenants...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 8 : 7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 align-top">
                      <button
                        className="text-left w-full min-w-0"
                        onClick={() => onViewTenant && onViewTenant(tenant.id)}
                      >
                        <p className="text-sm font-semibold text-gray-900 hover:text-indigo-600 break-words leading-5">{tenant.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 break-words leading-5">{tenant.email}</p>
                      </button>
                    </td>
                    {selectedProperty === 'all' && (
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900 align-top break-words leading-5">{getPropertyName(tenant.propertyId)}</td>
                    )}
                    <td className="px-6 py-3.5 text-sm text-gray-700 align-top break-words leading-5">{tenant.room} / Bed {tenant.bed}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 align-top">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="break-words leading-5">{tenant.phone}</span>
                        <span className="text-xs text-gray-400 break-words leading-5">{tenant.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-900 text-right align-top tabular-nums">₹{tenant.rent.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600 text-right align-top tabular-nums">{tenant.joinDate}</td>
                    <td className="px-6 py-3.5 align-top">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${tenant.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      <div className="flex items-center gap-2 justify-start">
                        <button
                          onClick={() => onViewTenant && onViewTenant(tenant.id)}
                          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(tenant)}
                          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                          title="Edit tenant"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => void handleDeleteTenant(tenant.id)}
                          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-800">{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
              <button onClick={closeModal} className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Name *</label>
                  <input
                    required
                    value={formData.name}
                    maxLength={NAME_MAX_LENGTH}
                    placeholder="e.g. Aarav Singh"
                    onBlur={() => touchField('name')}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\d/g, '') })}
                    className={getInputClass('name')}
                  />
                  {getFieldError('name') && <p className="text-xs text-red-600">{getFieldError('name')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Phone *</label>
                  <InternationalPhoneField
                    required
                    value={formatStoredPhone(formData.phoneCountryCode, formData.phone)}
                    onChange={(value) => {
                      const parsed = parseStoredPhone(value);
                      setFormData({
                        ...formData,
                        phoneCountryCode: parsed.countryCode,
                        phone: sanitizePhoneLocal(parsed.localNumber, parsed.countryCode),
                      });
                    }}
                    onBlur={() => touchField('phone')}
                    placeholder="Enter mobile number"
                    invalid={Boolean(getFieldError('phone'))}
                  />
                  <p className="text-xs text-gray-500">Select country and enter a valid mobile number.</p>
                  {getFieldError('phone') && <p className="text-xs text-red-600">{getFieldError('phone')}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-500">Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    placeholder="e.g. aarav@example.com"
                    onBlur={() => touchField('email')}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={getInputClass('email')}
                  />
                  {getFieldError('email') && <p className="text-xs text-red-600">{getFieldError('email')}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-gray-500">Property *</label>
                  <select
                    required
                    value={formData.propertyId}
                    onBlur={() => touchField('propertyId')}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, floor: 1, room: '', bed: '', customRoomNumber: '', customRoomBeds: 1, customRoomType: 'single', customBedLabel: '' })}
                    className={getInputClass('propertyId')}
                  >
                    <option value="">Select Property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                  {getFieldError('propertyId') && <p className="text-xs text-red-600">{getFieldError('propertyId')}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Floor *</label>
                  <select
                    required
                    value={formData.floor}
                    onBlur={() => touchField('floor')}
                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value), room: '', bed: '', customRoomNumber: '', customRoomBeds: 1, customRoomType: 'single', customBedLabel: '' })}
                    className={getInputClass('floor')}
                  >
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>Floor {floor}</option>
                    ))}
                  </select>
                  {getFieldError('floor') && <p className="text-xs text-red-600">{getFieldError('floor')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Room Number *</label>
                  <select
                    required
                    value={formData.room}
                    onBlur={() => touchField('room')}
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
                    className={getInputClass('room')}
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
                  {getFieldError('room') && <p className="text-xs text-red-600">{getFieldError('room')}</p>}
                </div>

                {isCustomRoomSelected && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Custom Room Number *</label>
                      <input
                        required
                        value={formData.customRoomNumber}
                        onBlur={() => touchField('customRoomNumber')}
                        onChange={(e) => setFormData({ ...formData, customRoomNumber: e.target.value })}
                        className={getInputClass('customRoomNumber')}
                        placeholder="e.g. 305A"
                      />
                      {getFieldError('customRoomNumber') && <p className="text-xs text-red-600">{getFieldError('customRoomNumber')}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Total Beds in New Room *</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="20"
                        value={formData.customRoomBeds}
                        onBlur={() => touchField('customRoomBeds')}
                        onChange={(e) => setFormData({ ...formData, customRoomBeds: Math.max(1, Number(e.target.value) || 1), bed: '', customBedLabel: '' })}
                        className={getInputClass('customRoomBeds')}
                      />
                      {getFieldError('customRoomBeds') && <p className="text-xs text-red-600">{getFieldError('customRoomBeds')}</p>}
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
                    onBlur={() => touchField('bed')}
                    onChange={(e) => setFormData({ ...formData, bed: e.target.value, customBedLabel: e.target.value === CUSTOM_BED_OPTION ? formData.customBedLabel : '' })}
                    className={getInputClass('bed')}
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
                      onBlur={() => touchField('customBedLabel')}
                      onChange={(e) => setFormData({ ...formData, customBedLabel: e.target.value })}
                      className={getInputClass('customBedLabel')}
                      placeholder="e.g. A1"
                    />
                  )}
                  {getFieldError('bed') && <p className="text-xs text-red-600">{getFieldError('bed')}</p>}
                  {getFieldError('customBedLabel') && <p className="text-xs text-red-600">{getFieldError('customBedLabel')}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Monthly Rent *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.monthlyRent === 0 ? '' : formData.monthlyRent}
                    placeholder="e.g. 8500"
                    onBlur={() => touchField('monthlyRent')}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: parseCurrencyInputValue(e.target.value) })}
                    className={getInputClass('monthlyRent')}
                  />
                  {getFieldError('monthlyRent') && <p className="text-xs text-red-600">{getFieldError('monthlyRent')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Security Deposit</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.securityDeposit === 0 ? '' : formData.securityDeposit}
                    placeholder="e.g. 15000"
                    onBlur={() => touchField('securityDeposit')}
                    onChange={(e) => setFormData({ ...formData, securityDeposit: parseCurrencyInputValue(e.target.value) })}
                    className={getInputClass('securityDeposit')}
                  />
                  {getFieldError('securityDeposit') && <p className="text-xs text-red-600">{getFieldError('securityDeposit')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Rent Due Date</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.rentDueDate}
                    placeholder="e.g. 5"
                    onBlur={() => touchField('rentDueDate')}
                    onChange={(e) => setFormData({ ...formData, rentDueDate: Number(e.target.value) })}
                    className={getInputClass('rentDueDate')}
                  />
                  {getFieldError('rentDueDate') && <p className="text-xs text-red-600">{getFieldError('rentDueDate')}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Parent Name *</label>
                  <input
                    required
                    value={formData.parentName}
                    placeholder="e.g. Suresh Singh"
                    onBlur={() => touchField('parentName')}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value.replace(/\d/g, '') })}
                    className={getInputClass('parentName')}
                  />
                  {getFieldError('parentName') && <p className="text-xs text-red-600">{getFieldError('parentName')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Parent Phone *</label>
                  <InternationalPhoneField
                    required
                    value={formatStoredPhone(formData.parentPhoneCountryCode, formData.parentPhone)}
                    onChange={(value) => {
                      const parsed = parseStoredPhone(value);
                      setFormData({
                        ...formData,
                        parentPhoneCountryCode: parsed.countryCode,
                        parentPhone: sanitizePhoneLocal(parsed.localNumber, parsed.countryCode),
                      });
                    }}
                    onBlur={() => touchField('parentPhone')}
                    placeholder="Enter parent mobile number"
                    invalid={Boolean(getFieldError('parentPhone'))}
                  />
                  <p className="text-xs text-gray-500">Select country and enter a valid parent mobile number.</p>
                  {getFieldError('parentPhone') && <p className="text-xs text-red-600">{getFieldError('parentPhone')}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">ID Type *</label>
                  <select
                    required
                    value={formData.idType}
                    onBlur={() => touchField('idType')}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value, idTypeOther: e.target.value === 'Other' ? formData.idTypeOther : '' })}
                    className={getInputClass('idType')}
                  >
                    {ID_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {getFieldError('idType') && <p className="text-xs text-red-600">{getFieldError('idType')}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">ID Number *</label>
                  <input
                    required
                    value={formData.idNumber}
                    maxLength={ID_NUMBER_MAX_LENGTH}
                    placeholder="Enter ID number"
                    onBlur={() => touchField('idNumber')}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value.toUpperCase() })}
                    className={getInputClass('idNumber')}
                  />
                  {getFieldError('idNumber') && <p className="text-xs text-red-600">{getFieldError('idNumber')}</p>}
                </div>

                {formData.idType === 'Other' && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-gray-500">Other ID Type Name *</label>
                    <input
                      required
                      value={formData.idTypeOther}
                      placeholder="e.g. Voter ID"
                      onBlur={() => touchField('idTypeOther')}
                      onChange={(e) => setFormData({ ...formData, idTypeOther: e.target.value })}
                      className={getInputClass('idTypeOther')}
                    />
                    {getFieldError('idTypeOther') && <p className="text-xs text-red-600">{getFieldError('idTypeOther')}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Join Date *</label>
                  <input
                    required
                    type="date"
                    value={formData.joinDate}
                    onBlur={() => touchField('joinDate')}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className={getInputClass('joinDate')}
                  />
                  {getFieldError('joinDate') && <p className="text-xs text-red-600">{getFieldError('joinDate')}</p>}
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
                  <label className="text-sm text-gray-500">ID Document (optional)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setFormData({ ...formData, idDocument: e.target.files?.[0] ?? null })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  {editingTenant?.idDocumentUrl && !formData.idDocument && (
                    <p className="text-xs text-gray-500">Existing ID document found. Upload a new file only if you want to replace it.</p>
                  )}
                  {!editingTenant?.idDocumentUrl && !formData.idDocument && (
                    <p className="text-xs text-gray-500">You can save tenant now and upload document later if needed.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
                  {isSaving ? 'Saving...' : editingTenant ? 'Update Tenant' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <button className="text-left" onClick={() => onViewTenant && onViewTenant(tenant.id)}>
                <p className="text-gray-900 font-semibold">{tenant.name}</p>
                <p className="text-xs text-gray-500">{selectedProperty === 'all' ? getPropertyName(tenant.propertyId) : tenant.room}</p>
              </button>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${tenant.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
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