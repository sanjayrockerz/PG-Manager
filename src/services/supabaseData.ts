import { supabase } from '../lib/supabase';
import type { Property, Room } from '../contexts/PropertyContext';
import { isPlatformAdminRole, isScopedOwnerRole } from '../utils/roles';

export type UserRole = 'owner' | 'owner_manager' | 'staff' | 'tenant' | 'platform_admin' | 'admin' | 'super_admin';
export type TenantStatus = 'active' | 'inactive';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type MaintenanceStatus = 'open' | 'in-progress' | 'resolved';
export type MaintenancePriority = 'low' | 'medium' | 'high';
export type AnnouncementCategory = 'maintenance' | 'payment' | 'rules' | 'general';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketCategory = 'billing' | 'technical' | 'operations' | 'tenant' | 'other';

const TENANT_FILES_BUCKET = 'tenant-files';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  owner_scope_id: string | null;
  pg_name: string | null;
  city: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PropertyRow {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  address_line1: string | null;
  address_line2: string | null;
  locality: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
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

interface OwnerUserPropertyScopeRow {
  id: string;
  owner_id: string;
  user_id: string;
  property_id: string;
  can_manage_properties: boolean;
  can_manage_tenants: boolean;
  can_manage_payments: boolean;
  can_manage_maintenance: boolean;
  can_manage_announcements: boolean;
  created_at: string;
}

interface OwnerSubscriptionRow {
  id: string;
  owner_id: string;
  plan_code: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  billing_cycle: 'monthly' | 'yearly';
  amount: number | string;
  currency: string;
  seats: number;
  started_at: string;
  trial_ends_at: string | null;
  renews_at: string | null;
  last_payment_at: string | null;
  metadata: JsonValue;
  updated_at: string;
}

interface SupportTicketRow {
  id: string;
  owner_id: string;
  property_id: string | null;
  created_by: string;
  assigned_to: string | null;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  visibility: 'owner' | 'property' | 'platform';
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportTicketCommentRow {
  id: string;
  ticket_id: string;
  author_id: string;
  message: string;
  internal_note: boolean;
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
  role: UserRole;
  ownerScopeId: string | null;
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

export interface TeamScopeRecord {
  id: string;
  ownerId: string;
  userId: string;
  propertyId: string;
  canManageProperties: boolean;
  canManageTenants: boolean;
  canManagePayments: boolean;
  canManageMaintenance: boolean;
  canManageAnnouncements: boolean;
  createdAt: string;
}

export interface TeamMemberRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  ownerScopeId: string | null;
  scopes: TeamScopeRecord[];
}

export interface OwnerSubscriptionRecord {
  id: string;
  ownerId: string;
  planCode: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  seats: number;
  startedAt: string;
  trialEndsAt: string;
  renewsAt: string;
  lastPaymentAt: string;
  updatedAt: string;
}

export interface SupportTicketRecord {
  id: string;
  ownerId: string;
  propertyId: string | null;
  createdBy: string;
  assignedTo: string | null;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  visibility: 'owner' | 'property' | 'platform';
  resolvedAt: string;
  createdAt: string;
  updatedAt: string;
  comments: SupportTicketCommentRecord[];
}

export interface SupportTicketCommentRecord {
  id: string;
  ticketId: string;
  authorId: string;
  message: string;
  internalNote: boolean;
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
      template: string;
      notifyOnCreate: boolean;
      notifyOnProgress: boolean;
      notifyOnResolve: boolean;
    };
  };
  notifications: {
    paymentNotifications: boolean;
    maintenanceAlerts: boolean;
    tenantUpdates: boolean;
    emailNotifications: boolean;
  };
  security: {
    twoFactorAuthentication: boolean;
  };
  paymentSettings: {
    upiId: string;
    bankAccount: string;
    latePaymentFee: number;
  };
  additionalSettings: {
    language: string;
    timezone: string;
    currency: string;
  };
}

export interface ProfileUpdateInput {
  name?: string;
  phone?: string;
  pgName?: string;
  city?: string;
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

function isMissingColumnError(error: unknown, candidateColumns: string[]): boolean {
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  if (!message.includes('column')) {
    return false;
  }
  return candidateColumns.some((column) => message.includes(column.toLowerCase()));
}

function isMissingRelationError(error: unknown, relation: string): boolean {
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  return message.includes('relation') && message.includes(relation.toLowerCase()) && message.includes('does not exist');
}

interface CurrentUserContext {
  userId: string;
  role: UserRole;
  ownerId: string;
  ownerScopeId: string | null;
  isPlatformAdmin: boolean;
}

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('No authenticated user found. Please log in again.');
  }

  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,owner_scope_id')
    .eq('id', userId)
    .maybeSingle<Pick<ProfileRow, 'id' | 'role' | 'owner_scope_id'>>();

  if (profileError && isMissingColumnError(profileError, ['owner_scope_id'])) {
    const legacy = await supabase
      .from('profiles')
      .select('id,role')
      .eq('id', userId)
      .maybeSingle<Pick<ProfileRow, 'id' | 'role'>>();

    profileError = legacy.error;
    profile = legacy.data ? { ...legacy.data, owner_scope_id: null } : null;
  }

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error('Profile not found for authenticated user.');
  }

  const role = profile.role;
  const ownerScopeId = profile.owner_scope_id ?? null;
  const ownerId = role === 'owner'
    ? profile.id
    : (isScopedOwnerRole(role) ? (ownerScopeId ?? profile.id) : profile.id);

  return {
    userId: profile.id,
    role,
    ownerId,
    ownerScopeId,
    isPlatformAdmin: isPlatformAdminRole(role),
  };
}

async function getOwnerId(): Promise<string> {
  const context = await getCurrentUserContext();
  return context.ownerId;
}

async function getCurrentProfile(): Promise<AppUser> {
  const context = await getCurrentUserContext();
  const profile = await supabaseAuthDataApi.getProfileById(context.userId);
  if (!profile) {
    throw new Error('Profile not found for authenticated user.');
  }
  return profile;
}

async function listScopedPropertyIds(context: CurrentUserContext): Promise<string[] | null> {
  if (context.isPlatformAdmin || context.role === 'owner') {
    return null;
  }

  if (!isScopedOwnerRole(context.role)) {
    return null;
  }

  const { data, error } = await supabase
    .from('owner_user_property_scopes')
    .select('property_id')
    .eq('owner_id', context.ownerId)
    .eq('user_id', context.userId)
    .returns<Array<{ property_id: string }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.property_id);
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

function emitOwnerDataUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('owner-data-updated'));
  }
}

async function syncRoomOccupancyForProperty(ownerId: string, propertyId: string): Promise<void> {
  if (!propertyId) {
    return;
  }

  const [{ data: roomRows, error: roomError }, { data: tenantRows, error: tenantError }] = await Promise.all([
    supabase
      .from('rooms')
      .select('id,number,floor,beds,status')
      .eq('property_id', propertyId)
      .returns<Array<{ id: string; number: string; floor: number; beds: number; status: 'occupied' | 'vacant' | 'maintenance' }>>(),
    supabase
      .from('tenants')
      .select('id,room,floor,status')
      .eq('owner_id', ownerId)
      .eq('property_id', propertyId)
      .returns<Array<{ id: string; room: string; floor: number; status: TenantStatus }>>(),
  ]);

  if (roomError) {
    throw roomError;
  }
  if (tenantError) {
    throw tenantError;
  }

  const activeTenants = (tenantRows ?? []).filter((tenant) => tenant.status === 'active');
  const tenantIndex = new Map<string, Array<{ id: string }>>();

  activeTenants.forEach((tenant) => {
    const key = `${tenant.floor}::${tenant.room.toLowerCase()}`;
    const list = tenantIndex.get(key) ?? [];
    list.push({ id: tenant.id });
    tenantIndex.set(key, list);
  });

  await Promise.all((roomRows ?? []).map(async (room) => {
    const key = `${room.floor}::${room.number.toLowerCase()}`;
    const assignedTenants = tenantIndex.get(key) ?? [];
    const occupiedBeds = Math.min(assignedTenants.length, room.beds);
    const primaryTenantId = assignedTenants[0]?.id ?? null;

    const nextStatus: 'occupied' | 'vacant' | 'maintenance' =
      occupiedBeds > 0
        ? 'occupied'
        : (room.status === 'maintenance' ? 'maintenance' : 'vacant');

    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        occupied_beds: occupiedBeds,
        tenant_id: primaryTenantId,
        status: nextStatus,
      })
      .eq('id', room.id)
      .eq('property_id', propertyId);

    if (updateError) {
      throw updateError;
    }
  }));
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

  if (!row && (profile.role === 'owner' || isScopedOwnerRole(profile.role) || isPlatformAdminRole(profile.role))) {
    let fallbackQuery = supabase
      .from('tenants')
      .select('*')
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (!isPlatformAdminRole(profile.role)) {
      fallbackQuery = fallbackQuery.eq('owner_id', profile.ownerScopeId ?? profile.id);
    }

    const { data: fallbackRows, error: fallbackError } = await fallbackQuery.returns<TenantRow[]>();
    if (fallbackError) {
      throw fallbackError;
    }

    row = fallbackRows?.[0] ?? null;
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
    addressLine1: row.address_line1 ?? row.address,
    addressLine2: row.address_line2 ?? undefined,
    locality: row.locality ?? row.city,
    landmark: row.landmark ?? undefined,
    formattedAddress: row.formatted_address ?? row.address,
    latitude: row.latitude,
    longitude: row.longitude,
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

function mapTeamScope(row: OwnerUserPropertyScopeRow): TeamScopeRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    userId: row.user_id,
    propertyId: row.property_id,
    canManageProperties: row.can_manage_properties,
    canManageTenants: row.can_manage_tenants,
    canManagePayments: row.can_manage_payments,
    canManageMaintenance: row.can_manage_maintenance,
    canManageAnnouncements: row.can_manage_announcements,
    createdAt: row.created_at,
  };
}

function mapOwnerSubscription(row: OwnerSubscriptionRow): OwnerSubscriptionRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    planCode: row.plan_code,
    status: row.status,
    billingCycle: row.billing_cycle,
    amount: toNumber(row.amount),
    currency: row.currency,
    seats: row.seats,
    startedAt: row.started_at,
    trialEndsAt: row.trial_ends_at ?? '',
    renewsAt: row.renews_at ?? '',
    lastPaymentAt: row.last_payment_at ?? '',
    updatedAt: row.updated_at,
  };
}

function mapSupportComment(row: SupportTicketCommentRow): SupportTicketCommentRecord {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    message: row.message,
    internalNote: row.internal_note,
    createdAt: row.created_at,
  };
}

function mapSupportTicket(row: SupportTicketRow, comments: SupportTicketCommentRow[]): SupportTicketRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    propertyId: row.property_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    subject: row.subject,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    visibility: row.visibility,
    resolvedAt: row.resolved_at ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments: comments
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(mapSupportComment),
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
      template: 'Your complaint status has been updated. We will keep you posted until it is resolved.',
      notifyOnCreate: true,
      notifyOnProgress: true,
      notifyOnResolve: true,
    },
  },
  notifications: {
    paymentNotifications: true,
    maintenanceAlerts: true,
    tenantUpdates: true,
    emailNotifications: false,
  },
  security: {
    twoFactorAuthentication: false,
  },
  paymentSettings: {
    upiId: 'yourname@upi',
    bankAccount: 'Account number',
    latePaymentFee: 100,
  },
  additionalSettings: {
    language: 'English',
    timezone: 'IST (UTC+5:30)',
    currency: 'INR (Rs)',
  },
};

function parseOwnerSettings(row: OwnerSettingsRow | null): OwnerSettingsRecord {
  if (!row) {
    return defaultSettings;
  }

  const pgRules = Array.isArray(row.pg_rules) ? row.pg_rules.filter((entry) => typeof entry === 'string') as string[] : [];

  const ws = (row.whatsapp_settings ?? {}) as Record<string, unknown>;
  const wsNotifications = (ws.notifications as Record<string, unknown> | undefined) ?? {};
  const wsSecurity = (ws.security as Record<string, unknown> | undefined) ?? {};
  const wsPayment = (ws.paymentSettings as Record<string, unknown> | undefined) ?? {};
  const wsAdditional = (ws.additionalSettings as Record<string, unknown> | undefined) ?? {};

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
        template: String((ws.complaintUpdate as Record<string, unknown> | undefined)?.template ?? defaultSettings.whatsappSettings.complaintUpdate.template),
        notifyOnCreate: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.notifyOnCreate ?? true),
        notifyOnProgress: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.notifyOnProgress ?? true),
        notifyOnResolve: Boolean((ws.complaintUpdate as Record<string, unknown> | undefined)?.notifyOnResolve ?? true),
      },
    },
    notifications: {
      paymentNotifications: Boolean(wsNotifications.paymentNotifications ?? defaultSettings.notifications.paymentNotifications),
      maintenanceAlerts: Boolean(wsNotifications.maintenanceAlerts ?? defaultSettings.notifications.maintenanceAlerts),
      tenantUpdates: Boolean(wsNotifications.tenantUpdates ?? defaultSettings.notifications.tenantUpdates),
      emailNotifications: Boolean(wsNotifications.emailNotifications ?? defaultSettings.notifications.emailNotifications),
    },
    security: {
      twoFactorAuthentication: Boolean(wsSecurity.twoFactorAuthentication ?? defaultSettings.security.twoFactorAuthentication),
    },
    paymentSettings: {
      upiId: String(wsPayment.upiId ?? defaultSettings.paymentSettings.upiId),
      bankAccount: String(wsPayment.bankAccount ?? defaultSettings.paymentSettings.bankAccount),
      latePaymentFee: Number(wsPayment.latePaymentFee ?? defaultSettings.paymentSettings.latePaymentFee),
    },
    additionalSettings: {
      language: String(wsAdditional.language ?? defaultSettings.additionalSettings.language),
      timezone: String(wsAdditional.timezone ?? defaultSettings.additionalSettings.timezone),
      currency: String(wsAdditional.currency ?? defaultSettings.additionalSettings.currency),
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
    const message = String(error.message ?? '').toLowerCase();
    if (message.includes('bucket') || message.includes('policy') || message.includes('permission') || message.includes('not found')) {
      throw new Error('File upload failed. Configure Supabase storage bucket tenant-files and storage policies, then try again.');
    }
    throw error;
  }

  const { data } = supabase.storage.from(TENANT_FILES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const supabaseAuthDataApi = {
  async getProfileById(userId: string): Promise<AppUser | null> {
    let { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,owner_scope_id,pg_name,city')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error && isMissingColumnError(error, ['owner_scope_id'])) {
      const legacy = await supabase
        .from('profiles')
        .select('id,email,full_name,phone,role,pg_name,city')
        .eq('id', userId)
        .maybeSingle<Omit<ProfileRow, 'owner_scope_id'>>();

      error = legacy.error;
      data = legacy.data
        ? {
          ...legacy.data,
          owner_scope_id: null,
        }
        : null;
    }

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
      ownerScopeId: data.owner_scope_id,
      pgName: data.pg_name ?? '',
      city: data.city ?? '',
    };
  },

  async ensureOwnerProfile(payload: {
    userId: string;
    email: string;
    name: string;
    phone: string;
    role?: UserRole;
    pgName: string;
    city: string;
    ownerScopeId?: string | null;
  }): Promise<void> {
    const profileRole = payload.role ?? 'owner';
    const ownerScopeId = profileRole === 'owner'
      ? payload.userId
      : (payload.ownerScopeId ?? null);

    let { error } = await supabase
      .from('profiles')
      .upsert({
        id: payload.userId,
        email: payload.email,
        full_name: payload.name,
        phone: payload.phone,
        role: profileRole,
        owner_scope_id: ownerScopeId,
        pg_name: payload.pgName,
        city: payload.city,
      }, { onConflict: 'id' });

    if (error && isMissingColumnError(error, ['owner_scope_id'])) {
      const legacy = await supabase
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

      error = legacy.error;
    }

    if (error) {
      throw error;
    }

    if (profileRole !== 'owner') {
      return;
    }

    const [{ error: settingsError }, { error: subscriptionError }] = await Promise.all([
      supabase
        .from('owner_settings')
        .upsert({
          owner_id: payload.userId,
        }, { onConflict: 'owner_id' }),
      supabase
        .from('owner_subscriptions')
        .upsert({
          owner_id: payload.userId,
          plan_code: 'starter',
          status: 'trialing',
          billing_cycle: 'monthly',
          amount: 0,
          currency: 'INR',
          seats: 1,
          trial_ends_at: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(),
          renews_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
        }, { onConflict: 'owner_id' }),
    ]);

    if (settingsError) {
      throw settingsError;
    }

    if (subscriptionError && !isMissingRelationError(subscriptionError, 'owner_subscriptions')) {
      throw subscriptionError;
    }
  },

  async updateCurrentProfile(input: ProfileUpdateInput): Promise<AppUser> {
    const context = await getCurrentUserContext();
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.full_name = input.name;
    if (input.phone !== undefined) payload.phone = input.phone;
    if (input.pgName !== undefined) payload.pg_name = input.pgName;
    if (input.city !== undefined) payload.city = input.city;

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', context.userId);

    if (error) {
      throw error;
    }

    const refreshed = await this.getProfileById(context.userId);
    if (!refreshed) {
      throw new Error('Updated profile could not be loaded.');
    }

    emitOwnerDataUpdated();
    return refreshed;
  },
};

export const supabasePropertyApi = {
  async list(): Promise<Property[]> {
    const context = await getCurrentUserContext();

    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && scopedPropertyIds.length === 0) {
      return [];
    }

    if (scopedPropertyIds) {
      query = query.in('id', scopedPropertyIds);
    }

    const { data: propertyRows, error } = await query.returns<PropertyRow[]>();

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

    const basePayload = {
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
    };

    const extendedPayload = {
      ...basePayload,
      address_line1: input.addressLine1 ?? input.address,
      address_line2: input.addressLine2 ?? null,
      locality: input.locality ?? input.city,
      landmark: input.landmark ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      formatted_address: input.formattedAddress ?? input.address,
    };

    let createdRow: PropertyRow | null = null;

    const { data, error } = await supabase
      .from('properties')
      .insert(extendedPayload)
      .select('*')
      .single<PropertyRow>();

    if (!error && data) {
      createdRow = data;
    }

    if (error && isMissingColumnError(error, ['address_line1', 'formatted_address', 'latitude', 'longitude', 'locality', 'landmark'])) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('properties')
        .insert(basePayload)
        .select('*')
        .single<PropertyRow>();

      if (fallbackError) {
        throw fallbackError;
      }

      createdRow = fallbackData;
    }

    if (!createdRow) {
      if (error) {
        throw error;
      }
      throw new Error('Property could not be created.');
    }

    return mapProperty(createdRow, []);
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

    const extendedPayload: Record<string, unknown> = { ...payload };
    if (input.addressLine1 !== undefined) extendedPayload.address_line1 = input.addressLine1;
    if (input.addressLine2 !== undefined) extendedPayload.address_line2 = input.addressLine2;
    if (input.locality !== undefined) extendedPayload.locality = input.locality;
    if (input.landmark !== undefined) extendedPayload.landmark = input.landmark;
    if (input.latitude !== undefined) extendedPayload.latitude = input.latitude;
    if (input.longitude !== undefined) extendedPayload.longitude = input.longitude;
    if (input.formattedAddress !== undefined) extendedPayload.formatted_address = input.formattedAddress;

    let updatedRow: PropertyRow | null = null;

    const { data, error } = await supabase
      .from('properties')
      .update(extendedPayload)
      .eq('id', id)
      .select('*')
      .single<PropertyRow>();

    if (!error && data) {
      updatedRow = data;
    }

    if (error && isMissingColumnError(error, ['address_line1', 'formatted_address', 'latitude', 'longitude', 'locality', 'landmark'])) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single<PropertyRow>();

      if (fallbackError) {
        throw fallbackError;
      }

      updatedRow = fallbackData;
    }

    if (!updatedRow) {
      if (error) {
        throw error;
      }
      throw new Error('Property could not be updated.');
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

    return mapProperty(updatedRow, (roomRows ?? []).map(mapRoom));
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
    const context = await getCurrentUserContext();

    let query = supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && scopedPropertyIds.length === 0) {
      return [];
    }

    if (scopedPropertyIds) {
      query = query.in('property_id', scopedPropertyIds);
    }

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
    const context = await getCurrentUserContext();

    let query = supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId);

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const { data, error } = await query.maybeSingle<TenantRow>();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && !scopedPropertyIds.includes(data.property_id)) {
      return null;
    }

    return mapTenant(data);
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

    await syncRoomOccupancyForProperty(ownerId, created.propertyId);
    emitOwnerDataUpdated();

    return created;
  },

  async updateTenant(tenantId: string, input: Partial<TenantCreateInput>): Promise<TenantRecord> {
    const ownerId = await getOwnerId();

    const { data: existingTenant, error: existingTenantError } = await supabase
      .from('tenants')
      .select('property_id')
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string }>();

    if (existingTenantError) {
      throw existingTenantError;
    }

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

    const filePayload: Record<string, unknown> = {};
    if (input.photo) {
      try {
        filePayload.photo_url = await uploadTenantFile(ownerId, input.name ?? data.name ?? 'tenant', input.photo, 'photo');
      } catch (uploadError) {
        console.warn('Tenant photo upload failed during update:', uploadError);
      }
    }
    if (input.idDocument) {
      try {
        filePayload.id_document_url = await uploadTenantFile(ownerId, input.name ?? data.name ?? 'tenant', input.idDocument, 'document');
      } catch (uploadError) {
        console.warn('Tenant ID document upload failed during update:', uploadError);
      }
    }

    let tenantRow = data;
    if (Object.keys(filePayload).length > 0) {
      const { data: fileUpdatedTenant, error: fileUpdateError } = await supabase
        .from('tenants')
        .update(filePayload)
        .eq('id', tenantId)
        .eq('owner_id', ownerId)
        .select('*')
        .single<TenantRow>();

      if (!fileUpdateError && fileUpdatedTenant) {
        tenantRow = fileUpdatedTenant;
      }
    }

    const updatedTenant = mapTenant(tenantRow);

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
        .returns<Array<{ id: string; extra_charges: number | string | null }>>();

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

    const propertyIdsToSync = new Set<string>();
    if (existingTenant?.property_id) {
      propertyIdsToSync.add(existingTenant.property_id);
    }
    propertyIdsToSync.add(updatedTenant.propertyId);

    await Promise.all(Array.from(propertyIdsToSync).map((propertyId) => syncRoomOccupancyForProperty(ownerId, propertyId)));
    emitOwnerDataUpdated();

    return updatedTenant;
  },

  async deleteTenant(tenantId: string): Promise<void> {
    const ownerId = await getOwnerId();

    const { data: existingTenant, error: existingTenantError } = await supabase
      .from('tenants')
      .select('property_id')
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string }>();

    if (existingTenantError) {
      throw existingTenantError;
    }

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId)
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }

    if (existingTenant?.property_id) {
      await syncRoomOccupancyForProperty(ownerId, existingTenant.property_id);
    }
    emitOwnerDataUpdated();
  },

  async listPayments(propertyId: string | 'all' = 'all'): Promise<PaymentRecord[]> {
    const context = await getCurrentUserContext();

    let query = supabase
      .from('payments')
      .select('*')
      .order('due_date', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && scopedPropertyIds.length === 0) {
      return [];
    }

    if (scopedPropertyIds) {
      query = query.in('property_id', scopedPropertyIds);
    }

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
    const context = await getCurrentUserContext();

    let query = supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && scopedPropertyIds.length === 0) {
      return [];
    }

    if (scopedPropertyIds) {
      query = query.in('property_id', scopedPropertyIds);
    }

    const { data, error } = await query.returns<PaymentRow[]>();

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

    emitOwnerDataUpdated();

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

    emitOwnerDataUpdated();

    return mapPayment(data);
  },

  async listMaintenanceTickets(propertyId: string | 'all' = 'all'): Promise<MaintenanceTicketRecord[]> {
    const context = await getCurrentUserContext();

    let query = supabase
      .from('maintenance_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && scopedPropertyIds.length === 0) {
      return [];
    }

    if (scopedPropertyIds) {
      query = query.in('property_id', scopedPropertyIds);
    }

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
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

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

    let tickets = Array.from(dedupedTickets.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds && scopedPropertyIds.length > 0) {
      tickets = tickets.filter((ticket) => scopedPropertyIds.includes(ticket.property_id));
    }

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
    const context = await getCurrentUserContext();

    let query = supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    if (propertyId !== 'all') {
      query = query.or(`property_id.eq.${propertyId},property_id.is.null`);
    }

    const { data, error } = await query.returns<AnnouncementRow[]>();

    if (error) {
      throw error;
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);
    const rows = scopedPropertyIds
      ? (data ?? []).filter((row) => row.property_id === null || scopedPropertyIds.includes(row.property_id))
      : (data ?? []);

    return rows.map(mapAnnouncement);
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

  async getOwnerSubscription(): Promise<OwnerSubscriptionRecord> {
    const ownerId = await getOwnerId();

    const defaultSubscription: OwnerSubscriptionRecord = {
      id: `local-${ownerId}`,
      ownerId,
      planCode: 'starter',
      status: 'trialing',
      billingCycle: 'monthly',
      amount: 0,
      currency: 'INR',
      seats: 1,
      startedAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(),
      renewsAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      lastPaymentAt: '',
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('owner_subscriptions')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle<OwnerSubscriptionRow>();

    if (error) {
      if (isMissingRelationError(error, 'owner_subscriptions')) {
        return defaultSubscription;
      }
      throw error;
    }

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('owner_subscriptions')
        .insert({
          owner_id: ownerId,
          plan_code: defaultSubscription.planCode,
          status: defaultSubscription.status,
          billing_cycle: defaultSubscription.billingCycle,
          amount: defaultSubscription.amount,
          currency: defaultSubscription.currency,
          seats: defaultSubscription.seats,
          trial_ends_at: defaultSubscription.trialEndsAt,
          renews_at: defaultSubscription.renewsAt,
        })
        .select('*')
        .single<OwnerSubscriptionRow>();

      if (insertError) {
        if (isMissingRelationError(insertError, 'owner_subscriptions')) {
          return defaultSubscription;
        }
        throw insertError;
      }

      return mapOwnerSubscription(inserted);
    }

    return mapOwnerSubscription(data);
  },

  async updateOwnerSubscription(input: {
    planCode?: string;
    status?: OwnerSubscriptionRecord['status'];
    billingCycle?: OwnerSubscriptionRecord['billingCycle'];
    amount?: number;
    currency?: string;
    seats?: number;
    renewsAt?: string;
  }): Promise<OwnerSubscriptionRecord> {
    const ownerId = await getOwnerId();

    const payload: Record<string, unknown> = {};
    if (input.planCode !== undefined) payload.plan_code = input.planCode;
    if (input.status !== undefined) payload.status = input.status;
    if (input.billingCycle !== undefined) payload.billing_cycle = input.billingCycle;
    if (input.amount !== undefined) payload.amount = input.amount;
    if (input.currency !== undefined) payload.currency = input.currency;
    if (input.seats !== undefined) payload.seats = input.seats;
    if (input.renewsAt !== undefined) payload.renews_at = input.renewsAt;

    const { data, error } = await supabase
      .from('owner_subscriptions')
      .update(payload)
      .eq('owner_id', ownerId)
      .select('*')
      .single<OwnerSubscriptionRow>();

    if (error) {
      if (isMissingRelationError(error, 'owner_subscriptions')) {
        return this.getOwnerSubscription();
      }
      throw error;
    }

    return mapOwnerSubscription(data);
  },

  async listSupportTickets(propertyId: string | 'all' = 'all'): Promise<SupportTicketRecord[]> {
    const context = await getCurrentUserContext();
    const scopedPropertyIds = await listScopedPropertyIds(context);

    if (propertyId !== 'all' && scopedPropertyIds && !scopedPropertyIds.includes(propertyId)) {
      return [];
    }

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    if (propertyId !== 'all') {
      query = query.eq('property_id', propertyId);
    }

    const { data: ticketRows, error } = await query.returns<SupportTicketRow[]>();
    if (error) {
      if (isMissingRelationError(error, 'support_tickets')) {
        return [];
      }
      throw error;
    }

    const tickets = scopedPropertyIds
      ? (ticketRows ?? []).filter((ticket) => ticket.property_id === null || scopedPropertyIds.includes(ticket.property_id))
      : (ticketRows ?? []);
    if (tickets.length === 0) {
      return [];
    }

    const ids = tickets.map((ticket) => ticket.id);
    const { data: comments, error: commentError } = await supabase
      .from('support_ticket_comments')
      .select('*')
      .in('ticket_id', ids)
      .order('created_at', { ascending: true })
      .returns<SupportTicketCommentRow[]>();

    if (commentError) {
      if (isMissingRelationError(commentError, 'support_ticket_comments')) {
        return tickets.map((ticket) => mapSupportTicket(ticket, []));
      }
      throw commentError;
    }

    const commentMap = new Map<string, SupportTicketCommentRow[]>();
    (comments ?? []).forEach((comment) => {
      const list = commentMap.get(comment.ticket_id) ?? [];
      list.push(comment);
      commentMap.set(comment.ticket_id, list);
    });

    return tickets.map((ticket) => mapSupportTicket(ticket, commentMap.get(ticket.id) ?? []));
  },

  async createSupportTicket(input: {
    subject: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    propertyId?: string | null;
    visibility?: 'owner' | 'property' | 'platform';
  }): Promise<SupportTicketRecord> {
    const context = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        owner_id: context.ownerId,
        property_id: input.propertyId ?? null,
        created_by: context.userId,
        subject: input.subject,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: 'open',
        visibility: input.visibility ?? (input.propertyId ? 'property' : 'owner'),
      })
      .select('*')
      .single<SupportTicketRow>();

    if (error) {
      throw error;
    }

    return mapSupportTicket(data, []);
  },

  async updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus): Promise<SupportTicketRecord> {
    const resolvedAt = status === 'resolved' || status === 'closed'
      ? new Date().toISOString()
      : null;

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status,
        resolved_at: resolvedAt,
      })
      .eq('id', ticketId)
      .select('*')
      .single<SupportTicketRow>();

    if (error) {
      throw error;
    }

    const { data: comments, error: commentError } = await supabase
      .from('support_ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .returns<SupportTicketCommentRow[]>();

    if (commentError) {
      throw commentError;
    }

    return mapSupportTicket(data, comments ?? []);
  },

  async addSupportTicketComment(ticketId: string, message: string, internalNote = false): Promise<void> {
    const context = await getCurrentUserContext();

    const { error } = await supabase
      .from('support_ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: context.userId,
        message,
        internal_note: internalNote,
      });

    if (error) {
      throw error;
    }
  },

  async listTeamMembers(): Promise<TeamMemberRecord[]> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    let profilesQuery = supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,owner_scope_id')
      .eq('owner_scope_id', ownerId)
      .neq('id', ownerId)
      .order('full_name', { ascending: true });

    let { data: teamProfiles, error: profileError } = await profilesQuery.returns<ProfileRow[]>();

    if (profileError && isMissingColumnError(profileError, ['owner_scope_id'])) {
      const legacyResult = await supabase
        .from('profiles')
        .select('id,email,full_name,phone,role')
        .neq('id', ownerId)
        .order('full_name', { ascending: true })
        .returns<Array<Omit<ProfileRow, 'owner_scope_id'>>>();

      profileError = legacyResult.error;
      teamProfiles = (legacyResult.data ?? [])
        .filter((profile) => profile.role === 'owner_manager' || profile.role === 'staff')
        .map((profile) => ({ ...profile, owner_scope_id: ownerId }));
    }

    if (profileError) {
      throw profileError;
    }

    const members = teamProfiles ?? [];
    if (members.length === 0) {
      return [];
    }

    const memberIds = members.map((profile) => profile.id);
    const { data: scopeRows, error: scopeError } = await supabase
      .from('owner_user_property_scopes')
      .select('*')
      .eq('owner_id', ownerId)
      .in('user_id', memberIds)
      .returns<OwnerUserPropertyScopeRow[]>();

    if (scopeError) {
      if (isMissingRelationError(scopeError, 'owner_user_property_scopes')) {
        return members.map((profile) => ({
          id: profile.id,
          email: profile.email ?? '',
          name: profile.full_name ?? profile.email ?? 'Team Member',
          phone: profile.phone ?? '',
          role: profile.role,
          ownerScopeId: profile.owner_scope_id,
          scopes: [],
        }));
      }
      throw scopeError;
    }

    const scopeMap = new Map<string, TeamScopeRecord[]>();
    (scopeRows ?? []).forEach((row) => {
      const list = scopeMap.get(row.user_id) ?? [];
      list.push(mapTeamScope(row));
      scopeMap.set(row.user_id, list);
    });

    return members.map((profile) => ({
      id: profile.id,
      email: profile.email ?? '',
      name: profile.full_name ?? profile.email ?? 'Team Member',
      phone: profile.phone ?? '',
      role: profile.role,
      ownerScopeId: profile.owner_scope_id,
      scopes: scopeMap.get(profile.id) ?? [],
    }));
  },

  async upsertTeamMemberAccess(input: {
    email: string;
    role: 'owner_manager' | 'staff';
    scopes: Array<{
      propertyId: string;
      canManageProperties: boolean;
      canManageTenants: boolean;
      canManagePayments: boolean;
      canManageMaintenance: boolean;
      canManageAnnouncements: boolean;
    }>;
  }): Promise<void> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    if (context.role !== 'owner') {
      throw new Error('Only owner accounts can manage team access.');
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('profiles')
      .select('id,email')
      .ilike('email', normalizedEmail)
      .maybeSingle<{ id: string; email: string | null }>();

    if (targetProfileError) {
      throw targetProfileError;
    }

    if (!targetProfile?.id) {
      throw new Error('No existing user account found for this email. Ask the user to sign up first.');
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        role: input.role,
        owner_scope_id: ownerId,
      })
      .eq('id', targetProfile.id);

    if (profileUpdateError) {
      if (!isMissingColumnError(profileUpdateError, ['owner_scope_id'])) {
        throw profileUpdateError;
      }

      const { error: fallbackRoleError } = await supabase
        .from('profiles')
        .update({ role: input.role })
        .eq('id', targetProfile.id);

      if (fallbackRoleError) {
        throw fallbackRoleError;
      }
    }

    const { error: clearError } = await supabase
      .from('owner_user_property_scopes')
      .delete()
      .eq('owner_id', ownerId)
      .eq('user_id', targetProfile.id);

    if (clearError && !isMissingRelationError(clearError, 'owner_user_property_scopes')) {
      throw clearError;
    }

    if (input.scopes.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from('owner_user_property_scopes')
      .insert(
        input.scopes.map((scope) => ({
          owner_id: ownerId,
          user_id: targetProfile.id,
          property_id: scope.propertyId,
          can_manage_properties: scope.canManageProperties,
          can_manage_tenants: scope.canManageTenants,
          can_manage_payments: scope.canManagePayments,
          can_manage_maintenance: scope.canManageMaintenance,
          can_manage_announcements: scope.canManageAnnouncements,
        })),
      );

    if (insertError) {
      if (isMissingRelationError(insertError, 'owner_user_property_scopes')) {
        throw new Error('Team property scopes are unavailable until the latest migration is applied.');
      }
      throw insertError;
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

    const serializedSettings = {
      ...settings.whatsappSettings,
      notifications: settings.notifications,
      security: settings.security,
      paymentSettings: settings.paymentSettings,
      additionalSettings: settings.additionalSettings,
    };

    const { error } = await supabase
      .from('owner_settings')
      .update({
        pg_rules: settings.pgRules,
        whatsapp_settings: serializedSettings,
      })
      .eq('owner_id', ownerId);

    if (error) {
      throw error;
    }

    emitOwnerDataUpdated();

    return settings;
  },

  async exportOwnerData(): Promise<Record<string, unknown>> {
    const ownerId = await getOwnerId();
    const [profile, settings, properties, tenants, payments, maintenance, announcements, notifications, subscription, support, team] = await Promise.all([
      supabaseAuthDataApi.getProfileById(ownerId),
      this.getOwnerSettings(),
      supabasePropertyApi.list(),
      this.listTenants('all'),
      this.listPayments('all'),
      this.listMaintenanceTickets('all'),
      this.listAnnouncements('all'),
      supabaseNotificationApi.listForCurrentUser(),
      this.getOwnerSubscription(),
      this.listSupportTickets('all'),
      this.listTeamMembers(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      properties,
      tenants,
      payments,
      maintenance,
      announcements,
      notifications,
      subscription,
      support,
      team,
    };
  },

  async clearOwnerData(): Promise<void> {
    const ownerId = await getOwnerId();

    const [
      { data: paymentRows, error: paymentListError },
      { data: ticketRows, error: ticketListError },
      { data: propertyRows, error: propertyListError },
      { data: supportRows, error: supportListError },
    ] = await Promise.all([
      supabase.from('payments').select('id').eq('owner_id', ownerId).returns<Array<{ id: string }>>(),
      supabase.from('maintenance_tickets').select('id').eq('owner_id', ownerId).returns<Array<{ id: string }>>(),
      supabase.from('properties').select('id').eq('owner_id', ownerId).returns<Array<{ id: string }>>(),
      supabase.from('support_tickets').select('id').eq('owner_id', ownerId).returns<Array<{ id: string }>>(),
    ]);

    if (paymentListError) throw paymentListError;
    if (ticketListError) throw ticketListError;
    if (propertyListError) throw propertyListError;
    if (supportListError && !isMissingRelationError(supportListError, 'support_tickets')) throw supportListError;

    const paymentIds = (paymentRows ?? []).map((row) => row.id);
    const ticketIds = (ticketRows ?? []).map((row) => row.id);
    const propertyIds = (propertyRows ?? []).map((row) => row.id);
    const supportIds = (supportRows ?? []).map((row) => row.id);

    const { error: notificationsError } = await supabase.from('notifications').delete().eq('owner_id', ownerId);
    if (notificationsError) throw notificationsError;

    if (supportIds.length > 0) {
      const { error: supportCommentError } = await supabase
        .from('support_ticket_comments')
        .delete()
        .in('ticket_id', supportIds);

      if (supportCommentError && !isMissingRelationError(supportCommentError, 'support_ticket_comments')) {
        throw supportCommentError;
      }
    }

    const { error: supportTicketError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('owner_id', ownerId);

    if (supportTicketError && !isMissingRelationError(supportTicketError, 'support_tickets')) {
      throw supportTicketError;
    }

    const { error: teamScopesError } = await supabase
      .from('owner_user_property_scopes')
      .delete()
      .eq('owner_id', ownerId);

    if (teamScopesError && !isMissingRelationError(teamScopesError, 'owner_user_property_scopes')) {
      throw teamScopesError;
    }

    if (ticketIds.length > 0) {
      const { error: notesError } = await supabase.from('maintenance_notes').delete().in('ticket_id', ticketIds);
      if (notesError) throw notesError;
    }

    const { error: ticketsError } = await supabase.from('maintenance_tickets').delete().eq('owner_id', ownerId);
    if (ticketsError) throw ticketsError;

    if (paymentIds.length > 0) {
      const { error: chargesError } = await supabase.from('payment_charges').delete().in('payment_id', paymentIds);
      if (chargesError) throw chargesError;
    }

    const { error: paymentsError } = await supabase.from('payments').delete().eq('owner_id', ownerId);
    if (paymentsError) throw paymentsError;

    const { error: tenantsError } = await supabase.from('tenants').delete().eq('owner_id', ownerId);
    if (tenantsError) throw tenantsError;

    if (propertyIds.length > 0) {
      const { error: roomsError } = await supabase.from('rooms').delete().in('property_id', propertyIds);
      if (roomsError) throw roomsError;
    }

    const { error: announcementsError } = await supabase.from('announcements').delete().eq('owner_id', ownerId);
    if (announcementsError) throw announcementsError;

    const { error: propertiesError } = await supabase.from('properties').delete().eq('owner_id', ownerId);
    if (propertiesError) throw propertiesError;

    const { error: subscriptionResetError } = await supabase
      .from('owner_subscriptions')
      .upsert({
        owner_id: ownerId,
        plan_code: 'starter',
        status: 'trialing',
        billing_cycle: 'monthly',
        amount: 0,
        currency: 'INR',
        seats: 1,
        trial_ends_at: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(),
        renews_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
        last_payment_at: null,
      }, { onConflict: 'owner_id' });

    if (subscriptionResetError && !isMissingRelationError(subscriptionResetError, 'owner_subscriptions')) {
      throw subscriptionResetError;
    }

    const { error: resetSettingsError } = await supabase
      .from('owner_settings')
      .update({
        pg_rules: defaultSettings.pgRules,
        whatsapp_settings: {
          ...defaultSettings.whatsappSettings,
          notifications: defaultSettings.notifications,
          security: defaultSettings.security,
          paymentSettings: defaultSettings.paymentSettings,
          additionalSettings: defaultSettings.additionalSettings,
        },
      })
      .eq('owner_id', ownerId);

    if (resetSettingsError) {
      throw resetSettingsError;
    }

    emitOwnerDataUpdated();
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
          const referenceDate = payment.paidDate ? new Date(payment.paidDate) : new Date(payment.dueDate);
          return referenceDate.getMonth() === currentMonth && referenceDate.getFullYear() === currentYear;
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
      totalOwners: number;
      totalProperties: number;
      totalTenants: number;
      activeSubscriptions: number;
      openSupportTickets: number;
      monthlyRevenue: number;
    };
    owners: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      city: string;
      pgName: string;
      propertyCount: number;
      tenantCount: number;
      subscriptionStatus: OwnerSubscriptionRecord['status'] | 'not_configured';
      planCode: string;
    }>;
    subscriptions: OwnerSubscriptionRecord[];
    support: SupportTicketRecord[];
    activity: Array<{
      id: string;
      label: string;
      detail: string;
      createdAt: string;
    }>;
  }> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) {
      throw new Error('Platform admin access is required.');
    }

    const profile = await getCurrentProfile();
    const [ownersResult, propertiesResult, tenantsResult, paymentsResult, subscriptionsResult, supportTicketsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,email,full_name,phone,role,owner_scope_id,pg_name,city,created_at')
        .eq('role', 'owner')
        .returns<ProfileRow[]>(),
      supabase.from('properties').select('*').returns<PropertyRow[]>(),
      supabase.from('tenants').select('*').returns<TenantRow[]>(),
      supabase.from('payments').select('*').returns<PaymentRow[]>(),
      supabase.from('owner_subscriptions').select('*').returns<OwnerSubscriptionRow[]>(),
      supabase.from('support_tickets').select('*').returns<SupportTicketRow[]>(),
    ]);

    if (ownersResult.error) {
      throw ownersResult.error;
    }

    if (propertiesResult.error) {
      throw propertiesResult.error;
    }
    if (tenantsResult.error) {
      throw tenantsResult.error;
    }
    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    let subscriptionRows: OwnerSubscriptionRow[] = [];
    if (subscriptionsResult.error) {
      if (!isMissingRelationError(subscriptionsResult.error, 'owner_subscriptions')) {
        throw subscriptionsResult.error;
      }
    } else {
      subscriptionRows = subscriptionsResult.data ?? [];
    }

    let supportRows: SupportTicketRow[] = [];
    if (supportTicketsResult.error) {
      if (!isMissingRelationError(supportTicketsResult.error, 'support_tickets')) {
        throw supportTicketsResult.error;
      }
    } else {
      supportRows = supportTicketsResult.data ?? [];
    }

    let supportComments: SupportTicketCommentRow[] = [];
    if (supportRows.length > 0) {
      const ticketIds = supportRows.map((ticket) => ticket.id);
      const commentsResult = await supabase
        .from('support_ticket_comments')
        .select('*')
        .in('ticket_id', ticketIds)
        .returns<SupportTicketCommentRow[]>();

      if (commentsResult.error) {
        if (!isMissingRelationError(commentsResult.error, 'support_ticket_comments')) {
          throw commentsResult.error;
        }
      } else {
        supportComments = commentsResult.data ?? [];
      }
    }

    const owners = ownersResult.data ?? [];
    const properties = propertiesResult.data ?? [];
    const tenants = (tenantsResult.data ?? []).map(mapTenant);
    const payments = (paymentsResult.data ?? []).map(mapPayment);

    const subscriptionRecords = subscriptionRows.map(mapOwnerSubscription);
    const subscriptionsByOwner = new Map<string, OwnerSubscriptionRecord>();
    subscriptionRecords.forEach((subscription) => {
      subscriptionsByOwner.set(subscription.ownerId, subscription);
    });

    const propertyCountByOwner = new Map<string, number>();
    properties.forEach((property) => {
      propertyCountByOwner.set(property.owner_id, (propertyCountByOwner.get(property.owner_id) ?? 0) + 1);
    });

    const tenantCountByOwner = new Map<string, number>();
    tenants.forEach((tenant) => {
      tenantCountByOwner.set(tenant.ownerId, (tenantCountByOwner.get(tenant.ownerId) ?? 0) + 1);
    });

    const supportCommentMap = new Map<string, SupportTicketCommentRow[]>();
    supportComments.forEach((comment) => {
      const list = supportCommentMap.get(comment.ticket_id) ?? [];
      list.push(comment);
      supportCommentMap.set(comment.ticket_id, list);
    });

    const support = supportRows
      .map((ticket) => mapSupportTicket(ticket, supportCommentMap.get(ticket.id) ?? []))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthlyRevenue = payments
      .filter((payment) => payment.status === 'paid')
      .filter((payment) => {
        const referenceDate = payment.paidDate ? new Date(payment.paidDate) : new Date(payment.dueDate);
        return referenceDate.getMonth() === month && referenceDate.getFullYear() === year;
      })
      .reduce((sum, payment) => sum + payment.totalAmount, 0);

    const ownerCards = owners.map((owner) => {
      const subscription = subscriptionsByOwner.get(owner.id);
      const subscriptionStatus: OwnerSubscriptionRecord['status'] | 'not_configured' = subscription?.status ?? 'not_configured';
      return {
        id: owner.id,
        name: owner.full_name ?? owner.email ?? 'Owner',
        email: owner.email ?? '',
        phone: owner.phone ?? '',
        city: owner.city ?? '',
        pgName: owner.pg_name ?? '',
        propertyCount: propertyCountByOwner.get(owner.id) ?? 0,
        tenantCount: tenantCountByOwner.get(owner.id) ?? 0,
        subscriptionStatus,
        planCode: subscription?.planCode ?? 'starter',
      };
    });

    const activity = [
      ...owners.map((owner) => ({
        id: `owner-${owner.id}`,
        label: 'Owner Account',
        detail: `${owner.full_name ?? owner.email ?? 'Owner'} joined the platform`,
        createdAt: owner.created_at ?? new Date().toISOString(),
      })),
      ...support.map((ticket) => ({
        id: `support-${ticket.id}`,
        label: 'Support Ticket',
        detail: `${ticket.subject} (${ticket.status})`,
        createdAt: ticket.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);

    return {
      profile,
      stats: {
        totalOwners: owners.length,
        totalProperties: properties.length,
        totalTenants: tenants.length,
        activeSubscriptions: subscriptionRecords.filter((subscription) => subscription.status === 'active' || subscription.status === 'trialing').length,
        openSupportTickets: support.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length,
        monthlyRevenue,
      },
      owners: ownerCards,
      subscriptions: subscriptionRecords,
      support,
      activity,
    };
  },

  async updateOwnerSubscription(ownerId: string, input: {
    planCode?: string;
    status?: OwnerSubscriptionRecord['status'];
    billingCycle?: OwnerSubscriptionRecord['billingCycle'];
    amount?: number;
    currency?: string;
    seats?: number;
    renewsAt?: string;
  }): Promise<OwnerSubscriptionRecord> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) {
      throw new Error('Platform admin access is required.');
    }

    const payload: Record<string, unknown> = {};
    if (input.planCode !== undefined) payload.plan_code = input.planCode;
    if (input.status !== undefined) payload.status = input.status;
    if (input.billingCycle !== undefined) payload.billing_cycle = input.billingCycle;
    if (input.amount !== undefined) payload.amount = input.amount;
    if (input.currency !== undefined) payload.currency = input.currency;
    if (input.seats !== undefined) payload.seats = input.seats;
    if (input.renewsAt !== undefined) payload.renews_at = input.renewsAt;

    const { data, error } = await supabase
      .from('owner_subscriptions')
      .update(payload)
      .eq('owner_id', ownerId)
      .select('*')
      .single<OwnerSubscriptionRow>();

    if (error) {
      throw error;
    }

    return mapOwnerSubscription(data);
  },

  async updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus, assignedTo?: string | null): Promise<SupportTicketRecord> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) {
      throw new Error('Platform admin access is required.');
    }

    const payload: Record<string, unknown> = {
      status,
      resolved_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null,
    };

    if (assignedTo !== undefined) {
      payload.assigned_to = assignedTo;
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(payload)
      .eq('id', ticketId)
      .select('*')
      .single<SupportTicketRow>();

    if (error) {
      throw error;
    }

    const { data: comments, error: commentError } = await supabase
      .from('support_ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .returns<SupportTicketCommentRow[]>();

    if (commentError) {
      throw commentError;
    }

    return mapSupportTicket(data, comments ?? []);
  },

  async getAdminOwnerDetailedView(ownerId: string) {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) {
      throw new Error('Platform admin access is required.');
    }

    // Fetch Properties
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (propsError) throw propsError;

    // Fetch Tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (tenantsError) throw tenantsError;

    // Fetch Subscription State
    const { data: subscription, error: subError } = await supabase
      .from('owner_subscriptions')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    // Do not throw on subError because it might legitimately be missing

    return {
      properties: properties ?? [],
      tenants: tenants ?? [],
      subscription: subscription || null,
    };
  },

  async deleteOwnerProfile(ownerId: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    // RLS and cascades handles the heavy lifting, deleting the profile natively purges properties/tenants via foreign keys.
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', ownerId);

    if (error) throw error;
  },
};
