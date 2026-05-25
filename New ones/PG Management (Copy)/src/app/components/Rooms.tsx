import { useState, useMemo } from 'react';
import { Bed, Users, DoorOpen, DoorClosed, Filter, Building } from 'lucide-react';
import { BuildingView } from './BuildingView';
import { useProperty } from '../contexts/PropertyContext';
import { mockRooms as allRooms, filterByProperty } from '../utils/mockData';

export function Rooms() {
  const { selectedProperty } = useProperty();
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'building'>('building');

  // Filter rooms by property
  const propertyFilteredRooms = useMemo(() => filterByProperty(allRooms, selectedProperty), [selectedProperty]);

  const filteredRooms = propertyFilteredRooms.filter(room => 
    filterStatus === 'all' ? true : room.status === filterStatus
  );

  const stats = {
    total: propertyFilteredRooms.length,
    occupied: propertyFilteredRooms.filter(r => r.status === 'occupied').length,
    available: propertyFilteredRooms.filter(r => r.status === 'vacant').length,
    maintenance: propertyFilteredRooms.filter(r => r.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Rooms</h1>
          <p className="text-gray-600 mt-1">Manage room availability and assignments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('building')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${viewMode === 'building' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <Building className="w-5 h-5" />
            <span className="hidden sm:inline">Building View</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${viewMode === 'grid' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Grid View</span>
          </button>
        </div>
      </div>

      {viewMode === 'building' ? (
        <BuildingView />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
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
                <div className="p-3 bg-green-50 rounded-lg">
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
                <div className="p-3 bg-purple-50 rounded-lg">
                  <DoorOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Available</p>
                  <p className="text-gray-900">{stats.available}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Filter className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Maintenance</p>
                  <p className="text-gray-900">{stats.maintenance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex gap-2 overflow-x-auto">
              {['all', 'vacant', 'occupied', 'maintenance'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`
                    px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                    ${filterStatus === status 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {status === 'vacant' ? 'Available' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRooms.map((room) => (
              <div 
                key={room.id} 
                className={`
                  bg-white rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-lg
                  ${room.status === 'available' ? 'border-green-200 hover:border-green-400' : ''}
                  ${room.status === 'occupied' ? 'border-gray-200 hover:border-gray-400' : ''}
                  ${room.status === 'maintenance' ? 'border-orange-200 hover:border-orange-400' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-gray-900">Room {room.number}</h3>
                    <p className="text-sm text-gray-600">Floor {room.floor}</p>
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-xs
                    ${room.status === 'available' ? 'bg-green-100 text-green-700' : ''}
                    ${room.status === 'occupied' ? 'bg-blue-100 text-blue-700' : ''}
                    ${room.status === 'maintenance' ? 'bg-orange-100 text-orange-700' : ''}
                  `}>
                    {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="text-gray-900">{room.type}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{room.occupied}/{room.capacity}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Rent:</span>
                    <span className="text-gray-900">₹{room.rent.toLocaleString()}/mo</span>
                  </div>

                  {room.tenant && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Current Tenant</p>
                      <p className="text-sm text-gray-900 mt-1">{room.tenant}</p>
                    </div>
                  )}
                </div>

                {room.status === 'available' && (
                  <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    Assign Tenant
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}