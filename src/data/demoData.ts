import type { Property, Room } from '../contexts/PropertyContext';
import type {
  ActivityLogEntry,
  AnnouncementRecord,
  DashboardSnapshot,
  MaintenanceTicketRecord,
  PaymentRecord,
  SupportTicketRecord,
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
// Base hand-authored properties (IDs referenced by AuthContext demo users).
const baseDemoProperties: Property[] = [
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
const baseDemoTenants: TenantRecord[] = [
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

// ─── Procedurally generated third property ──────────────────────────────────────
// Scales the demo to 3 properties / 40 rooms / 77 beds / 60+ tenants without
// disturbing the hand-authored narrative set above. Deterministic (stable across
// renders) so payments/occupancy stay consistent.
const P3_ID = 'demo-property-3';

const DEMO_FIRST_NAMES = [
  'Aditya', 'Ishaan', 'Vivaan', 'Reyansh', 'Krishna', 'Aarav', 'Kabir', 'Aryan', 'Dhruv', 'Karan',
  'Manish', 'Nikhil', 'Rahul', 'Saurabh', 'Tushar', 'Varun', 'Akash', 'Gaurav', 'Harsh', 'Lakshya',
  'Ananya', 'Diya', 'Isha', 'Meera', 'Riya', 'Sneha', 'Tanvi', 'Aditi', 'Pooja', 'Shreya',
  'Naina', 'Kriti', 'Anjali', 'Bhavna', 'Devika', 'Garima', 'Jyoti', 'Komal', 'Lavanya', 'Mahima',
  'Nidhi', 'Payal', 'Ritika', 'Simran', 'Vandana', 'Yamini', 'Farah', 'Ira', 'Tarini', 'Ojas',
];
const DEMO_SURNAMES = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Meena', 'Rajput', 'Choudhary', 'Joshi', 'Soni', 'Khandelwal',
  'Saini', 'Yadav', 'Jain', 'Mathur', 'Bhandari', 'Purohit', 'Vyas', 'Tiwari', 'Mishra', 'Nair',
];
const DEMO_ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Driving License'];

function genRoomType(slot: number): { type: Room['type']; beds: number } {
  if (slot < 2) return { type: 'single', beds: 1 };
  if (slot < 4) return { type: 'double', beds: 2 };
  return { type: 'triple', beds: 3 };
}

const p3Rooms: Room[] = [];
const demoProperty3Tenants: TenantRecord[] = [];
let p3Seq = 0;

const P3_FLOORS = 5;
const P3_ROOMS_PER_FLOOR = 6;

for (let floor = 1; floor <= P3_FLOORS; floor++) {
  for (let slot = 0; slot < P3_ROOMS_PER_FLOOR; slot++) {
    const idx = (floor - 1) * P3_ROOMS_PER_FLOOR + slot;
    const { type, beds } = genRoomType(slot);
    const number = `${floor}${String(slot + 1).padStart(2, '0')}`;
    const baseRent = type === 'single' ? 9200 : type === 'double' ? 8600 : 7400;
    const rent = baseRent + (floor - 1) * 150;

    // Deterministic occupancy → ~85% fill with a few vacant + one maintenance.
    let status: Room['status'];
    let occupiedBeds: number;
    if (idx % 14 === 4) { status = 'vacant'; occupiedBeds = 0; }
    else if (idx % 23 === 9) { status = 'maintenance'; occupiedBeds = 0; }
    else {
      const partial = beds > 1 && idx % 12 === 3;
      occupiedBeds = partial ? beds - 1 : beds;
      status = 'occupied';
    }

    p3Rooms.push({ id: `demo-room-p3-${number}`, number, floor, type, beds, rent, status, occupiedBeds });

    for (let b = 1; b <= occupiedBeds; b++) {
      const first = DEMO_FIRST_NAMES[p3Seq % DEMO_FIRST_NAMES.length];
      const last = DEMO_SURNAMES[(p3Seq * 7 + floor) % DEMO_SURNAMES.length];
      const monthsAgo = (p3Seq % 9) + 1;
      const day = (p3Seq % 26) + 1;

      let tStatus: TenantRecord['status'] = 'active';
      let vacateDate: string | undefined;
      let vacateReason: string | undefined;
      if (p3Seq % 13 === 6) {
        tStatus = 'payment_overdue';
      } else if (p3Seq === 8) {
        tStatus = 'notice_submitted';
        vacateDate = toDateOnly(shiftDays(18));
        vacateReason = 'Relocating closer to workplace.';
      }

      demoProperty3Tenants.push({
        id: `demo-tenant-p3-${p3Seq + 1}`,
        ownerId: DEMO_OWNER_ID,
        name: `${first} ${last}`,
        phone: `+9197${String(30000000 + p3Seq * 137).slice(0, 8)}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${p3Seq}@demo.app`,
        photoUrl: '',
        propertyId: P3_ID,
        floor,
        room: number,
        bed: String(b),
        rent,
        securityDeposit: rent * 2,
        rentDueDate: (p3Seq % 10) + 1,
        parentName: `${DEMO_FIRST_NAMES[(p3Seq * 3 + 1) % DEMO_FIRST_NAMES.length]} ${last}`,
        parentPhone: `+9198${String(20000000 + p3Seq * 211).slice(0, 8)}`,
        idType: DEMO_ID_TYPES[p3Seq % DEMO_ID_TYPES.length],
        idNumber: `${100000000000 + p3Seq * 8237}`,
        idDocumentUrl: '',
        joinDate: toJoinDate(-monthsAgo, day),
        status: tStatus,
        ...(vacateDate ? { vacateDate, vacateReason } : {}),
        createdAt: toCreatedAt(-monthsAgo, day),
      });
      p3Seq++;
    }
  }
}

const demoProperty3: Property = {
  id: P3_ID,
  name: 'Lakeview Residency PG',
  address: '5, Amrapali Circle, Vaishali Nagar',
  addressLine1: '5, Amrapali Circle',
  locality: 'Vaishali Nagar',
  city: 'Jaipur',
  state: 'Rajasthan',
  pincode: '302021',
  floors: P3_FLOORS,
  totalRooms: p3Rooms.length,
  contactName: 'Meghna Singhania',
  contactPhone: '+919887654323',
  contactEmail: 'lakeview.pg@demo.app',
  formattedAddress: '5, Amrapali Circle, Vaishali Nagar, Jaipur, Rajasthan 302021',
  occupancyMode: 'BED_BASED',
  createdAt: toCreatedAt(-12, 3),
  rooms: p3Rooms,
};

// A couple of P3 maintenance tickets so the third property is not an empty screen.
const demoProperty3Tickets: MaintenanceTicketRecord[] = [
  {
    id: 'demo-ticket-p3-1',
    ticketId: 'TKT-101',
    tenant: demoProperty3Tenants[0]?.name ?? 'Resident',
    propertyId: P3_ID,
    room: demoProperty3Tenants[0]?.room ?? '101',
    issue: 'AC servicing required',
    description: 'Room AC is cooling poorly and needs a filter clean + gas top-up.',
    source: 'portal',
    status: 'in-progress',
    priority: 'medium',
    date: toDateOnly(shiftDays(-2)),
    phone: demoProperty3Tenants[0]?.phone ?? '',
    notes: ['Technician assigned, visit scheduled.'],
    threads: [],
    assignedTo: 'HVAC - CoolCare',
  },
  {
    id: 'demo-ticket-p3-2',
    ticketId: 'TKT-102',
    tenant: demoProperty3Tenants[5]?.name ?? 'Resident',
    propertyId: P3_ID,
    room: demoProperty3Tenants[5]?.room ?? '102',
    issue: 'Common area light fused',
    description: 'Second floor corridor light is not working at night.',
    source: 'manual',
    status: 'open',
    priority: 'low',
    date: toDateOnly(shiftDays(-1)),
    phone: demoProperty3Tenants[5]?.phone ?? '',
    notes: [],
    threads: [],
  },
];

// ─── Combined exports (base narrative set + generated third property) ────────────
export const demoProperties: Property[] = [...baseDemoProperties, demoProperty3];
export const demoTenants: TenantRecord[] = [...baseDemoTenants, ...demoProperty3Tenants];

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
  ...demoProperty3Tickets,
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
  {
    id: 'demo-ann-5',
    title: 'Lakeview Residency — Festive Decoration Drive',
    content:
      'We are decorating the Lakeview common lounge for the upcoming festival this weekend. Residents are welcome to join the decoration team on Saturday evening. Snacks provided!',
    category: 'general',
    date: toDateOnly(shiftDays(-2)),
    isPinned: false,
    views: 11,
    sentViaWhatsApp: false,
    propertyId: 'demo-property-3',
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

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const demoSupportTickets: SupportTicketRecord[] = [
  {
    id: 'demo-support-1',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-1',
    createdBy: DEMO_OWNER_ID,
    assignedTo: null,
    subject: 'Unable to generate rent receipts — PDF is blank',
    description: 'When I click "Mark as Paid" and try to download the receipt, the PDF opens but is completely blank. This has been happening since yesterday.',
    category: 'technical',
    priority: 'high',
    status: 'open',
    visibility: 'owner',
    resolvedAt: '',
    createdAt: shiftDays(-1).toISOString(),
    updatedAt: shiftDays(-1).toISOString(),
    comments: [],
  },
  {
    id: 'demo-support-2',
    ownerId: DEMO_OWNER_ID,
    propertyId: null,
    createdBy: DEMO_OWNER_ID,
    assignedTo: 'support@rentcare.com',
    subject: 'How to transfer a tenant between properties?',
    description: 'I have a tenant in Shree Niwas PG who wants to move to Lakeview Residency. Is there a way to transfer their profile without losing payment history?',
    category: 'billing',
    priority: 'medium',
    status: 'in_progress',
    visibility: 'owner',
    resolvedAt: '',
    createdAt: shiftDays(-3).toISOString(),
    updatedAt: shiftDays(-2).toISOString(),
    comments: [
      {
        id: 'demo-comment-2-1',
        ticketId: 'demo-support-2',
        authorId: 'platform-admin',
        message: 'Thanks for reaching out! You can use the Vacate workflow for the current property and create a new tenant profile at the destination property. We are working on a direct transfer feature for the next release.',
        internalNote: false,
        createdAt: shiftDays(-2).toISOString(),
      },
    ],
  },
  {
    id: 'demo-support-3',
    ownerId: DEMO_OWNER_ID,
    propertyId: 'demo-property-2',
    createdBy: DEMO_OWNER_ID,
    assignedTo: 'support@rentcare.com',
    subject: 'WhatsApp reminders not reaching tenants',
    description: 'I have enabled WhatsApp payment reminders but tenants at Rajputana Boys PG report they are not receiving any messages. Please check if there is an issue with the integration.',
    category: 'technical',
    priority: 'high',
    status: 'resolved',
    visibility: 'owner',
    resolvedAt: shiftDays(-5).toISOString(),
    createdAt: shiftDays(-8).toISOString(),
    updatedAt: shiftDays(-5).toISOString(),
    comments: [
      {
        id: 'demo-comment-3-1',
        ticketId: 'demo-support-3',
        authorId: 'platform-admin',
        message: 'We identified an issue with the WhatsApp Business API rate limiting. The fix has been deployed. Please verify that reminders are now working and let us know.',
        internalNote: false,
        createdAt: shiftDays(-6).toISOString(),
      },
      {
        id: 'demo-comment-3-2',
        ticketId: 'demo-support-3',
        authorId: DEMO_OWNER_ID,
        message: 'Confirmed — reminders are working now. Thank you!',
        internalNote: false,
        createdAt: shiftDays(-5).toISOString(),
      },
    ],
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

// ─── Demo Admin Activity Log ───────────────────────────────────────────────────
const demoAdminActivityLog = [
  {
    id: 'admin-log-1',
    event: 'NEW_SIGNUP',
    detail: 'Raj Mehta signed up for a trial account',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'admin-log-2',
    event: 'PLAN_UPGRADE',
    detail: 'Anita Sharma upgraded plan: Growth → Scale',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'admin-log-3',
    event: 'SUBSCRIPTION_CANCELLED',
    detail: 'Vikram Patel cancelled their subscription',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'admin-log-4',
    event: 'NEW_SUPPORT_TICKET',
    detail: 'Ticket #47 created: Payment issue',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'admin-log-5',
    event: 'PAYMENT_FAILED',
    detail: 'Subscription payment of ₹1,500 failed for Suresh Kumar',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Demo Admin Summary ───────────────────────────────────────────────────────
export const buildDemoAdminSummary = () => {
  const totalRooms = demoProperties.reduce((s, p) => s + p.rooms.length, 0);
  const occupiedRooms = demoProperties.flatMap((p) => p.rooms).filter((r) => r.status === 'occupied').length;
  const totalBeds = demoProperties.flatMap((p) => p.rooms).reduce((s, r) => s + ((r as any).beds ?? 0), 0);
  const monthlyRevenue = demoPayments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.totalAmount, 0);
  const openTickets = demoSupportTickets.filter((t) => t.status === 'open').length;
  const urgentTickets = demoSupportTickets.filter((t) => t.priority === 'urgent').length;
  const activeTenants = demoTenants.filter((t) => t.status === 'active').length;

  return {
    profile: {
      id: 'demo-admin-1',
      name: 'Platform Admin',
      email: 'admin.demo@rentcare.demo',
      phone: '',
      role: 'platform_admin' as const,
      ownerScopeId: null,
      pgName: 'RentCare Platform',
      city: 'Bengaluru',
      photoUrl: null,
      onboardingComplete: true,
      firstLoginAt: null,
    },
    stats: {
      totalOwners: 3,
      totalProperties: demoProperties.length + 2,
      totalTenants: activeTenants + 18,
      activeSubscriptions: 2,
      openSupportTickets: openTickets,
      monthlyRevenue: monthlyRevenue + 48500,
      arr: (monthlyRevenue + 48500) * 12,
      newMrr: 12000,
      churnMrr: 0,
      ownersActive: 2,
      ownersTrialing: 1,
      ownersSuspended: 0,
      totalRooms: totalRooms + 12,
      totalBeds: totalBeds + 18,
      occupancyRate: occupiedRooms / Math.max(totalRooms, 1),
      newTenantsThisMonth: 4,
      vacatesThisMonth: 1,
      urgentSupportTickets: urgentTickets,
      avgSupportResponseHours: 3.5,
    },
    owners: [
      {
        id: DEMO_OWNER_ID,
        name: 'Vikram Singhania',
        email: 'vikram@singhaniapg.com',
        phone: '+919887654321',
        city: 'Jaipur',
        pgName: 'Singhania PG Network',
        propertyCount: demoProperties.length,
        tenantCount: activeTenants,
        subscriptionStatus: 'active' as const,
        planCode: 'growth',
        isSuspended: false,
        verifiedAt: shiftDays(-60).toISOString(),
        joinedAt: shiftDays(-180).toISOString(),
        revenue: monthlyRevenue,
        lastActive: shiftDays(-1).toISOString(),
        photoUrl: null,
      },
      {
        id: 'demo-owner-2',
        name: 'Pradeep Choudhary',
        email: 'pradeep@lakeviewpg.com',
        phone: '+919811234567',
        city: 'Bengaluru',
        pgName: 'Lakeview Residency',
        propertyCount: 2,
        tenantCount: 18,
        subscriptionStatus: 'trialing' as const,
        planCode: 'starter',
        isSuspended: false,
        verifiedAt: null,
        joinedAt: shiftDays(-14).toISOString(),
        revenue: 48500,
        lastActive: shiftDays(-2).toISOString(),
        photoUrl: null,
      },
    ],
    subscriptions: [
      {
        id: 'demo-sub-1',
        ownerId: DEMO_OWNER_ID,
        planCode: 'growth',
        status: 'active' as const,
        billingCycle: 'monthly' as const,
        amount: 2499,
        currency: 'INR',
        seats: 3,
        currentPeriodStart: shiftDays(-30).toISOString(),
        currentPeriodEnd: shiftDays(0).toISOString(),
        trialEnd: null,
        cancelAtPeriodEnd: false,
        createdAt: shiftDays(-180).toISOString(),
        updatedAt: shiftDays(-30).toISOString(),
      },
    ],
    support: demoSupportTickets,
    activity: demoAdminActivityLog.map((a) => ({
      id: a.id,
      label: a.event.replace(/_/g, ' '),
      detail: a.detail,
      createdAt: a.createdAt,
    })),
  };
};
