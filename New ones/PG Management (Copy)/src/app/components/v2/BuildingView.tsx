import { useState } from 'react';
import { Building2, ChevronDown, Users, Home, Wrench, Sparkles, ArrowRight, User, Phone, Mail } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Room {
  id: string;
  number: string;
  floor: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenantName?: string;
  tenantPhone?: string;
  beds?: number;
  occupiedBeds?: number;
  rent?: number;
}

const demoRooms: Room[] = [
  // Floor 3
  { id: '1', number: '301', floor: 3, status: 'occupied', tenantName: 'Amit Kumar', tenantPhone: '+91 98765 43210', beds: 1, occupiedBeds: 1, rent: 8000 },
  { id: '2', number: '302', floor: 3, status: 'vacant', beds: 1, occupiedBeds: 0, rent: 8000 },
  { id: '3', number: '303', floor: 3, status: 'occupied', tenantName: 'Rahul Sharma', tenantPhone: '+91 98765 43211', beds: 1, occupiedBeds: 1, rent: 8000 },
  { id: '4', number: '304', floor: 3, status: 'maintenance', beds: 1, occupiedBeds: 0, rent: 8000 },

  // Floor 2
  { id: '5', number: '201', floor: 2, status: 'occupied', tenantName: 'Vikash Singh', tenantPhone: '+91 98765 43212', beds: 2, occupiedBeds: 2, rent: 7500 },
  { id: '6', number: '202', floor: 2, status: 'vacant', beds: 1, occupiedBeds: 0, rent: 7500 },
  { id: '7', number: '203', floor: 2, status: 'occupied', tenantName: 'Priya Patel', tenantPhone: '+91 98765 43213', beds: 1, occupiedBeds: 1, rent: 7500 },

  // Floor 1
  { id: '8', number: '101', floor: 1, status: 'vacant', beds: 2, occupiedBeds: 0, rent: 7000 },
  { id: '9', number: '102', floor: 1, status: 'occupied', tenantName: 'Suresh Kumar', tenantPhone: '+91 98765 43214', beds: 1, occupiedBeds: 1, rent: 7000 },
];

export function BuildingView() {
  const [selectedProperty, setSelectedProperty] = useState('1');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const floors = [3, 2, 1];

  const getRoomStyles = (status: string, isSelected: boolean) => {
    const baseStyles = "relative group cursor-pointer transition-all duration-300 transform";
    const hoverStyles = "hover:scale-105 hover:shadow-2xl hover:z-10";

    switch (status) {
      case 'occupied':
        return `${baseStyles} ${hoverStyles} ${isSelected ? 'scale-105 shadow-2xl ring-4 ring-green-400 ring-opacity-50' : ''} bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg`;
      case 'vacant':
        return `${baseStyles} ${hoverStyles} ${isSelected ? 'scale-105 shadow-2xl ring-4 ring-gray-400 ring-opacity-50' : ''} bg-gradient-to-br from-gray-200 to-gray-300 shadow-md`;
      case 'maintenance':
        return `${baseStyles} ${hoverStyles} ${isSelected ? 'scale-105 shadow-2xl ring-4 ring-amber-400 ring-opacity-50' : ''} bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg`;
      default:
        return baseStyles;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'occupied':
        return <Users className="w-5 h-5 text-white" />;
      case 'vacant':
        return <Home className="w-5 h-5 text-gray-600" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-white" />;
    }
  };

  const totalRooms = demoRooms.length;
  const occupiedRooms = demoRooms.filter(r => r.status === 'occupied').length;
  const vacantRooms = demoRooms.filter(r => r.status === 'vacant').length;
  const maintenanceRooms = demoRooms.filter(r => r.status === 'maintenance').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6" />
                <h1 className="text-3xl font-bold">Building View</h1>
              </div>
              <p className="text-white/90">Visual floor-by-floor room status at a glance</p>
            </div>

            {/* Property Selector */}
            <div className="relative">
              <button className="flex items-center gap-3 px-6 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all">
                <Building2 className="w-5 h-5" />
                <span className="font-semibold">Sunshine Residency</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Rooms</p>
                <p className="text-3xl font-bold text-gray-900">{totalRooms}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 mb-1">Occupied</p>
                <p className="text-3xl font-bold text-green-700">{occupiedRooms}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Vacant</p>
                <p className="text-3xl font-bold text-gray-700">{vacantRooms}</p>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 mb-1">Maintenance</p>
                <p className="text-3xl font-bold text-amber-700">{maintenanceRooms}</p>
              </div>
              <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Legend */}
        <Card className="p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg shadow-md"></div>
              <span className="text-sm font-medium text-gray-700">Occupied</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-md"></div>
              <span className="text-sm font-medium text-gray-700">Vacant</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-md"></div>
              <span className="text-sm font-medium text-gray-700">Maintenance</span>
            </div>
            <div className="ml-auto text-sm text-gray-500">Click on any room for details</div>
          </div>
        </Card>

        {/* Building Visualization */}
        <div className="space-y-6">
          {floors.map((floor) => {
            const floorRooms = demoRooms.filter((r) => r.floor === floor);

            return (
              <Card key={floor} className="p-6 bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex gap-6">
                  {/* Floor Label - Modern 3D style */}
                  <div className="flex-shrink-0 w-24">
                    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-4 shadow-lg transform hover:scale-105 transition-transform">
                      <div className="text-center">
                        <div className="text-4xl font-black text-white mb-1">{floor}</div>
                        <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">Floor</div>
                        <div className="mt-3 pt-3 border-t border-white/30">
                          <div className="text-xl font-bold text-white">{floorRooms.length}</div>
                          <div className="text-xs text-white/80">Rooms</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rooms Grid - Modern cards */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {floorRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                        className={getRoomStyles(room.status, selectedRoom?.id === room.id)}
                      >
                        <div className="relative h-32 rounded-xl overflow-hidden">
                          {/* Room Content */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                            {getStatusIcon(room.status)}
                            <div className={`font-bold text-xl mt-2 ${room.status === 'vacant' ? 'text-gray-700' : 'text-white'}`}>
                              {room.number}
                            </div>
                            <div className={`text-xs mt-1 ${room.status === 'vacant' ? 'text-gray-600' : 'text-white/90'}`}>
                              {room.beds && `${room.occupiedBeds}/${room.beds} beds`}
                            </div>
                          </div>

                          {/* Hover Shine Effect */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                          {/* Status Badge */}
                          <div className="absolute top-2 right-2">
                            <div className={`w-2 h-2 rounded-full ${
                              room.status === 'occupied' ? 'bg-white' :
                              room.status === 'vacant' ? 'bg-gray-600' :
                              'bg-white'
                            } shadow-lg animate-pulse`}></div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Selected Room Details - Floating Panel */}
        {selectedRoom && (
          <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-300">
            <Card className="p-6 bg-white shadow-2xl border-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedRoom.status === 'occupied' ? 'bg-green-100' :
                    selectedRoom.status === 'vacant' ? 'bg-gray-100' :
                    'bg-amber-100'
                  }`}>
                    {getStatusIcon(selectedRoom.status)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">Room {selectedRoom.number}</h3>
                    <p className="text-sm text-gray-500">Floor {selectedRoom.floor}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {selectedRoom.status === 'occupied' && selectedRoom.tenantName && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Tenant</p>
                        <p className="font-medium text-gray-900">{selectedRoom.tenantName}</p>
                      </div>
                    </div>
                    {selectedRoom.tenantPhone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-medium text-gray-900">{selectedRoom.tenantPhone}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Beds</p>
                    <p className="font-bold text-purple-900">{selectedRoom.occupiedBeds}/{selectedRoom.beds}</p>
                  </div>
                  {selectedRoom.rent && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Rent</p>
                      <p className="font-bold text-blue-900">₹{selectedRoom.rent}</p>
                    </div>
                  )}
                </div>

                {selectedRoom.status === 'vacant' && (
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    Assign Tenant
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {selectedRoom.status === 'occupied' && (
                  <Button variant="outline" className="w-full">
                    View Tenant Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
