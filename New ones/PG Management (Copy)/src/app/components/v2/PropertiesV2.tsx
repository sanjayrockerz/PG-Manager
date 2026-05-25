'use client';

import { useState } from 'react';
import { Plus, Building2, MapPin, ChevronDown, ChevronRight, Edit, Trash, Bed, Home, Layers, X, Save, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  floors: number;
  rooms: number;
  beds: number;
  dateAdded: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
}

interface Room {
  id: string;
  propertyId: string;
  number: string;
  floor: number;
  type: 'Single' | 'Double' | 'Triple';
  beds: number;
  rent: number;
  status: 'Occupied' | 'Vacant' | 'Maintenance';
  occupiedBeds: number;
}

const initialProperties: Property[] = [
  {
    id: '1',
    name: 'Sunshine Residency',
    address: '123 MG Road, Indiranagar',
    city: 'Bangalore',
    floors: 3,
    rooms: 4,
    beds: 6,
    dateAdded: 'Jan 15, 2025',
    contact: { name: 'Ramesh Kumar', phone: '+91 98765 43210', email: 'ramesh@example.com' },
  },
  {
    id: '2',
    name: 'Lakeview PG',
    address: '456 HSR Layout',
    city: 'Bangalore',
    floors: 2,
    rooms: 3,
    beds: 4,
    dateAdded: 'Feb 1, 2025',
    contact: { name: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@example.com' },
  },
  {
    id: '3',
    name: 'Green Valley Apartments',
    address: '789 Whitefield Main Road',
    city: 'Bangalore',
    floors: 4,
    rooms: 8,
    beds: 12,
    dateAdded: 'Mar 10, 2025',
    contact: { name: 'Suresh Reddy', phone: '+91 98765 43212', email: 'suresh@example.com' },
  },
  {
    id: '4',
    name: 'Ocean View Plaza',
    address: '321 Koramangala 5th Block',
    city: 'Bangalore',
    floors: 3,
    rooms: 6,
    beds: 9,
    dateAdded: 'Apr 5, 2025',
    contact: { name: 'Anjali Patel', phone: '+91 98765 43213', email: 'anjali@example.com' },
  },
  {
    id: '5',
    name: 'Maple Heights PG',
    address: '654 BTM Layout Stage 2',
    city: 'Bangalore',
    floors: 2,
    rooms: 5,
    beds: 7,
    dateAdded: 'May 1, 2025',
    contact: { name: 'Vikram Singh', phone: '+91 98765 43214', email: 'vikram@example.com' },
  },
  {
    id: '6',
    name: 'Sunrise Residency',
    address: '987 Jayanagar 4th Block',
    city: 'Bangalore',
    floors: 3,
    rooms: 7,
    beds: 10,
    dateAdded: 'Dec 20, 2024',
    contact: { name: 'Meera Krishnan', phone: '+91 98765 43215', email: 'meera@example.com' },
  },
  {
    id: '7',
    name: 'Paradise Stays',
    address: '456 Electronic City Phase 1',
    city: 'Bangalore',
    floors: 5,
    rooms: 10,
    beds: 15,
    dateAdded: 'Nov 15, 2024',
    contact: { name: 'Arjun Mehta', phone: '+91 98765 43216', email: 'arjun@example.com' },
  },
  {
    id: '8',
    name: 'Comfort Inn PG',
    address: '234 Marathahalli Ring Road',
    city: 'Bangalore',
    floors: 2,
    rooms: 4,
    beds: 6,
    dateAdded: 'Oct 10, 2024',
    contact: { name: 'Kavita Sharma', phone: '+91 98765 43217', email: 'kavita@example.com' },
  },
];

const initialRooms: Room[] = [
  // Sunshine Residency (Property 1)
  { id: '1', propertyId: '1', number: '301', floor: 3, type: 'Single', beds: 1, rent: 8000, status: 'Occupied', occupiedBeds: 1 },
  { id: '2', propertyId: '1', number: '302', floor: 3, type: 'Single', beds: 1, rent: 8000, status: 'Vacant', occupiedBeds: 0 },
  { id: '3', propertyId: '1', number: '201', floor: 2, type: 'Double', beds: 2, rent: 7500, status: 'Occupied', occupiedBeds: 2 },
  { id: '4', propertyId: '1', number: '101', floor: 1, type: 'Single', beds: 1, rent: 7000, status: 'Maintenance', occupiedBeds: 0 },

  // Lakeview PG (Property 2)
  { id: '5', propertyId: '2', number: '201', floor: 2, type: 'Single', beds: 1, rent: 9000, status: 'Occupied', occupiedBeds: 1 },
  { id: '6', propertyId: '2', number: '202', floor: 2, type: 'Double', beds: 2, rent: 8500, status: 'Vacant', occupiedBeds: 0 },
  { id: '7', propertyId: '2', number: '101', floor: 1, type: 'Single', beds: 1, rent: 8000, status: 'Occupied', occupiedBeds: 1 },

  // Green Valley Apartments (Property 3)
  { id: '8', propertyId: '3', number: '401', floor: 4, type: 'Triple', beds: 3, rent: 7000, status: 'Occupied', occupiedBeds: 3 },
  { id: '9', propertyId: '3', number: '402', floor: 4, type: 'Double', beds: 2, rent: 8000, status: 'Vacant', occupiedBeds: 0 },
  { id: '10', propertyId: '3', number: '301', floor: 3, type: 'Single', beds: 1, rent: 9000, status: 'Occupied', occupiedBeds: 1 },
  { id: '11', propertyId: '3', number: '302', floor: 3, type: 'Double', beds: 2, rent: 8500, status: 'Occupied', occupiedBeds: 2 },
  { id: '12', propertyId: '3', number: '201', floor: 2, type: 'Single', beds: 1, rent: 8500, status: 'Vacant', occupiedBeds: 0 },
  { id: '13', propertyId: '3', number: '202', floor: 2, type: 'Triple', beds: 3, rent: 7200, status: 'Occupied', occupiedBeds: 2 },
  { id: '14', propertyId: '3', number: '101', floor: 1, type: 'Double', beds: 2, rent: 8000, status: 'Occupied', occupiedBeds: 1 },
  { id: '15', propertyId: '3', number: '102', floor: 1, type: 'Single', beds: 1, rent: 8800, status: 'Maintenance', occupiedBeds: 0 },

  // Ocean View Plaza (Property 4)
  { id: '16', propertyId: '4', number: '301', floor: 3, type: 'Double', beds: 2, rent: 10000, status: 'Occupied', occupiedBeds: 2 },
  { id: '17', propertyId: '4', number: '302', floor: 3, type: 'Single', beds: 1, rent: 11000, status: 'Vacant', occupiedBeds: 0 },
  { id: '18', propertyId: '4', number: '201', floor: 2, type: 'Triple', beds: 3, rent: 9000, status: 'Occupied', occupiedBeds: 3 },
  { id: '19', propertyId: '4', number: '202', floor: 2, type: 'Double', beds: 2, rent: 9500, status: 'Occupied', occupiedBeds: 1 },
  { id: '20', propertyId: '4', number: '101', floor: 1, type: 'Single', beds: 1, rent: 10500, status: 'Vacant', occupiedBeds: 0 },
  { id: '21', propertyId: '4', number: '102', floor: 1, type: 'Double', beds: 2, rent: 9800, status: 'Occupied', occupiedBeds: 2 },

  // Maple Heights PG (Property 5)
  { id: '22', propertyId: '5', number: '201', floor: 2, type: 'Single', beds: 1, rent: 7500, status: 'Occupied', occupiedBeds: 1 },
  { id: '23', propertyId: '5', number: '202', floor: 2, type: 'Double', beds: 2, rent: 7000, status: 'Vacant', occupiedBeds: 0 },
  { id: '24', propertyId: '5', number: '203', floor: 2, type: 'Single', beds: 1, rent: 7500, status: 'Occupied', occupiedBeds: 1 },
  { id: '25', propertyId: '5', number: '101', floor: 1, type: 'Triple', beds: 3, rent: 6500, status: 'Occupied', occupiedBeds: 2 },
  { id: '26', propertyId: '5', number: '102', floor: 1, type: 'Double', beds: 2, rent: 7200, status: 'Maintenance', occupiedBeds: 0 },

  // Sunrise Residency (Property 6)
  { id: '27', propertyId: '6', number: '301', floor: 3, type: 'Single', beds: 1, rent: 8500, status: 'Occupied', occupiedBeds: 1 },
  { id: '28', propertyId: '6', number: '302', floor: 3, type: 'Double', beds: 2, rent: 8000, status: 'Vacant', occupiedBeds: 0 },
  { id: '29', propertyId: '6', number: '303', floor: 3, type: 'Single', beds: 1, rent: 8500, status: 'Occupied', occupiedBeds: 1 },
  { id: '30', propertyId: '6', number: '201', floor: 2, type: 'Triple', beds: 3, rent: 7500, status: 'Occupied', occupiedBeds: 3 },
  { id: '31', propertyId: '6', number: '202', floor: 2, type: 'Double', beds: 2, rent: 7800, status: 'Occupied', occupiedBeds: 2 },
  { id: '32', propertyId: '6', number: '101', floor: 1, type: 'Single', beds: 1, rent: 8200, status: 'Vacant', occupiedBeds: 0 },
  { id: '33', propertyId: '6', number: '102', floor: 1, type: 'Double', beds: 2, rent: 7600, status: 'Occupied', occupiedBeds: 1 },

  // Paradise Stays (Property 7)
  { id: '34', propertyId: '7', number: '501', floor: 5, type: 'Single', beds: 1, rent: 9500, status: 'Occupied', occupiedBeds: 1 },
  { id: '35', propertyId: '7', number: '502', floor: 5, type: 'Double', beds: 2, rent: 9000, status: 'Vacant', occupiedBeds: 0 },
  { id: '36', propertyId: '7', number: '401', floor: 4, type: 'Triple', beds: 3, rent: 8500, status: 'Occupied', occupiedBeds: 3 },
  { id: '37', propertyId: '7', number: '402', floor: 4, type: 'Double', beds: 2, rent: 8800, status: 'Occupied', occupiedBeds: 2 },
  { id: '38', propertyId: '7', number: '301', floor: 3, type: 'Single', beds: 1, rent: 9200, status: 'Vacant', occupiedBeds: 0 },
  { id: '39', propertyId: '7', number: '302', floor: 3, type: 'Triple', beds: 3, rent: 8300, status: 'Occupied', occupiedBeds: 2 },
  { id: '40', propertyId: '7', number: '201', floor: 2, type: 'Double', beds: 2, rent: 8600, status: 'Occupied', occupiedBeds: 2 },
  { id: '41', propertyId: '7', number: '202', floor: 2, type: 'Single', beds: 1, rent: 9000, status: 'Maintenance', occupiedBeds: 0 },
  { id: '42', propertyId: '7', number: '101', floor: 1, type: 'Triple', beds: 3, rent: 8000, status: 'Occupied', occupiedBeds: 3 },
  { id: '43', propertyId: '7', number: '102', floor: 1, type: 'Double', beds: 2, rent: 8400, status: 'Vacant', occupiedBeds: 0 },

  // Comfort Inn PG (Property 8)
  { id: '44', propertyId: '8', number: '201', floor: 2, type: 'Single', beds: 1, rent: 7800, status: 'Occupied', occupiedBeds: 1 },
  { id: '45', propertyId: '8', number: '202', floor: 2, type: 'Double', beds: 2, rent: 7200, status: 'Vacant', occupiedBeds: 0 },
  { id: '46', propertyId: '8', number: '101', floor: 1, type: 'Single', beds: 1, rent: 7500, status: 'Occupied', occupiedBeds: 1 },
  { id: '47', propertyId: '8', number: '102', floor: 1, type: 'Triple', beds: 3, rent: 6800, status: 'Occupied', occupiedBeds: 2 },
];

interface PropertiesV2Props {
  onNavigate: (screen: string) => void;
}

export function PropertiesV2({ onNavigate }: PropertiesV2Props) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Add Property Modal
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: '',
    address: '',
    city: '',
    floors: 1,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  });

  // Edit Property Modal
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Delete Property Modal
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);

  // Add Room Modal
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [addRoomPropertyId, setAddRoomPropertyId] = useState<string>('');
  const [newRoom, setNewRoom] = useState({
    number: '',
    floor: 1,
    type: 'Single' as 'Single' | 'Double' | 'Triple',
    rent: 0,
  });

  // Edit Room Modal
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Delete Room Modal
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

  const stats = [
    { label: 'Total Properties', value: properties.length, icon: Building2, color: 'from-purple-500 to-pink-500' },
    { label: 'Total Floors', value: properties.reduce((sum, p) => sum + p.floors, 0), icon: Layers, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Rooms', value: properties.reduce((sum, p) => sum + p.rooms, 0), icon: Home, color: 'from-green-500 to-emerald-500' },
    { label: 'Total Beds', value: properties.reduce((sum, p) => sum + p.beds, 0), icon: Bed, color: 'from-orange-500 to-amber-500' },
  ];

  // Add Property Handler
  const handleAddProperty = () => {
    if (!newProperty.name || !newProperty.address || !newProperty.city) {
      toast.error('Please fill all required fields');
      return;
    }

    const property: Property = {
      id: String(Date.now()),
      name: newProperty.name,
      address: newProperty.address,
      city: newProperty.city,
      floors: newProperty.floors,
      rooms: 0,
      beds: 0,
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      contact: {
        name: newProperty.contactName,
        phone: newProperty.contactPhone,
        email: newProperty.contactEmail,
      },
    };

    setProperties([...properties, property]);
    setAddPropertyOpen(false);
    setNewProperty({
      name: '',
      address: '',
      city: '',
      floors: 1,
      contactName: '',
      contactPhone: '',
      contactEmail: '',
    });
    toast.success('Property added successfully!');
  };

  // Edit Property Handler
  const handleEditProperty = () => {
    if (!editingProperty) return;

    setProperties(
      properties.map((p) =>
        p.id === editingProperty.id ? editingProperty : p
      )
    );
    setEditPropertyOpen(false);
    setEditingProperty(null);
    toast.success('Property updated successfully!');
  };

  // Delete Property Handler
  const handleDeleteProperty = () => {
    if (!deletingProperty) return;

    setProperties(properties.filter((p) => p.id !== deletingProperty.id));
    setRooms(rooms.filter((r) => r.propertyId !== deletingProperty.id));
    setDeletePropertyOpen(false);
    setDeletingProperty(null);
    toast.success('Property deleted successfully!');
  };

  // Add Room Handler
  const handleAddRoom = () => {
    if (!newRoom.number || !newRoom.rent) {
      toast.error('Please fill all required fields');
      return;
    }

    const bedsCount = newRoom.type === 'Single' ? 1 : newRoom.type === 'Double' ? 2 : 3;

    const room: Room = {
      id: String(Date.now()),
      propertyId: addRoomPropertyId,
      number: newRoom.number,
      floor: newRoom.floor,
      type: newRoom.type,
      beds: bedsCount,
      rent: newRoom.rent,
      status: 'Vacant',
      occupiedBeds: 0,
    };

    setRooms([...rooms, room]);

    // Update property room and bed counts
    setProperties(
      properties.map((p) =>
        p.id === addRoomPropertyId
          ? { ...p, rooms: p.rooms + 1, beds: p.beds + bedsCount }
          : p
      )
    );

    setAddRoomOpen(false);
    setNewRoom({
      number: '',
      floor: 1,
      type: 'Single',
      rent: 0,
    });
    toast.success('Room added successfully!');
  };

  // Edit Room Handler
  const handleEditRoom = () => {
    if (!editingRoom) return;

    setRooms(rooms.map((r) => (r.id === editingRoom.id ? editingRoom : r)));
    setEditRoomOpen(false);
    setEditingRoom(null);
    toast.success('Room updated successfully!');
  };

  // Delete Room Handler
  const handleDeleteRoom = () => {
    if (!deletingRoom) return;

    setRooms(rooms.filter((r) => r.id !== deletingRoom.id));

    // Update property room and bed counts
    setProperties(
      properties.map((p) =>
        p.id === deletingRoom.propertyId
          ? { ...p, rooms: p.rooms - 1, beds: p.beds - deletingRoom.beds }
          : p
      )
    );

    setDeleteRoomOpen(false);
    setDeletingRoom(null);
    toast.success('Room deleted successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Occupied':
        return 'bg-green-100 text-green-700';
      case 'Vacant':
        return 'bg-gray-100 text-gray-700';
      case 'Maintenance':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getFloorRooms = (propertyId: string, floor: number) => {
    return rooms.filter((r) => r.propertyId === propertyId && r.floor === floor);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Sticky Header with Gradient */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-blue-50 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Properties & Rooms
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage all your PG properties and room configurations</p>
          </div>
          <Button
            onClick={() => setAddPropertyOpen(true)}
            className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] w-full md:w-auto shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 h-12 md:h-10"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-semibold">Add Property</span>
          </Button>
        </div>
      </div>

      {/* Stats - Enhanced with gradients and icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
            >
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

      {/* Properties List */}
      <div className="space-y-4 md:space-y-6">
        {properties.map((property) => {
          const isExpanded = expandedProperty === property.id;
          const propertyRooms = rooms.filter((r) => r.propertyId === property.id);
          const floors = Array.from(new Set(propertyRooms.map((r) => r.floor))).sort((a, b) => b - a);

          return (
            <Card
              key={property.id}
              className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              {/* Property Header - Enhanced */}
              <div className="bg-gradient-to-r from-purple-100 via-blue-50 to-purple-50 p-4 md:p-6 border-b border-purple-200">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#9333EA] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/50 animate-pulse">
                      <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
                        {property.name}
                      </h3>
                      <p className="text-sm md:text-base text-gray-700 flex items-center gap-1.5 mt-2">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-purple-600" />
                        <span className="truncate font-medium">{property.address}</span>
                      </p>
                      <div className="flex flex-wrap gap-3 md:gap-4 mt-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs md:text-sm font-bold text-gray-900">{property.floors}</span>
                          <span className="text-xs text-gray-600">Floors</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
                          <Home className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs md:text-sm font-bold text-gray-900">{property.rooms}</span>
                          <span className="text-xs text-gray-600">Rooms</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-sm">
                          <Bed className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-xs md:text-sm font-bold text-gray-900">{property.beds}</span>
                          <span className="text-xs text-gray-600">Beds</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end md:justify-start flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                      className="h-10 w-10 md:h-9 md:w-9 p-0 rounded-full hover:bg-white hover:shadow-md transition-all"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-purple-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-purple-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingProperty(property);
                        setEditPropertyOpen(true);
                      }}
                      className="h-10 w-10 md:h-9 md:w-9 p-0 rounded-full hover:bg-blue-100 hover:shadow-md transition-all"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingProperty(property);
                        setDeletePropertyOpen(true);
                      }}
                      className="h-10 w-10 md:h-9 md:w-9 p-0 rounded-full hover:bg-red-100 hover:shadow-md transition-all"
                    >
                      <Trash className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {/* Contact Person - Enhanced */}
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Contact Person</p>
                  <div className="flex flex-wrap gap-3 md:gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-bold">
                          {property.contact.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-gray-900 font-semibold">{property.contact.name}</span>
                    </div>
                    <span className="text-gray-700 font-medium">{property.contact.phone}</span>
                    <span className="text-gray-700">{property.contact.email}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Room Management - Enhanced */}
              {isExpanded && (
                <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <h4 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Room Management
                    </h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAddRoomPropertyId(property.id);
                        setAddRoomOpen(true);
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 w-full md:w-auto shadow-lg shadow-green-500/30 h-11 md:h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="font-semibold">Add Room</span>
                    </Button>
                  </div>

                  {/* Rooms by Floor */}
                  <div className="space-y-6">
                    {floors.map((floor) => {
                      const floorRooms = getFloorRooms(property.id, floor);

                      return (
                        <div key={floor} className="space-y-3">
                          <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3 rounded-xl shadow-md">
                            <h5 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                              <Layers className="w-5 h-5" />
                              Floor {floor}
                              <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">
                                {floorRooms.length} rooms
                              </span>
                            </h5>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {floorRooms.map((room) => (
                              <Card
                                key={room.id}
                                className="p-4 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                                        <span className="text-white font-bold text-sm">{room.number}</span>
                                      </div>
                                      <div>
                                        <h6 className="font-bold text-gray-900 text-base">{room.number}</h6>
                                        <p className="text-xs text-gray-600 font-medium">{room.type}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      className="p-2 hover:bg-blue-100 rounded-lg transition-all"
                                      onClick={() => {
                                        setEditingRoom(room);
                                        setEditRoomOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 text-blue-600" />
                                    </button>
                                    <button
                                      className="p-2 hover:bg-red-100 rounded-lg transition-all"
                                      onClick={() => {
                                        setDeletingRoom(room);
                                        setDeleteRoomOpen(true);
                                      }}
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
                                    <span
                                      className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusColor(
                                        room.status
                                      )}`}
                                    >
                                      {room.status}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                                      {room.occupiedBeds}/{room.beds} occupied
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
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Property Modal */}
      <Dialog open={addPropertyOpen} onOpenChange={setAddPropertyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Add New Property
            </DialogTitle>
            <DialogDescription>
              Enter the details of your new property below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="property-name" className="text-sm font-semibold">
                Property Name *
              </Label>
              <Input
                id="property-name"
                placeholder="e.g., Sunshine Residency"
                value={newProperty.name}
                onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property-address" className="text-sm font-semibold">
                  Address *
                </Label>
                <Input
                  id="property-address"
                  placeholder="e.g., 123 MG Road"
                  value={newProperty.address}
                  onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-city" className="text-sm font-semibold">
                  City *
                </Label>
                <Input
                  id="property-city"
                  placeholder="e.g., Bangalore"
                  value={newProperty.city}
                  onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-floors" className="text-sm font-semibold">
                Number of Floors *
              </Label>
              <Input
                id="property-floors"
                type="number"
                min="1"
                value={newProperty.floors}
                onChange={(e) => setNewProperty({ ...newProperty, floors: parseInt(e.target.value) || 1 })}
                className="h-11"
              />
            </div>
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-gray-900 mb-4">Contact Person Details</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-sm font-semibold">
                    Name
                  </Label>
                  <Input
                    id="contact-name"
                    placeholder="e.g., Ramesh Kumar"
                    value={newProperty.contactName}
                    onChange={(e) => setNewProperty({ ...newProperty, contactName: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone" className="text-sm font-semibold">
                      Phone
                    </Label>
                    <Input
                      id="contact-phone"
                      placeholder="+91 98765 43210"
                      value={newProperty.contactPhone}
                      onChange={(e) => setNewProperty({ ...newProperty, contactPhone: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email" className="text-sm font-semibold">
                      Email
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="ramesh@example.com"
                      value={newProperty.contactEmail}
                      onChange={(e) => setNewProperty({ ...newProperty, contactEmail: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddPropertyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddProperty}
              className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9]"
            >
              <Save className="w-4 h-4 mr-2" />
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
                <Label htmlFor="edit-property-name" className="text-sm font-semibold">
                  Property Name *
                </Label>
                <Input
                  id="edit-property-name"
                  value={editingProperty.name}
                  onChange={(e) => setEditingProperty({ ...editingProperty, name: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-property-address" className="text-sm font-semibold">
                    Address *
                  </Label>
                  <Input
                    id="edit-property-address"
                    value={editingProperty.address}
                    onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-property-city" className="text-sm font-semibold">
                    City *
                  </Label>
                  <Input
                    id="edit-property-city"
                    value={editingProperty.city}
                    onChange={(e) => setEditingProperty({ ...editingProperty, city: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-property-floors" className="text-sm font-semibold">
                  Number of Floors *
                </Label>
                <Input
                  id="edit-property-floors"
                  type="number"
                  min="1"
                  value={editingProperty.floors}
                  onChange={(e) =>
                    setEditingProperty({ ...editingProperty, floors: parseInt(e.target.value) || 1 })
                  }
                  className="h-11"
                />
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-4">Contact Person Details</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact-name" className="text-sm font-semibold">
                      Name
                    </Label>
                    <Input
                      id="edit-contact-name"
                      value={editingProperty.contact.name}
                      onChange={(e) =>
                        setEditingProperty({
                          ...editingProperty,
                          contact: { ...editingProperty.contact, name: e.target.value },
                        })
                      }
                      className="h-11"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-contact-phone" className="text-sm font-semibold">
                        Phone
                      </Label>
                      <Input
                        id="edit-contact-phone"
                        value={editingProperty.contact.phone}
                        onChange={(e) =>
                          setEditingProperty({
                            ...editingProperty,
                            contact: { ...editingProperty.contact, phone: e.target.value },
                          })
                        }
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-contact-email" className="text-sm font-semibold">
                        Email
                      </Label>
                      <Input
                        id="edit-contact-email"
                        type="email"
                        value={editingProperty.contact.email}
                        onChange={(e) =>
                          setEditingProperty({
                            ...editingProperty,
                            contact: { ...editingProperty.contact, email: e.target.value },
                          })
                        }
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditPropertyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditProperty}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
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
              <AlertTriangle className="w-5 h-5" />
              Delete Property?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingProperty?.name}</strong>? This will also delete all rooms
              in this property. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProperty}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
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
            <DialogDescription>Enter the details of the new room</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-number" className="text-sm font-semibold">
                  Room Number *
                </Label>
                <Input
                  id="room-number"
                  placeholder="e.g., 301"
                  value={newRoom.number}
                  onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-floor" className="text-sm font-semibold">
                  Floor *
                </Label>
                <Input
                  id="room-floor"
                  type="number"
                  min="1"
                  value={newRoom.floor}
                  onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-type" className="text-sm font-semibold">
                Room Type *
              </Label>
              <select
                id="room-type"
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value as any })}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Single">Single (1 bed)</option>
                <option value="Double">Double (2 beds)</option>
                <option value="Triple">Triple (3 beds)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-rent" className="text-sm font-semibold">
                Monthly Rent (₹) *
              </Label>
              <Input
                id="room-rent"
                type="number"
                min="0"
                placeholder="8000"
                value={newRoom.rent || ''}
                onChange={(e) => setNewRoom({ ...newRoom, rent: parseInt(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddRoomOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRoom}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Add Room
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
            <DialogDescription>Update the room details</DialogDescription>
          </DialogHeader>
          {editingRoom && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room-number" className="text-sm font-semibold">
                    Room Number *
                  </Label>
                  <Input
                    id="edit-room-number"
                    value={editingRoom.number}
                    onChange={(e) => setEditingRoom({ ...editingRoom, number: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-room-floor" className="text-sm font-semibold">
                    Floor *
                  </Label>
                  <Input
                    id="edit-room-floor"
                    type="number"
                    min="1"
                    value={editingRoom.floor}
                    onChange={(e) => setEditingRoom({ ...editingRoom, floor: parseInt(e.target.value) || 1 })}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-type" className="text-sm font-semibold">
                  Room Type *
                </Label>
                <select
                  id="edit-room-type"
                  value={editingRoom.type}
                  onChange={(e) => {
                    const newType = e.target.value as 'Single' | 'Double' | 'Triple';
                    const beds = newType === 'Single' ? 1 : newType === 'Double' ? 2 : 3;
                    setEditingRoom({ ...editingRoom, type: newType, beds });
                  }}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Single">Single (1 bed)</option>
                  <option value="Double">Double (2 beds)</option>
                  <option value="Triple">Triple (3 beds)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-rent" className="text-sm font-semibold">
                  Monthly Rent (₹) *
                </Label>
                <Input
                  id="edit-room-rent"
                  type="number"
                  min="0"
                  value={editingRoom.rent}
                  onChange={(e) => setEditingRoom({ ...editingRoom, rent: parseInt(e.target.value) || 0 })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-room-status" className="text-sm font-semibold">
                  Status
                </Label>
                <select
                  id="edit-room-status"
                  value={editingRoom.status}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as any })}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Vacant">Vacant</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditRoomOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRoom}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Update Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Room Modal */}
      <AlertDialog open={deleteRoomOpen} onOpenChange={setDeleteRoomOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Room?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete room <strong>{deletingRoom?.number}</strong>? This action cannot be
              undone.
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
