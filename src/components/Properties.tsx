import { useState } from 'react';
import {
  Plus, Building2, MapPin, ChevronDown, ChevronRight,
  Edit, Trash, Bed, Home, Layers, Save, AlertTriangle, Loader2,
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
import type { Property, Room } from '../contexts/PropertyContext';

interface PropertiesV2Props {
  onNavigate: (screen: string) => void;
}

const emptyPropertyForm = () => ({
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  floors: 1,
  totalRooms: 0,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
});

type RoomType = 'single' | 'double' | 'triple';
type RoomStatus = 'occupied' | 'vacant' | 'maintenance';

const roomTypeBeds: Record<RoomType, number> = { single: 1, double: 2, triple: 3 };

const statusLabel: Record<RoomStatus, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  maintenance: 'Maintenance',
};

const statusColor: Record<RoomStatus, string> = {
  occupied: 'bg-green-100 text-green-700',
  vacant: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-amber-100 text-amber-700',
};

export function Properties({ onNavigate: _onNavigate }: PropertiesV2Props) {
  const {
    properties, isLoading,
    addProperty, updateProperty, deleteProperty,
    addRoom, updateRoom, deleteRoom,
  } = useProperty();

  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Add Property
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyPropertyForm());
  const [addSaving, setAddSaving] = useState(false);

  // Edit Property
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete Property
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);

  // Add Room
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addRoomPropertyId, setAddRoomPropertyId] = useState('');
  const [newRoom, setNewRoom] = useState({ number: '', floor: 1, type: 'single' as RoomType, rent: 0 });

  // Edit Room
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomPropertyId, setEditRoomPropertyId] = useState('');

  // Delete Room
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<{ room: Room; propertyId: string } | null>(null);

  const totalBeds = properties.reduce((s, p) => s + p.rooms.reduce((rs, r) => rs + r.beds, 0), 0);
  const totalRooms = properties.reduce((s, p) => s + p.rooms.length, 0);

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2, color: 'from-purple-500 to-pink-500' },
    { label: 'Total Floors', value: properties.reduce((s, p) => s + p.floors, 0), icon: Layers, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Rooms', value: totalRooms, icon: Home, color: 'from-green-500 to-emerald-500' },
    { label: 'Total Beds', value: totalBeds, icon: Bed, color: 'from-orange-500 to-amber-500' },
  ];

  const handleAddProperty = async () => {
    if (!addForm.name || !addForm.address || !addForm.city) {
      toast.error('Name, address and city are required');
      return;
    }
    setAddSaving(true);
    try {
      await addProperty(addForm);
      setAddPropertyOpen(false);
      setAddForm(emptyPropertyForm());
      toast.success('Property added successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add property');
    } finally {
      setAddSaving(false);
    }
  };

  const handleEditProperty = async () => {
    if (!editingProperty) return;
    setEditSaving(true);
    try {
      await updateProperty(editingProperty.id, {
        name: editingProperty.name,
        address: editingProperty.address,
        city: editingProperty.city,
        state: editingProperty.state,
        pincode: editingProperty.pincode,
        floors: editingProperty.floors,
        contactName: editingProperty.contactName,
        contactPhone: editingProperty.contactPhone,
        contactEmail: editingProperty.contactEmail,
      });
      setEditPropertyOpen(false);
      setEditingProperty(null);
      toast.success('Property updated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update property');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteProperty = () => {
    if (!deletingProperty) return;
    deleteProperty(deletingProperty.id);
    setDeletePropertyOpen(false);
    setDeletingProperty(null);
    toast.success('Property deleted');
  };

  const handleAddRoom = () => {
    if (!newRoom.number || !newRoom.rent) {
      toast.error('Room number and rent are required');
      return;
    }
    addRoom(addRoomPropertyId, {
      number: newRoom.number,
      floor: newRoom.floor,
      type: newRoom.type,
      beds: roomTypeBeds[newRoom.type],
      rent: newRoom.rent,
      status: 'vacant',
      occupiedBeds: 0,
    });
    setAddRoomOpen(false);
    setNewRoom({ number: '', floor: 1, type: 'single', rent: 0 });
    toast.success('Room added');
  };

  const handleEditRoom = () => {
    if (!editingRoom || !editRoomPropertyId) return;
    updateRoom(editRoomPropertyId, editingRoom.id, {
      number: editingRoom.number,
      floor: editingRoom.floor,
      type: editingRoom.type,
      beds: editingRoom.beds,
      rent: editingRoom.rent,
      status: editingRoom.status,
    });
    setEditRoomOpen(false);
    setEditingRoom(null);
    toast.success('Room updated');
  };

  const handleDeleteRoom = () => {
    if (!deletingRoom) return;
    deleteRoom(deletingRoom.propertyId, deletingRoom.room.id);
    setDeleteRoomOpen(false);
    setDeletingRoom(null);
    toast.success('Room deleted');
  };

  if (isLoading) {
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
              Properties & Rooms
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage all your PG properties and room configurations</p>
          </div>
          <Button
            onClick={() => { setAddForm(emptyPropertyForm()); setAddPropertyOpen(true); }}
            className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] w-full md:w-auto shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 h-12 md:h-10"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-semibold">Add Property</span>
          </Button>
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
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {stat.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Properties list */}
      {properties.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No properties yet. Add your first property.</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {properties.map((property) => {
            const isExpanded = expandedProperty === property.id;
            const floors = Array.from(new Set(property.rooms.map((r) => r.floor))).sort((a, b) => b - a);

            return (
              <Card key={property.id} className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                {/* Property header */}
                <div className="bg-gradient-to-r from-purple-100 via-blue-50 to-purple-50 p-4 md:p-6 border-b border-purple-200">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#9333EA] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50">
                        <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
                          {property.name}
                        </h3>
                        <p className="text-sm md:text-base text-gray-700 flex items-center gap-1.5 mt-2">
                          <MapPin className="w-4 h-4 flex-shrink-0 text-purple-600" />
                          <span className="truncate font-medium">{property.address}{property.city ? `, ${property.city}` : ''}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 md:gap-4 mt-3">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs md:text-sm font-bold text-gray-900">{property.floors}</span>
                            <span className="text-xs text-gray-600">Floors</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
                            <Home className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs md:text-sm font-bold text-gray-900">{property.rooms.length}</span>
                            <span className="text-xs text-gray-600">Rooms</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
                            <Bed className="w-3.5 h-3.5 text-orange-600" />
                            <span className="text-xs md:text-sm font-bold text-gray-900">{property.rooms.reduce((s, r) => s + r.beds, 0)}</span>
                            <span className="text-xs text-gray-600">Beds</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end md:justify-start flex-shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                        className="h-10 w-10 md:h-9 md:w-9 p-0 rounded-full hover:bg-white hover:shadow-md transition-all"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-5 h-5 text-purple-600" />
                          : <ChevronRight className="w-5 h-5 text-purple-600" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setEditingProperty(property); setEditPropertyOpen(true); }}
                        className="h-10 w-10 md:h-9 md:w-9 p-0 rounded-full hover:bg-blue-100 hover:shadow-md transition-all"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setDeletingProperty(property); setDeletePropertyOpen(true); }}
                        className="h-10 w-10 md:h-9 md:w-9 p-0 rounded-full hover:bg-red-100 hover:shadow-md transition-all"
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact person */}
                  {(property.contactName || property.contactPhone || property.contactEmail) && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Contact Person</p>
                      <div className="flex flex-wrap gap-3 md:gap-6 text-sm">
                        {property.contactName && (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                              <span className="text-white text-xs font-bold">
                                {property.contactName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <span className="text-gray-900 font-semibold">{property.contactName}</span>
                          </div>
                        )}
                        {property.contactPhone && <span className="text-gray-700 font-medium">{property.contactPhone}</span>}
                        {property.contactEmail && <span className="text-gray-700">{property.contactEmail}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded room management (building view) */}
                {isExpanded && (
                  <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                      <h4 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Room Management
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => { setAddRoomPropertyId(property.id); setNewRoom({ number: '', floor: 1, type: 'single', rent: 0 }); setAddRoomOpen(true); }}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 w-full md:w-auto shadow-lg shadow-green-500/30 h-11 md:h-9"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="font-semibold">Add Room</span>
                      </Button>
                    </div>

                    {property.rooms.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No rooms yet. Add the first room.</p>
                    ) : (
                      <div className="space-y-6">
                        {floors.map((floor) => {
                          const floorRooms = property.rooms.filter((r) => r.floor === floor);
                          return (
                            <div key={floor} className="space-y-3">
                              <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 rounded-xl shadow-md">
                                <h5 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                                  <Layers className="w-5 h-5" />
                                  Floor {floor}
                                  <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">
                                    {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}
                                  </span>
                                </h5>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {floorRooms.map((room) => (
                                  <Card key={room.id} className="p-4 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                                          <span className="text-white font-bold text-sm">{room.number}</span>
                                        </div>
                                        <div>
                                          <h6 className="font-bold text-gray-900 text-base">{room.number}</h6>
                                          <p className="text-xs text-gray-600 font-medium capitalize">{room.type}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        <button
                                          className="p-2 hover:bg-blue-100 rounded-lg transition-all"
                                          onClick={() => { setEditingRoom(room); setEditRoomPropertyId(property.id); setEditRoomOpen(true); }}
                                        >
                                          <Edit className="w-4 h-4 text-blue-600" />
                                        </button>
                                        <button
                                          className="p-2 hover:bg-red-100 rounded-lg transition-all"
                                          onClick={() => { setDeletingRoom({ room, propertyId: property.id }); setDeleteRoomOpen(true); }}
                                        >
                                          <Trash className="w-4 h-4 text-red-600" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                                        <Bed className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                        <span className="text-sm font-bold text-gray-900">
                                          {room.beds} bed{room.beds > 1 ? 's' : ''}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                                        <span className="text-xs font-medium text-gray-600">Monthly Rent</span>
                                        <span className="text-base font-bold text-green-700">₹{room.rent.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${statusColor[room.status as RoomStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                                          {statusLabel[room.status as RoomStatus] ?? room.status}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                                          {room.occupiedBeds ?? 0}/{room.beds} occupied
                                        </span>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Add New Property
            </DialogTitle>
            <DialogDescription>Enter the details of your new property</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Property Name *</Label>
              <Input placeholder="e.g., Sunshine Residency" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Address *</Label>
              <Input placeholder="e.g., 123 MG Road, Indiranagar" value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} className="h-11" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">City *</Label>
                <Input placeholder="Bangalore" value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">State</Label>
                <Input placeholder="Karnataka" value={addForm.state} onChange={(e) => setAddForm({ ...addForm, state: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Pincode</Label>
                <Input placeholder="560001" value={addForm.pincode} onChange={(e) => setAddForm({ ...addForm, pincode: e.target.value })} className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Number of Floors</Label>
              <Input type="number" min="1" value={addForm.floors} onChange={(e) => setAddForm({ ...addForm, floors: parseInt(e.target.value) || 1 })} className="h-11" />
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-gray-900 mb-4">Contact Person</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Name</Label>
                  <Input placeholder="e.g., Ramesh Kumar" value={addForm.contactName} onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })} className="h-11" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Phone</Label>
                    <InternationalPhoneField value={addForm.contactPhone} onChange={(v) => setAddForm({ ...addForm, contactPhone: v })} placeholder="9876543210" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Email</Label>
                    <Input type="email" placeholder="ramesh@example.com" value={addForm.contactEmail} onChange={(e) => setAddForm({ ...addForm, contactEmail: e.target.value })} className="h-11" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddPropertyOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddProperty()} disabled={addSaving} className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9]">
              {addSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Add Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Property Modal */}
      <Dialog open={editPropertyOpen} onOpenChange={setEditPropertyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit Property
            </DialogTitle>
            <DialogDescription>Update the property details</DialogDescription>
          </DialogHeader>
          {editingProperty && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Property Name *</Label>
                <Input value={editingProperty.name} onChange={(e) => setEditingProperty({ ...editingProperty, name: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Address</Label>
                <Input value={editingProperty.address} onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })} className="h-11" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">City</Label>
                  <Input value={editingProperty.city} onChange={(e) => setEditingProperty({ ...editingProperty, city: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">State</Label>
                  <Input value={editingProperty.state ?? ''} onChange={(e) => setEditingProperty({ ...editingProperty, state: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Pincode</Label>
                  <Input value={editingProperty.pincode ?? ''} onChange={(e) => setEditingProperty({ ...editingProperty, pincode: e.target.value })} className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Number of Floors</Label>
                <Input type="number" min="1" value={editingProperty.floors} onChange={(e) => setEditingProperty({ ...editingProperty, floors: parseInt(e.target.value) || 1 })} className="h-11" />
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-4">Contact Person</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Name</Label>
                    <Input value={editingProperty.contactName} onChange={(e) => setEditingProperty({ ...editingProperty, contactName: e.target.value })} className="h-11" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Phone</Label>
                      <InternationalPhoneField value={editingProperty.contactPhone} onChange={(v) => setEditingProperty({ ...editingProperty, contactPhone: v })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Email</Label>
                      <Input type="email" value={editingProperty.contactEmail} onChange={(e) => setEditingProperty({ ...editingProperty, contactEmail: e.target.value })} className="h-11" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPropertyOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleEditProperty()} disabled={editSaving} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              {editSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Property Modal */}
      <AlertDialog open={deletePropertyOpen} onOpenChange={setDeletePropertyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Delete Property?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deletingProperty?.name}</strong>? All rooms in this property will also be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Room Modal */}
      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Add New Room
            </DialogTitle>
            <DialogDescription>Enter room details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Room Number *</Label>
                <Input placeholder="e.g., 301" value={newRoom.number} onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Floor *</Label>
                <Input type="number" min="0" value={newRoom.floor} onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })} className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Room Type *</Label>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as RoomType })}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="single">Single (1 bed)</option>
                <option value="double">Double (2 beds)</option>
                <option value="triple">Triple (3 beds)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Monthly Rent (₹) *</Label>
              <Input type="number" min="0" placeholder="8000" value={newRoom.rent || ''} onChange={(e) => setNewRoom({ ...newRoom, rent: parseInt(e.target.value) || 0 })} className="h-11" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddRoomOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
              <Save className="w-4 h-4 mr-2" /> Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Modal */}
      <Dialog open={editRoomOpen} onOpenChange={setEditRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit Room
            </DialogTitle>
            <DialogDescription>Update room details</DialogDescription>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Room Number *</Label>
                  <Input value={editingRoom.number} onChange={(e) => setEditingRoom({ ...editingRoom, number: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Floor *</Label>
                  <Input type="number" min="0" value={editingRoom.floor} onChange={(e) => setEditingRoom({ ...editingRoom, floor: parseInt(e.target.value) || 1 })} className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Room Type *</Label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => {
                    const t = e.target.value as RoomType;
                    setEditingRoom({ ...editingRoom, type: t, beds: roomTypeBeds[t] });
                  }}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="single">Single (1 bed)</option>
                  <option value="double">Double (2 beds)</option>
                  <option value="triple">Triple (3 beds)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Monthly Rent (₹) *</Label>
                <Input type="number" min="0" value={editingRoom.rent} onChange={(e) => setEditingRoom({ ...editingRoom, rent: parseInt(e.target.value) || 0 })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <select
                  value={editingRoom.status}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as RoomStatus })}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditRoomOpen(false)}>Cancel</Button>
            <Button onClick={handleEditRoom} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <Save className="w-4 h-4 mr-2" /> Update Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Room Modal */}
      <AlertDialog open={deleteRoomOpen} onOpenChange={setDeleteRoomOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Delete Room?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete room <strong>{deletingRoom?.room.number}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
