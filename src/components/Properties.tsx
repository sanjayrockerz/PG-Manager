import { useEffect, useState } from 'react';
import { useProperty, Property, Room } from '../contexts/PropertyContext';
import { Building2, Plus, Edit2, Trash2, MapPin, Phone, Mail, Layers, Home, X, Bed, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { AddressSuggestion, searchAddressSuggestions } from '../services/addressLookup';
import { validatePropertyForm, normaliseAndValidatePhone, validatePincode } from '../utils/validation';

export function Properties() {
  const { properties, addProperty, updateProperty, deleteProperty, addRoom, updateRoom, deleteRoom } = useProperty();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [currentPropertyId, setCurrentPropertyId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isAddressLookupLoading, setIsAddressLookupLoading] = useState(false);
  
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
    country: 'India',
    floors: 1,
    totalRooms: 0,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  });

  // Per-field inline error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setFieldErrors({});
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
        country: 'India',
        floors: property.floors,
        totalRooms: property.totalRooms,
        contactName: property.contactName,
        contactPhone: property.contactPhone,
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
        country: 'India',
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
    setFieldErrors({});
    setAddressSuggestions([]);
  };

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const query = formData.address.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsAddressLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsAddressLookupLoading(true);

    // 400ms debounce — respects Nominatim 1 req/s policy
    const timeout = window.setTimeout(() => {
      void searchAddressSuggestions(query, controller.signal)
        .then((results) => {
          setAddressSuggestions(results);
        })
        .catch((error) => {
          if ((error as { name?: string }).name !== 'AbortError') {
            setAddressSuggestions([]);
          }
        })
        .finally(() => {
          setIsAddressLookupLoading(false);
        });
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [formData.address, isDialogOpen]);

  const applyAddressSuggestion = (suggestion: AddressSuggestion) => {
    setFormData((current) => ({
      ...current,
      address: suggestion.addressLine1 || suggestion.formattedAddress,
      addressLine1: suggestion.addressLine1 || suggestion.formattedAddress,
      addressLine2: suggestion.addressLine2,
      locality: suggestion.locality,
      landmark: suggestion.landmark,
      city: suggestion.city || current.city,
      state: suggestion.state || current.state,
      pincode: suggestion.pincode || current.pincode,
      country: suggestion.country || current.country,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      formattedAddress: suggestion.formattedAddress,
    }));
    setAddressSuggestions([]);
    // Clear address-related field errors
    setFieldErrors((prev) => ({ ...prev, address: '', city: '', state: '', pincode: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Normalise phone before validation
    const { cleaned: cleanedPhone, error: phoneErr } = normaliseAndValidatePhone(formData.contactPhone);
    if (phoneErr) {
      setFormError(phoneErr);
      setFieldErrors((prev) => ({ ...prev, contactPhone: phoneErr }));
      return;
    }

    const pincodeErr = validatePincode(formData.pincode);
    if (pincodeErr) {
      setFormError(pincodeErr);
      setFieldErrors((prev) => ({ ...prev, pincode: pincodeErr }));
      return;
    }

    const normalized = { ...formData, contactPhone: cleanedPhone };
    const validationError = validatePropertyForm(normalized);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      ...formData,
      address: formData.address.trim(),
      addressLine1: (formData.addressLine1 || formData.address).trim(),
      addressLine2: formData.addressLine2.trim(),
      locality: formData.locality.trim(),
      landmark: formData.landmark.trim(),
      formattedAddress: (formData.formattedAddress || formData.address).trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      country: formData.country || 'India',
      name: formData.name.trim(),
      contactName: formData.contactName.trim(),
      contactPhone: cleanedPhone,
      contactEmail: formData.contactEmail.trim(),
    };

    if (editingProperty) {
      updateProperty(editingProperty.id, payload);
    } else {
      addProperty(payload);
    }
    handleCloseDialog();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl">Properties & Rooms</h1>
          <p className="text-gray-600 mt-1">Manage all your PG properties and room configurations</p>
        </div>
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">Total Properties</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-gray-900 text-3xl font-bold tracking-tight">{properties.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">Total Floors</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-gray-900 text-3xl font-bold tracking-tight">
              {properties.reduce((sum, p) => sum + p.floors, 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">Total Rooms</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-gray-900 text-3xl font-bold tracking-tight">
              {properties.reduce((sum, p) => sum + p.rooms.length, 0)}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm font-semibold tracking-wide uppercase">Total Beds</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
              <Bed className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-gray-900 text-3xl font-bold tracking-tight">
              {properties.reduce((sum, p) => sum + p.rooms.reduce((s, r) => s + r.beds, 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Properties List with Expandable Room Management */}
      <div className="space-y-4">
        {properties.map((property) => (
          <div
            key={property.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Property Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2"></div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg">{property.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Added on {new Date(property.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePropertyExpansion(property.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Manage Rooms"
                  >
                    {expandedProperty === property.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenDialog(property)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p>{property.address}</p>
                    <p className="text-gray-500">
                      {property.city}, {property.state} - {property.pincode}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Floors</p>
                    <p className="text-sm mt-1">{property.floors}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rooms</p>
                    <p className="text-sm mt-1">{property.rooms.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Beds</p>
                    <p className="text-sm mt-1">{property.rooms.reduce((sum, r) => sum + r.beds, 0)}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <p className="text-xs text-gray-500">Contact Person</p>
                  <p className="text-sm">{property.contactName}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3 h-3" />
                    {property.contactPhone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-3 h-3" />
                    {property.contactEmail}
                  </div>
                </div>
              </div>

              {/* Expandable Room Management Section */}
              {expandedProperty === property.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base">Room Management</h4>
                    <button
                      onClick={() => handleOpenRoomDialog(property.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
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
                        <div key={floor} className="bg-gray-50 rounded-lg p-4">
                          <h5 className="text-sm mb-3">
                            Floor {floor} - {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}
                          </h5>
                          {floorRooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {floorRooms.map((room) => (
                                <div key={room.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="text-sm">Room {room.number}</p>
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
                                  <p className="text-xs text-gray-600 mb-2">Rent: ₹{room.rent.toLocaleString()}</p>
                                  {room.occupiedBeds !== undefined && room.occupiedBeds > 0 && (
                                    <p className="text-xs text-gray-600 mb-2">
                                      Occupied: {room.occupiedBeds}/{room.beds} beds
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <button
                                      onClick={() => handleOpenRoomDialog(property.id, room)}
                                      className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRoom(property.id, room.id)}
                                      className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
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
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
              <button
                onClick={handleCloseDialog}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                <h3 className="text-sm text-gray-500 uppercase tracking-wide">
                  Property Details
                </h3>
                
                <div>
                  <label className="block text-sm mb-2">Property Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Green Valley PG"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Address Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: e.target.value,
                          addressLine1: e.target.value,
                          formattedAddress: '',
                          latitude: null,
                          longitude: null,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type an address, landmark, pincode or city name…"
                    />

                    {(isAddressLookupLoading || addressSuggestions.length > 0) && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl">
                        {isAddressLookupLoading && (
                          <p className="px-4 py-3 text-sm text-gray-500">Searching via OpenStreetMap…</p>
                        )}

                        {!isAddressLookupLoading && addressSuggestions.length > 0 && (
                          <ul className="max-h-60 overflow-y-auto py-1">
                            {addressSuggestions.map((suggestion) => (
                              <li key={suggestion.id}>
                                <button
                                  type="button"
                                  onClick={() => applyAddressSuggestion(suggestion)}
                                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0"
                                >
                                  <p className="text-sm text-gray-900">{suggestion.addressLine1 || suggestion.formattedAddress.split(',')[0]}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                                    {[suggestion.locality, suggestion.city, suggestion.state, suggestion.pincode].filter(Boolean).join(', ')}
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Select a suggestion to auto-fill fields below, or fill them manually.
                  </p>

                  {formData.latitude !== null && formData.longitude !== null && (
                    <p className="mt-1 text-xs text-green-600">
                      ✓ Coordinates captured: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                    </p>
                  )}
                </div>

                {/* Address Line 1 - always visible and required */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="House no., building, street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Address Line 2 (optional)</label>
                    <input
                      type="text"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Apartment, wing, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Locality (optional)</label>
                    <input
                      type="text"
                      value={formData.locality}
                      onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Area or neighborhood"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Landmark (optional)</label>
                    <input
                      type="text"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nearby landmark"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      value={formData.pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setFormData({ ...formData, pincode: val });
                        const err = val.length > 0 && val.length !== 6 ? 'Pincode must be exactly 6 digits.' : '';
                        setFieldErrors((prev) => ({ ...prev, pincode: err }));
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.pincode ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="560001"
                    />
                    {fieldErrors.pincode && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{fieldErrors.pincode}
                      </p>
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
                    onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can add rooms to each floor after creating the property</p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h3 className="text-sm text-gray-500 uppercase tracking-wide">
                  Contact Details
                </h3>

                <div>
                  <label className="block text-sm mb-2">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={15}
                      inputMode="numeric"
                      value={formData.contactPhone}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setFormData({ ...formData, contactPhone: raw });
                        const { error: phoneErr } = normaliseAndValidatePhone(raw);
                        setFieldErrors((prev) => ({ ...prev, contactPhone: raw.length > 0 ? phoneErr : '' }));
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.contactPhone ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="9876543210 (10 digits)"
                    />
                    {fieldErrors.contactPhone ? (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{fieldErrors.contactPhone}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Enter 10-digit Indian mobile (no country code).</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email Address (optional)</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => {
                        setFormData({ ...formData, contactEmail: e.target.value });
                      }}
                      maxLength={254}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="contact@property.com"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h2>
              <button
                onClick={handleCloseRoomDialog}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
