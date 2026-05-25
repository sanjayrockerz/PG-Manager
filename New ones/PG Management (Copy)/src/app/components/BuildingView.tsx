import { Bed, Users, Wrench } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { mockRooms, filterByProperty } from '../utils/mockData';
import { useMemo } from 'react';

export function BuildingView() {
  const { selectedProperty, properties } = useProperty();
  
  // Get current property details
  const currentProperty = selectedProperty === 'all' 
    ? null 
    : properties.find(p => p.id === selectedProperty);
  
  // Filter rooms by property
  const propertyRooms = useMemo(() => filterByProperty(mockRooms, selectedProperty), [selectedProperty]);
  
  // Group rooms by floor
  const buildingData = useMemo(() => {
    if (selectedProperty === 'all') {
      // When "all properties" is selected, show a summary message
      return [];
    }
    
    // Get max floor for this property
    const maxFloor = currentProperty?.floors || Math.max(...propertyRooms.map(r => r.floor), 0);
    
    // Create floor data in descending order (top floor first)
    const floors = [];
    for (let floor = maxFloor; floor >= 1; floor--) {
      const roomsOnFloor = propertyRooms.filter(r => r.floor === floor);
      if (roomsOnFloor.length > 0) {
        floors.push({
          floor,
          rooms: roomsOnFloor.map(room => ({
            number: room.number,
            beds: room.type === 'single' ? 1 : room.type === 'double' ? 2 : 3,
            occupied: room.status === 'occupied' ? 1 : 0,
            status: room.status,
            tenant: room.tenant || null,
          }))
        });
      }
    }
    
    // Add ground floor if it's a property view
    if (currentProperty) {
      floors.push({
        floor: 0,
        name: 'Ground Floor',
        rooms: [
          { number: 'G01', beds: 0, occupied: 0, status: 'common', label: 'Reception' },
          { number: 'G02', beds: 0, occupied: 0, status: 'common', label: 'Common Hall' },
          { number: 'G03', beds: 0, occupied: 0, status: 'common', label: 'Dining' },
          { number: 'G04', beds: 0, occupied: 0, status: 'common', label: 'Kitchen' },
        ]
      });
    }
    
    return floors;
  }, [selectedProperty, propertyRooms, currentProperty]);

  // If "all properties" is selected, show a message
  if (selectedProperty === 'all') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center">
          <Bed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">Select a Property</h3>
          <p className="text-gray-600">
            Please select a specific property from the dropdown to view the building layout.
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalRooms = propertyRooms.length;
  const occupiedRooms = propertyRooms.filter(r => r.status === 'occupied').length;
  const availableRooms = propertyRooms.filter(r => r.status === 'vacant').length;
  const maintenanceRooms = propertyRooms.filter(r => r.status === 'maintenance').length;
  
  const totalBeds = propertyRooms.reduce((sum, room) => {
    const beds = room.type === 'single' ? 1 : room.type === 'double' ? 2 : 3;
    return sum + beds;
  }, 0);
  
  const occupiedBeds = propertyRooms.filter(r => r.status === 'occupied').reduce((sum, room) => {
    const beds = room.type === 'single' ? 1 : room.type === 'double' ? 2 : 3;
    return sum + beds;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Legend and Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h3 className="text-gray-900 mb-4">Building Occupancy Overview</h3>
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Total Rooms</p>
            <p className="text-2xl text-gray-900 mt-1">{totalRooms}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600">Occupied</p>
            <p className="text-2xl text-green-700 mt-1">{occupiedRooms}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600">Available</p>
            <p className="text-2xl text-blue-700 mt-1">{availableRooms}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-gray-600">Maintenance</p>
            <p className="text-2xl text-orange-700 mt-1">{maintenanceRooms}</p>
          </div>
        </div>

        {/* Bed Occupancy */}
        <div className="flex items-center justify-between mb-6 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Bed className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-sm text-purple-900">Bed Occupancy</p>
              <p className="text-xs text-purple-700">{occupiedBeds} / {totalBeds} beds filled</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl text-purple-900">{Math.round((occupiedBeds / totalBeds) * 100)}%</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded border-2 border-green-600"></div>
            <span className="text-gray-700">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded border-2 border-blue-600"></div>
            <span className="text-gray-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded border-2 border-orange-600"></div>
            <span className="text-gray-700">Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-400 rounded border-2 border-gray-500"></div>
            <span className="text-gray-700">Common Area</span>
          </div>
        </div>
      </div>

      {/* Building Visualization */}
      <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-xl border-2 border-gray-300 p-4 md:p-8 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Building Name */}
          <div className="text-center mb-6">
            <div className="inline-block bg-white px-6 py-3 rounded-lg border-2 border-gray-300 shadow-lg">
              <h2 className="text-gray-900">{currentProperty?.name || 'PG Building'}</h2>
              <p className="text-sm text-gray-600">Real-time Occupancy View</p>
            </div>
          </div>

          {/* Floors */}
          <div className="space-y-4">
            {buildingData.map((floorData) => (
              <div key={floorData.floor} className="bg-white rounded-xl border-2 border-gray-300 shadow-lg overflow-hidden">
                {/* Floor Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {floorData.name || `${floorData.floor}${floorData.floor === 1 ? 'st' : floorData.floor === 2 ? 'nd' : floorData.floor === 3 ? 'rd' : 'th'} Floor`}
                    </h3>
                    <p className="text-xs opacity-90">
                      {floorData.rooms.filter(r => r.status === 'occupied').length} / {floorData.rooms.filter(r => r.status !== 'common').length} Rooms Occupied
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Floor {floorData.floor}</p>
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {floorData.rooms.map((room) => {
                      const bgColor = 
                        room.status === 'occupied' ? 'bg-green-500 border-green-600' :
                        room.status === 'vacant' || room.status === 'available' ? 'bg-blue-500 border-blue-600' :
                        room.status === 'maintenance' ? 'bg-orange-500 border-orange-600' :
                        'bg-gray-400 border-gray-500';
                      
                      return (
                        <div
                          key={room.number}
                          className={`
                            ${bgColor} 
                            rounded-lg border-2 p-3 transition-all hover:scale-105 cursor-pointer
                            shadow-md hover:shadow-xl
                          `}
                        >
                          <div className="text-center">
                            <p className="text-white text-xs mb-1">{room.number}</p>
                            {room.status === 'common' ? (
                              <p className="text-white text-xs opacity-90">{room.label}</p>
                            ) : (
                              <>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  {room.status === 'occupied' ? (
                                    <Users className="w-4 h-4 text-white" />
                                  ) : room.status === 'maintenance' ? (
                                    <Wrench className="w-4 h-4 text-white" />
                                  ) : (
                                    <Bed className="w-4 h-4 text-white" />
                                  )}
                                  <span className="text-white text-xs">{room.occupied}/{room.beds}</span>
                                </div>
                                {room.tenant && (
                                  <p className="text-white text-xs opacity-90 truncate">{room.tenant}</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Building Base */}
          <div className="mt-4 h-8 bg-gradient-to-t from-gray-700 to-gray-600 rounded-b-lg border-2 border-gray-700"></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-white border-2 border-blue-600 text-blue-600 rounded-xl p-4 hover:bg-blue-50 transition-colors">
          <p className="font-semibold">View Available Rooms</p>
          <p className="text-sm opacity-75 mt-1">{availableRooms} rooms ready</p>
        </button>
        <button className="bg-white border-2 border-orange-600 text-orange-600 rounded-xl p-4 hover:bg-orange-50 transition-colors">
          <p className="font-semibold">Maintenance Required</p>
          <p className="text-sm opacity-75 mt-1">{maintenanceRooms} rooms need attention</p>
        </button>
        <button className="bg-white border-2 border-green-600 text-green-600 rounded-xl p-4 hover:bg-green-50 transition-colors">
          <p className="font-semibold">Occupied Rooms</p>
          <p className="text-sm opacity-75 mt-1">{occupiedRooms} rooms filled</p>
        </button>
      </div>
    </div>
  );
}