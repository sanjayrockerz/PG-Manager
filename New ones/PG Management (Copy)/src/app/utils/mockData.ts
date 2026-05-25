// Mock data for different properties

export interface Tenant {
  id: string;
  name: string;
  room: string;
  phone: string;
  email: string;
  joinDate: string;
  rent: number;
  status: 'active' | 'inactive';
  propertyId: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: 'single' | 'double' | 'triple';
  rent: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenant?: string;
  propertyId: string;
}

export interface Payment {
  id: string;
  tenant: string;
  room: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  propertyId: string;
}

export interface MaintenanceRequest {
  id: string;
  room: string;
  tenant: string;
  issue: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  propertyId: string;
}

export const mockTenants: Tenant[] = [
  // Green Valley PG (prop-1)
  { id: '1', name: 'Rajesh Kumar', room: '101', phone: '+91 98765 43210', email: 'rajesh@example.com', joinDate: '2024-01-15', rent: 5500, status: 'active', propertyId: 'prop-1' },
  { id: '2', name: 'Priya Sharma', room: '205', phone: '+91 98765 43211', email: 'priya@example.com', joinDate: '2024-02-01', rent: 6000, status: 'active', propertyId: 'prop-1' },
  { id: '3', name: 'Amit Patel', room: '302', phone: '+91 98765 43212', email: 'amit@example.com', joinDate: '2024-01-20', rent: 5500, status: 'active', propertyId: 'prop-1' },
  { id: '4', name: 'Sneha Reddy', room: '108', phone: '+91 98765 43213', email: 'sneha@example.com', joinDate: '2024-03-10', rent: 7000, status: 'active', propertyId: 'prop-1' },
  { id: '5', name: 'Vikram Singh', room: '215', phone: '+91 98765 43214', email: 'vikram@example.com', joinDate: '2024-02-15', rent: 6500, status: 'active', propertyId: 'prop-1' },
  
  // Sunrise Residency (prop-2)
  { id: '6', name: 'Ananya Iyer', room: '101', phone: '+91 98765 43215', email: 'ananya@example.com', joinDate: '2024-04-01', rent: 6500, status: 'active', propertyId: 'prop-2' },
  { id: '7', name: 'Karthik Menon', room: '205', phone: '+91 98765 43216', email: 'karthik@example.com', joinDate: '2024-04-15', rent: 7000, status: 'active', propertyId: 'prop-2' },
  { id: '8', name: 'Deepa Nair', room: '310', phone: '+91 98765 43217', email: 'deepa@example.com', joinDate: '2024-05-01', rent: 6500, status: 'active', propertyId: 'prop-2' },
  { id: '9', name: 'Ravi Kumar', room: '402', phone: '+91 98765 43218', email: 'ravi@example.com', joinDate: '2024-05-20', rent: 7500, status: 'active', propertyId: 'prop-2' },
  
  // City Center PG (prop-3)
  { id: '10', name: 'Meera Desai', room: '101', phone: '+91 98765 43219', email: 'meera@example.com', joinDate: '2024-06-15', rent: 5000, status: 'active', propertyId: 'prop-3' },
  { id: '11', name: 'Arjun Shah', room: '105', phone: '+91 98765 43220', email: 'arjun@example.com', joinDate: '2024-07-01', rent: 5500, status: 'active', propertyId: 'prop-3' },
  { id: '12', name: 'Pooja Mehta', room: '208', phone: '+91 98765 43221', email: 'pooja@example.com', joinDate: '2024-07-10', rent: 6000, status: 'active', propertyId: 'prop-3' },
  
  // Lakeview PG (prop-4)
  { id: '13', name: 'Sanjay Gupta', room: '102', phone: '+91 98765 43222', email: 'sanjay@example.com', joinDate: '2024-08-10', rent: 6000, status: 'active', propertyId: 'prop-4' },
  { id: '14', name: 'Divya Krishnan', room: '206', phone: '+91 98765 43223', email: 'divya@example.com', joinDate: '2024-08-20', rent: 6500, status: 'active', propertyId: 'prop-4' },
  { id: '15', name: 'Rahul Verma', room: '307', phone: '+91 98765 43224', email: 'rahul@example.com', joinDate: '2024-09-01', rent: 7000, status: 'active', propertyId: 'prop-4' },
];

export const mockRooms: Room[] = [
  // Green Valley PG (prop-1) - 50 rooms across 3 floors
  { id: 'r1', number: '101', floor: 1, type: 'single', rent: 5500, status: 'occupied', tenant: 'Rajesh Kumar', propertyId: 'prop-1' },
  { id: 'r2', number: '102', floor: 1, type: 'double', rent: 6000, status: 'vacant', propertyId: 'prop-1' },
  { id: 'r3', number: '103', floor: 1, type: 'single', rent: 5500, status: 'occupied', propertyId: 'prop-1' },
  { id: 'r4', number: '108', floor: 1, type: 'triple', rent: 7000, status: 'occupied', tenant: 'Sneha Reddy', propertyId: 'prop-1' },
  { id: 'r5', number: '205', floor: 2, type: 'double', rent: 6000, status: 'occupied', tenant: 'Priya Sharma', propertyId: 'prop-1' },
  { id: 'r6', number: '210', floor: 2, type: 'single', rent: 5500, status: 'vacant', propertyId: 'prop-1' },
  { id: 'r7', number: '215', floor: 2, type: 'double', rent: 6500, status: 'occupied', tenant: 'Vikram Singh', propertyId: 'prop-1' },
  { id: 'r8', number: '302', floor: 3, type: 'single', rent: 5500, status: 'occupied', tenant: 'Amit Patel', propertyId: 'prop-1' },
  { id: 'r9', number: '305', floor: 3, type: 'double', rent: 6000, status: 'maintenance', propertyId: 'prop-1' },
  
  // Sunrise Residency (prop-2) - 60 rooms across 4 floors
  { id: 'r10', number: '101', floor: 1, type: 'double', rent: 6500, status: 'occupied', tenant: 'Ananya Iyer', propertyId: 'prop-2' },
  { id: 'r11', number: '102', floor: 1, type: 'single', rent: 6000, status: 'vacant', propertyId: 'prop-2' },
  { id: 'r12', number: '205', floor: 2, type: 'triple', rent: 7000, status: 'occupied', tenant: 'Karthik Menon', propertyId: 'prop-2' },
  { id: 'r13', number: '310', floor: 3, type: 'double', rent: 6500, status: 'occupied', tenant: 'Deepa Nair', propertyId: 'prop-2' },
  { id: 'r14', number: '402', floor: 4, type: 'triple', rent: 7500, status: 'occupied', tenant: 'Ravi Kumar', propertyId: 'prop-2' },
  { id: 'r15', number: '408', floor: 4, type: 'single', rent: 6000, status: 'vacant', propertyId: 'prop-2' },
  
  // City Center PG (prop-3) - 30 rooms across 2 floors
  { id: 'r16', number: '101', floor: 1, type: 'single', rent: 5000, status: 'occupied', tenant: 'Meera Desai', propertyId: 'prop-3' },
  { id: 'r17', number: '105', floor: 1, type: 'double', rent: 5500, status: 'occupied', tenant: 'Arjun Shah', propertyId: 'prop-3' },
  { id: 'r18', number: '110', floor: 1, type: 'single', rent: 5000, status: 'vacant', propertyId: 'prop-3' },
  { id: 'r19', number: '208', floor: 2, type: 'double', rent: 6000, status: 'occupied', tenant: 'Pooja Mehta', propertyId: 'prop-3' },
  { id: 'r20', number: '215', floor: 2, type: 'single', rent: 5000, status: 'vacant', propertyId: 'prop-3' },
  
  // Lakeview PG (prop-4) - 45 rooms across 3 floors
  { id: 'r21', number: '102', floor: 1, type: 'double', rent: 6000, status: 'occupied', tenant: 'Sanjay Gupta', propertyId: 'prop-4' },
  { id: 'r22', number: '108', floor: 1, type: 'single', rent: 5500, status: 'vacant', propertyId: 'prop-4' },
  { id: 'r23', number: '206', floor: 2, type: 'double', rent: 6500, status: 'occupied', tenant: 'Divya Krishnan', propertyId: 'prop-4' },
  { id: 'r24', number: '307', floor: 3, type: 'triple', rent: 7000, status: 'occupied', tenant: 'Rahul Verma', propertyId: 'prop-4' },
  { id: 'r25', number: '312', floor: 3, type: 'single', rent: 6000, status: 'vacant', propertyId: 'prop-4' },
];

export const mockPayments: Payment[] = [
  // Green Valley PG payments
  { id: 'p1', tenant: 'Rajesh Kumar', room: '101', amount: 5500, status: 'paid', date: '2025-12-01', propertyId: 'prop-1' },
  { id: 'p2', tenant: 'Priya Sharma', room: '205', amount: 6000, status: 'paid', date: '2025-12-01', propertyId: 'prop-1' },
  { id: 'p3', tenant: 'Amit Patel', room: '302', amount: 5500, status: 'pending', date: '2025-12-02', propertyId: 'prop-1' },
  { id: 'p4', tenant: 'Sneha Reddy', room: '108', amount: 7000, status: 'overdue', date: '2025-11-28', propertyId: 'prop-1' },
  { id: 'p5', tenant: 'Vikram Singh', room: '215', amount: 6500, status: 'paid', date: '2025-12-01', propertyId: 'prop-1' },
  
  // Sunrise Residency payments
  { id: 'p6', tenant: 'Ananya Iyer', room: '101', amount: 6500, status: 'paid', date: '2025-12-01', propertyId: 'prop-2' },
  { id: 'p7', tenant: 'Karthik Menon', room: '205', amount: 7000, status: 'paid', date: '2025-12-02', propertyId: 'prop-2' },
  { id: 'p8', tenant: 'Deepa Nair', room: '310', amount: 6500, status: 'pending', date: '2025-12-03', propertyId: 'prop-2' },
  { id: 'p9', tenant: 'Ravi Kumar', room: '402', amount: 7500, status: 'paid', date: '2025-12-01', propertyId: 'prop-2' },
  
  // City Center PG payments
  { id: 'p10', tenant: 'Meera Desai', room: '101', amount: 5000, status: 'paid', date: '2025-12-01', propertyId: 'prop-3' },
  { id: 'p11', tenant: 'Arjun Shah', room: '105', amount: 5500, status: 'pending', date: '2025-12-05', propertyId: 'prop-3' },
  { id: 'p12', tenant: 'Pooja Mehta', room: '208', amount: 6000, status: 'paid', date: '2025-12-02', propertyId: 'prop-3' },
  
  // Lakeview PG payments
  { id: 'p13', tenant: 'Sanjay Gupta', room: '102', amount: 6000, status: 'paid', date: '2025-12-01', propertyId: 'prop-4' },
  { id: 'p14', tenant: 'Divya Krishnan', room: '206', amount: 6500, status: 'paid', date: '2025-12-01', propertyId: 'prop-4' },
  { id: 'p15', tenant: 'Rahul Verma', room: '307', amount: 7000, status: 'overdue', date: '2025-11-25', propertyId: 'prop-4' },
];

export const mockMaintenanceRequests: MaintenanceRequest[] = [
  // Green Valley PG
  { id: 'm1', room: '205', tenant: 'Priya Sharma', issue: 'AC not working', priority: 'high', status: 'in-progress', date: '2025-12-05', propertyId: 'prop-1' },
  { id: 'm2', room: '302', tenant: 'Amit Patel', issue: 'Leaking tap', priority: 'medium', status: 'open', date: '2025-12-06', propertyId: 'prop-1' },
  { id: 'm3', room: '108', tenant: 'Sneha Reddy', issue: 'Door lock issue', priority: 'low', status: 'resolved', date: '2025-12-03', propertyId: 'prop-1' },
  
  // Sunrise Residency
  { id: 'm4', room: '310', tenant: 'Deepa Nair', issue: 'WiFi not working', priority: 'high', status: 'open', date: '2025-12-06', propertyId: 'prop-2' },
  { id: 'm5', room: '402', tenant: 'Ravi Kumar', issue: 'Light bulb replacement', priority: 'low', status: 'resolved', date: '2025-12-04', propertyId: 'prop-2' },
  
  // City Center PG
  { id: 'm6', room: '208', tenant: 'Pooja Mehta', issue: 'Water heater not working', priority: 'high', status: 'in-progress', date: '2025-12-05', propertyId: 'prop-3' },
  
  // Lakeview PG
  { id: 'm7', room: '307', tenant: 'Rahul Verma', issue: 'Window glass broken', priority: 'medium', status: 'open', date: '2025-12-06', propertyId: 'prop-4' },
];

// Helper function to filter data by property
export function filterByProperty<T extends { propertyId: string }>(
  data: T[],
  selectedProperty: string | 'all'
): T[] {
  if (selectedProperty === 'all') {
    return data;
  }
  return data.filter(item => item.propertyId === selectedProperty);
}
