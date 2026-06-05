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

const toCreatedAt = (monthOffset: number, day: number, hour = 10): string =>
  atMonthOffset(monthOffset, day, hour).toISOString();
const toDueDate = (monthOffset: number, day: number): string =>
  toDateOnly(atMonthOffset(monthOffset, day, 8));
const toJoinDate = (monthOffset: number, day: number): string =>
  toDateOnly(atMonthOffset(monthOffset, day, 9));

const monthLabel = (monthOffset: number): string =>
  atMonthOffset(monthOffset, 1).toLocaleDateString('en-US', { month: 'short' });

// ─── Demo owner ID must match AuthContext DEMO_USERS.owner.id ─────────────────
const DEMO_OWNER_ID = 'demo-owner-1';

// ─── Properties ───────────────────────────────────────────────────────────────
export const demoProperties: Property[] = [
  {
    id: 'demo-property-1',
    name: 'Shree Niwas PG',
    address: '14-B, Gopalbari Lane, C-Scheme',
    addressLine1: '14-B, Gopalbari Lane',
    locality: 'C-Scheme',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    floors: 3,
    totalRooms: 6,
    contactName: 'Kavya Singhania',
    contactPhone: '+919887654322',
    contactEmail: 'shreeniwaas.pg@demo.app',
    formattedAddress: '14-B, Gopalbari Lane, C-Scheme, Jaipur, Rajasthan 302001',
    occupancyMode: 'BED_BASED',
    createdAt: toCreatedAt(-14, 5),
    rooms: [
      { id: 'demo-room-101', number: '101', floor: 1, type: 'double', beds: 2, rent: 9500, status: 'occupied', occupiedBeds: 2 },
      { id: 'demo-room-102', number: '102', floor: 1, type: 'single', beds: 1, rent: 10200, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-201', number: '201', floor: 2, type: 'double', beds: 2, rent: 9000, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-202', number: '202', floor: 2, type: 'single', beds: 1, rent: 8500, status: 'vacant', occupiedBeds: 0 },
      { id: 'demo-room-301', number: '301', floor: 3, type: 'triple', beds: 3, rent: 7500, status: 'occupied', occupiedBeds: 2 },
      { id: 'demo-room-302', number: '302', floor: 3, type: 'double', beds: 2, rent: 8800, status: 'maintenance', occupiedBeds: 0 },
    ],
  },
  {
    id: 'demo-property-2',
    name: 'Rajputana Boys PG',
    address: '22, Durga Marg, Malviya Nagar',
    addressLine1: '22, Durga Marg',
    locality: 'Malviya Nagar',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302017',
    floors: 2,
    totalRooms: 4,
    contactName: 'Vikram Singhania',
    contactPhone: '+919887654321',
    contactEmail: 'rajputana.pg@demo.app',
    formattedAddress: '22, Durga Marg, Malviya Nagar, Jaipur, Rajasthan 302017',
    occupancyMode: 'BED_BASED',
    createdAt: toCreatedAt(-10, 12),
    rooms: [
      { id: 'demo-room-a1', number: 'A1', floor: 1, type: 'single', beds: 1, rent: 8200, status: 'occupied', occupiedBeds: 1 },
      { id: 'demo-room-a2', number: 'A2', floor: 1, type: 'double', beds: 2, rent: 8700, status: 'maintenance', occupiedBeds: 0 },
      { id: 'demo-room-b1', number: 'B1', floor: 2, type: 'single', beds: 1, rent: 8400, status: 'vacant', occupiedBeds: 0 },
      { id: 'demo-room-b2', number: 'B2', floor: 2, type: 'double', beds: 2, rent: 9600, status: 'occupied', occupiedBeds: 1 },
    ],
  },
];

// ─── Tenants ──────────────────────────────────────────────────────────────────
// demo-tenant-1 must match AuthContext DEMO_USERS.tenant (Arjun Sharma, room 101 bed 1)
export const demoTenants: TenantRecord[] = [
  // --- Shree Niwas PG ---
  {
    id: 'demo-tenant-1',
    ownerId: DEMO_OWNER_ID,
    name: 'Arjun Sharma',
    phone: '+919812345678',
    email: 'tenant.demo@rentcare.demo',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 1,
    room: '101',
    bed: '1',
    rent: 9500,
    securityDeposit: 19000,
    rentDueDate: 5,
    parentName: 'Ramesh Sharma',
    parentPhone: '+919812345600',
    idType: 'Aadhaar',
    idNumber: '123456789012',
    idDocumentUrl: '',
    joinDate: toJoinDate(-8, 10),
    status: 'active',
    createdAt: toCreatedAt(-8, 10),
  },
  {
    id: 'demo-tenant-1b',
    ownerId: DEMO_OWNER_ID,
    name: 'Rohit Meena',
    phone: '+919812345679',
    email: 'rohit.meena@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 1,
    room: '101',
    bed: '2',
    rent: 9500,
    securityDeposit: 19000,
    rentDueDate: 5,
    parentName: 'Suresh Meena',
    parentPhone: '+919812345601',
    idType: 'PAN',
    idNumber: 'ABCPM1234R',
    idDocumentUrl: '',
    joinDate: toJoinDate(-5, 15),
    status: 'active',
    createdAt: toCreatedAt(-5, 15),
  },
  {
    id: 'demo-tenant-2',
    ownerId: DEMO_OWNER_ID,
    name: 'Priya Agarwal',
    phone: '+919887001122',
    email: 'priya.agarwal@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 1,
    room: '102',
    bed: '1',
    rent: 10200,
    securityDeposit: 20400,
    rentDueDate: 7,
    parentName: 'Deepak Agarwal',
    parentPhone: '+919887001100',
    idType: 'Aadhaar',
    idNumber: '234567890123',
    idDocumentUrl: '',
    joinDate: toJoinDate(-6, 8),
    status: 'payment_overdue',
    createdAt: toCreatedAt(-6, 8),
  },
  {
    id: 'demo-tenant-3',
    ownerId: DEMO_OWNER_ID,
    name: 'Kavita Gupta',
    phone: '+919887002233',
    email: 'kavita.gupta@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 2,
    room: '201',
    bed: '1',
    rent: 9000,
    securityDeposit: 18000,
    rentDueDate: 4,
    parentName: 'Mohan Gupta',
    parentPhone: '+919887002200',
    idType: 'Passport',
    idNumber: 'J1234567',
    idDocumentUrl: '',
    joinDate: toJoinDate(-5, 14),
    status: 'notice_submitted',
    vacateDate: toDateOnly(shiftDays(12)),
    vacateReason: 'Shifting to company-provided accommodation.',
    createdAt: toCreatedAt(-5, 14),
  },
  {
    id: 'demo-tenant-6',
    ownerId: DEMO_OWNER_ID,
    name: 'Sandeep Rajput',
    phone: '+919887003344',
    email: 'sandeep.rajput@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 3,
    room: '301',
    bed: '1',
    rent: 7500,
    securityDeposit: 15000,
    rentDueDate: 10,
    parentName: 'Bharat Rajput',
    parentPhone: '+919887003300',
    idType: 'Aadhaar',
    idNumber: '345678901234',
    idDocumentUrl: '',
    joinDate: toJoinDate(-4, 1),
    status: 'active',
    createdAt: toCreatedAt(-4, 1),
  },
  {
    id: 'demo-tenant-7',
    ownerId: DEMO_OWNER_ID,
    name: 'Suman Joshi',
    phone: '+919887004455',
    email: 'suman.joshi@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 3,
    room: '301',
    bed: '2',
    rent: 7500,
    securityDeposit: 15000,
    rentDueDate: 10,
    parentName: 'Girish Joshi',
    parentPhone: '+919887004400',
    idType: 'Driving License',
    idNumber: 'RJ1420210055001',
    idDocumentUrl: '',
    joinDate: toJoinDate(-2, 5),
    status: 'vacating',
    vacateDate: toDateOnly(shiftDays(7)),
    vacateReason: 'Studies complete, returning to native place.',
    createdAt: toCreatedAt(-2, 5),
  },
  // Archived
  {
    id: 'demo-tenant-8',
    ownerId: DEMO_OWNER_ID,
    name: 'Ankit Sharma',
    phone: '+919887005566',
    email: 'ankit.sharma@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-1',
    floor: 2,
    room: '202',
    bed: '1',
    rent: 8500,
    securityDeposit: 17000,
    rentDueDate: 3,
    parentName: 'Dinesh Sharma',
    parentPhone: '+919887005500',
    idType: 'Aadhaar',
    idNumber: '456789012345',
    idDocumentUrl: '',
    joinDate: toJoinDate(-12, 1),
    status: 'archived',
    vacateDate: toDateOnly(atMonthOffset(-2, 28)),
    vacateReason: 'Purchased own flat in Vaishali Nagar.',
    createdAt: toCreatedAt(-12, 1),
  },
  // --- Rajputana Boys PG ---
  {
    id: 'demo-tenant-4',
    ownerId: DEMO_OWNER_ID,
    name: 'Yash Choudhary',
    phone: '+919887006677',
    email: 'yash.choudhary@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-2',
    floor: 1,
    room: 'A1',
    bed: '1',
    rent: 8200,
    securityDeposit: 16400,
    rentDueDate: 8,
    parentName: 'Mahesh Choudhary',
    parentPhone: '+919887006600',
    idType: 'Driving License',
    idNumber: 'RJ2020201234567',
    idDocumentUrl: '',
    joinDate: toJoinDate(-3, 3),
    status: 'active',
    createdAt: toCreatedAt(-3, 3),
  },
  {
    id: 'demo-tenant-5',
    ownerId: DEMO_OWNER_ID,
    name: 'Neha Banswal',
    phone: '+919887007788',
    email: 'neha.banswal@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-2',
    floor: 2,
    room: 'B2',
    bed: '1',
    rent: 9600,
    securityDeposit: 19200,
    rentDueDate: 6,
    parentName: 'Rajesh Banswal',
    parentPhone: '+919887007700',
    idType: 'Aadhaar',
    idNumber: '567890123456',
    idDocumentUrl: '',
    joinDate: toJoinDate(-2, 18),
    status: 'active',
    createdAt: toCreatedAt(-2, 18),
  },
  // Inactive (recently vacated)
  {
    id: 'demo-tenant-9',
    ownerId: DEMO_OWNER_ID,
    name: 'Pankaj Verma',
    phone: '+919887008899',
    email: 'pankaj.verma@demo.app',
    photoUrl: '',
    propertyId: 'demo-property-2',
    floor: 2,
    room: 'B1',
    bed: '1',
    rent: 8400,
    securityDeposit: 16800,
    rentDueDate: 12,
    parentName: 'Vinod Verma',
    parentPhone: '+919887008800',
    idType: 'PAN',
    idNumber: 'DELPV5678K',
    idDocumentUrl: '',
    joinDate: toJoinDate(-4, 10),
    status: 'inactive',
    vacateDate: toDateOnly(atMonthOffset(-1, 25)),
    vacateReason: 'Transfer to Delhi office.',
    createdAt: toCreatedAt(-4, 10),
  },
];

// ─── Payments ─────────────────────────────────────────────────────────────────
const activeTenants = demoTenants.filter((t) => isTenantCurrentlyInRoom(t.status));

const buildPaymentsForTenant = (tenant: TenantRecord): PaymentRecord[] => {
  const records: PaymentRecord[] = [];
  for (let offset = -2; offset <= 0; offset++) {
    const due = atMonthOffset(offset, tenant.rentDueDate);
    const isCurrent = offset === 0;
    const isFirst = offset === -2;
    const status: PaymentRecord['status'] =
      isCurrent && tenant.status === 'payment_overdue'
        ? 'overdue'
        : isCurrent
        ? 'pending'
        : 'paid';
    const paidDate =
      status === 'paid' ? toDateOnly(new Date(due.getTime() + 2 * 86400000)) : '';
    const extraCharges = isFirst ? 300 : 0;
    records.push({
      id: `demo-pay-${tenant.id}-${offset + 3}`,
      tenantId: tenant.id,
      tenant: tenant.name,
      propertyId: tenant.propertyId,
      room: tenant.room,
      monthlyRent: tenant.rent,
      extraCharges,
      totalAmount: tenant.rent + extraCharges,
      dueDate: toDateOnly(due),
      paidDate,
      status,
      createdAt: new Date(due.getTime() - 2 * 86400000).toISOString(),
    });
  }
  return records;
};

export const demoPayments: PaymentRecord[] = activeTenants.flatMap(buildPaymentsForTenant);

// ─── Maintenance tickets ───────────────────────────────────────────────────────
export const demoMaintenanceTickets: MaintenanceTicketRecord[] = [
  {
    id: 'demo-ticket-1',
    ticketId: 'TKT-001',
    tenant: 'Arjun Sharma',
    propertyId: 'demo-property-1',
    room: '101',
    issue: 'Water leakage from bathroom tap',
    description: 'The bathroom cold water tap drips continuously and causes water wastage.',
    source: 'portal',
    status: 'open',
    priority: 'high',
    date: toDateOnly(shiftDays(-3)),
    phone: '+919812345678',
    notes: [],
    threads: [],
  },
  {
    id: 'demo-ticket-2',
    ticketId: 'TKT-002',
    tenant: 'Priya Agarwal',
    propertyId: 'demo-property-1',
    room: '102',
    issue: 'Ceiling fan not working',
    description: 'The ceiling fan in my room has stopped working since two days.',
    source: 'portal',
    status: 'in-progress',
    priority: 'medium',
    date: toDateOnly(shiftDays(-5)),
    phone: '+919887001122',
    notes: ['Electrician scheduled for tomorrow 10 AM.'],
    threads: [],
    assignedTo: 'Electrician - Rajesh',
  },
  {
    id: 'demo-ticket-3',
    ticketId: 'TKT-003',
    tenant: 'Sandeep Rajput',
    propertyId: 'demo-property-1',
    room: '301',
    issue: 'Wi-Fi router keeps disconnecting',
    description: 'Internet disconnects every 30–40 minutes. Affects online work.',
    source: 'manual',
    status: 'resolved',
    priority: 'medium',
    date: toDateOnly(shiftDays(-10)),
    phone: '+919887003344',
    notes: ['ISP issue resolved. Router firmware updated.'],
    threads: [],
    resolvedAt: shiftDays(-7).toISOString(),
  },
  {
    id: 'demo-ticket-4',
    ticketId: 'TKT-004',
    tenant: 'Yash Choudhary',
    propertyId: 'demo-property-2',
    room: 'A1',
    issue: 'Geyser not heating water',
    description: 'The geyser in the bathroom does not heat water above lukewarm.',
    source: 'portal',
    status: 'open',
    priority: 'high',
    date: toDateOnly(shiftDays(-1)),
    phone: '+919887006677',
    notes: [],
    threads: [],
  },
  {
    id: 'demo-ticket-5',
    ticketId: 'TKT-005',
    tenant: 'Kavita Gupta',
    propertyId: 'demo-property-1',
    room: '201',
    issue: 'Door lock is stiff and hard to open',
    description: 'The room door lock requires too much force to open from outside.',
    source: 'portal',
    status: 'waiting',
    priority: 'low',
    date: toDateOnly(shiftDays(-7)),
    phone: '+919887002233',
    notes: ['Locksmith visit pending — part to be ordered.'],
    threads: [],
  },
];

// ─── Announcements ─────────────────────────────────────────────────────────────
export const demoAnnouncements: AnnouncementRecord[] = [
  {
    id: 'demo-ann-1',
    title: 'Monthly Deep Cleaning — This Sunday',
    content:
      'Common areas (kitchen, bathrooms, corridors) will be deep-cleaned this Sunday, 9 AM to 12 PM. Please cooperate with the housekeeping staff.',
    category: 'general',
    date: toDateOnly(shiftDays(-1)),
    isPinned: true,
    views: 14,
    sentViaWhatsApp: true,
    propertyId: null,
  },
  {
    id: 'demo-ann-2',
    title: 'Rent Reminder — Due by 7th',
    content:
      'This is a reminder that rent for this month is due by the 7th. Payments received after the 10th attract a late fee of ₹250. Please pay via UPI to avoid delays.',
    category: 'payment',
    date: toDateOnly(shiftDays(-3)),
    isPinned: false,
    views: 22,
    sentViaWhatsApp: true,
    propertyId: null,
  },
  {
    id: 'demo-ann-3',
    title: 'Water Supply Interruption — 2 Hours Tomorrow',
    content:
      'Jaipur Nagar Nigam has scheduled maintenance work. Water supply will be interrupted from 8 AM to 10 AM tomorrow. Please store water in advance.',
    category: 'maintenance',
    date: toDateOnly(shiftDays(-5)),
    isPinned: false,
    views: 18,
    sentViaWhatsApp: false,
    propertyId: 'demo-property-1',
  },
  {
    id: 'demo-ann-4',
    title: 'New PG Rules — Effective from Next Month',
    content:
      'Updated house rules have been published: (1) Guests allowed till 9 PM only. (2) No cooking in rooms. (3) Noise curfew after 11 PM. Please read the full rulebook.',
    category: 'rules',
    date: toDateOnly(shiftDays(-8)),
    isPinned: false,
    views: 29,
    sentViaWhatsApp: true,
    propertyId: null,
  },
];

// ─── Vacate Requests ──────────────────────────────────────────────────────────
export const demoVacateRequests: VacateRequest[] = [
  {
    id: 'demo-vacate-1',
    tenantId: 'demo-tenant-3',
    tenantName: 'Kavita Gupta',
    propertyId: 'demo-property-1',
    room: '201',
    noticeDate: toDateOnly(shiftDays(-4)),
    plannedVacateDate: toDateOnly(shiftDays(12)),
    reason: 'Shifting to company-provided accommodation.',
    finalSettlementAmount: 9000,
    depositRefund: 15000,
    depositDeduction: 3000,
    deductionReason: 'Minor wall damage in room.',
    status: 'confirmed',
    createdAt: shiftDays(-4).toISOString(),
  },
];

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const demoActivityLog: ActivityLogEntry[] = [
  {
    id: 'demo-log-1',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-1',
    event: 'PAYMENT_RECEIVED',
    detail: 'Payment of ₹9,500 received from Arjun Sharma (Room 101)',
    metadata: { tenantId: 'demo-tenant-1', amount: 9500 },
    createdAt: shiftDays(-1).toISOString(),
  },
  {
    id: 'demo-log-2',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-1',
    event: 'MAINTENANCE_CREATED',
    detail: 'Ticket TKT-001 created: Water leakage from bathroom tap (Room 101)',
    metadata: { ticketId: 'demo-ticket-1', priority: 'high' },
    createdAt: shiftDays(-3).toISOString(),
  },
  {
    id: 'demo-log-3',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-1',
    event: 'TENANT_VACATED',
    detail: 'Kavita Gupta submitted vacate notice — planned move-out in 12 days',
    metadata: { tenantId: 'demo-tenant-3', room: '201' },
    createdAt: shiftDays(-4).toISOString(),
  },
  {
    id: 'demo-log-4',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-2',
    event: 'TENANT_ASSIGNED',
    detail: 'Neha Banswal assigned to Room B2, Bed 1',
    metadata: { tenantId: 'demo-tenant-5', room: 'B2' },
    createdAt: toCreatedAt(-2, 18),
  },
  {
    id: 'demo-log-5',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-1',
    event: 'MAINTENANCE_UPDATED',
    detail: 'Ticket TKT-003 status: open → resolved (Wi-Fi router, Room 301)',
    metadata: { ticketId: 'demo-ticket-3', previousStatus: 'open', newStatus: 'resolved' },
    createdAt: shiftDays(-7).toISOString(),
  },
  {
    id: 'demo-log-6',
    ownerId: DEMO_OWNER_ID,
    propertyId: null,
    event: 'ANNOUNCEMENT_CREATED',
    detail: 'Announcement "Monthly Deep Cleaning — This Sunday" published · WhatsApp broadcast queued',
    metadata: { announcementId: 'demo-ann-1' },
    createdAt: shiftDays(-1).toISOString(),
  },
  {
    id: 'demo-log-7',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-1',
    event: 'PAYMENT_RECEIVED',
    detail: 'Payment of ₹10,200 received from Priya Agarwal (Room 102) — previous cycle',
    metadata: { tenantId: 'demo-tenant-2', amount: 10200 },
    createdAt: atMonthOffset(-1, 9).toISOString(),
  },
];

// ─── Dashboard Snapshot ────────────────────────────────────────────────────────
export const buildDemoDashboardSnapshot = (propertyId: string | 'all'): DashboardSnapshot => {
  const properties = propertyId === 'all'
    ? demoProperties
    : demoProperties.filter((p) => p.id === propertyId);

  const tenants = demoTenants.filter(
    (t) => isTenantCurrentlyInRoom(t.status) && (propertyId === 'all' || t.propertyId === propertyId),
  );

  const payments = demoPayments.filter(
    (p) => propertyId === 'all' || p.propertyId === propertyId,
  );

  const rooms = properties.flatMap((p) => p.rooms);
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const totalRooms = rooms.length;

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = payments
    .filter((p) => {
      if (p.status !== 'paid') return false;
      const ref = p.paidDate ? new Date(p.paidDate) : new Date(p.dueDate);
      return ref.getMonth() === currentMonth && ref.getFullYear() === currentYear;
    })
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const pendingAmount = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const pendingIssues = demoMaintenanceTickets.filter(
    (t) =>
      t.status === 'open' && (propertyId === 'all' || t.propertyId === propertyId),
  ).length;

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentActivity = demoActivityLog
    .filter((e) => propertyId === 'all' || e.propertyId === propertyId || e.propertyId === null)
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      action: e.event.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      detail: e.detail,
      propertyId: e.propertyId,
      createdAt: e.createdAt,
    }));

  const monthBuckets: Array<{ key: string; name: string; revenue: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: d.toLocaleDateString('en-US', { month: 'short' }),
      revenue: 0,
    });
  }

  payments.forEach((p) => {
    if (p.status !== 'paid') return;
    const ref = p.paidDate ? new Date(p.paidDate) : new Date(p.dueDate);
    const key = `${ref.getFullYear()}-${ref.getMonth()}`;
    const bucket = monthBuckets.find((b) => b.key === key);
    if (bucket) bucket.revenue += p.totalAmount;
  });

  const avgRevenue = monthBuckets.reduce((s, b) => s + b.revenue, 0) / (monthBuckets.length || 1);

  return {
    totalTenants: tenants.length,
    occupiedRooms,
    totalRooms,
    monthlyRevenue,
    pendingAmount,
    pendingIssues,
    recentPayments,
    recentActivity,
    revenueChartData: monthBuckets.map((b) => ({
      name: b.name,
      revenue: b.revenue,
      target: Math.round(avgRevenue),
    })),
  };
};
