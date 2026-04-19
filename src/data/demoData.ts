import type { Property } from '../contexts/PropertyContext';
import type { DashboardSnapshot, PaymentRecord, TenantRecord } from '../services/supabaseData';

const now = new Date();

const toDateOnly = (value: Date): string => value.toISOString().split('T')[0];

const atMonthOffset = (monthOffset: number, day: number, hour = 10): Date => {
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, Math.min(Math.max(day, 1), 28), hour, 0, 0, 0);
  return date;
};

const toCreatedAt = (monthOffset: number, day: number, hour = 10): string => atMonthOffset(monthOffset, day, hour).toISOString();
const toDueDate = (monthOffset: number, day: number): string => toDateOnly(atMonthOffset(monthOffset, day, 8));
const toJoinDate = (monthOffset: number, day: number): string => toDateOnly(atMonthOffset(monthOffset, day, 9));

const monthLabel = (monthOffset: number): string => atMonthOffset(monthOffset, 1).toLocaleDateString('en-US', { month: 'short' });

export const demoProperties: Property[] = [
  {
    id: 'demo-property-1',
    name: 'Sunrise Residency',
    address: '42 Residency Lane, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    floors: 3,
    totalRooms: 4,
    contactName: 'Neha Reddy',
    contactPhone: '+919845001111',
    contactEmail: 'sunrise.manager@demo.app',
    createdAt: toCreatedAt(-10, 6),
    rooms: [
      { id: 'demo-room-1', number: '101', floor: 1, type: 'double', beds: 2, rent: 10500, status: 'occupied', occupiedBeds: 2 },
      { id: 'demo-room-2', number: '102', floor: 1, type: 'single', beds: 1, rent: 11200, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-3', number: '201', floor: 2, type: 'double', beds: 2, rent: 9800, status: 'occupied', occupiedBeds: 2 },
      { id: 'demo-room-4', number: '202', floor: 2, type: 'single', beds: 1, rent: 8600, status: 'vacant', occupiedBeds: 0 },
    ],
  },
  {
    id: 'demo-property-2',
    name: 'Lakeview PG',
    address: '17 Outer Ring Road, HSR Layout',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560102',
    floors: 2,
    totalRooms: 3,
    contactName: 'Arjun Mehta',
    contactPhone: '+919900112233',
    contactEmail: 'lakeview.manager@demo.app',
    createdAt: toCreatedAt(-8, 12),
    rooms: [
      { id: 'demo-room-5', number: 'A1', floor: 1, type: 'single', beds: 1, rent: 8900, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-6', number: 'A2', floor: 1, type: 'double', beds: 2, rent: 9300, status: 'maintenance', occupiedBeds: 0 },
      { id: 'demo-room-7', number: 'B1', floor: 2, type: 'single', beds: 1, rent: 9200, status: 'occupied', occupiedBeds: 1 },
    ],
  },
];

export const demoTenants: TenantRecord[] = [
  {
    id: 'demo-tenant-1',
    ownerId: 'demo-owner-1',
    name: 'Rohan Dsouza',
    phone: '+919876500001',
    email: 'rohan.dsouza@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 1,
    room: '101',
    bed: '1',
    rent: 10500,
    securityDeposit: 21000,
    rentDueDate: 5,
    parentName: 'Anthony Dsouza',
    parentPhone: '+919876500099',
    idType: 'Aadhaar',
    idNumber: '111122223333',
    idDocumentUrl: '',
    joinDate: toJoinDate(-9, 10),
    status: 'active',
    createdAt: toCreatedAt(-9, 10),
  },
  {
    id: 'demo-tenant-2',
    ownerId: 'demo-owner-1',
    name: 'Karan Malhotra',
    phone: '+919876500002',
    email: 'karan.malhotra@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 1,
    room: '102',
    bed: '1',
    rent: 11200,
    securityDeposit: 22400,
    rentDueDate: 7,
    parentName: 'Rakesh Malhotra',
    parentPhone: '+919876500088',
    idType: 'PAN',
    idNumber: 'ABCDE4321F',
    idDocumentUrl: '',
    joinDate: toJoinDate(-7, 8),
    status: 'active',
    createdAt: toCreatedAt(-7, 8),
  },
  {
    id: 'demo-tenant-3',
    ownerId: 'demo-owner-1',
    name: 'Nisha Verma',
    phone: '+919876500003',
    email: 'nisha.verma@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 2,
    room: '201',
    bed: '1',
    rent: 9800,
    securityDeposit: 19600,
    rentDueDate: 4,
    parentName: 'Mahesh Verma',
    parentPhone: '+919876500077',
    idType: 'Passport',
    idNumber: 'Z1234567',
    idDocumentUrl: '',
    joinDate: toJoinDate(-6, 14),
    status: 'active',
    createdAt: toCreatedAt(-6, 14),
  },
  {
    id: 'demo-tenant-4',
    ownerId: 'demo-owner-1',
    name: 'Aditya Nair',
    phone: '+919876500004',
    email: 'aditya.nair@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-2',
    floor: 1,
    room: 'A1',
    bed: '1',
    rent: 8900,
    securityDeposit: 17800,
    rentDueDate: 8,
    parentName: 'Vikram Nair',
    parentPhone: '+919876500066',
    idType: 'Driving License',
    idNumber: 'KA0520241234567',
    idDocumentUrl: '',
    joinDate: toJoinDate(-4, 3),
    status: 'active',
    createdAt: toCreatedAt(-4, 3),
  },
  {
    id: 'demo-tenant-5',
    ownerId: 'demo-owner-1',
    name: 'Meera Iyer',
    phone: '+919876500005',
    email: 'meera.iyer@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-2',
    floor: 2,
    room: 'B1',
    bed: '1',
    rent: 9200,
    securityDeposit: 18400,
    rentDueDate: 6,
    parentName: 'Suresh Iyer',
    parentPhone: '+919876500055',
    idType: 'Aadhaar',
    idNumber: '999988887777',
    idDocumentUrl: '',
    joinDate: toJoinDate(-3, 18),
    status: 'inactive',
    createdAt: toCreatedAt(-3, 18),
  },
];

export const demoPayments: PaymentRecord[] = [
  {
    id: 'demo-payment-1',
    tenantId: 'demo-tenant-1',
    tenant: 'Rohan Dsouza',
    propertyId: 'demo-property-1',
    room: '101',
    monthlyRent: 10500,
    extraCharges: 0,
    totalAmount: 10500,
    dueDate: toDueDate(0, 5),
    paidDate: toDueDate(0, 4),
    status: 'paid',
    createdAt: toCreatedAt(0, 4, 11),
  },
  {
    id: 'demo-payment-2',
    tenantId: 'demo-tenant-2',
    tenant: 'Karan Malhotra',
    propertyId: 'demo-property-1',
    room: '102',
    monthlyRent: 11200,
    extraCharges: 0,
    totalAmount: 11200,
    dueDate: toDueDate(0, 7),
    paidDate: '',
    status: 'pending',
    createdAt: toCreatedAt(0, 7, 10),
  },
  {
    id: 'demo-payment-3',
    tenantId: 'demo-tenant-3',
    tenant: 'Nisha Verma',
    propertyId: 'demo-property-1',
    room: '201',
    monthlyRent: 8200,
    extraCharges: 400,
    totalAmount: 8600,
    dueDate: toDueDate(0, 3),
    paidDate: '',
    status: 'overdue',
    createdAt: toCreatedAt(0, 3, 9),
  },
  {
    id: 'demo-payment-4',
    tenantId: 'demo-tenant-4',
    tenant: 'Aditya Nair',
    propertyId: 'demo-property-2',
    room: 'A1',
    monthlyRent: 8900,
    extraCharges: 0,
    totalAmount: 8900,
    dueDate: toDueDate(0, 8),
    paidDate: toDueDate(0, 8),
    status: 'paid',
    createdAt: toCreatedAt(0, 8, 10),
  },
  {
    id: 'demo-payment-5',
    tenantId: 'demo-tenant-3',
    tenant: 'Nisha Verma',
    propertyId: 'demo-property-1',
    room: '201',
    monthlyRent: 9800,
    extraCharges: 0,
    totalAmount: 9800,
    dueDate: toDueDate(-1, 4),
    paidDate: toDueDate(-1, 3),
    status: 'paid',
    createdAt: toCreatedAt(-1, 3, 11),
  },
];

export const demoRecentActivity: DashboardSnapshot['recentActivity'] = [
  {
    id: 'demo-activity-1',
    action: 'Payment received',
    detail: 'Rohan Dsouza - Room 101',
    propertyId: 'demo-property-1',
    createdAt: toCreatedAt(0, 4, 11),
  },
  {
    id: 'demo-activity-2',
    action: 'Maintenance request',
    detail: 'Water leakage - Room A2',
    propertyId: 'demo-property-2',
    createdAt: toCreatedAt(0, 6, 9),
  },
  {
    id: 'demo-activity-3',
    action: 'Payment update',
    detail: 'Karan Malhotra - Room 102',
    propertyId: 'demo-property-1',
    createdAt: toCreatedAt(0, 7, 10),
  },
  {
    id: 'demo-activity-4',
    action: 'Maintenance request',
    detail: 'Fan repair - Room 201',
    propertyId: 'demo-property-1',
    createdAt: toCreatedAt(0, 5, 12),
  },
  {
    id: 'demo-activity-5',
    action: 'Payment received',
    detail: 'Aditya Nair - Room A1',
    propertyId: 'demo-property-2',
    createdAt: toCreatedAt(0, 8, 10),
  },
];

const filterByPropertyId = <T extends { propertyId: string }>(rows: T[], propertyId: string | 'all'): T[] => {
  if (propertyId === 'all') {
    return rows;
  }
  return rows.filter((row) => row.propertyId === propertyId);
};

const buildRevenueChartData = (payments: PaymentRecord[]): DashboardSnapshot['revenueChartData'] => {
  const monthBuckets: Array<{ key: string; name: string; revenue: number }> = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = atMonthOffset(-i, 1);
    monthBuckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      name: monthLabel(-i),
      revenue: 0,
    });
  }

  payments.forEach((payment) => {
    if (payment.status !== 'paid') {
      return;
    }
    const referenceDate = new Date(payment.paidDate || payment.dueDate);
    const key = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}`;
    const bucket = monthBuckets.find((entry) => entry.key === key);
    if (bucket) {
      bucket.revenue += payment.totalAmount;
    }
  });

  const averageRevenue = monthBuckets.length > 0
    ? monthBuckets.reduce((sum, bucket) => sum + bucket.revenue, 0) / monthBuckets.length
    : 0;

  return monthBuckets.map((bucket) => ({
    name: bucket.name,
    revenue: bucket.revenue,
    target: Math.round(averageRevenue),
  }));
};

export const buildDemoDashboardSnapshot = (propertyId: string | 'all'): DashboardSnapshot => {
  const properties = propertyId === 'all'
    ? demoProperties
    : demoProperties.filter((property) => property.id === propertyId);

  const tenants = filterByPropertyId(demoTenants, propertyId);
  const payments = filterByPropertyId(demoPayments, propertyId);
  const recentActivity = propertyId === 'all'
    ? demoRecentActivity
    : demoRecentActivity.filter((entry) => entry.propertyId === propertyId || entry.propertyId === null);

  const allRooms = properties.flatMap((property) => property.rooms);
  const occupiedRooms = allRooms.filter((room) => room.status === 'occupied').length;
  const totalRooms = allRooms.length;

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = payments
    .filter((payment) => {
      if (payment.status !== 'paid') {
        return false;
      }
      const referenceDate = new Date(payment.paidDate || payment.dueDate);
      return referenceDate.getMonth() === currentMonth && referenceDate.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + payment.totalAmount, 0);

  const pendingAmount = payments
    .filter((payment) => payment.status === 'pending' || payment.status === 'overdue')
    .reduce((sum, payment) => sum + payment.totalAmount, 0);

  const pendingIssues = recentActivity.filter((activity) => activity.action.toLowerCase().includes('maintenance')).length;

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalTenants: tenants.filter((tenant) => tenant.status === 'active').length,
    occupiedRooms,
    totalRooms,
    monthlyRevenue,
    pendingAmount,
    pendingIssues,
    recentPayments,
    recentActivity,
    revenueChartData: buildRevenueChartData(payments),
  };
};

export const demoDashboardSnapshot: DashboardSnapshot = buildDemoDashboardSnapshot('all');

// Alias exports for data-service contracts.
export const dashboardStats = demoDashboardSnapshot;
export const tenants = demoTenants;
export const properties = demoProperties;
export const payments = demoPayments;
export const activities = demoRecentActivity;
