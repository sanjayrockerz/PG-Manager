import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import {
  addRoomToProperty,
  createPropertyRecord,
  deletePropertyRecord,
  deleteRoomFromProperty,
  getProperties,
  isDemoModeEnabled,
  updatePropertyRecord,
  updateRoomInProperty,
} from '../services/dataService';

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
  addressLine1?: string;
  addressLine2?: string;
  locality?: string;
  landmark?: string;
  formattedAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'rooms'>) => Promise<void>;
  updateProperty: (id: string, property: Partial<Property>) => Promise<void>;
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
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);
  const isDemoMode = isDemoModeEnabled();

  const refreshProperties = useCallback(async (showLoader: boolean) => {
    if (inFlightRefreshRef.current) {
      await inFlightRefreshRef.current;
      return;
    }

    const request = (async () => {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
        const list = await getProperties();
        setProperties(list);
      } catch {
        // Keep last known properties (or cached state) to avoid blank-screen regressions.
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    })();

    inFlightRefreshRef.current = request;
    await request;
    inFlightRefreshRef.current = null;
  }, []);

  useEffect(() => {
    void refreshProperties(true);
  }, [refreshProperties]);

  useRealtimeRefresh({
    key: 'property-context',
    tables: ['properties', 'rooms'],
    onChange: () => refreshProperties(false),
    enabled: !isDemoMode,
  });

  const addProperty = async (property: Omit<Property, 'id' | 'createdAt' | 'rooms'>): Promise<void> => {
    try {
      const created = await createPropertyRecord(property);
      setProperties((prev) => [created, ...prev]);
      await refreshProperties(false);
    } catch (error) {
      throw error;
    }
  };

  const updateProperty = async (id: string, updatedData: Partial<Property>): Promise<void> => {
    const payload = { ...updatedData };
    delete (payload as Partial<Property>).rooms;

    try {
      const updated = await updatePropertyRecord(id, payload);
      setProperties((prev) => prev.map((prop) => (prop.id === id ? updated : prop)));
      await refreshProperties(false);
    } catch (error) {
      throw error;
    }
  };

  const deleteProperty = (id: string) => {
    const previous = properties;
    setProperties((prev) => prev.filter((prop) => prop.id !== id));
    if (selectedProperty === id) {
      setSelectedProperty('all');
    }

    void deletePropertyRecord(id).catch(() => {
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

    void addRoomToProperty(propertyId, room)
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

    void updateRoomInProperty(propertyId, roomId, updatedRoom).catch(() => {
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

    void deleteRoomFromProperty(propertyId, roomId).catch(() => {
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