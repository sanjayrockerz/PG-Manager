import { createContext, useContext, useState, ReactNode } from 'react';

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: 'single' | 'double' | 'triple';
  beds: number; // Number of beds in the room
  rent: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenant?: string;
  occupiedBeds?: number; // Number of beds currently occupied
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
  rooms: Room[]; // Rooms array integrated into property
}

export const mockProperties: Property[] = [
  {
    id: 'prop-1',
    name: 'Green Valley PG',
    address: '123, MG Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    floors: 3,
    totalRooms: 9,
    contactName: 'Rajesh Kumar',
    contactPhone: '+91 98765 43210',
    contactEmail: 'rajesh@greenvalley.com',
    createdAt: '2024-01-15',
    rooms: [
      { id: 'r1', number: '101', floor: 1, type: 'single', beds: 1, rent: 5500, status: 'occupied', tenant: 'Rajesh Kumar', occupiedBeds: 1 },
      { id: 'r2', number: '102', floor: 1, type: 'double', beds: 2, rent: 6000, status: 'vacant', occupiedBeds: 0 },
      { id: 'r3', number: '103', floor: 1, type: 'single', beds: 1, rent: 5500, status: 'occupied', occupiedBeds: 1 },
      { id: 'r4', number: '108', floor: 1, type: 'triple', beds: 3, rent: 7000, status: 'occupied', tenant: 'Sneha Reddy', occupiedBeds: 2 },
      { id: 'r5', number: '205', floor: 2, type: 'double', beds: 2, rent: 6000, status: 'occupied', tenant: 'Priya Sharma', occupiedBeds: 1 },
      { id: 'r6', number: '210', floor: 2, type: 'single', beds: 1, rent: 5500, status: 'vacant', occupiedBeds: 0 },
      { id: 'r7', number: '215', floor: 2, type: 'double', beds: 2, rent: 6500, status: 'occupied', tenant: 'Vikram Singh', occupiedBeds: 2 },
      { id: 'r8', number: '302', floor: 3, type: 'single', beds: 1, rent: 5500, status: 'occupied', tenant: 'Amit Patel', occupiedBeds: 1 },
      { id: 'r9', number: '305', floor: 3, type: 'double', beds: 2, rent: 6000, status: 'maintenance', occupiedBeds: 0 },
    ],
  },
  {
    id: 'prop-2',
    name: 'Sunrise Residency',
    address: '456, Park Street',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560002',
    floors: 4,
    totalRooms: 6,
    contactName: 'Priya Sharma',
    contactPhone: '+91 98765 43211',
    contactEmail: 'priya@sunrise.com',
    createdAt: '2024-03-20',
    rooms: [
      { id: 'r10', number: '101', floor: 1, type: 'double', beds: 2, rent: 6500, status: 'occupied', tenant: 'Ananya Iyer', occupiedBeds: 1 },
      { id: 'r11', number: '102', floor: 1, type: 'single', beds: 1, rent: 6000, status: 'vacant', occupiedBeds: 0 },
      { id: 'r12', number: '205', floor: 2, type: 'triple', beds: 3, rent: 7000, status: 'occupied', tenant: 'Karthik Menon', occupiedBeds: 2 },
      { id: 'r13', number: '310', floor: 3, type: 'double', beds: 2, rent: 6500, status: 'occupied', tenant: 'Deepa Nair', occupiedBeds: 2 },
      { id: 'r14', number: '402', floor: 4, type: 'triple', beds: 3, rent: 7500, status: 'occupied', tenant: 'Ravi Kumar', occupiedBeds: 3 },
      { id: 'r15', number: '408', floor: 4, type: 'single', beds: 1, rent: 6000, status: 'vacant', occupiedBeds: 0 },
    ],
  },
  {
    id: 'prop-3',
    name: 'City Center PG',
    address: '789, Brigade Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560003',
    floors: 2,
    totalRooms: 5,
    contactName: 'Amit Patel',
    contactPhone: '+91 98765 43212',
    contactEmail: 'amit@citycenter.com',
    createdAt: '2024-06-10',
    rooms: [
      { id: 'r16', number: '101', floor: 1, type: 'single', beds: 1, rent: 5000, status: 'occupied', tenant: 'Meera Desai', occupiedBeds: 1 },
      { id: 'r17', number: '105', floor: 1, type: 'double', beds: 2, rent: 5500, status: 'occupied', tenant: 'Arjun Shah', occupiedBeds: 2 },
      { id: 'r18', number: '110', floor: 1, type: 'single', beds: 1, rent: 5000, status: 'vacant', occupiedBeds: 0 },
      { id: 'r19', number: '208', floor: 2, type: 'double', beds: 2, rent: 6000, status: 'occupied', tenant: 'Pooja Mehta', occupiedBeds: 1 },
      { id: 'r20', number: '215', floor: 2, type: 'single', beds: 1, rent: 5000, status: 'vacant', occupiedBeds: 0 },
    ],
  },
  {
    id: 'prop-4',
    name: 'Lakeview PG',
    address: '321, Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560095',
    floors: 3,
    totalRooms: 5,
    contactName: 'Sneha Reddy',
    contactPhone: '+91 98765 43213',
    contactEmail: 'sneha@lakeview.com',
    createdAt: '2024-08-05',
    rooms: [
      { id: 'r21', number: '102', floor: 1, type: 'double', beds: 2, rent: 6000, status: 'occupied', tenant: 'Sanjay Gupta', occupiedBeds: 1 },
      { id: 'r22', number: '108', floor: 1, type: 'single', beds: 1, rent: 5500, status: 'vacant', occupiedBeds: 0 },
      { id: 'r23', number: '206', floor: 2, type: 'double', beds: 2, rent: 6500, status: 'occupied', tenant: 'Divya Krishnan', occupiedBeds: 2 },
      { id: 'r24', number: '307', floor: 3, type: 'triple', beds: 3, rent: 7000, status: 'occupied', tenant: 'Rahul Verma', occupiedBeds: 1 },
      { id: 'r25', number: '312', floor: 3, type: 'single', beds: 1, rent: 6000, status: 'vacant', occupiedBeds: 0 },
    ],
  },
];

interface PropertyContextType {
  properties: Property[];
  selectedProperty: string | 'all'; // 'all' or property id
  setSelectedProperty: (propertyId: string | 'all') => void;
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'rooms'>) => void;
  updateProperty: (id: string, property: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  addRoom: (propertyId: string, room: Omit<Room, 'id'>) => void;
  updateRoom: (propertyId: string, roomId: string, room: Partial<Room>) => void;
  deleteRoom: (propertyId: string, roomId: string) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [selectedProperty, setSelectedProperty] = useState<string | 'all'>('all');

  const addProperty = (property: Omit<Property, 'id' | 'createdAt' | 'rooms'>) => {
    const newProperty: Property = {
      ...property,
      id: `prop-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      rooms: [],
    };
    setProperties([...properties, newProperty]);
  };

  const updateProperty = (id: string, updatedData: Partial<Property>) => {
    setProperties(properties.map(prop => 
      prop.id === id ? { ...prop, ...updatedData } : prop
    ));
  };

  const deleteProperty = (id: string) => {
    setProperties(properties.filter(prop => prop.id !== id));
    if (selectedProperty === id) {
      setSelectedProperty('all');
    }
  };

  const addRoom = (propertyId: string, room: Omit<Room, 'id'>) => {
    setProperties(properties.map(prop => {
      if (prop.id === propertyId) {
        const newRoom: Room = {
          ...room,
          id: `r-${Date.now()}`,
        };
        return {
          ...prop,
          rooms: [...prop.rooms, newRoom],
          totalRooms: prop.rooms.length + 1,
        };
      }
      return prop;
    }));
  };

  const updateRoom = (propertyId: string, roomId: string, updatedRoom: Partial<Room>) => {
    setProperties(properties.map(prop => {
      if (prop.id === propertyId) {
        return {
          ...prop,
          rooms: prop.rooms.map(room => 
            room.id === roomId ? { ...room, ...updatedRoom } : room
          ),
        };
      }
      return prop;
    }));
  };

  const deleteRoom = (propertyId: string, roomId: string) => {
    setProperties(properties.map(prop => {
      if (prop.id === propertyId) {
        return {
          ...prop,
          rooms: prop.rooms.filter(room => room.id !== roomId),
          totalRooms: prop.rooms.length - 1,
        };
      }
      return prop;
    }));
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