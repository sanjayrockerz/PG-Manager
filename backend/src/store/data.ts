import { v4 as uuidv4 } from "uuid";
import {
  AppSettings,
  DatabaseState,
  MaintenanceStatus,
  Notification,
  PaymentStatus,
  Room,
  RoomStatus,
  RoomType,
  Tenant,
} from "../types/entities.js";

const now = new Date().toISOString().split("T")[0];

const propertySeeds = [
  {
    id: "prop-1",
    ownerId: "owner-1",
    name: "Green Valley PG",
    address: "123, MG Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    floors: 3,
    totalRooms: 9,
    contactName: "Rajesh Kumar",
    contactPhone: "+91 98765 43210",
    contactEmail: "rajesh@greenvalley.com",
    createdAt: "2024-01-15",
  },
  {
    id: "prop-2",
    ownerId: "owner-1",
    name: "Sunrise Residency",
    address: "456, Park Street",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560002",
    floors: 4,
    totalRooms: 6,
    contactName: "Priya Sharma",
    contactPhone: "+91 98765 43211",
    contactEmail: "priya@sunrise.com",
    createdAt: "2024-03-20",
  },
  {
    id: "prop-3",
    ownerId: "owner-1",
    name: "City Center PG",
    address: "789, Brigade Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560003",
    floors: 2,
    totalRooms: 5,
    contactName: "Amit Patel",
    contactPhone: "+91 98765 43212",
    contactEmail: "amit@citycenter.com",
    createdAt: "2024-06-10",
  },
  {
    id: "prop-4",
    ownerId: "owner-1",
    name: "Lakeview PG",
    address: "321, Koramangala",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560095",
    floors: 3,
    totalRooms: 5,
    contactName: "Sneha Reddy",
    contactPhone: "+91 98765 43213",
    contactEmail: "sneha@lakeview.com",
    createdAt: "2024-08-05",
  },
];

const roomFactory = (
  propertyId: string,
  number: string,
  floor: number,
  type: RoomType,
  rent: number,
  status: RoomStatus,
  occupiedBeds = 0,
): Room => ({
  id: uuidv4(),
  propertyId,
  number,
  floor,
  type,
  beds: type === "single" ? 1 : type === "double" ? 2 : 3,
  rent,
  status,
  occupiedBeds,
});

const tenantFactory = (
  id: string,
  propertyId: string,
  name: string,
  room: string,
  phone: string,
  email: string,
  rent: number,
  joinDate: string,
): Tenant => ({
  id,
  propertyId,
  name,
  phone,
  email,
  floor: Number(room.charAt(0)) || 1,
  room,
  bed: "A",
  monthlyRent: rent,
  securityDeposit: rent * 2,
  rentDueDate: 5,
  parentName: "Guardian",
  parentPhone: "+91 90000 00000",
  idType: "Aadhaar Card",
  idNumber: `XXXX-XXXX-${id.slice(-4)}`,
  joinDate,
  status: "active",
});

const tenants = [
  tenantFactory("tenant-1", "prop-1", "Rajesh Kumar", "101", "+91 98765 43210", "rajesh@example.com", 5500, "2024-01-15"),
  tenantFactory("tenant-2", "prop-1", "Priya Sharma", "205", "+91 98765 43211", "priya@example.com", 6000, "2024-02-01"),
  tenantFactory("tenant-3", "prop-1", "Amit Patel", "302", "+91 98765 43212", "amit@example.com", 5500, "2024-01-20"),
  tenantFactory("tenant-4", "prop-2", "Ananya Iyer", "101", "+91 98765 43215", "ananya@example.com", 6500, "2024-04-01"),
  tenantFactory("tenant-5", "prop-2", "Karthik Menon", "205", "+91 98765 43216", "karthik@example.com", 7000, "2024-04-15"),
  tenantFactory("tenant-6", "prop-3", "Meera Desai", "101", "+91 98765 43219", "meera@example.com", 5000, "2024-06-15"),
  tenantFactory("tenant-7", "prop-4", "Sanjay Gupta", "102", "+91 98765 43222", "sanjay@example.com", 6000, "2024-08-10"),
];

const rooms: Room[] = [
  roomFactory("prop-1", "101", 1, "single", 5500, "occupied", 1),
  roomFactory("prop-1", "102", 1, "double", 6000, "vacant", 0),
  roomFactory("prop-1", "205", 2, "double", 6000, "occupied", 1),
  roomFactory("prop-1", "302", 3, "single", 5500, "occupied", 1),
  roomFactory("prop-2", "101", 1, "double", 6500, "occupied", 1),
  roomFactory("prop-2", "205", 2, "triple", 7000, "occupied", 2),
  roomFactory("prop-2", "408", 4, "single", 6000, "vacant", 0),
  roomFactory("prop-3", "101", 1, "single", 5000, "occupied", 1),
  roomFactory("prop-3", "110", 1, "single", 5000, "vacant", 0),
  roomFactory("prop-4", "102", 1, "double", 6000, "occupied", 1),
  roomFactory("prop-4", "312", 3, "single", 6000, "vacant", 0),
];

const paymentStatusSeed = ["paid", "paid", "pending", "paid", "pending", "paid", "overdue"] as PaymentStatus[];

const payments = tenants.map((tenant, index) => {
  const status = paymentStatusSeed[index] || "pending";
  const extraCharges = index % 2 === 0 ? 0 : 350;
  return {
    id: `payment-${tenant.id}`,
    tenantId: tenant.id,
    propertyId: tenant.propertyId,
    tenantName: tenant.name,
    room: tenant.room,
    monthlyRent: tenant.monthlyRent,
    extraCharges,
    totalAmount: tenant.monthlyRent + extraCharges,
    dueDate: "2026-04-05",
    date: status === "paid" ? "2026-04-02" : "2026-04-05",
    status,
  };
});

const maintenanceStatuses: MaintenanceStatus[] = ["in-progress", "open", "resolved", "open", "resolved"];
const maintenanceTickets = [
  {
    id: uuidv4(),
    ticketId: "TKT1001",
    tenantId: "tenant-2",
    tenant: "Priya Sharma",
    propertyId: "prop-1",
    room: "205",
    issue: "AC not working",
    description: "Issue reported: AC not working",
    source: "whatsapp" as const,
    status: maintenanceStatuses[0],
    priority: "high" as const,
    date: "2026-04-06",
    phone: "+91 98765 43211",
    notes: [],
  },
  {
    id: uuidv4(),
    ticketId: "TKT1002",
    tenantId: "tenant-3",
    tenant: "Amit Patel",
    propertyId: "prop-1",
    room: "302",
    issue: "Leaking tap",
    description: "Issue reported: Leaking tap",
    source: "whatsapp" as const,
    status: maintenanceStatuses[1],
    priority: "medium" as const,
    date: "2026-04-07",
    phone: "+91 98765 43212",
    notes: [],
  },
  {
    id: uuidv4(),
    ticketId: "TKT1003",
    tenantId: "tenant-4",
    tenant: "Ananya Iyer",
    propertyId: "prop-2",
    room: "101",
    issue: "Light bulb replacement",
    description: "Issue reported: Light bulb replacement",
    source: "whatsapp" as const,
    status: maintenanceStatuses[2],
    priority: "low" as const,
    date: "2026-04-01",
    phone: "+91 98765 43215",
    notes: [],
  },
];

const announcements = [
  {
    id: uuidv4(),
    propertyId: "all" as const,
    title: "Electricity Maintenance",
    content: "Power will be off from 10 AM to 2 PM.",
    date: "2026-04-01",
    category: "maintenance" as const,
    isPinned: true,
    views: 42,
    sentViaWhatsApp: true,
  },
  {
    id: uuidv4(),
    propertyId: "all" as const,
    title: "Rent Due Reminder",
    content: "Monthly rent is due by 5th April.",
    date: "2026-04-01",
    category: "payment" as const,
    isPinned: true,
    views: 38,
    sentViaWhatsApp: true,
  },
];

const notifications: Notification[] = [
  {
    id: uuidv4(),
    type: "payment",
    title: "Payment Received",
    message: "Amit Kumar paid Rs 5,000 for Room 101",
    time: "5 minutes ago",
    read: false,
  },
  {
    id: uuidv4(),
    type: "maintenance",
    title: "New Maintenance Request",
    message: "Priya Sharma reported AC not working in Room 205",
    time: "1 hour ago",
    read: false,
  },
  {
    id: uuidv4(),
    type: "announcement",
    title: "Announcement Posted",
    message: "Electricity maintenance scheduled for tomorrow",
    time: "2 days ago",
    read: true,
  },
];

const settings: AppSettings = {
  pgRules: [
    "Check-in time: After 6:00 PM",
    "Check-out time: Before 11:00 AM",
    "No smoking inside the premises",
    "Maintain silence after 10:00 PM",
  ],
  whatsappSettings: {
    welcomeMessage: {
      enabled: true,
      template:
        "Welcome to {{pgName}}, {{tenantName}}. Your Room: {{room}}, Floor: {{floor}}.",
    },
    rentReminder: {
      enabled: true,
      daysBeforeDue: 3,
      template:
        "Rent Reminder: Hi {{tenantName}}, rent for {{month}} is due on {{dueDate}}. Amount: Rs {{amount}}",
    },
    paymentConfirmation: {
      enabled: true,
      template:
        "Payment received: Thank you {{tenantName}}. Amount Rs {{amount}} for {{month}} on {{date}}.",
    },
    complaintUpdate: {
      enabled: true,
      notifyOnCreate: true,
      notifyOnProgress: true,
      notifyOnResolve: true,
    },
  },
};

export const db: DatabaseState = {
  users: [
    {
      id: "owner-1",
      name: "Admin User",
      phone: "9876543210",
      role: "owner",
      city: "Bangalore",
      pgName: "Green Valley PG",
      createdAt: now,
    },
  ],
  properties: propertySeeds,
  rooms,
  tenants,
  payments,
  extraCharges: [],
  maintenanceTickets,
  announcements,
  notifications,
  settings,
  adminUsers: [
    {
      id: "1",
      name: "Rajesh Kumar",
      email: "rajesh@example.com",
      phone: "+91 98765 43210",
      plan: "pro",
      properties: 3,
      tenants: 45,
      status: "active",
      joinedDate: "2024-01-15",
      revenue: 15000,
    },
    {
      id: "2",
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+91 98765 43211",
      plan: "basic",
      properties: 1,
      tenants: 12,
      status: "active",
      joinedDate: "2024-02-20",
      revenue: 3000,
    },
  ],
  supportTickets: [
    {
      id: "1",
      user: "Rajesh Kumar",
      subject: "Payment gateway not working",
      status: "open",
      priority: "high",
      date: "2026-04-01",
    },
    {
      id: "2",
      user: "Priya Sharma",
      subject: "How to add multiple properties?",
      status: "in-progress",
      priority: "medium",
      date: "2026-03-31",
    },
  ],
};
