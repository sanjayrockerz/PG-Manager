import { useMemo, useState } from 'react';
import { Bed, Building2, DoorClosed, DoorOpen, Filter, Users } from 'lucide-react';
import { BuildingView } from './BuildingView';
import { useProperty } from '../contexts/PropertyContext';

export function Rooms() {
  const { selectedProperty, properties } = useProperty();
  const [filterStatus, setFilterStatus] = useState<'all' | 'vacant' | 'occupied' | 'maintenance'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'building'>('building');

  const rooms = useMemo(() => {
    if (selectedProperty === 'all') {
      return properties.flatMap((property) =>
        property.rooms.map((room) => ({
          ...room,
          propertyName: property.name,
        })),
      );
    }

    const property = properties.find((entry) => entry.id === selectedProperty);
    if (!property) {
      return [];
    }

    return property.rooms.map((room) => ({
      ...room,
      propertyName: property.name,
    }));
  }, [properties, selectedProperty]);

  const filteredRooms = rooms.filter((room) => (filterStatus === 'all' ? true : room.status === filterStatus));

  const stats = {
    total: rooms.length,
    occupied: rooms.filter((room) => room.status === 'occupied').length,
    vacant: rooms.filter((room) => room.status === 'vacant').length,
    maintenance: rooms.filter((room) => room.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Rooms</h1>
          <p className="text-gray-600 mt-1">Live room inventory and occupancy overview</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('building')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              viewMode === 'building' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Building
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Grid
          </button>
        </div>
      </div>

      {viewMode === 'building' ? (
        <BuildingView />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Bed className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Rooms</p>
                  <p className="text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DoorClosed className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Occupied</p>
                  <p className="text-gray-900">{stats.occupied}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <DoorOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Vacant</p>
                  <p className="text-gray-900">{stats.vacant}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Filter className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Maintenance</p>
                  <p className="text-gray-900">{stats.maintenance}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'vacant', 'occupied', 'maintenance'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                    filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className={`bg-white rounded-xl border p-5 ${
                  room.status === 'vacant'
                    ? 'border-purple-200'
                    : room.status === 'occupied'
                      ? 'border-green-200'
                      : 'border-orange-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-gray-900">Room {room.number}</h3>
                    <p className="text-xs text-gray-500 mt-1">{room.propertyName}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs capitalize ${
                      room.status === 'vacant'
                        ? 'bg-purple-100 text-purple-700'
                        : room.status === 'occupied'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Floor</span>
                    <span className="text-gray-900">{room.floor}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Type</span>
                    <span className="text-gray-900 capitalize">{room.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Beds</span>
                    <span className="text-gray-900 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {typeof room.occupiedBeds === 'number' ? `${room.occupiedBeds}/${room.beds}` : room.beds}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Rent</span>
                    <span className="text-gray-900">Rs {room.rent.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRooms.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
              No rooms match this filter.
            </div>
          )}
        </>
      )}
    </div>
  );
}
