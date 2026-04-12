import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabasePropertyApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: 'single' | 'double' | 'triple';
  beds: number;
  rent: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenant?: string;
  occupiedBeds?: number;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  floors: number;
  totalRooms: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  rooms: Room[];
}

interface PropertyContextType {
  properties: Property[];
  selectedProperty: string | 'all';
  setSelectedProperty: (propertyId: string | 'all') => void;
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'rooms'>) => void;
  updateProperty: (id: string, property: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  addRoom: (propertyId: string, room: Omit<Room, 'id'>) => void;
  updateRoom: (propertyId: string, roomId: string, room: Partial<Room>) => void;
  deleteRoom: (propertyId: string, roomId: string) => void;
  isLoading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProperties = async () => {
      setIsLoading(true);
      try {
        const list = await supabasePropertyApi.list();
        if (!cancelled) {
          setProperties(list);
        }
      } catch {
        if (!cancelled) {
          setProperties([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  useRealtimeRefresh({
    key: 'property-context',
    tables: ['properties', 'rooms'],
    onChange: async () => {
      const list = await supabasePropertyApi.list();
      setProperties(list);
    },
  });

  const addProperty = (property: Omit<Property, 'id' | 'createdAt' | 'rooms'>) => {
    const optimisticProperty: Property = {
      ...property,
      id: `tmp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      rooms: [],
    };

    setProperties((prev) => [optimisticProperty, ...prev]);

    void supabasePropertyApi
      .create(property)
      .then((created) => {
        setProperties((prev) => prev.map((entry) => (entry.id === optimisticProperty.id ? created : entry)));
      })
      .catch(() => {
        setProperties((prev) => prev.filter((entry) => entry.id !== optimisticProperty.id));
      });
  };

  const updateProperty = (id: string, updatedData: Partial<Property>) => {
    const previous = properties;
    setProperties((prev) => prev.map((prop) => (prop.id === id ? { ...prop, ...updatedData } : prop)));

    const payload = { ...updatedData };
    delete (payload as Partial<Property>).rooms;

    void supabasePropertyApi.update(id, payload).catch(() => {
      setProperties(previous);
    });
  };

  const deleteProperty = (id: string) => {
    const previous = properties;
    setProperties((prev) => prev.filter((prop) => prop.id !== id));
    if (selectedProperty === id) {
      setSelectedProperty('all');
    }

    void supabasePropertyApi.remove(id).catch(() => {
      setProperties(previous);
    });
  };

  const addRoom = (propertyId: string, room: Omit<Room, 'id'>) => {
    const optimisticRoom: Room = {
      ...room,
      id: `tmp-room-${Date.now()}`,
    };

    const previous = properties;
    setProperties((prev) =>
      prev.map((property) => {
        if (property.id !== propertyId) {
          return property;
        }
        return {
          ...property,
          rooms: [...property.rooms, optimisticRoom],
          totalRooms: property.rooms.length + 1,
        };
      }),
    );

    void supabasePropertyApi
      .addRoom(propertyId, room)
      .then((createdRoom) => {
        setProperties((prev) =>
          prev.map((property) => {
            if (property.id !== propertyId) {
              return property;
            }
            return {
              ...property,
              rooms: property.rooms.map((entry) => (entry.id === optimisticRoom.id ? createdRoom : entry)),
            };
          }),
        );
      })
      .catch(() => {
        setProperties(previous);
      });
  };

  const updateRoom = (propertyId: string, roomId: string, updatedRoom: Partial<Room>) => {
    const previous = properties;
    setProperties((prev) =>
      prev.map((property) => {
        if (property.id !== propertyId) {
          return property;
        }
        return {
          ...property,
          rooms: property.rooms.map((room) => (room.id === roomId ? { ...room, ...updatedRoom } : room)),
        };
      }),
    );

    void supabasePropertyApi.updateRoom(propertyId, roomId, updatedRoom).catch(() => {
      setProperties(previous);
    });
  };

  const deleteRoom = (propertyId: string, roomId: string) => {
    const previous = properties;
    setProperties((prev) =>
      prev.map((property) => {
        if (property.id !== propertyId) {
          return property;
        }
        const remainingRooms = property.rooms.filter((room) => room.id !== roomId);
        return {
          ...property,
          rooms: remainingRooms,
          totalRooms: remainingRooms.length,
        };
      }),
    );

    void supabasePropertyApi.removeRoom(propertyId, roomId).catch(() => {
      setProperties(previous);
    });
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        selectedProperty,
        setSelectedProperty,
        addProperty,
        updateProperty,
        deleteProperty,
        addRoom,
        updateRoom,
        deleteRoom,
        isLoading,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within PropertyProvider');
  }
  return context;
}