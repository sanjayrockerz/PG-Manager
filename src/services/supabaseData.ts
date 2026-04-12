import { supabase } from '../lib/supabase';
import type { Property, Room } from '../contexts/PropertyContext';

export type TenantStatus = 'active' | 'inactive';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type MaintenanceStatus = 'open' | 'in-progress' | 'resolved';
export type MaintenancePriority = 'low' | 'medium' | 'high';
export type AnnouncementCategory = 'maintenance' | 'payment' | 'rules' | 'general';

const TENANT_FILES_BUCKET = 'tenant-files';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: 'owner' | 'admin' | 'tenant' | 'super_admin';
  pg_name: string | null;
  city: string | null;
}

interface PropertyRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  floors: number;
  total_rooms: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  created_at: string;
}

interface RoomRow {
  id: string;
  property_id: string;
  number: string;
  floor: number;
  type: 'single' | 'double' | 'triple';
  beds: number;
  rent: number | string;
  status: 'occupied' | 'vacant' | 'maintenance';
  occupied_beds: number | null;
}

interface TenantRow {
  id: string;
  owner_id: string;
  property_id: string;
  name: string;
  phone: string;
  email: string;
  photo_url: string | null;
  floor: number;
  room: string;
  bed: string;
  monthly_rent: number | string;
  security_deposit: number | string;
  rent_due_date: number;
  parent_name: string;
  parent_phone: string;
  id_type: string;
  id_number: string;
  id_document_url: string | null;
  join_date: string;
  status: TenantStatus;
  created_at: string;
}

interface PaymentRow {
  id: string;
  owner_id: string;
  tenant_id: string;
  property_id: string;
  tenant_name: string;
  room: string;
  monthly_rent: number | string;
  extra_charges: number | string;
  total_amount: number | string;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  created_at: string;
}

interface MaintenanceTicketRow {
  id: string;
  owner_id: string;
  tenant_id: string | null;
  tenant: string;
  property_id: string;
  room: string;
  issue: string;
  description: string;
  source: 'whatsapp' | 'manual';
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  phone: string | null;
  date: string;
  created_at: string;
}

interface MaintenanceNoteRow {
  id: string;
  ticket_id: string;
  note: string;
  created_at: string;
}

interface AnnouncementRow {
  id: string;
  owner_id: string;
  property_id: string | null;
  title: string;
  content: string;
  date: string;
  category: AnnouncementCategory;
  is_pinned: boolean;
  views: number;
  sent_via_whatsapp: boolean;
  created_at: string;
}

interface NotificationRow {
  id: string;
  owner_id: string;
  type: 'payment' | 'maintenance' | 'tenant' | 'announcement';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface OwnerSettingsRow {
  owner_id: string;
  pg_rules: JsonValue;
  whatsapp_settings: JsonValue;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'admin' | 'tenant' | 'super_admin';
  pgName: string;
  city: string;
}

export interface TenantRecord {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  email: string;
  photoUrl: string;
  propertyId: string;
  floor: number;
  room: string;
  bed: string;
  rent: number;
  securityDeposit: number;
  rentDueDate: number;
  parentName: string;
  parentPhone: string;
  idType: string;
  idNumber: string;
  idDocumentUrl: string;
  joinDate: string;
  status: TenantStatus;
  createdAt: string;
}

export interface TenantCreateInput {
  name: string;
  phone: string;
  email: string;
  propertyId: string;
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
  joinDate: string;
  status: TenantStatus;
  photo?: File | null;
  idDocument?: File | null;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  tenant: string;
  propertyId: string;
  room: string;
  monthlyRent: number;
  extraCharges: number;
  totalAmount: number;
  dueDate: string;
  paidDate: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface MaintenanceTicketRecord {
  id: string;
  ticketId: string;
  tenant: string;
  propertyId: string;
  room: string;
  issue: string;
  description: string;
  source: 'whatsapp' | 'manual';
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  date: string;
  phone: string;
  notes: string[];
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  date: string;
  isPinned: boolean;
  views: number;
  sentViaWhatsApp: boolean;
  propertyId: string | null;
}

export interface NotificationRecord {
  id: string;
  ownerId: string;
  type: 'payment' | 'maintenance' | 'tenant' | 'announcement';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TenantPortalSnapshot {
  profile: AppUser;
  tenant: TenantRecord;
  property: Property | null;
  owner: AppUser | null;
  payments: PaymentRecord[];
  maintenance: MaintenanceTicketRecord[];
  announcements: AnnouncementRecord[];
}

export interface OwnerSettingsRecord {
  pgRules: string[];
  whatsappSettings: {
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
  };
}

export interface DashboardSnapshot {
  totalTenants: number;
  occupiedRooms: number;
  totalRooms: number;
  monthlyRevenue: number;
  pendingAmount: number;
  pendingIssues: number;
  recentPayments: PaymentRecord[];
  recentActivity: Array<{
    id: string;
    action: string;
    detail: string;
    propertyId: string | null;
    createdAt: string;
  }>;
  revenueChartData: Array<{
    name: string;
    revenue: number;
    target: number;
  }>;
}

function toDateOnly(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.split('T')[0];
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error('Unknown Supabase error');
}

async function getOwnerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  if (data.user?.id) {
    return data.user.id;
  }

  throw new Error('No authenticated user found. Please log in again.');
}

async function getCurrentProfile(): Promise<AppUser> {
  const ownerId = await getOwnerId();
  const profile = await supabaseAuthDataApi.getProfileById(ownerId);
  if (!profile) {
    throw new Error('Profile not found for authenticated user.');
  }
  return profile;
}

async function createOwnerNotification(
  ownerId: string,
  input: {
    type: 'payment' | 'maintenance' | 'tenant' | 'announcement';
    title: string;
    message: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      owner_id: ownerId,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
    });

  if (error) {
    throw error;
  }
}

async function resolveTenantContextForCurrentUser(): Promise<{
  profile: AppUser;
  tenant: TenantRecord;
}> {
  const profile = await getCurrentProfile();
  const email = profile.email.trim().toLowerCase();
  const phone = profile.phone.trim();

  const fetchTenantByEmail = async (tenantEmail: string): Promise<TenantRow | null> => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .ilike('email', tenantEmail)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<TenantRow[]>();

    if (error) {
      throw error;
    }

    return data?.[0] ?? null;
  };

  const fetchTenantByPhone = async (tenantPhone: string): Promise<TenantRow | null> => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('phone', tenantPhone)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<TenantRow[]>();

    if (error) {
      throw error;
    }

    return data?.[0] ?? null;
  };

  let row: TenantRow | null = null;

  if (email) {
    row = await fetchTenantByEmail(email);
  }

  if (!row && phone) {
    row = await fetchTenantByPhone(phone);
  }

  if (!row) {
    throw new Error('No tenant record found for this account.');
  }

  const tenant = mapTenant(row);
  const resolvedProfile: AppUser = profile.role === 'tenant'
    ? profile
    : {
      ...profile,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      role: 'tenant',
    };

  return {
    profile: resolvedProfile,
    tenant,
  };
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    number: row.number,
    floor: row.floor,
    type: row.type,
    beds: row.beds,
    rent: toNumber(row.rent),
    status: row.status,
    occupiedBeds: row.occupied_beds ?? 0,
  };
}

function mapProperty(row: PropertyRow, rooms: Room[]): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    floors: row.floors,
    totalRooms: row.total_rooms,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    createdAt: row.created_at,
    rooms,
  };
}

function mapTenant(row: TenantRow): TenantRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    photoUrl: row.photo_url ?? '',
    propertyId: row.property_id,
    floor: row.floor,
    room: row.room,
    bed: row.bed,
    rent: toNumber(row.monthly_rent),
    securityDeposit: toNumber(row.security_deposit),
    rentDueDate: row.rent_due_date,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    idType: row.id_type,
    idNumber: row.id_number,
    idDocumentUrl: row.id_document_url ?? '',
    joinDate: toDateOnly(row.join_date),
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenant: row.tenant_name,
    propertyId: row.property_id,
    room: row.room,
    monthlyRent: toNumber(row.monthly_rent),
    extraCharges: toNumber(row.extra_charges),
    totalAmount: toNumber(row.total_amount),
    dueDate: toDateOnly(row.due_date),
    paidDate: toDateOnly(row.paid_date),
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapMaintenanceTicket(row: MaintenanceTicketRow, notes: MaintenanceNoteRow[]): MaintenanceTicketRecord {
  const sortedNotes = notes
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((note) => `[${new Date(note.created_at).toLocaleString('en-IN')}] ${note.note}`);

  return {
    id: row.id,
    ticketId: `TKT${row.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`,
    tenant: row.tenant,
    propertyId: row.property_id,
    room: row.room,
    issue: row.issue,
    description: row.description,
    source: row.source,
    status: row.status,
    priority: row.priority,
    date: toDateOnly(row.date),
    phone: row.phone ?? '',
    notes: sortedNotes,
  };
}

function mapAnnouncement(row: AnnouncementRow): AnnouncementRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    date: toDateOnly(row.date),
    isPinned: row.is_pinned,
    views: row.views,
    sentViaWhatsApp: row.sent_via_whatsapp,
    propertyId: row.property_id,
  };
}

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

const defaultSettings: OwnerSettingsRecord = {
  pgRules: [],
  whatsappSettings: {
    welcomeMessage: {
      enabled: true,
      template: 'Welcome to {{pgName}}, {{tenantName}}.',
    },
    rentReminder: {
      enabled: true,
      daysBeforeDue: 3,
      template: 'Rent reminder for {{month}}. Amount: Rs {{amount}}.',
    },
    paymentConfirmation: {
      enabled: true,
      template: 'Payment received for {{month}}. Amount: Rs {{amount}}.',
    },
    complaintUpdate: {
      enabled: true,
      notifyOnCreate: true,
      notifyOnProgress: true,
      notifyOnResolve: true,
    },
  },
};

function parseOwnerSettings(row: OwnerSettingsRow | null): OwnerSettingsRecord {
  if (!row) {
    return defaultSettings;
  }

  const pgRules = Array.isArray(row.pg_rules) ? row.pg_rules.filter((entry) => typeof entry === 'string') as string[] : [];

  const ws = (row.whatsapp_settings ?? {}) as Record<string, unknown>;

  return {
    pgRules,
    whatsappSettings: {
      welcomeMessage: {
        enabled: Boolean((ws.welcomeMessage as Record<string, unknown> | undefined)?.enabled ?? true),
        template: String((ws.welcomeMessage as Record<string, unknown> | undefined)?.template ?? defaultSettings.whatsappSettings.welcomeMessage.template),
      },
      rentReminder: {
        enabled: Boolean((ws.rentReminder as Record<string, unknown> | undefined)?.enabled ?? true),
        daysBeforeDue: Number((ws.rentReminder as Record<string, unknown> | undefined)?.daysBeforeDue ?? 3),
        template: String((ws.rentReminder as Record<string, unknown> | undefined)?.template ?? defaultSettings.whatsappSettings.rentReminder.template),
      },
      paymentConfirmation: {
        enabled: Boolean((ws.paymentConfirmation as Record<string, unknown> | undefined)?.enabled ?? true),
        template: String((ws.paymentConfirmation as Record<string, unknown> | undefined)?.template ?? defaultSettings.whatsappSettings.paymentConfirmation.template),
      },
      complaintUpdate: {
        enabled: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.enabled ?? true),
        notifyOnCreate: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.notifyOnCreate ?? true),
        notifyOnProgress: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.notifyOnProgress ?? true),
        notifyOnResolve: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.notifyOnResolve ?? true),
      },
    },
  };
}

function toMonthName(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

async function syncPropertyRoomCount(propertyId: string): Promise<void> {
  const { count, error } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);

  if (error) {
    throw error;
  }

  const { error: updateError } = await supabase
    .from('properties')
    .update({ total_rooms: count ?? 0 })
    .eq('id', propertyId);

  if (updateError) {
    throw updateError;
  }
}

async function uploadTenantFile(ownerId: string, tenantName: string, file: File, kind: 'photo' | 'document'): Promise<string> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeName = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const path = `${ownerId}/${kind}/${Date.now()}-${safeName}.${extension}`;

  const { error } = await supabase.storage
    .from(TENANT_FILES_BUCKET)
    .upload(path, file, { upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(TENANT_FILES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const supabaseAuthDataApi = {
  async getProfileById(userId: string): Promise<AppUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,pg_name,city')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.full_name ?? data.email ?? 'Owner',
      email: data.email ?? '',
      phone: data.phone ?? '',
      role: data.role,
      pgName: data.pg_name ?? '',
      city: data.city ?? '',
    };
  },

  async ensureOwnerProfile(payload: {
    userId: string;
    email: string;
    name: string;
    phone: string;
    role?: 'owner' | 'admin' | 'tenant' | 'super_admin';
    pgName: string;
    city: string;
  }): Promise<void> {
    const profileRole = payload.role ?? 'owner';

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: payload.userId,
        email: payload.email,
        full_name: payload.name,
        phone: payload.phone,
        role: profileRole,
        pg_name: payload.pgName,
        city: payload.city,
      }, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    if (profileRole !== 'owner') {
      return;
    }

    const { error: settingsError } = await supabase
      .from('owner_settings')
      .upsert({
        owner_id: payload.userId,
      }, { onConflict: 'owner_id' });

    if (settingsError) {
      throw settingsError;
    }
  },
};

export const supabasePropertyApi = {
  async list(): Promise<Property[]> {
    const ownerId = await getOwnerId();

    const { data: propertyRows, error } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .returns<PropertyRow[]>();

    if (error) {
      throw error;
    }

    const properties = propertyRows ?? [];
    if (properties.length === 0) {
      return [];
    }

    const propertyIds = properties.map((property) => property.id);

    const { data: roomRows, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .in('property_id', propertyIds)
      .order('floor', { ascending: true })
      .order('number', { ascending: true })
      .returns<RoomRow[]>();

    if (roomError) {
      throw roomError;
    }

    const roomMap = new Map<string, Room[]>();
    (roomRows ?? []).forEach((row) => {
      const current = roomMap.get(row.property_id) ?? [];
      current.push(mapRoom(row));
      roomMap.set(row.property_id, current);
    });

    return properties.map((property) => mapProperty(property, roomMap.get(property.id) ?? []));
  },

  async create(input: Omit<Property, 'id' | 'createdAt' | 'rooms'>): Promise<Property> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('properties')
      .insert({
        owner_id: ownerId,
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        floors: input.floors,
        total_rooms: input.totalRooms,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail,
      })
      .select('*')
      .single<PropertyRow>();

    if (error) {
      throw error;
    }

    return mapProperty(data, []);
  },

  async update(id: string, input: Partial<Property>): Promise<Property> {
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.name = input.name;
    if (input.address !== undefined) payload.address = input.address;
    if (input.city !== undefined) payload.city = input.city;
    if (input.state !== undefined) payload.state = input.state;
    if (input.pincode !== undefined) payload.pincode = input.pincode;
    if (input.floors !== undefined) payload.floors = input.floors;
    if (input.totalRooms !== undefined) payload.total_rooms = input.totalRooms;
    if (input.contactName !== undefined) payload.contact_name = input.contactName;
    if (input.contactPhone !== undefined) payload.contact_phone = input.contactPhone;
    if (input.contactEmail !== undefined) payload.contact_email = input.contactEmail;

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single<PropertyRow>();

    if (error) {
      throw error;
    }

    const { data: roomRows, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', id)
      .order('floor', { ascending: true })
      .order('number', { ascending: true })
      .returns<RoomRow[]>();

    if (roomError) {
      throw roomError;
    }

    return mapProperty(data, (roomRows ?? []).map(mapRoom));
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },

  async addRoom(propertyId: string, input: Omit<Room, 'id'>): Promise<Room> {
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        property_id: propertyId,
        number: input.number,
        floor: input.floor,
        type: input.type,
        beds: input.beds,
        rent: input.rent,
        status: input.status,
        occupied_beds: input.occupiedBeds ?? 0,
      })
      .select('*')
      .single<RoomRow>();

    if (error) {
      throw error;
    }

    await syncPropertyRoomCount(propertyId);
    return mapRoom(data);
  },

  async updateRoom(propertyId: string, roomId: string, input: Partial<Room>): Promise<Room> {
    const payload: Record<string, unknown> = {};

    if (input.number !== undefined) payload.number = input.number;
    if (input.floor !== undefined) payload.floor = input.floor;
    if (input.type !== undefined) payload.type = input.type;
    if (input.beds !== undefined) payload.beds = input.beds;
    if (input.rent !== undefined) payload.rent = input.rent;
    if (input.status !== undefined) payload.status = input.status;
    if (input.occupiedBeds !== undefined) payload.occupied_beds = input.occupiedBeds;

    const { data, error } = await supabase
      .from('rooms')
      .update(payload)
      .eq('id', roomId)
      .eq('property_id', propertyId)
      .select('*')
      .single<RoomRow>();

    if (error) {
      throw error;
    }

    return mapRoom(data);
  },

  async removeRoom(propertyId: string, roomId: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('property_id', propertyId);

    if (error) {
      throw error;
    }

    await syncPropertyRoomCount(propertyId);
  },
};

export const supabaseOwnerDataApi = {
  async listTenants(propertyId: string | 'all' = 'all'): Promise<TenantRecord[]> {
    const ownerId = await getOwnerId();

    let query = supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (propertyId !== 'all') {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query.returns<TenantRow[]>();
    if (error) {
      throw error;
    }

    return (data ?? []).map(mapTenant);
  },

  async getTenantById(tenantId: string): Promise<TenantRecord | null> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .maybeSingle<TenantRow>();

    if (error) {
      throw error;
    }

    return data ? mapTenant(data) : null;
  },

  async createTenant(input: TenantCreateInput): Promise<TenantRecord> {
    const ownerId = await getOwnerId();

    let photoUrl: string | null = null;
    let idDocumentUrl: string | null = null;

    if (input.photo) {
      photoUrl = await uploadTenantFile(ownerId, input.name, input.photo, 'photo');
    }
    if (input.idDocument) {
      idDocumentUrl = await uploadTenantFile(ownerId, input.name, input.idDocument, 'document');
    }

    const { data, error } = await supabase
      .from('tenants')
      .insert({
        owner_id: ownerId,
        property_id: input.propertyId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        photo_url: photoUrl,
        floor: input.floor,
        room: input.room,
        bed: input.bed,
        monthly_rent: input.monthlyRent,
        security_deposit: input.securityDeposit,
        rent_due_date: input.rentDueDate,
        parent_name: input.parentName,
        parent_phone: input.parentPhone,
        id_type: input.idType,
        id_number: input.idNumber,
        id_document_url: idDocumentUrl,
        join_date: input.joinDate,
        status: input.status,
      })
      .select('*')
      .single<TenantRow>();

    if (error) {
      throw error;
    }

    const created = mapTenant(data);

    void createOwnerNotification(ownerId, {
      type: 'tenant',
      title: 'New Tenant Added',
      message: `${created.name} added to room ${created.room}.`,
    }).catch(() => {
      // Notification should not block tenant creation.
    });

    return created;
  },

  async updateTenant(tenantId: string, input: Partial<TenantCreateInput>): Promise<TenantRecord> {
    const ownerId = await getOwnerId();

    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.name = input.name;
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.email !== undefined) payload.email = input.email;
    if (input.propertyId !== undefined) payload.property_id = input.propertyId;
    if (input.floor !== undefined) payload.floor = input.floor;
    if (input.room !== undefined) payload.room = input.room;
    if (input.bed !== undefined) payload.bed = input.bed;
    if (input.monthlyRent !== undefined) payload.monthly_rent = input.monthlyRent;
    if (input.securityDeposit !== undefined) payload.security_deposit = input.securityDeposit;
    if (input.rentDueDate !== undefined) payload.rent_due_date = input.rentDueDate;
    if (input.parentName !== undefined) payload.parent_name = input.parentName;
    if (input.parentPhone !== undefined) payload.parent_phone = input.parentPhone;
    if (input.idType !== undefined) payload.id_type = input.idType;
    if (input.idNumber !== undefined) payload.id_number = input.idNumber;
    if (input.joinDate !== undefined) payload.join_date = input.joinDate;
    if (input.status !== undefined) payload.status = input.status;

    if (input.photo) {
      payload.photo_url = await uploadTenantFile(ownerId, input.name ?? 'tenant', input.photo, 'photo');
    }
    if (input.idDocument) {
      payload.id_document_url = await uploadTenantFile(ownerId, input.name ?? 'tenant', input.idDocument, 'document');
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<TenantRow>();

    if (error) {
      throw error;
    }

    const updatedTenant = mapTenant(data);

    const paymentPayload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      paymentPayload.tenant_name = updatedTenant.name;
    }
    if (input.room !== undefined) {
      paymentPayload.room = updatedTenant.room;
    }
    if (input.propertyId !== undefined) {
      paymentPayload.property_id = updatedTenant.propertyId;
    }
    if (input.monthlyRent !== undefined) {
      paymentPayload.monthly_rent = updatedTenant.rent;
    }

    if (Object.keys(paymentPayload).length > 0) {
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update(paymentPayload)
        .eq('tenant_id', tenantId)
        .eq('owner_id', ownerId);

      if (paymentUpdateError) {
        throw paymentUpdateError;
      }
    }

    if (input.monthlyRent !== undefined) {
      const { data: tenantPayments, error: tenantPaymentsError } = await supabase
        .from('payments')
        .select('id, extra_charges')
        .eq('tenant_id', tenantId)
        .eq('owner_id', ownerId)
        .returns<Array<{ id: string; extra_charges: number }>>();

      if (tenantPaymentsError) {
        throw tenantPaymentsError;
      }

      const paymentsToSync = tenantPayments ?? [];
      for (const payment of paymentsToSync) {
        const nextTotal = Number(updatedTenant.rent) + Number(payment.extra_charges ?? 0);
        const { error: totalSyncError } = await supabase
          .from('payments')
          .update({ total_amount: nextTotal })
          .eq('id', payment.id)
          .eq('owner_id', ownerId);

        if (totalSyncError) {
          throw totalSyncError;
        }
      }
    }

    return updatedTenant;
  },

  async deleteTenant(tenantId: string): Promise<void> {
    const ownerId = await getOwnerId();
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }
  },

  async listPayments(propertyId: string | 'all' = 'all'): Promise<PaymentRecord[]> {
    const ownerId = await getOwnerId();

    let query = supabase
      .from('payments')
      .select('*')
      .eq('owner_id', ownerId)
      .order('due_date', { ascending: false });

    if (propertyId !== 'all') {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query.returns<PaymentRow[]>();
    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPayment);
  },

  async listPaymentsForTenant(tenantId: string): Promise<PaymentRecord[]> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false })
      .returns<PaymentRow[]>();

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPayment);
  },

  async updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<PaymentRecord> {
    const ownerId = await getOwnerId();

    const payload: Record<string, unknown> = {
      status,
    };

    if (status === 'paid') {
      payload.paid_date = new Date().toISOString().split('T')[0];
    } else {
      payload.paid_date = null;
    }

    const { data, error } = await supabase
      .from('payments')
      .update(payload)
      .eq('id', paymentId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<PaymentRow>();

    if (error) {
      throw error;
    }

    const updated = mapPayment(data);

    void createOwnerNotification(ownerId, {
      type: 'payment',
      title: status === 'paid' ? 'Payment Marked Paid' : 'Payment Status Updated',
      message: `${updated.tenant} - ${updated.room} is now ${status}.`,
    }).catch(() => {
      // Notification should not block payment updates.
    });

    return updated;
  },

  async addPaymentCharge(paymentId: string, input: {
    type: string;
    customType?: string;
    description?: string;
    amount: number;
  }): Promise<PaymentRecord> {
    const { error } = await supabase
      .from('payment_charges')
      .insert({
        payment_id: paymentId,
        type: input.type,
        custom_type: input.customType ?? null,
        description: input.description ?? null,
        amount: input.amount,
      });

    if (error) {
      throw error;
    }

    const ownerId = await getOwnerId();
    const { data, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('owner_id', ownerId)
      .single<PaymentRow>();

    if (paymentError) {
      throw paymentError;
    }

    return mapPayment(data);
  },

  async listMaintenanceTickets(propertyId: string | 'all' = 'all'): Promise<MaintenanceTicketRecord[]> {
    const ownerId = await getOwnerId();

    let query = supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (propertyId !== 'all') {
      query = query.eq('property_id', propertyId);
    }

    const { data: ticketRows, error } = await query.returns<MaintenanceTicketRow[]>();

    if (error) {
      throw error;
    }

    const tickets = ticketRows ?? [];
    if (tickets.length === 0) {
      return [];
    }

    const ticketIds = tickets.map((ticket) => ticket.id);

    const { data: noteRows, error: noteError } = await supabase
      .from('maintenance_notes')
      .select('*')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: true })
      .returns<MaintenanceNoteRow[]>();

    if (noteError) {
      throw noteError;
    }

    const noteMap = new Map<string, MaintenanceNoteRow[]>();
    (noteRows ?? []).forEach((note) => {
      const list = noteMap.get(note.ticket_id) ?? [];
      list.push(note);
      noteMap.set(note.ticket_id, list);
    });

    return tickets.map((ticket) => mapMaintenanceTicket(ticket, noteMap.get(ticket.id) ?? []));
  },

  async listMaintenanceForTenant(tenantId: string, tenantName?: string): Promise<MaintenanceTicketRecord[]> {
    const ownerId = await getOwnerId();

    const { data: idTicketRows, error } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .returns<MaintenanceTicketRow[]>();

    if (error) {
      throw error;
    }

    let nameTicketRows: MaintenanceTicketRow[] = [];
    if (tenantName && tenantName.trim()) {
      const { data: fallbackRows, error: fallbackError } = await supabase
        .from('maintenance_tickets')
        .select('*')
        .eq('owner_id', ownerId)
        .is('tenant_id', null)
        .eq('tenant', tenantName.trim())
        .order('created_at', { ascending: false })
        .returns<MaintenanceTicketRow[]>();

      if (fallbackError) {
        throw fallbackError;
      }

      nameTicketRows = fallbackRows ?? [];
    }

    const dedupedTickets = new Map<string, MaintenanceTicketRow>();
    [...(idTicketRows ?? []), ...nameTicketRows].forEach((ticket) => {
      dedupedTickets.set(ticket.id, ticket);
    });

    const tickets = Array.from(dedupedTickets.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (tickets.length === 0) {
      return [];
    }

    const ids = tickets.map((ticket) => ticket.id);
    const { data: notes, error: noteError } = await supabase
      .from('maintenance_notes')
      .select('*')
      .in('ticket_id', ids)
      .returns<MaintenanceNoteRow[]>();

    if (noteError) {
      throw noteError;
    }

    const noteMap = new Map<string, MaintenanceNoteRow[]>();
    (notes ?? []).forEach((note) => {
      const list = noteMap.get(note.ticket_id) ?? [];
      list.push(note);
      noteMap.set(note.ticket_id, list);
    });

    return tickets.map((ticket) => mapMaintenanceTicket(ticket, noteMap.get(ticket.id) ?? []));
  },

  async createMaintenanceTicket(input: {
    tenant: string;
    propertyId: string;
    room: string;
    issue: string;
    description: string;
    priority: MaintenancePriority;
    source?: 'whatsapp' | 'manual';
    phone?: string;
  }): Promise<MaintenanceTicketRecord> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        owner_id: ownerId,
        tenant: input.tenant,
        property_id: input.propertyId,
        room: input.room,
        issue: input.issue,
        description: input.description,
        source: input.source ?? 'manual',
        status: 'open',
        priority: input.priority,
        phone: input.phone ?? null,
      })
      .select('*')
      .single<MaintenanceTicketRow>();

    if (error) {
      throw error;
    }

    const created = mapMaintenanceTicket(data, []);

    void createOwnerNotification(ownerId, {
      type: 'maintenance',
      title: 'Maintenance Ticket Created',
      message: `${created.issue} (${created.room}) for ${created.tenant}.`,
    }).catch(() => {
      // Notification should not block ticket creation.
    });

    return created;
  },

  async updateMaintenanceStatus(ticketId: string, status: MaintenanceStatus): Promise<MaintenanceTicketRecord> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({ status })
      .eq('id', ticketId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<MaintenanceTicketRow>();

    if (error) {
      throw error;
    }

    const { data: notes, error: noteError } = await supabase
      .from('maintenance_notes')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .returns<MaintenanceNoteRow[]>();

    if (noteError) {
      throw noteError;
    }

    return mapMaintenanceTicket(data, notes ?? []);
  },

  async addMaintenanceNote(ticketId: string, note: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_notes')
      .insert({
        ticket_id: ticketId,
        note,
      });

    if (error) {
      throw error;
    }
  },

  async listAnnouncements(propertyId: string | 'all' = 'all'): Promise<AnnouncementRecord[]> {
    const ownerId = await getOwnerId();

    let query = supabase
      .from('announcements')
      .select('*')
      .eq('owner_id', ownerId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (propertyId !== 'all') {
      query = query.or(`property_id.eq.${propertyId},property_id.is.null`);
    }

    const { data, error } = await query.returns<AnnouncementRow[]>();

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapAnnouncement);
  },

  async createAnnouncement(input: {
    title: string;
    content: string;
    category: AnnouncementCategory;
    isPinned: boolean;
    sendViaWhatsApp: boolean;
    propertyId?: string | null;
  }): Promise<AnnouncementRecord> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        owner_id: ownerId,
        title: input.title,
        content: input.content,
        category: input.category,
        is_pinned: input.isPinned,
        sent_via_whatsapp: input.sendViaWhatsApp,
        property_id: input.propertyId ?? null,
      })
      .select('*')
      .single<AnnouncementRow>();

    if (error) {
      throw error;
    }

    const created = mapAnnouncement(data);

    void createOwnerNotification(ownerId, {
      type: 'announcement',
      title: 'Announcement Posted',
      message: created.title,
    }).catch(() => {
      // Notification should not block announcement creation.
    });

    return created;
  },

  async updateAnnouncement(announcementId: string, input: {
    title: string;
    content: string;
    category: AnnouncementCategory;
    isPinned: boolean;
  }): Promise<AnnouncementRecord> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('announcements')
      .update({
        title: input.title,
        content: input.content,
        category: input.category,
        is_pinned: input.isPinned,
      })
      .eq('id', announcementId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<AnnouncementRow>();

    if (error) {
      throw error;
    }

    return mapAnnouncement(data);
  },

  async toggleAnnouncementPin(announcementId: string, isPinned: boolean): Promise<void> {
    const ownerId = await getOwnerId();

    const { error } = await supabase
      .from('announcements')
      .update({ is_pinned: isPinned })
      .eq('id', announcementId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }
  },

  async deleteAnnouncement(announcementId: string): Promise<void> {
    const ownerId = await getOwnerId();

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }
  },

  async markAnnouncementSent(announcementId: string): Promise<void> {
    const ownerId = await getOwnerId();

    const { error } = await supabase
      .from('announcements')
      .update({ sent_via_whatsapp: true })
      .eq('id', announcementId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }
  },

  async getOwnerSettings(): Promise<OwnerSettingsRecord> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('owner_settings')
      .select('owner_id,pg_rules,whatsapp_settings')
      .eq('owner_id', ownerId)
      .maybeSingle<OwnerSettingsRow>();

    if (error) {
      throw error;
    }

    if (!data) {
      const { error: createError } = await supabase
        .from('owner_settings')
        .insert({ owner_id: ownerId });

      if (createError) {
        throw createError;
      }

      return defaultSettings;
    }

    return parseOwnerSettings(data);
  },

  async updateOwnerSettings(settings: OwnerSettingsRecord): Promise<OwnerSettingsRecord> {
    const ownerId = await getOwnerId();

    const { error } = await supabase
      .from('owner_settings')
      .update({
        pg_rules: settings.pgRules,
        whatsapp_settings: settings.whatsappSettings,
      })
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }

    return settings;
  },

  async getDashboardSnapshot(propertyId: string | 'all'): Promise<DashboardSnapshot> {
    try {
      const [properties, payments, tenants, maintenance] = await Promise.all([
        supabasePropertyApi.list(),
        this.listPayments(propertyId),
        this.listTenants(propertyId),
        this.listMaintenanceTickets(propertyId),
      ]);

      const allRooms = properties.flatMap((property) => property.rooms);
      const occupiedRooms = allRooms.filter((room) => room.status === 'occupied').length;
      const totalRooms = allRooms.length;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyRevenue = payments
        .filter((payment) => {
          if (payment.status !== 'paid') {
            return false;
          }
          const paidDate = payment.paidDate ? new Date(payment.paidDate) : null;
          if (!paidDate) {
            return false;
          }
          return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
        })
        .reduce((sum, payment) => sum + payment.totalAmount, 0);

      const pendingAmount = payments
        .filter((payment) => payment.status === 'pending' || payment.status === 'overdue')
        .reduce((sum, payment) => sum + payment.totalAmount, 0);

      const pendingIssues = maintenance.filter((ticket) => ticket.status === 'open').length;

      const recentPayments = [...payments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const paymentActivity = recentPayments.slice(0, 3).map((payment) => ({
        id: `payment-${payment.id}`,
        action: payment.status === 'paid' ? 'Payment received' : 'Payment update',
        detail: `${payment.tenant} - ${payment.room}`,
        propertyId: payment.propertyId,
        createdAt: payment.createdAt,
      }));

      const maintenanceActivity = maintenance.slice(0, 3).map((ticket) => ({
        id: `maintenance-${ticket.id}`,
        action: 'Maintenance request',
        detail: `${ticket.issue} - ${ticket.room}`,
        propertyId: ticket.propertyId,
        createdAt: ticket.date,
      }));

      const recentActivity = [...paymentActivity, ...maintenanceActivity]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

      const monthBuckets: Array<{ key: string; name: string; revenue: number }> = [];
      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(currentYear, currentMonth - i, 1);
        monthBuckets.push({
          key: `${date.getFullYear()}-${date.getMonth()}`,
          name: toMonthName(date),
          revenue: 0,
        });
      }

      payments.forEach((payment) => {
        if (payment.status !== 'paid') {
          return;
        }
        const referenceDate = payment.paidDate ? new Date(payment.paidDate) : new Date(payment.dueDate);
        const key = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}`;
        const bucket = monthBuckets.find((entry) => entry.key === key);
        if (bucket) {
          bucket.revenue += payment.totalAmount;
        }
      });

      const averageRevenue = monthBuckets.length > 0
        ? monthBuckets.reduce((sum, bucket) => sum + bucket.revenue, 0) / monthBuckets.length
        : 0;

      const revenueChartData = monthBuckets.map((bucket) => ({
        name: bucket.name,
        revenue: bucket.revenue,
        target: Math.round(averageRevenue),
      }));

      return {
        totalTenants: tenants.filter((tenant) => tenant.status === 'active').length,
        occupiedRooms,
        totalRooms,
        monthlyRevenue,
        pendingAmount,
        pendingIssues,
        recentPayments,
        recentActivity,
        revenueChartData,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export const supabaseNotificationApi = {
  async listForCurrentUser(): Promise<NotificationRecord[]> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .returns<NotificationRow[]>();

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapNotification);
  },

  async markAsRead(notificationId: string): Promise<void> {
    const ownerId = await getOwnerId();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }
  },

  async markAllAsRead(): Promise<void> {
    const ownerId = await getOwnerId();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('owner_id', ownerId)
      .eq('read', false);

    if (error) {
      throw error;
    }
  },
};

export const supabaseTenantDataApi = {
  async getPortalSnapshot(): Promise<TenantPortalSnapshot> {
    const { profile, tenant } = await resolveTenantContextForCurrentUser();

    const [{ data: propertyRow, error: propertyError }, ownerProfile, paymentRows, maintenanceRows, announcementRows] = await Promise.all([
      supabase
        .from('properties')
        .select('*')
        .eq('id', tenant.propertyId)
        .maybeSingle<PropertyRow>(),
      supabaseAuthDataApi.getProfileById(tenant.ownerId).catch(() => null),
      supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('due_date', { ascending: false })
        .returns<PaymentRow[]>(),
      supabase
        .from('maintenance_tickets')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('property_id', tenant.propertyId)
        .order('created_at', { ascending: false })
        .returns<MaintenanceTicketRow[]>(),
      supabase
        .from('announcements')
        .select('*')
        .or(`property_id.eq.${tenant.propertyId},property_id.is.null`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .returns<AnnouncementRow[]>(),
    ]);

    if (propertyError) {
      throw propertyError;
    }
    if (paymentRows.error) {
      throw paymentRows.error;
    }
    if (maintenanceRows.error) {
      throw maintenanceRows.error;
    }
    if (announcementRows.error) {
      throw announcementRows.error;
    }

    const property = propertyRow ? mapProperty(propertyRow, []) : null;

    const maintenanceTicketRows = maintenanceRows.data ?? [];
    const maintenanceIds = maintenanceTicketRows.map((ticket) => ticket.id);
    let notesByTicket = new Map<string, MaintenanceNoteRow[]>();

    if (maintenanceIds.length > 0) {
      const { data: noteRows, error: noteError } = await supabase
        .from('maintenance_notes')
        .select('*')
        .in('ticket_id', maintenanceIds)
        .order('created_at', { ascending: true })
        .returns<MaintenanceNoteRow[]>();

      if (noteError) {
        throw noteError;
      }

      notesByTicket = new Map<string, MaintenanceNoteRow[]>();
      (noteRows ?? []).forEach((note) => {
        const current = notesByTicket.get(note.ticket_id) ?? [];
        current.push(note);
        notesByTicket.set(note.ticket_id, current);
      });
    }

    return {
      profile,
      tenant,
      property,
      owner: ownerProfile,
      payments: (paymentRows.data ?? []).map(mapPayment),
      maintenance: maintenanceTicketRows.map((ticket) => mapMaintenanceTicket(ticket, notesByTicket.get(ticket.id) ?? [])),
      announcements: (announcementRows.data ?? []).map(mapAnnouncement),
    };
  },

  async createMaintenanceTicket(input: {
    issue: string;
    description: string;
    priority: MaintenancePriority;
  }): Promise<MaintenanceTicketRecord> {
    const { tenant } = await resolveTenantContextForCurrentUser();

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        owner_id: tenant.ownerId,
        tenant_id: tenant.id,
        tenant: tenant.name,
        property_id: tenant.propertyId,
        room: tenant.room,
        issue: input.issue,
        description: input.description,
        source: 'manual',
        status: 'open',
        priority: input.priority,
        phone: tenant.phone,
      })
      .select('*')
      .single<MaintenanceTicketRow>();

    if (error) {
      throw error;
    }

    void createOwnerNotification(tenant.ownerId, {
      type: 'maintenance',
      title: 'New Tenant Complaint',
      message: `${tenant.name} reported: ${input.issue}`,
    }).catch(() => {
      // Notification should not block tenant ticket creation.
    });

    return mapMaintenanceTicket(data, []);
  },
};

export const supabaseAdminDataApi = {
  async getAdminSummary(): Promise<{
    profile: AppUser;
    stats: {
      totalProperties: number;
      totalTenants: number;
      pendingPayments: number;
      openTickets: number;
      monthlyRevenue: number;
    };
    tenants: TenantRecord[];
    maintenance: MaintenanceTicketRecord[];
  }> {
    const profile = await getCurrentProfile();
    const [propertiesResult, tenantsResult, paymentsResult, maintenanceResult, notesResult] = await Promise.all([
      supabase.from('properties').select('*').returns<PropertyRow[]>(),
      supabase.from('tenants').select('*').returns<TenantRow[]>(),
      supabase.from('payments').select('*').returns<PaymentRow[]>(),
      supabase.from('maintenance_tickets').select('*').returns<MaintenanceTicketRow[]>(),
      supabase.from('maintenance_notes').select('*').returns<MaintenanceNoteRow[]>(),
    ]);

    if (propertiesResult.error) {
      throw propertiesResult.error;
    }
    if (tenantsResult.error) {
      throw tenantsResult.error;
    }
    if (paymentsResult.error) {
      throw paymentsResult.error;
    }
    if (maintenanceResult.error) {
      throw maintenanceResult.error;
    }
    if (notesResult.error) {
      throw notesResult.error;
    }

    const properties = propertiesResult.data ?? [];
    const tenants = (tenantsResult.data ?? []).map(mapTenant);
    const payments = (paymentsResult.data ?? []).map(mapPayment);
    const notesByTicket = new Map<string, MaintenanceNoteRow[]>();
    (notesResult.data ?? []).forEach((note) => {
      const current = notesByTicket.get(note.ticket_id) ?? [];
      current.push(note);
      notesByTicket.set(note.ticket_id, current);
    });
    const maintenance = (maintenanceResult.data ?? []).map((ticket) =>
      mapMaintenanceTicket(ticket, notesByTicket.get(ticket.id) ?? []),
    );

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthlyRevenue = payments
      .filter((payment) => payment.status === 'paid' && payment.paidDate)
      .filter((payment) => {
        const paidDate = new Date(payment.paidDate);
        return paidDate.getMonth() === month && paidDate.getFullYear() === year;
      })
      .reduce((sum, payment) => sum + payment.totalAmount, 0);

    return {
      profile,
      stats: {
        totalProperties: properties.length,
        totalTenants: tenants.length,
        pendingPayments: payments.filter((payment) => payment.status !== 'paid').length,
        openTickets: maintenance.filter((ticket) => ticket.status === 'open').length,
        monthlyRevenue,
      },
      tenants: tenants.slice(0, 8),
      maintenance: maintenance.slice(0, 8),
    };
  },
};
