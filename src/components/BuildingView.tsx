import { useMemo } from 'react';
import { Bed, Home, Users, Wrench } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';

export function BuildingView() {
  const { selectedProperty, properties } = useProperty();

  const currentProperty = selectedProperty === 'all'
    ? null
    : properties.find((property) => property.id === selectedProperty) ?? null;

  const rooms = currentProperty?.rooms ?? [];

  const floorData = useMemo(() => {
    const floorMap = new Map<number, typeof rooms>();

    rooms.forEach((room) => {
      const current = floorMap.get(room.floor) ?? [];
      current.push(room);
      floorMap.set(room.floor, current);
    });

    return Array.from(floorMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, floorRooms]) => ({
        floor,
        rooms: floorRooms.sort((a, b) => a.number.localeCompare(b.number)),
      }));
  }, [rooms]);

  if (!currentProperty) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Home className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-gray-900 text-lg">Select a property</h3>
        <p className="text-sm text-gray-600 mt-2">
          Pick a specific property from the top selector to view floor-by-floor room occupancy.
        </p>
      </div>
    );
  }

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((room) => room.status === 'occupied').length;
  const vacantRooms = rooms.filter((room) => room.status === 'vacant').length;
  const maintenanceRooms = rooms.filter((room) => room.status === 'maintenance').length;
  const totalBeds = rooms.reduce((sum, room) => sum + room.beds, 0);
  const occupiedBeds = rooms.reduce((sum, room) => {
    if (typeof room.occupiedBeds === 'number') {
      return sum + room.occupiedBeds;
    }
    return sum + (room.status === 'occupied' ? room.beds : 0);
  }, 0);
  const occupancyRate = totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-gray-900">{currentProperty.name}</h3>
            <p className="text-sm text-gray-600 mt-1">Live building occupancy from active property records</p>
          </div>
          <div className="text-sm text-gray-600">{occupancyRate}% bed occupancy</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total Rooms</p>
            <p className="text-xl text-gray-900 mt-1">{totalRooms}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Occupied</p>
            <p className="text-xl text-green-700 mt-1">{occupiedRooms}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Vacant</p>
            <p className="text-xl text-blue-700 mt-1">{vacantRooms}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Maintenance</p>
            <p className="text-xl text-orange-700 mt-1">{maintenanceRooms}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {floorData.map((floorGroup) => (
          <div key={floorGroup.floor} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-gray-900">Floor {floorGroup.floor}</p>
              <p className="text-xs text-gray-500">{floorGroup.rooms.length} rooms</p>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {floorGroup.rooms.map((room) => (
                <div
                  key={room.id}
                  className={`border rounded-lg p-3 ${
                    room.status === 'occupied'
                      ? 'border-green-200 bg-green-50'
                      : room.status === 'maintenance'
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-900">Room {room.number}</p>
                    <span className="text-xs text-gray-600 capitalize">{room.status}</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5" />
                      <span>{room.beds} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {room.status === 'maintenance' ? <Wrench className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                      <span>
                        {typeof room.occupiedBeds === 'number'
                          ? `${room.occupiedBeds}/${room.beds} occupied`
                          : room.status === 'occupied'
                            ? `${room.beds}/${room.beds} occupied`
                            : `0/${room.beds} occupied`}
                      </span>
                    </div>
                    <p>Rent Rs {room.rent.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {floorData.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            No rooms added for this property yet.
          </div>
        )}
      </div>
    </div>
  );
}
