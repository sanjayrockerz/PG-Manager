export type UserRole = "owner" | "admin" | "tenant" | "super_admin";

export type RoomType = "single" | "double" | "triple";
export type RoomStatus = "occupied" | "vacant" | "maintenance";
export type TenantStatus = "active" | "inactive";
export type PaymentStatus = "paid" | "pending" | "overdue";
export type MaintenanceStatus = "open" | "in-progress" | "resolved";
export type MaintenancePriority = "low" | "medium" | "high";
export type AnnouncementCategory = "maintenance" | "payment" | "rules" | "general";
export type NotificationType = "payment" | "maintenance" | "tenant" | "announcement";

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  city?: string;
  pgName?: string;
  createdAt: string;
}

export interface Property {
  id: string;
  ownerId: string;
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
}

export interface Room {
  id: string;
  propertyId: string;
  number: string;
  floor: number;
  type: RoomType;
  beds: number;
  rent: number;
  status: RoomStatus;
  occupiedBeds: number;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  propertyId: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  floor: number;
  room: string;
  bed: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDate: number;
  parentName: string;
  parentPhone: string;
  idType: string;
  idNumber: string;
  idDocumentUrl?: string;
  joinDate: string;
  status: TenantStatus;
}

export interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  tenantName: string;
  room: string;
  monthlyRent: number;
  extraCharges: number;
  totalAmount: number;
  dueDate: string;
  date: string;
  status: PaymentStatus;
}

export interface ExtraCharge {
  id: string;
  paymentId: string;
  type: string;
  customType?: string;
  description?: string;
  amount: number;
  createdAt: string;
}

export interface MaintenanceTicket {
  id: string;
  ticketId: string;
  tenantId?: string;
  tenant: string;
  propertyId: string;
  room: string;
  issue: string;
  description: string;
  source: "whatsapp" | "manual";
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  date: string;
  phone?: string;
  notes: string[];
}

export interface Announcement {
  id: string;
  propertyId: string | "all";
  title: string;
  content: string;
  date: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  views: number;
  sentViaWhatsApp: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface WhatsAppTemplateSettings {
  welcomeMessage: {
    enabled: boolean;
    template: string;
  };
  rentReminder: {
    enabled: boolean;
    daysBeforeDue: number;
    template: string;
  };
  paymentConfirmation: {
    enabled: boolean;
    template: string;
  };
  complaintUpdate: {
    enabled: boolean;
    notifyOnCreate: boolean;
    notifyOnProgress: boolean;
    notifyOnResolve: boolean;
  };
}

export interface AppSettings {
  pgRules: string[];
  whatsappSettings: WhatsAppTemplateSettings;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  properties: number;
  tenants: number;
  status: "active" | "suspended" | "trial";
  joinedDate: string;
  revenue: number;
}

export interface SupportTicket {
  id: string;
  user: string;
  subject: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  date: string;
}

export interface DatabaseState {
  users: UserAccount[];
  properties: Property[];
  rooms: Room[];
  tenants: Tenant[];
  payments: Payment[];
  extraCharges: ExtraCharge[];
  maintenanceTickets: MaintenanceTicket[];
  announcements: Announcement[];
  notifications: Notification[];
  settings: AppSettings;
  adminUsers: AdminUser[];
  supportTickets: SupportTicket[];
}
