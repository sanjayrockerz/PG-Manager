import { useState } from 'react';
import { useProperty, Property, Room } from '../contexts/PropertyContext';
import { Building2, Plus, Edit2, Trash2, MapPin, Phone, Mail, Layers, Home, X, Bed, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DEFAULT_COUNTRY_CODE,
  isValidStoredPhoneNumber,
} from '../utils/phone';
import { InternationalPhoneField } from './ui/InternationalPhoneField';
import { AddressAutocomplete } from './ui/AddressAutocomplete';
import type { StructuredAddressData } from '../hooks/usePhotonAutocomplete';

const EMAIL_MAX_LENGTH = 254;
const PINCODE_LENGTH = 6;
const PROPERTY_NAME_MAX_LENGTH = 80;
const PERSON_NAME_MAX_LENGTH = 80;
const LOCATION_MAX_LENGTH = 64;


type PropertyField = 'name' | 'address' | 'city' | 'state' | 'pincode' | 'floors' | 'contactName' | 'contactPhone' | 'contactEmail';

const PROPERTY_FIELDS: PropertyField[] = ['name', 'address', 'city', 'state', 'pincode', 'floors', 'contactName', 'contactPhone', 'contactEmail'];

const emptyPropertyErrors = (): Record<PropertyField, string> => ({
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  floors: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
});

const emptyPropertyTouched = (): Record<PropertyField, boolean> => ({
  name: false,
  address: false,
  city: false,
  state: false,
  pincode: false,
  floors: false,
  contactName: false,
  contactPhone: false,
  contactEmail: false,
});

const sanitizeTextWithoutDigits = (value: string): string => value.replace(/\d/g, '');

const normalizeStoredPhone = (value: string): string => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (raw.startsWith('+')) {
    return `+${digits}`;
  }

  return `${DEFAULT_COUNTRY_CODE}${digits}`;
};

export function Properties() {
  const { properties, addProperty, updateProperty, deleteProperty, addRoom, updateRoom, deleteRoom } = useProperty();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<PropertyField, string>>(emptyPropertyErrors());
  const [touchedFields, setTouchedFields] = useState<Record<PropertyField, boolean>>(emptyPropertyTouched());
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    addressLine1: '',
    addressLine2: '',
    locality: '',
    landmark: '',
    latitude: null as number | null,
    longitude: null as number | null,
    formattedAddress: '',
    city: '',
    state: '',
    pincode: '',
    floors: 1,
    totalRooms: 0,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  });

  const [roomFormData, setRoomFormData] = useState({
    number: '',
    floor: 1,
    type: 'single' as 'single' | 'double' | 'triple',
    beds: 1,
    rent: 0,
    status: 'vacant' as 'occupied' | 'vacant' | 'maintenance',
  });

  const handleOpenDialog = (property?: Property) => {
    setFormError('');
    setFieldErrors(emptyPropertyErrors());
    setTouchedFields(emptyPropertyTouched());
    if (property) {
      setEditingProperty(property);
      setFormData({
        name: property.name,
        address: property.address,
        addressLine1: property.addressLine1 ?? property.address,
        addressLine2: property.addressLine2 ?? '',
        locality: property.locality ?? property.city,
        landmark: property.landmark ?? '',
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
        formattedAddress: property.formattedAddress ?? property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        floors: property.floors,
        totalRooms: property.totalRooms,
        contactName: property.contactName,
        contactPhone: normalizeStoredPhone(property.contactPhone),
        contactEmail: property.contactEmail,
      });
    } else {
      setEditingProperty(null);
      setFormData({
        name: '',
        address: '',
        addressLine1: '',
        addressLine2: '',
        locality: '',
        landmark: '',
        latitude: null,
        longitude: null,
        formattedAddress: '',
        city: '',
        state: '',
        pincode: '',
        floors: 1,
        totalRooms: 0,
        contactName: '',
        contactPhone: '',
        contactEmail: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProperty(null);
    setFormError('');
    setFieldErrors(emptyPropertyErrors());
    setTouchedFields(emptyPropertyTouched());
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validatePropertyField = (field: PropertyField, candidate = formData): string => {
    const cleanName = candidate.name.trim();
    const cleanAddress = candidate.address.trim();
    const cleanCity = candidate.city.trim();
    const cleanState = candidate.state.trim();
    const cleanPincode = candidate.pincode.trim();
    const cleanContactName = candidate.contactName.trim();
    const cleanContactPhone = normalizeStoredPhone(candidate.contactPhone);
    const cleanContactEmail = candidate.contactEmail.trim();

    switch (field) {
      case 'name':
        if (!cleanName) return 'Property name is required.';
        if (cleanName.length < 2) return 'Property name must be at least 2 characters.';
        if (cleanName.length > PROPERTY_NAME_MAX_LENGTH) return 'Property name is too long.';
        return '';
      case 'address':
        if (!cleanAddress) return 'Address is required.';
        if (cleanAddress.length < 5) return 'Address must be at least 5 characters.';
        return '';
      case 'city':
        if (!cleanCity) return 'City is required.';
        if (/\d/.test(cleanCity)) return 'City cannot contain digits.';
        if (cleanCity.length > LOCATION_MAX_LENGTH) return 'City is too long.';
        return '';
      case 'state':
        if (!cleanState) return 'State is required.';
        if (/\d/.test(cleanState)) return 'State cannot contain digits.';
        if (cleanState.length > LOCATION_MAX_LENGTH) return 'State is too long.';
        return '';
      case 'pincode':
        if (!cleanPincode) return 'Pincode is required.';
        if (!/^\d{6}$/.test(cleanPincode)) return 'Pincode must be exactly 6 digits.';
        return '';
      case 'floors':
        if (!Number.isFinite(candidate.floors) || candidate.floors < 1) return 'Number of floors must be at least 1.';
        if (candidate.floors > 100) return 'Number of floors cannot exceed 100.';
        return '';
      case 'contactName':
        if (!cleanContactName) return 'Contact person name is required.';
        if (cleanContactName.length < 2) return 'Contact person name must be at least 2 characters.';
        if (/\d/.test(cleanContactName)) return 'Contact person name cannot contain digits.';
        if (cleanContactName.length > PERSON_NAME_MAX_LENGTH) return 'Contact person name is too long.';
        return '';
      case 'contactPhone':
        if (!cleanContactPhone) return 'Phone number is required.';
        if (!isValidStoredPhoneNumber(cleanContactPhone)) return 'Enter a valid mobile phone number.';
        return '';
      case 'contactEmail':
        if (cleanContactEmail.length > EMAIL_MAX_LENGTH) return 'Email address is too long.';
        if (cleanContactEmail && !isValidEmail(cleanContactEmail)) return 'Enter a valid email address or leave it blank.';
        return '';
      default:
        return '';
    }
  };

  const validateAllPropertyFields = (candidate = formData): Record<PropertyField, string> => {
    const nextErrors = emptyPropertyErrors();
    PROPERTY_FIELDS.forEach((field) => {
      nextErrors[field] = validatePropertyField(field, candidate);
    });
    return nextErrors;
  };

  const hasValidationErrors = (errors: Record<PropertyField, string>): boolean => PROPERTY_FIELDS.some((field) => errors[field]);

  const touchField = (field: PropertyField, candidate = formData) => {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: validatePropertyField(field, candidate),
    }));
  };

  const updateFormData = (next: typeof formData, fieldsToValidate: PropertyField[] = []) => {
    setFormData(next);
    if (formError) {
      setFormError('');
    }

    if (fieldsToValidate.length === 0) {
      return;
    }

    setTouchedFields((current) => {
      const updated = { ...current };
      fieldsToValidate.forEach((field) => {
        updated[field] = true;
      });
      return updated;
    });

    setFieldErrors((current) => {
      const updated = { ...current };
      fieldsToValidate.forEach((field) => {
        updated[field] = validatePropertyField(field, next);
      });
      return updated;
    });
  };

  const applyAddressSuggestion = (suggestion: StructuredAddressData) => {
    const next = {
      ...formData,
      address: suggestion.formattedAddress || suggestion.addressLine1 || formData.address,
      addressLine1: suggestion.addressLine1 || suggestion.formattedAddress || formData.addressLine1,
      addressLine2: formData.addressLine2,
      locality: suggestion.city || formData.locality,
      landmark: formData.landmark,
      city: suggestion.city || formData.city,
      state: suggestion.state || formData.state,
      pincode: suggestion.pincode ? suggestion.pincode.replace(/\D/g, '').slice(0, PINCODE_LENGTH) : formData.pincode,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      formattedAddress: suggestion.formattedAddress || formData.formattedAddress,
    };
    updateFormData(next, ['address', 'city', 'state', 'pincode']);
  };

  const validatePropertyForm = (): string => {
    const nextErrors = validateAllPropertyFields(formData);
    setFieldErrors(nextErrors);
    setTouchedFields(PROPERTY_FIELDS.reduce((acc, field) => ({ ...acc, [field]: true }), emptyPropertyTouched()));

    if (!hasValidationErrors(nextErrors)) {
      return '';
    }

    const firstError = PROPERTY_FIELDS.map((field) => nextErrors[field]).find((value) => value);
    return firstError || 'Please review the highlighted fields.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePropertyForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      ...formData,
      address: formData.address.trim(),
      addressLine1: formData.addressLine1.trim() || formData.address.trim(),
      addressLine2: formData.addressLine2.trim(),
      locality: formData.locality.trim(),
      landmark: formData.landmark.trim(),
      formattedAddress: formData.formattedAddress.trim() || formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      name: formData.name.trim(),
      contactName: formData.contactName.trim(),
      contactPhone: normalizeStoredPhone(formData.contactPhone),
      contactEmail: formData.contactEmail.trim(),
    };

    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, payload);
      } else {
        await addProperty(payload);
      }
      handleCloseDialog();
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : 'Unable to save property. Please try again.';
      setFormError(message);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this property? All associated rooms will be deleted.')) {
      deleteProperty(id);
    }
  };

  const handleOpenRoomDialog = (propertyId: string, room?: Room) => {
    setCurrentPropertyId(propertyId);
    if (room) {
      setEditingRoom(room);
      setRoomFormData({
        number: room.number,
        floor: room.floor,
        type: room.type,
        beds: room.beds,
        rent: room.rent,
        status: room.status,
      });
    } else {
      setEditingRoom(null);
      const property = properties.find(p => p.id === propertyId);
      setRoomFormData({
        number: '',
        floor: property?.floors || 1,
        type: 'single',
        beds: 1,
        rent: 0,
        status: 'vacant',
      });
    }
    setShowRoomDialog(true);
  };

  const handleCloseRoomDialog = () => {
    setShowRoomDialog(false);
    setEditingRoom(null);
    setCurrentPropertyId('');
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      updateRoom(currentPropertyId, editingRoom.id, roomFormData);
    } else {
      addRoom(currentPropertyId, { ...roomFormData, occupiedBeds: 0 });
    }
    handleCloseRoomDialog();
  };

  const handleDeleteRoom = (propertyId: string, roomId: string) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      deleteRoom(propertyId, roomId);
    }
  };

  const togglePropertyExpansion = (propertyId: string) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  };

  const getInputClass = (field: PropertyField): string => {
    if (fieldErrors[field]) {
      return 'w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200';
    }
    return 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
  };

  const summaryCards: Array<{
    title: string;
    value: number;
    icon: typeof Building2;
    iconClassName: string;
    iconWrapClassName: string;
  }> = [
    {
      title: 'Total Properties',
      value: properties.length,
      icon: Building2,
      iconClassName: 'text-blue-600',
      iconWrapClassName: 'bg-blue-100',
    },
    {
      title: 'Total Floors',
      value: properties.reduce((sum, property) => sum + property.floors, 0),
      icon: Layers,
      iconClassName: 'text-emerald-600',
      iconWrapClassName: 'bg-emerald-100',
    },
    {
      title: 'Total Rooms',
      value: properties.reduce((sum, property) => sum + property.rooms.length, 0),
      icon: Home,
      iconClassName: 'text-violet-600',
      iconWrapClassName: 'bg-violet-100',
    },
    {
      title: 'Total Beds',
      value: properties.reduce((sum, property) => sum + property.rooms.reduce((roomTotal, room) => roomTotal + room.beds, 0), 0),
      icon: Bed,
      iconClassName: 'text-orange-600',
      iconWrapClassName: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Properties & Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all your PG properties and room configurations</p>
        </div>
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white px-6 py-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{card.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 leading-none">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconWrapClassName}`}>
                  <Icon className={`w-5 h-5 ${card.iconClassName}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Properties List with Expandable Room Management */}
      <div className="space-y-4">
        {properties.map((property) => (
          <div
            key={property.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{property.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">Added on {new Date(property.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePropertyExpansion(property.id)}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Manage Rooms"
                  >
                    {expandedProperty === property.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenDialog(property)}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Edit property"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Delete property"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-500 leading-6">{property.address}</p>
                </div>

                <div className="border-t border-gray-200 pt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Floors</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{property.floors}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Rooms</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{property.rooms.length}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Beds</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{property.rooms.reduce((sum, r) => sum + r.beds, 0)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
                  <p className="text-sm font-semibold text-gray-900">{property.contactName}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{property.contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{property.contactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Expandable Room Management Section */}
              {expandedProperty === property.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-800">Room Management</h4>
                    <button
                      onClick={() => handleOpenRoomDialog(property.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Room
                    </button>
                  </div>

                  {/* Rooms by Floor */}
                  <div className="space-y-4">
                    {Array.from({ length: property.floors }, (_, i) => i + 1).map((floor) => {
                      const floorRooms = property.rooms.filter(r => r.floor === floor);
                      return (
                        <div key={floor} className="bg-gray-50 rounded-xl p-4">
                          <h5 className="text-sm font-medium text-gray-800 mb-3">
                            Floor {floor} - {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}
                          </h5>
                          {floorRooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {floorRooms.map((room) => (
                                <div key={room.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between mb-2 gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">Room {room.number}</p>
                                      <p className="text-xs text-gray-500 capitalize">{room.type} - {room.beds} bed{room.beds > 1 ? 's' : ''}</p>
                                    </div>
                                    <span className={`
                                      px-2 py-0.5 rounded text-xs
                                      ${room.status === 'occupied' ? 'bg-green-100 text-green-700' : 
                                        room.status === 'vacant' ? 'bg-gray-100 text-gray-700' : 
                                        'bg-orange-100 text-orange-700'}
                                    `}>
                                      {room.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mb-2">Rent: ₹{room.rent.toLocaleString()}</p>
                                  {room.occupiedBeds !== undefined && room.occupiedBeds > 0 && (
                                    <p className="text-xs text-gray-500 mb-2">
                                      Occupied: {room.occupiedBeds}/{room.beds} beds
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                                    <button
                                      onClick={() => handleOpenRoomDialog(property.id, room)}
                                      className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRoom(property.id, room.id)}
                                      className="flex-1 px-2 py-1.5 text-xs bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No rooms on this floor yet. Click "Add Room" to create one.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Property Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-800">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
              <button
                onClick={handleCloseDialog}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Property Details */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wide text-gray-500">
                  Property Details
                </h3>
                
                <div>
                  <label className="block text-sm mb-2">Property Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => updateFormData({ ...formData, name: e.target.value }, ['name'])}
                    onBlur={() => touchField('name')}
                    maxLength={PROPERTY_NAME_MAX_LENGTH}
                    className={getInputClass('name')}
                    placeholder="e.g. Green Valley PG"
                  />
                  {touchedFields.name && fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-2">Address *</label>
                  <AddressAutocomplete
                    required
                    value={formData.address}
                    onChange={(value) => updateFormData({
                      ...formData,
                      address: value,
                      addressLine1: value,
                      formattedAddress: '',
                      latitude: null,
                      longitude: null,
                    }, ['address'])}
                    onBlur={() => touchField('address')}
                    onSelect={applyAddressSuggestion}
                    inputClassName={getInputClass('address')}
                    placeholder="Street address"
                  />

                  {formData.formattedAddress && (
                    <p className="mt-2 text-xs text-gray-500">Selected: {formData.formattedAddress}</p>
                  )}

                  {touchedFields.address && fieldErrors.address && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>
                  )}

                  {formData.latitude !== null && formData.longitude !== null && (
                    <p className="mt-1 text-xs text-gray-500">
                      Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => updateFormData({ ...formData, city: sanitizeTextWithoutDigits(e.target.value) }, ['city'])}
                      onBlur={() => touchField('city')}
                      className={getInputClass('city')}
                      placeholder="e.g. Bengaluru"
                    />
                    {touchedFields.city && fieldErrors.city && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm mb-2">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => updateFormData({ ...formData, state: sanitizeTextWithoutDigits(e.target.value) }, ['state'])}
                      onBlur={() => touchField('state')}
                      className={getInputClass('state')}
                      placeholder="e.g. Karnataka"
                    />
                    {touchedFields.state && fieldErrors.state && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => updateFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, PINCODE_LENGTH) }, ['pincode'])}
                      onBlur={() => touchField('pincode')}
                      className={getInputClass('pincode')}
                      placeholder="e.g. 560001"
                    />
                    {touchedFields.pincode && fieldErrors.pincode && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2">Number of Floors *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.floors}
                    onChange={(e) => updateFormData({ ...formData, floors: Math.min(100, parseInt(e.target.value, 10) || 1) }, ['floors'])}
                    onBlur={() => touchField('floors')}
                    className={getInputClass('floors')}
                    placeholder="e.g. 1"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can add rooms to each floor after creating the property</p>
                  {touchedFields.floors && fieldErrors.floors && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.floors}</p>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wide text-gray-500">
                  Contact Details
                </h3>

                <div>
                  <label className="block text-sm mb-2">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => updateFormData({ ...formData, contactName: sanitizeTextWithoutDigits(e.target.value) }, ['contactName'])}
                    onBlur={() => touchField('contactName')}
                    maxLength={PERSON_NAME_MAX_LENGTH}
                    className={getInputClass('contactName')}
                    placeholder="e.g. Rahul Verma"
                  />
                  {touchedFields.contactName && fieldErrors.contactName && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.contactName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Phone Number *</label>
                    <InternationalPhoneField
                      required
                      value={formData.contactPhone}
                      onChange={(value) => updateFormData({ ...formData, contactPhone: value }, ['contactPhone'])}
                      onBlur={() => touchField('contactPhone')}
                      placeholder="Enter mobile number"
                      invalid={Boolean(touchedFields.contactPhone && fieldErrors.contactPhone)}
                    />
                    <p className="mt-1 text-xs text-gray-500">Select country and enter a valid mobile number.</p>
                    {touchedFields.contactPhone && fieldErrors.contactPhone && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.contactPhone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Email Address (optional)</label>
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      value={formData.contactEmail}
                      onChange={(e) => updateFormData({ ...formData, contactEmail: e.target.value }, ['contactEmail'])}
                      onBlur={() => touchField('contactEmail')}
                      maxLength={EMAIL_MAX_LENGTH}
                      className={getInputClass('contactEmail')}
                      placeholder="e.g. contact@property.com"
                    />
                    {touchedFields.contactEmail && fieldErrors.contactEmail && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.contactEmail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="px-6 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingProperty ? 'Update Property' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Room Dialog */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-800">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h2>
              <button
                onClick={handleCloseRoomDialog}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={roomFormData.number}
                    onChange={(e) => setRoomFormData({ ...roomFormData, number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 101"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Floor *</label>
                  <select
                    required
                    value={roomFormData.floor}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: properties.find(p => p.id === currentPropertyId)?.floors || 1 }, (_, i) => i + 1).map((floor) => (
                      <option key={floor} value={floor}>Floor {floor}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Room Type *</label>
                  <select
                    required
                    value={roomFormData.type}
                    onChange={(e) => {
                      const type = e.target.value as 'single' | 'double' | 'triple';
                      const beds = type === 'single' ? 1 : type === 'double' ? 2 : 3;
                      setRoomFormData({ ...roomFormData, type, beds });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Number of Beds *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={roomFormData.beds}
                    onChange={(e) => setRoomFormData({ ...roomFormData, beds: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Rent (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={roomFormData.rent}
                    onChange={(e) => setRoomFormData({ ...roomFormData, rent: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Status *</label>
                  <select
                    required
                    value={roomFormData.status}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value as 'occupied' | 'vacant' | 'maintenance' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseRoomDialog}
                  className="px-5 py-2.5 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingRoom ? 'Update Room' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
