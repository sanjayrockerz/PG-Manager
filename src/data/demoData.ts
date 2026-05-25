import type { Property } from '../contexts/PropertyContext';
import type {
  ActivityLogEntry,
  AnnouncementRecord,
  DashboardSnapshot,
  MaintenanceTicketRecord,
  PaymentRecord,
  TenantRecord,
  VacateRequest,
} from '../services/supabaseData';
import { isTenantCurrentlyInRoom } from '../services/supabaseData';

const now = new Date();

const toDateOnly = (value: Date): string => value.toISOString().split('T')[0];

const atMonthOffset = (monthOffset: number, day: number, hour = 10): Date => {
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, Math.min(Math.max(day, 1), 28), hour, 0, 0, 0);
  return date;
};

const shiftDays = (days: number, hour = 10): Date => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
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
    totalRooms: 6,
    contactName: 'Neha Reddy',
    contactPhone: '+919845001111',
    contactEmail: 'sunrise.manager@demo.app',
    occupancyMode: 'BED_BASED',
    createdAt: toCreatedAt(-10, 6),
    rooms: [
      { id: 'demo-room-1', number: '101', floor: 1, type: 'double', beds: 2, rent: 10500, status: 'occupied', occupiedBeds: 2 },
      { id: 'demo-room-2', number: '102', floor: 1, type: 'single', beds: 1, rent: 11200, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-3', number: '201', floor: 2, type: 'double', beds: 2, rent: 9800, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-4', number: '202', floor: 2, type: 'single', beds: 1, rent: 8600, status: 'vacant', occupiedBeds: 0 },
      { id: 'demo-room-8', number: '301', floor: 3, type: 'triple', beds: 3, rent: 8000, status: 'occupied', occupiedBeds: 2 },
      { id: 'demo-room-9', number: '302', floor: 3, type: 'double', beds: 2, rent: 9200, status: 'maintenance', occupiedBeds: 0 },
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
    totalRooms: 4,
    contactName: 'Arjun Mehta',
    contactPhone: '+919900112233',
    contactEmail: 'lakeview.manager@demo.app',
    occupancyMode: 'ROOM_BASED',
    createdAt: toCreatedAt(-8, 12),
    rooms: [
      { id: 'demo-room-5', number: 'A1', floor: 1, type: 'single', beds: 1, rent: 8900, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-6', number: 'A2', floor: 1, type: 'double', beds: 2, rent: 9300, status: 'maintenance', occupiedBeds: 0 },
      { id: 'demo-room-7', number: 'B1', floor: 2, type: 'single', beds: 1, rent: 9200, status: 'vacant', occupiedBeds: 0 },
      { id: 'demo-room-10', number: 'B2', floor: 2, type: 'double', beds: 2, rent: 10200, status: 'occupied', occupiedBeds: 1 },
    ],
  },
];

export const demoTenants: TenantRecord[] = [
  // --- Sunrise Residency tenants ---
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
    id: 'demo-tenant-1b',
    ownerId: 'demo-owner-1',
    name: 'Priya Kapoor',
    phone: '+919876500011',
    email: 'priya.kapoor@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 1,
    room: '101',
    bed: '2',
    rent: 10500,
    securityDeposit: 21000,
    rentDueDate: 5,
    parentName: 'Suresh Kapoor',
    parentPhone: '+919876500012',
    idType: 'PAN',
    idNumber: 'BCDFE4321G',
    idDocumentUrl: '',
    joinDate: toJoinDate(-6, 15),
    status: 'active',
    createdAt: toCreatedAt(-6, 15),
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
    status: 'payment_overdue',
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
    status: 'notice_submitted',
    vacateDate: toDateOnly(shiftDays(15)),
    vacateReason: 'Relocating to another city for job.',
    createdAt: toCreatedAt(-6, 14),
  },
  {
    id: 'demo-tenant-6',
    ownerId: 'demo-owner-1',
    name: 'Ravi Shankar',
    phone: '+919876500016',
    email: 'ravi.shankar@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 3,
    room: '301',
    bed: '1',
    rent: 8000,
    securityDeposit: 16000,
    rentDueDate: 10,
    parentName: 'Gopal Shankar',
    parentPhone: '+919876500017',
    idType: 'Aadhaar',
    idNumber: '444455556666',
    idDocumentUrl: '',
    joinDate: toJoinDate(-5, 1),
    status: 'active',
    createdAt: toCreatedAt(-5, 1),
  },
  {
    id: 'demo-tenant-7',
    ownerId: 'demo-owner-1',
    name: 'Anjali Singh',
    phone: '+919876500017',
    email: 'anjali.singh@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 3,
    room: '301',
    bed: '2',
    rent: 8000,
    securityDeposit: 16000,
    rentDueDate: 10,
    parentName: 'Ramesh Singh',
    parentPhone: '+919876500018',
    idType: 'Driving License',
    idNumber: 'KA0420210054321',
    idDocumentUrl: '',
    joinDate: toJoinDate(-3, 5),
    status: 'vacating',
    vacateDate: toDateOnly(shiftDays(5)),
    vacateReason: 'Course completed, returning home.',
    createdAt: toCreatedAt(-3, 5),
  },
  // Archived former tenant at Sunrise
  {
    id: 'demo-tenant-8',
    ownerId: 'demo-owner-1',
    name: 'Deepak Joshi',
    phone: '+919876500018',
    email: 'deepak.joshi@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 2,
    room: '202',
    bed: '1',
    rent: 8600,
    securityDeposit: 17200,
    rentDueDate: 3,
    parentName: 'Narayan Joshi',
    parentPhone: '+919876500019',
    idType: 'Aadhaar',
    idNumber: '777788889999',
    idDocumentUrl: '',
    joinDate: toJoinDate(-12, 1),
    status: 'archived',
    vacateDate: toDateOnly(atMonthOffset(-2, 28)),
    vacateReason: 'Bought own flat.',
    createdAt: toCreatedAt(-12, 1),
  },
  // --- Lakeview PG tenants ---
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
    room: 'B2',
    bed: '1',
    rent: 10200,
    securityDeposit: 20400,
    rentDueDate: 6,
    parentName: 'Suresh Iyer',
    parentPhone: '+919876500055',
    idType: 'Aadhaar',
    idNumber: '999988887777',
    idDocumentUrl: '',
    joinDate: toJoinDate(-3, 18),
    status: 'active',
    createdAt: toCreatedAt(-3, 18),
  },
  // Inactive (recently vacated) at Lakeview
  {
    id: 'demo-tenant-9',
    ownerId: 'demo-owner-1',
    name: 'Siddharth Rao',
    phone: '+919876500019',
    email: 'siddharth.rao@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-2',
    floor: 2,
    room: 'B1',
    bed: '1',
    rent: 9200,
    securityDeposit: 18400,
    rentDueDate: 12,
    parentName: 'Krishna Rao',
    parentPhone: '+919876500020',
    idType: 'PAN',
    idNumber: 'CDEFG5432H',
    idDocumentUrl: '',
    joinDate: toJoinDate(-5, 10),
    status: 'inactive',
    vacateDate: toDateOnly(shiftDays(-10)),
    vacateReason: 'Transferred to Pune office.',
    createdAt: toCreatedAt(-5, 10),
  },
];

export const demoVacateRequests: VacateRequest[] = [
  {
    id: 'demo-vacate-1',
    tenantId: 'demo-tenant-3',
    tenantName: 'Nisha Verma',
    propertyId: 'demo-property-1',
    room: '201',
    noticeDate: toDateOnly(shiftDays(-7)),
    plannedVacateDate: toDateOnly(shiftDays(15)),
    reason: 'Relocating to another city for job.',
    finalSettlementAmount: 9800,
    depositRefund: 18100,
    depositDeduction: 1500,
    deductionReason: 'Minor wall damage repair.',
    status: 'confirmed',
    createdAt: shiftDays(-7).toISOString(),
  },
  {
    id: 'demo-vacate-2',
    tenantId: 'demo-tenant-7',
    tenantName: 'Anjali Singh',
    propertyId: 'demo-property-1',
    room: '301',
    noticeDate: toDateOnly(shiftDays(-3)),
    plannedVacateDate: toDateOnly(shiftDays(5)),
    reason: 'Course completed, returning home.',
    finalSettlementAmount: 8000,
    depositRefund: 16000,
    depositDeduction: 0,
    deductionReason: '',
    status: 'pending',
    createdAt: shiftDays(-3).toISOString(),
  },
];

export const demoActivityLog: ActivityLogEntry[] = [
  {
    id: 'demo-log-1',
    ownerId: 'demo-owner-1',
    propertyId: 'demo-property-1',
    event: 'TENANT_ASSIGNED',
    detail: 'Priya Kapoor assigned to Room 101, Bed 2 at Sunrise Residency',
    metadata: { tenantId: 'demo-tenant-1b', room: '101', bed: '2' },
    createdAt: toCreatedAt(-6, 15),
  },
  {
    id: 'demo-log-2',
    ownerId: 'demo-owner-1',
    propertyId: 'demo-property-1',
    event: 'TENANT_STATUS_CHANGED',
    detail: 'Karan Malhotra status changed from active to payment_overdue',
    metadata: { tenantId: 'demo-tenant-2', previousStatus: 'active', newStatus: 'payment_overdue' },
    createdAt: shiftDays(-5).toISOString(),
  },
  {
    id: 'demo-log-3',
    ownerId: 'demo-owner-1',
    propertyId: 'demo-property-1',
    event: 'TENANT_VACATED',
    detail: 'Nisha Verma submitted vacate notice, planned exit in 15 days',
    metadata: { tenantId: 'demo-tenant-3', vacateDate: toDateOnly(shiftDays(15)) },
    createdAt: shiftDays(-7).toISOString(),
  },
  {
    id: 'demo-log-4',
    ownerId: 'demo-owner-1',
    propertyId: 'demo-property-2',
    event: 'ROOM_VACATED',
    detail: 'Room B1 vacated — Siddharth Rao checked out',
    metadata: { room: 'B1', floor: 2, tenantId: 'demo-tenant-9' },
    createdAt: shiftDays(-10).toISOString(),
  },
  {
    id: 'demo-log-5',
    ownerId: 'demo-owner-1',
    propertyId: 'demo-property-1',
    event: 'PAYMENT_RECORDED',
    detail: 'Rent received from Rohan Dsouza — ₹10,500',
    metadata: { tenantId: 'demo-tenant-1', amount: 10500 },
    createdAt: toCreatedAt(0, 4, 11),
  },
  {
    id: 'demo-log-6',
    ownerId: 'demo-owner-1',
    propertyId: 'demo-property-1',
    event: 'ROOM_MAINTENANCE',
    detail: 'Room 302 placed under maintenance — plumbing repair',
    metadata: { room: '302', floor: 3 },
    createdAt: shiftDays(-2).toISOString(),
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
    id: 'demo-payment-1b',
    tenantId: 'demo-tenant-1b',
    tenant: 'Priya Kapoor',
    propertyId: 'demo-property-1',
    room: '101',
    monthlyRent: 10500,
    extraCharges: 0,
    totalAmount: 10500,
    dueDate: toDueDate(0, 5),
    paidDate: '',
    status: 'pending',
    createdAt: toCreatedAt(0, 5, 9),
  },
  {
    id: 'demo-payment-2',
    tenantId: 'demo-tenant-2',
    tenant: 'Karan Malhotra',
    propertyId: 'demo-property-1',
    room: '102',
    monthlyRent: 11200,
    extraCharges: 500,
    totalAmount: 11700,
    dueDate: toDueDate(-1, 7),
    paidDate: '',
    status: 'overdue',
    createdAt: toCreatedAt(-1, 7, 10),
  },
  {
    id: 'demo-payment-3',
    tenantId: 'demo-tenant-3',
    tenant: 'Nisha Verma',
    propertyId: 'demo-property-1',
    room: '201',
    monthlyRent: 9800,
    extraCharges: 0,
    totalAmount: 9800,
    dueDate: toDueDate(0, 4),
    paidDate: toDueDate(0, 3),
    status: 'paid',
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
    tenantId: 'demo-tenant-5',
    tenant: 'Meera Iyer',
    propertyId: 'demo-property-2',
    room: 'B2',
    monthlyRent: 10200,
    extraCharges: 0,
    totalAmount: 10200,
    dueDate: toDueDate(0, 6),
    paidDate: '',
    status: 'pending',
    createdAt: toCreatedAt(0, 6, 10),
  },
  {
    id: 'demo-payment-6',
    tenantId: 'demo-tenant-6',
    tenant: 'Ravi Shankar',
    propertyId: 'demo-property-1',
    room: '301',
    monthlyRent: 8000,
    extraCharges: 0,
    totalAmount: 8000,
    dueDate: toDueDate(0, 10),
    paidDate: toDueDate(0, 10),
    status: 'paid',
    createdAt: toCreatedAt(0, 10, 10),
  },
  // Previous month payments
  {
    id: 'demo-payment-7',
    tenantId: 'demo-tenant-1',
    tenant: 'Rohan Dsouza',
    propertyId: 'demo-property-1',
    room: '101',
    monthlyRent: 10500,
    extraCharges: 0,
    totalAmount: 10500,
    dueDate: toDueDate(-1, 5),
    paidDate: toDueDate(-1, 4),
    status: 'paid',
    createdAt: toCreatedAt(-1, 4, 11),
  },
  {
    id: 'demo-payment-8',
    tenantId: 'demo-tenant-2',
    tenant: 'Karan Malhotra',
    propertyId: 'demo-property-1',
    room: '102',
    monthlyRent: 11200,
    extraCharges: 0,
    totalAmount: 11200,
    dueDate: toDueDate(-2, 7),
    paidDate: toDueDate(-2, 6),
    status: 'paid',
    createdAt: toCreatedAt(-2, 6, 11),
  },
];

export const demoRecentActivity: DashboardSnapshot['recentActivity'] = [
  {
    id: 'demo-activity-1',
    action: 'Payment received',
    detail: 'Rohan Dsouza — Room 101 — ₹10,500',
    propertyId: 'demo-property-1',
    createdAt: toCreatedAt(0, 4, 11),
  },
  {
    id: 'demo-activity-2',
    action: 'Vacate notice submitted',
    detail: 'Nisha Verma — Room 201 — moving out in 15 days',
    propertyId: 'demo-property-1',
    createdAt: shiftDays(-7).toISOString(),
  },
  {
    id: 'demo-activity-3',
    action: 'Payment overdue',
    detail: 'Karan Malhotra — Room 102 — ₹11,700 overdue',
    propertyId: 'demo-property-1',
    createdAt: toCreatedAt(-1, 7, 10),
  },
  {
    id: 'demo-activity-4',
    action: 'Tenant vacated',
    detail: 'Siddharth Rao — Room B1 — Lakeview PG',
    propertyId: 'demo-property-2',
    createdAt: shiftDays(-10).toISOString(),
  },
  {
    id: 'demo-activity-5',
    action: 'Payment received',
    detail: 'Aditya Nair — Room A1 — ₹8,900',
    propertyId: 'demo-property-2',
    createdAt: toCreatedAt(0, 8, 10),
  },
];

const filterByPropertyId = <T extends { propertyId: string }>(rows: T[], propertyId: string | 'all'): T[] => {
  if (propertyId === 'all') return rows;
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
    if (payment.status !== 'paid') return;
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
      if (payment.status !== 'paid') return false;
      const referenceDate = new Date(payment.paidDate || payment.dueDate);
      return referenceDate.getMonth() === currentMonth && referenceDate.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + payment.totalAmount, 0);

  const pendingAmount = payments
    .filter((payment) => payment.status === 'pending' || payment.status === 'overdue')
    .reduce((sum, payment) => sum + payment.totalAmount, 0);

  // Count all tenants currently occupying a room (not just 'active')
  const activeTenants = tenants.filter((tenant) => isTenantCurrentlyInRoom(tenant.status));
  const pendingIssues = recentActivity.filter((activity) => activity.action.toLowerCase().includes('maintenance')).length;

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalTenants: activeTenants.length,
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

export const demoMaintenanceTickets: MaintenanceTicketRecord[] = [
  {
    id: 'demo-ticket-1',
    ticketId: 'TKT-001',
    tenant: 'Aditya Nair',
    propertyId: 'demo-property-2',
    room: 'A2',
    issue: 'Water leakage',
    description: 'Severe water leakage from the bathroom ceiling. Floor is wet and slippery.',
    source: 'manual',
    status: 'open',
    priority: 'high',
    date: toDateOnly(atMonthOffset(0, 6)),
    phone: '+919876500004',
    notes: [],
  },
  {
    id: 'demo-ticket-2',
    ticketId: 'TKT-002',
    tenant: 'Nisha Verma',
    propertyId: 'demo-property-1',
    room: '201',
    issue: 'Ceiling fan not working',
    description: 'Ceiling fan stopped spinning. May need motor replacement.',
    source: 'manual',
    status: 'in-progress',
    priority: 'medium',
    date: toDateOnly(atMonthOffset(0, 5)),
    phone: '+919876500003',
    notes: ['Electrician visit scheduled for tomorrow.'],
  },
  {
    id: 'demo-ticket-3',
    ticketId: 'TKT-003',
    tenant: 'Rohan Dsouza',
    propertyId: 'demo-property-1',
    room: '101',
    issue: 'AC not cooling',
    description: 'Air conditioner is running but not cooling the room.',
    source: 'whatsapp',
    status: 'resolved',
    priority: 'high',
    date: toDateOnly(atMonthOffset(-1, 20)),
    phone: '+919876500001',
    notes: ['Gas refilled and serviced.', 'Tenant confirmed issue resolved.'],
  },
  {
    id: 'demo-ticket-4',
    ticketId: 'TKT-004',
    tenant: 'Karan Malhotra',
    propertyId: 'demo-property-1',
    room: '102',
    issue: 'WiFi connectivity issue',
    description: 'WiFi signal is very weak in the room. Drops frequently.',
    source: 'manual',
    status: 'open',
    priority: 'low',
    date: toDateOnly(atMonthOffset(0, 8)),
    phone: '+919876500002',
    notes: [],
  },
  {
    id: 'demo-ticket-5',
    ticketId: 'TKT-005',
    tenant: 'Anjali Singh',
    propertyId: 'demo-property-1',
    room: '301',
    issue: 'Room lock needs replacement',
    description: 'Door lock is loose and sometimes gets stuck.',
    source: 'manual',
    status: 'open',
    priority: 'medium',
    date: toDateOnly(shiftDays(-1)),
    phone: '+919876500017',
    notes: [],
  },
];

export const demoAnnouncements: AnnouncementRecord[] = [
  {
    id: 'demo-announcement-1',
    title: 'Monthly Rent Due — Please Pay by 10th',
    content: 'Dear residents, this is a reminder that monthly rent is due by the 10th of every month. Kindly ensure timely payment to avoid late fees. You can pay via UPI or bank transfer. Contact management for any payment issues.',
    category: 'payment',
    date: toDateOnly(atMonthOffset(0, 1)),
    isPinned: true,
    views: 12,
    sentViaWhatsApp: true,
    propertyId: null,
  },
  {
    id: 'demo-announcement-2',
    title: 'Scheduled Water Supply Maintenance',
    content: 'Water supply will be interrupted on Sunday from 9 AM to 1 PM for routine pipeline maintenance. Please store sufficient water in advance. We apologise for the inconvenience.',
    category: 'maintenance',
    date: toDateOnly(atMonthOffset(0, 5)),
    isPinned: false,
    views: 8,
    sentViaWhatsApp: false,
    propertyId: 'demo-property-1',
  },
  {
    id: 'demo-announcement-3',
    title: 'Updated House Rules — Please Read',
    content: 'We have updated our house rules to improve the living experience for all residents. Key changes: (1) Quiet hours are now 10 PM to 7 AM. (2) Guests must be registered at reception. (3) Common areas must be kept clean. Full rules available at reception.',
    category: 'rules',
    date: toDateOnly(atMonthOffset(-1, 15)),
    isPinned: false,
    views: 15,
    sentViaWhatsApp: true,
    propertyId: null,
  },
  {
    id: 'demo-announcement-4',
    title: 'Common Area Deep Cleaning This Weekend',
    content: 'Our housekeeping team will perform a deep cleaning of all common areas (corridors, kitchen, bathrooms) this Saturday. Please cooperate by keeping your belongings out of the common areas.',
    category: 'general',
    date: toDateOnly(atMonthOffset(0, 3)),
    isPinned: false,
    views: 5,
    sentViaWhatsApp: false,
    propertyId: null,
  },
];

// Alias exports for data-service contracts.
export const dashboardStats = demoDashboardSnapshot;
export const tenants = demoTenants;
export const properties = demoProperties;
export const payments = demoPayments;
export const activities = demoRecentActivity;
