import { useEffect, useState } from 'react';
import {
  Plus, Building2, MapPin, ChevronDown, ChevronRight,
  Edit, Trash, Bed, Home, Layers, Save, AlertTriangle, Loader2,
  Crown, TrendingUp,
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
import { supabaseOwnerDataApi } from '../services/supabaseData';
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

// Starter plan allows 1 property; Pro/Business are unlimited
const STARTER_PROPERTY_LIMIT = 1;

export function Properties({ onNavigate }: PropertiesV2Props) {
  const {
    properties, isLoading,
    addProperty, updateProperty, deleteProperty,
    addRoom, updateRoom, deleteRoom,
  } = useProperty();

  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Plan limit gate
  const [planCode, setPlanCode] = useState<string>('starter');
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  useEffect(() => {
    supabaseOwnerDataApi.getOwnerSubscription()
      .then((sub) => setPlanCode(sub.planCode))
      .catch(() => { /* stay on starter defaults */ });
  }, []);

  const isUnlimited = planCode !== 'starter';
  const atPropertyLimit = !isUnlimited && properties.length >= STARTER_PROPERTY_LIMIT;

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
    { label: 'Total Properties', value: properties.length, icon: Building2 },
    { label: 'Total Floors', value: properties.reduce((s, p) => s + p.floors, 0), icon: Layers },
    { label: 'Total Rooms', value: totalRooms, icon: Home },
    { label: 'Total Beds', value: totalBeds, icon: Bed },
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
    // Check for rooms with active occupancy before deleting
    const occupiedRooms = deletingProperty.rooms.filter((r) => r.status === 'occupied');
    if (occupiedRooms.length > 0) {
      toast.error(`Cannot delete: ${occupiedRooms.length} room${occupiedRooms.length > 1 ? 's are' : ' is'} currently occupied. Vacate all tenants first.`);
      setDeletePropertyOpen(false);
      setDeletingProperty(null);
      return;
    }
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
      <div className="space-y-4 animate-pulse">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ds-card" style={{ height: 86, padding: 16 }}>
              <div style={{ height: 10, background: '#F4F4F6', borderRadius: 4, width: '50%', marginBottom: 8 }} />
              <div style={{ height: 22, background: '#F4F4F6', borderRadius: 4, width: '65%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 80 }}>
      {/* ── Header ─────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Properties</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} · {totalRooms} rooms · {totalBeds} beds
          </p>
        </div>
        <button
          onClick={() => {
            if (atPropertyLimit) { setLimitModalOpen(true); return; }
            setAddForm(emptyPropertyForm()); setAddPropertyOpen(true);
          }}
          className="ds-btn ds-btn-primary"
          style={{ fontSize: 12, padding: '6px 14px', gap: 6 }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Add Property
        </button>
      </div>

      {/* ── Portfolio KPIs ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="ds-card flex items-start justify-between" style={{ padding: '14px 16px', gap: 12 }}>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0B', letterSpacing: '-0.03em', lineHeight: 1 }}>{stat.value}</p>
              </div>
              <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: '#EEF2FF' }}>
                <Icon style={{ width: 16, height: 16, color: '#6366F1', strokeWidth: 1.75 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Properties list ─────────────────── */}
      {properties.length === 0 ? (
        <div className="ds-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Building2 style={{ width: 36, height: 36, color: '#D4D4D8', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#A1A1AA' }}>No properties yet. Add your first property.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {properties.map((property) => {
            const isExpanded = expandedProperty === property.id;
            const floors = Array.from(new Set(property.rooms.map((r) => r.floor))).sort((a, b) => b - a);

            // Operational summary
            const totalRoomsInProp = property.rooms.length;
            const occupiedRooms = property.rooms.filter((r) => r.status === 'occupied').length;
            const vacantRooms = property.rooms.filter((r) => r.status === 'vacant').length;
            const totalBedsInProp = property.rooms.reduce((s, r) => s + r.beds, 0);
            const occupiedBeds = property.rooms.reduce((s, r) => s + (r.occupiedBeds ?? 0), 0);
            const occupancyPct = totalRoomsInProp > 0 ? Math.round((occupiedRooms / totalRoomsInProp) * 100) : 0;
            const revenueTotal = property.rooms.reduce((s, r) => s + r.rent * (r.occupiedBeds ?? (r.status === 'occupied' ? 1 : 0)), 0);

            return (
              <div key={property.id} className="ds-card" style={{ overflow: 'hidden' }}>
                {/* Property header */}
                <div style={{ padding: '16px 18px' }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-xl"
                        style={{ width: 40, height: 40, background: '#EEF2FF' }}
                      >
                        <Building2 style={{ width: 18, height: 18, color: '#6366F1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0B' }}>{property.name}</p>
                        <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#A1A1AA', marginTop: 2 }}>
                          <MapPin style={{ width: 11, height: 11, flexShrink: 0 }} />
                          <span className="truncate">{property.address}{property.city ? `, ${property.city}` : ''}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        title="Building View"
                        onClick={() => onNavigate('building-view')}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
                      >
                        <Building2 style={{ width: 12, height: 12, color: '#6366F1' }} />
                        View
                      </button>
                      <button
                        onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 8px', gap: 4 }}
                      >
                        {isExpanded ? <ChevronDown style={{ width: 13, height: 13 }} /> : <ChevronRight style={{ width: 13, height: 13 }} />}
                        Rooms
                      </button>
                      <button
                        onClick={() => { setEditingProperty(property); setEditPropertyOpen(true); }}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0 }}
                      >
                        <Edit style={{ width: 12, height: 12 }} />
                      </button>
                      <button
                        onClick={() => { setDeletingProperty(property); setDeletePropertyOpen(true); }}
                        className="ds-btn ds-btn-secondary"
                        style={{ fontSize: 11, padding: '4px 6px', minWidth: 0, color: '#DC2626' }}
                      >
                        <Trash style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>

                  {/* Operational summary */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid #F4F4F6',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {[
                      { label: 'Occupancy', value: `${occupancyPct}%`, sub: `${occupiedRooms}/${totalRoomsInProp} rooms`, color: occupancyPct >= 80 ? '#059669' : occupancyPct >= 50 ? '#D97706' : '#A1A1AA' },
                      { label: 'Vacant', value: vacantRooms.toString(), sub: `${totalBedsInProp - occupiedBeds} beds free`, color: vacantRooms > 0 ? '#6366F1' : '#A1A1AA' },
                      { label: 'Floors', value: property.floors.toString(), sub: `${totalRoomsInProp} rooms`, color: '#52525B' },
                      { label: 'Revenue', value: `₹${revenueTotal > 0 ? (revenueTotal / 1000).toFixed(0) + 'k' : '0'}`, sub: 'Active tenants', color: '#059669' },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} style={{ padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</p>
                        <p style={{ fontSize: 10, color: '#A1A1AA', marginTop: 2 }}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Occupancy progress bar */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ width: '100%', background: '#F1F1F3', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: 4,
                        width: `${occupancyPct}%`,
                        borderRadius: 99,
                        background: occupancyPct >= 80 ? '#059669' : occupancyPct >= 50 ? '#D97706' : '#6366F1',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>

                  {/* Contact person */}
                  {(property.contactName || property.contactPhone) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F4F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-lg"
                        style={{ width: 24, height: 24, background: '#EEF2FF' }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#6366F1' }}>
                          {(property.contactName || '?').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#52525B' }}>{property.contactName}</span>
                      {property.contactPhone && <span style={{ fontSize: 12, color: '#A1A1AA' }}>· {property.contactPhone}</span>}
                    </div>
                  )}
                </div>

                {/* Expanded room management */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F4F4F6', padding: '16px 18px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-between mb-4">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Rooms</p>
                      <button
                        onClick={() => { setAddRoomPropertyId(property.id); setNewRoom({ number: '', floor: 1, type: 'single', rent: 0 }); setAddRoomOpen(true); }}
                        className="ds-btn ds-btn-primary"
                        style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}
                      >
                        <Plus style={{ width: 12, height: 12 }} /> Add Room
                      </button>
                    </div>

                    {property.rooms.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#A1A1AA', textAlign: 'center', padding: '24px 0' }}>No rooms yet. Add the first room.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {floors.map((floor) => {
                          const floorRooms = property.rooms.filter((r) => r.floor === floor);
                          return (
                            <div key={floor}>
                              <div
                                className="flex items-center justify-between"
                                style={{ marginBottom: 8 }}
                              >
                                <p style={{ fontSize: 11, fontWeight: 600, color: '#6366F1', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  Floor {floor}
                                </p>
                                <span style={{ fontSize: 11, color: '#A1A1AA' }}>{floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}</span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                                {floorRooms.map((room) => (
                                  <div
                                    key={room.id}
                                    style={{
                                      padding: '10px 12px',
                                      border: `1px solid ${room.status === 'occupied' ? '#A7F3D0' : room.status === 'maintenance' ? '#FDE68A' : '#E4E4E7'}`,
                                      borderRadius: 8,
                                      background: room.status === 'occupied' ? '#F0FDF4' : room.status === 'maintenance' ? '#FFFBEB' : '#fff',
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B' }}>Room {room.number}</p>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => { setEditingRoom(room); setEditRoomPropertyId(property.id); setEditRoomOpen(true); }}
                                          className="ds-btn ds-btn-secondary"
                                          style={{ fontSize: 10, padding: '2px 5px', minWidth: 0 }}
                                        >
                                          <Edit style={{ width: 11, height: 11 }} />
                                        </button>
                                        <button
                                          onClick={() => { setDeletingRoom({ room, propertyId: property.id }); setDeleteRoomOpen(true); }}
                                          className="ds-btn ds-btn-secondary"
                                          style={{ fontSize: 10, padding: '2px 5px', minWidth: 0, color: '#DC2626' }}
                                        >
                                          <Trash style={{ width: 11, height: 11 }} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span style={{ fontSize: 11, color: '#71717A', textTransform: 'capitalize' }}>{room.type}</span>
                                        <span style={{ fontSize: 11, color: '#71717A' }}>{room.beds}b</span>
                                      </div>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                        ₹{room.rent.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1.5">
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: room.status === 'occupied' ? '#ECFDF5' : room.status === 'maintenance' ? '#FFFBEB' : '#EEF2FF', color: room.status === 'occupied' ? '#065F46' : room.status === 'maintenance' ? '#92400E' : '#4338CA' }}>
                                        {statusLabel[room.status as RoomStatus] ?? room.status}
                                      </span>
                                      <span style={{ fontSize: 10, color: '#A1A1AA' }}>{room.occupiedBeds ?? 0}/{room.beds} occ</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Property Modal */}
      <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>
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
            <Button onClick={() => void handleAddProperty()} disabled={addSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>
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
            <Button onClick={() => void handleEditProperty()} disabled={editSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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

      {/* Property Limit Modal */}
      <AlertDialog open={limitModalOpen} onOpenChange={setLimitModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-indigo-700">
              <Crown className="w-5 h-5" /> Property Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Your <strong>Starter</strong> plan includes 1 property. You currently have {properties.length}.</p>
              <p>Upgrade to <strong>Pro</strong> for unlimited properties, team collaboration, and WhatsApp messaging.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setLimitModalOpen(false); onNavigate('settings'); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              View Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Room Modal */}
      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>
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
            <Button onClick={handleAddRoom} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Modal */}
      <Dialog open={editRoomOpen} onOpenChange={setEditRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0B' }}>
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
            <Button onClick={handleEditRoom} className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
