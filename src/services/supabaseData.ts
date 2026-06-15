import { supabase, supabaseUrl } from '../lib/supabase';
import type { Property, Room } from '../contexts/PropertyContext';
import { isPlatformAdminRole, isScopedOwnerRole } from '../utils/roles';
import { isValidStoredPhoneNumber as isValidStoredPhoneFromUtils, parseStoredPhone } from '../utils/phone';
import { domainEvents } from './eventBus';
import { generateSettlementReceiptHtml } from './depositSettlementService';
import type { SettlementDeductionItem } from './depositSettlementService';

export type UserRole = 'owner' | 'owner_manager' | 'staff' | 'tenant' | 'platform_admin' | 'admin' | 'super_admin';
export type DisplayRole = 'viewer' | 'editor' | 'manager';
export type TenantStatus =
  | 'pending_onboarding'
  | 'active'
  | 'payment_overdue'
  | 'notice_submitted'
  | 'vacating'
  | 'inactive'
  | 'archived';

export type OccupancyMode = 'BED_BASED' | 'ROOM_BASED';

/** Statuses where tenant still physically occupies a room/bed */
export const ACTIVE_IN_ROOM_STATUSES: TenantStatus[] = [
  'active',
  'payment_overdue',
  'notice_submitted',
  'vacating',
];

export const isTenantCurrentlyInRoom = (status: TenantStatus): boolean =>
  ACTIVE_IN_ROOM_STATUSES.includes(status);

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  pending_onboarding: 'Pending Onboarding',
  active: 'Active',
  payment_overdue: 'Payment Overdue',
  notice_submitted: 'Notice Submitted',
  vacating: 'Vacating',
  inactive: 'Vacated',
  archived: 'Archived',
};

export const TENANT_STATUS_COLORS: Record<TenantStatus, string> = {
  pending_onboarding: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  payment_overdue: 'bg-red-100 text-red-700',
  notice_submitted: 'bg-amber-100 text-amber-700',
  vacating: 'bg-orange-100 text-orange-700',
  inactive: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-500',
};

export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type MaintenanceStatus = 'open' | 'assigned' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
export type MaintenancePriority = 'low' | 'medium' | 'high';
export type MaintenanceSource = 'portal' | 'manual' | 'admin_created' | 'whatsapp' | 'staff_created';
export type AnnouncementCategory = 'maintenance' | 'payment' | 'rules' | 'general';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketCategory = 'billing' | 'technical' | 'operations' | 'tenant' | 'other';

const TENANT_FILES_BUCKET = 'tenant-files';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PINCODE_PATTERN = /^\d{6}$/;
const STARTER_MARKER = '[starter-reference-v2]';
const STARTER_EMAIL_PREFIX = 'starter.';
const SYNTHETIC_EMAIL_MARKERS = ['.demo@pgmanager.app', '@demo.app', '@noemail.placeholder'] as const;
const NO_EMAIL_MARKER = '@noemail.placeholder';

/** Returns true if the stored email is a system-generated placeholder (tenant had no email). */
export function isNoEmailPlaceholder(email: string | null | undefined): boolean {
  return Boolean(email && email.includes(NO_EMAIL_MARKER));
}

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
  photo_url: string | null;
  is_suspended?: boolean;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  verified_at?: string | null;
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
  occupancy_mode: 'BED_BASED' | 'ROOM_BASED' | null;
  created_at: string;
}

interface RoomRow {
  id: string;
  property_id: string;
  number: string;
  floor: number;
  type: 'single' | 'double' | 'triple' | 'custom';
  beds: number;
  rent: number | string;
  status: 'occupied' | 'vacant' | 'maintenance';
  occupied_beds: number | null;
  room_code: string | null;
}

interface FloorRow {
  id: string;
  property_id: string;
  floor_number: number;
  label: string;
  created_at: string;
}

interface BedRow {
  id: string;
  room_id: string;
  property_id: string;
  bed_code: string;
  position: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenant_id: string | null;
  created_at: string;
}

interface TenantDocumentRow {
  id: string;
  tenant_id: string;
  owner_id: string;
  doc_type: string;
  label: string;
  file_url: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

interface AgreementRow {
  id: string;
  tenant_id: string;
  property_id: string;
  owner_id: string;
  status: AgreementStatus;
  agreement_type: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number | string;
  security_deposit: number | string;
  html_content: string | null;
  pdf_url: string | null;
  signed_at: string | null;
  sent_at: string | null;
  owner_signature_name?: string | null;
  owner_signed_at?: string | null;
  owner_signature_image?: string | null;
  tenant_signature_name?: string | null;
  tenant_signed_at?: string | null;
  tenant_signature_image?: string | null;
  is_locked?: boolean;
  version?: number;
  template_version?: number | null;
  ip_address?: string | null;
  device_metadata?: string | null;
  created_at: string;
  updated_at: string;
}

interface OwnerSignatureProfileRow {
  id: string;
  owner_id: string;
  is_active: boolean;
  signature_type: 'draw' | 'upload' | 'typed';
  signature_image: string | null;
  signature_text: string | null;
  created_at: string;
  updated_at: string;
}

interface AgreementTemplateRow {
  id: string;
  owner_id: string;
  version: number;
  is_active: boolean;
  house_rules: string | null;
  visitor_rules: string | null;
  late_fee_clause: string | null;
  notice_period_clause: string | null;
  refund_policy: string | null;
  security_deposit_terms: string | null;
  property_rules: string | null;
  miscellaneous_terms: string | null;
  created_at: string;
  updated_at: string;
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
  vacate_date?: string | null;
  vacate_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
  alternate_phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  guardian_relationship?: string | null;
  billing_cycle?: string;
  invitation_sent_at?: string | null;
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
  payment_mode?: string | null;
  reference_number?: string | null;
  payment_notes?: string | null;
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
  assigned_to?: string | null;
  updated_at?: string | null;
}

interface MaintenanceNoteRow {
  id: string;
  ticket_id: string;
  note: string;
  created_at: string;
}

interface MaintenanceThreadRow {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  actor_role: 'owner' | 'owner_manager' | 'staff' | 'tenant' | 'system';
  body: string;
  is_internal: boolean;
  status_from: string | null;
  status_to: string | null;
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
  property_id?: string | null;
  read: boolean;
  created_at: string;
}

interface OwnerUserPropertyScopeRow {
  id: string;
  owner_id: string;
  user_id: string;
  property_id: string;
  can_view?: boolean;
  can_manage_properties: boolean;
  can_manage_tenants: boolean;
  can_manage_payments: boolean;
  can_manage_maintenance: boolean;
  can_manage_announcements: boolean;
  display_role?: DisplayRole | null;
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
  photoUrl: string | null;
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
  vacateDate?: string;
  vacateReason?: string;
  createdAt: string;
  alternatePhone?: string;
  dob?: string;
  gender?: string;
  guardianRelationship?: string;
  billingCycle?: string;
  /** ISO timestamp of the most recent magic-link invitation email, or null if never sent. */
  invitationSentAt?: string | null;
}

export interface VacateRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  room: string;
  noticeDate: string;
  plannedVacateDate: string;
  reason: string;
  finalSettlementAmount: number;
  depositRefund: number;
  depositDeduction: number;
  deductionReason: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface VacateDeductionItem {
  id: string;
  category: string;
  description: string;
  amount: number;
}

export interface VacateWorkflowInput {
  tenantId: string;
  vacateDate: string;
  reason: string;
  depositDeduction: number;
  deductionReason: string;
  deductionItems?: VacateDeductionItem[];
  adjustPendingRentFromDeposit?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  ownerId: string;
  propertyId: string | null;
  event: string;
  detail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CSVTenantRow {
  name: string;
  phone: string;
  email: string;
  propertyName: string;
  floor: string;
  room: string;
  bed: string;
  monthlyRent: string;
  securityDeposit: string;
  rentDueDate: string;
  parentName: string;
  parentPhone: string;
  idType: string;
  idNumber: string;
  joinDate: string;
}

export interface CSVImportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string }>;
  createdTenants: TenantRecord[];
}

export interface TenantCreateInput {
  name: string;
  phone: string;
  email?: string;   // optional — phone is the primary identifier
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
  alternatePhone?: string;
  dob?: string;
  gender?: string;
  guardianRelationship?: string;
  billingCycle?: string;
}

export type AgreementStatus =
  | 'draft'
  | 'pending_owner_signature'
  | 'pending_tenant_signature'
  | 'executed'
  | 'sent'
  | 'signed'
  | 'expired'
  | 'archived'
  | 'cancelled';
export type TenantDocType = 'aadhaar_front' | 'aadhaar_back' | 'pan' | 'passport' | 'driving_license' | 'photo' | 'other';

export interface FloorRecord {
  id: string;
  propertyId: string;
  floorNumber: number;
  label: string;
  createdAt: string;
}

export interface BedRecord {
  id: string;
  roomId: string;
  propertyId: string;
  bedCode: string;
  position: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  tenantId: string | null;
  createdAt: string;
}

export interface BedCreateInput {
  roomId: string;
  propertyId: string;
  bedCode: string;
  position?: number;
}

export interface TenantDocument {
  id: string;
  tenantId: string;
  ownerId: string;
  docType: TenantDocType | string;
  label: string;
  fileUrl: string;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface TenantDocumentCreateInput {
  tenantId: string;
  docType: TenantDocType | string;
  label?: string;
  file: File;
}

export interface AgreementRecord {
  id: string;
  tenantId: string;
  propertyId: string;
  ownerId: string;
  status: AgreementStatus;
  agreementType: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  securityDeposit: number;
  htmlContent: string | null;
  pdfUrl: string | null;
  signedAt: string | null;
  sentAt: string | null;
  ownerSignatureName: string | null;
  ownerSignedAt: string | null;
  ownerSignatureImage: string | null;
  tenantSignatureName: string | null;
  tenantSignedAt: string | null;
  tenantSignatureImage: string | null;
  isLocked: boolean;
  version: number;
  templateVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementSignInput {
  agreementId: string;
  signatureName: string;
  role: 'owner' | 'tenant';
  signatureImage?: string;
  ipAddress?: string;
  deviceMetadata?: string;
}

export interface AgreementCreateInput {
  tenantId: string;
  propertyId: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  agreementType?: string;
  htmlContent?: string;
  templateVersion?: number;
  autoOwnerSignatureName?: string;
  autoOwnerSignatureImage?: string;
}

export interface OwnerSignatureProfile {
  id: string;
  ownerId: string;
  isActive: boolean;
  signatureType: 'draw' | 'upload' | 'typed';
  signatureImage: string | null;
  signatureText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementTemplate {
  id: string;
  ownerId: string;
  version: number;
  isActive: boolean;
  houseRules: string | null;
  visitorRules: string | null;
  lateFeeClause: string | null;
  noticePeriodClause: string | null;
  refundPolicy: string | null;
  securityDepositTerms: string | null;
  propertyRules: string | null;
  miscellaneousTerms: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementTemplateUpsertInput {
  houseRules?: string;
  visitorRules?: string;
  lateFeeClause?: string;
  noticePeriodClause?: string;
  refundPolicy?: string;
  securityDepositTerms?: string;
  propertyRules?: string;
  miscellaneousTerms?: string;
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
  paymentMode?: string;
  referenceNumber?: string;
  paymentNotes?: string;
  ownerId?: string;
}

export interface MaintenanceThreadEntry {
  id: string;
  ticketId: string;
  actorName: string;
  actorRole: 'owner' | 'staff' | 'system';
  message: string;
  isInternal: boolean;
  statusTransition?: { from: MaintenanceStatus; to: MaintenanceStatus };
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
  source: MaintenanceSource;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  date: string;
  phone: string;
  notes: string[];
  threads?: MaintenanceThreadEntry[];
  assignedTo?: string;
  updatedAt?: string;
  resolvedAt?: string;
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

export type NotificationType = 'payment' | 'maintenance' | 'tenant' | 'announcement' | 'occupancy' | 'system';

export interface NotificationRecord {
  id: string;
  ownerId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  propertyId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface WhatsAppQueueEntry {
  id: string;
  announcementId: string;
  propertyId: string | null;
  status: 'queued' | 'sending' | 'delivered' | 'failed';
  recipientCount: number;
  sentCount: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface TeamScopeRecord {
  id: string;
  ownerId: string;
  userId: string;
  propertyId: string;
  canView: boolean;
  canManageProperties: boolean;
  canManageTenants: boolean;
  canManagePayments: boolean;
  canManageMaintenance: boolean;
  canManageAnnouncements: boolean;
  displayRole: DisplayRole;
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

export interface TenantOwnerPaymentInfo {
  upiId: string;
  qrCodeUrl: string;
  pgRules: string[];
  ownerPhone: string;
  pgName: string;
}

export interface TenantPortalSnapshot {
  profile: AppUser;
  tenant: TenantRecord;
  property: Property | null;
  owner: AppUser | null;
  payments: PaymentRecord[];
  maintenance: MaintenanceTicketRecord[];
  announcements: AnnouncementRecord[];
  notifications: NotificationRecord[];
  ownerPaymentInfo: TenantOwnerPaymentInfo;
  vacateRequest: VacateRequest | null;
  documents: TenantDocument[];
  agreements: AgreementRecord[];
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
    customFooter: string;
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
    bankAccountName: string;
    ifscCode: string;
    qrCodeUrl: string;
    latePaymentFee: number;
    rentReminderEnabled: boolean;
    rentReminderDaysBefore: number;
  };
  additionalSettings: {
    language: string;
    timezone: string;
    currency: string;
  };
  integrations: {
    smsProvider: {
      provider: string;
      enabled: boolean;
      config: Record<string, string>;
    };
    paymentGateway: {
      gateway: string;
      enabled: boolean;
      config: Record<string, string>;
    };
  };
}

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface InviteRecord {
  id: string;
  email: string;
  ownerId: string;
  propertyId: string | null;
  role: string; // e.g., 'viewer' | 'editor' | 'manager'
  token: string;
  expiresAt: string;
  status: InviteStatus;
  createdAt: string;
  sentAt?: string | null;
  resendCount?: number;
}

export interface ProfileUpdateInput {
  name?: string;
  phone?: string;
  pgName?: string;
  city?: string;
  photoUrl?: string | null;
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
  const candidate = error as { message?: string; details?: string; hint?: string; code?: string } | null;
  const message = String(candidate?.message ?? '').trim();
  const details = String(candidate?.details ?? '').trim();
  const hint = String(candidate?.hint ?? '').trim();
  const code = String(candidate?.code ?? '').trim();

  const combined = [message, details, hint].filter(Boolean).join(' | ');
  if (combined) {
    return new Error(code ? `${combined} (code: ${code})` : combined);
  }
  return new Error('Unknown Supabase error');
}

function isStarterPropertyRow(row: Pick<PropertyRow, 'landmark'>): boolean {
  const landmark = String(row.landmark ?? '').toLowerCase();
  return landmark.includes(STARTER_MARKER.toLowerCase());
}

function isStarterTenantRow(row: Pick<TenantRow, 'email'>): boolean {
  const email = String(row.email ?? '').trim().toLowerCase();
  return email.startsWith(STARTER_EMAIL_PREFIX) || SYNTHETIC_EMAIL_MARKERS.some((marker) => email.includes(marker));
}

function isSyntheticTenantEmail(emailValue: string): boolean {
  const email = String(emailValue ?? '').trim().toLowerCase();
  if (!email) {
    return false;
  }
  return email.startsWith(STARTER_EMAIL_PREFIX) || SYNTHETIC_EMAIL_MARKERS.some((marker) => email.includes(marker));
}

async function filterSyntheticPayments(rows: PaymentRow[]): Promise<PaymentRow[]> {
  if (rows.length === 0) {
    return rows;
  }

  const tenantIds = Array.from(new Set(rows.map((row) => row.tenant_id).filter(Boolean)));
  if (tenantIds.length === 0) {
    return rows;
  }

  const { data: tenantRows, error } = await supabase
    .from('tenants')
    .select('id,email')
    .in('id', tenantIds)
    .returns<Array<{ id: string; email: string }>>();

  if (error) {
    throw error;
  }

  const syntheticTenantIds = new Set(
    (tenantRows ?? [])
      .filter((tenant) => isSyntheticTenantEmail(tenant.email))
      .map((tenant) => tenant.id),
  );

  if (syntheticTenantIds.size === 0) {
    return rows;
  }

  return rows.filter((row) => !syntheticTenantIds.has(row.tenant_id));
}

function isMissingColumnError(error: unknown, candidateColumns: string[]): boolean {
  const message = String((error as { message?: string } | null)?.message ?? '').toLowerCase();
  if (!message.includes('column')) {
    return false;
  }
  return candidateColumns.some((column) => message.includes(column.toLowerCase()));
}

function isMissingRelationError(error: unknown, relation: string): boolean {
  const candidate = error as { message?: string; code?: string } | null;
  const message = String(candidate?.message ?? '').toLowerCase();
  const code = String(candidate?.code ?? '');

  // New PostgREST: "Could not find the table 'public.X' in the schema cache" (PGRST205)
  if (code === 'PGRST205' && message.includes(relation.toLowerCase())) return true;

  // Old PostgreSQL: "relation 'X' does not exist" (42P01)
  return (message.includes('relation') || message.includes('table')) &&
    message.includes(relation.toLowerCase()) &&
    (message.includes('does not exist') || message.includes('schema cache') || message.includes('not found'));
}

function isValidEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

function isValidStoredPhoneNumber(value: string): boolean {
  return isValidStoredPhoneFromUtils(value);
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function toPropertyContactPhoneForDatabase(value: string): string {
  const parsed = parseStoredPhone(value);
  const localDigits = normalizePhoneDigits(parsed.localNumber);
  if (localDigits.length === 10) {
    return localDigits;
  }

  // Fallback for partially normalized historical values.
  const allDigits = normalizePhoneDigits(value);
  if (allDigits.length >= 10) {
    return allDigits.slice(-10);
  }

  return allDigits;
}

function toPhoneSearchVariants(value: string): string[] {
  const trimmed = value.trim();
  const digits = normalizePhoneDigits(trimmed);
  const variants = new Set<string>();

  if (trimmed) {
    variants.add(trimmed);
  }

  if (digits) {
    variants.add(digits);
    if (digits.length > 10) {
      variants.add(digits.slice(-10));
    }
    if (digits.length === 10) {
      variants.add(`+91 ${digits}`);
      variants.add(`+91${digits}`);
    }
  }

  return Array.from(variants);
}

function validatePropertyInput(input: Partial<Property>, requireAll: boolean): void {
  const name = String(input.name ?? '').trim();
  const address = String(input.address ?? '').trim();
  const city = String(input.city ?? '').trim();
  const state = String(input.state ?? '').trim();
  const pincode = String(input.pincode ?? '').trim();
  const contactName = String(input.contactName ?? '').trim();
  const contactPhone = String(input.contactPhone ?? '').trim();
  const contactPhoneDigits = toPropertyContactPhoneForDatabase(contactPhone);
  const contactEmail = String(input.contactEmail ?? '').trim();

  if (requireAll || input.name !== undefined) {
    if (!name || name.length < 2) {
      throw new Error('Property name must be at least 2 characters.');
    }
  }

  if (requireAll || input.address !== undefined) {
    if (!address || address.length < 5) {
      throw new Error('Property address must be at least 5 characters.');
    }
  }

  if (requireAll || input.city !== undefined) {
    if (!city || /\d/.test(city)) {
      throw new Error('City is required and cannot contain digits.');
    }
  }

  if (requireAll || input.state !== undefined) {
    if (!state || /\d/.test(state)) {
      throw new Error('State is required and cannot contain digits.');
    }
  }

  if (requireAll || input.pincode !== undefined) {
    if (!INDIAN_PINCODE_PATTERN.test(pincode)) {
      throw new Error('Pincode must be exactly 6 digits.');
    }
  }

  if (requireAll || input.floors !== undefined) {
    const floors = Number(input.floors ?? 0);
    if (!Number.isFinite(floors) || floors < 1 || floors > 100) {
      throw new Error('Number of floors must be between 1 and 100.');
    }
  }

  if (requireAll || input.contactName !== undefined) {
    if (!contactName || contactName.length < 2 || /\d/.test(contactName)) {
      throw new Error('Contact person name is required and cannot contain digits.');
    }
  }

  if (requireAll || input.contactPhone !== undefined) {
    if (!contactPhone) {
      throw new Error('Contact phone number is required.');
    }

    if (!isValidStoredPhoneNumber(contactPhone)) {
      throw new Error('Contact phone number must be a valid mobile value like +919876543210.');
    }

    if (contactPhoneDigits.length !== 10) {
      throw new Error('Property contact phone must resolve to exactly 10 digits for current Supabase schema.');
    }
  }

  if (requireAll || input.contactEmail !== undefined) {
    if (contactEmail && !isValidEmailAddress(contactEmail)) {
      throw new Error('Contact email must be a valid email address.');
    }
  }
}

function validateTenantInput(input: Partial<TenantCreateInput>, requireAll: boolean): void {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const phone = String(input.phone ?? '').trim();
  const parentName = String(input.parentName ?? '').trim();
  const parentPhone = String(input.parentPhone ?? '').trim();
  const idType = String(input.idType ?? '').trim();
  const idNumber = String(input.idNumber ?? '').trim();

  if (requireAll || input.name !== undefined) {
    if (!name || name.length < 2 || /\d/.test(name)) {
      throw new Error('Tenant name must be at least 2 characters and cannot contain digits.');
    }
  }

  // Email is optional — validate format only when a non-empty value is provided.
  if (email && !isValidEmailAddress(email)) {
    throw new Error('Tenant email must be a valid email address.');
  }

  if (requireAll || input.phone !== undefined) {
    if (!phone || !isValidStoredPhoneNumber(phone)) {
      throw new Error('Tenant phone must be a valid value like +919876543210.');
    }
  }

  if (requireAll || input.propertyId !== undefined) {
    if (!String(input.propertyId ?? '').trim()) {
      throw new Error('Property selection is required.');
    }
  }

  if (requireAll || input.floor !== undefined) {
    const floor = Number(input.floor ?? -1);
    if (!Number.isFinite(floor) || floor < 0) {
      throw new Error('Floor must be 0 or greater (0 = ground floor).');
    }
  }

  if (requireAll || input.room !== undefined) {
    if (!String(input.room ?? '').trim()) {
      throw new Error('Room is required.');
    }
  }

  // Bed is optional — required only when explicitly provided and empty
  if (!requireAll && input.bed !== undefined && input.bed !== null) {
    // allow empty string (room-based properties may not have a bed)
  }

  if (requireAll || input.monthlyRent !== undefined) {
    const monthlyRent = Number(input.monthlyRent ?? 0);
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      throw new Error('Monthly rent must be greater than zero.');
    }
  }

  if (requireAll || input.securityDeposit !== undefined) {
    const securityDeposit = Number(input.securityDeposit ?? 0);
    if (!Number.isFinite(securityDeposit) || securityDeposit < 0) {
      throw new Error('Security deposit cannot be negative.');
    }
  }

  if (requireAll || input.rentDueDate !== undefined) {
    const rentDueDate = Number(input.rentDueDate ?? 0);
    if (!Number.isFinite(rentDueDate) || rentDueDate < 1 || rentDueDate > 31) {
      throw new Error('Rent due date must be between 1 and 31.');
    }
  }

  if (requireAll || input.parentName !== undefined) {
    if (!parentName || /\d/.test(parentName)) {
      throw new Error('Parent/guardian name is required and cannot contain digits.');
    }
  }

  if (requireAll || input.parentPhone !== undefined) {
    if (!parentPhone || !isValidStoredPhoneNumber(parentPhone)) {
      throw new Error('Parent phone must be a valid value like +919876543210.');
    }
  }

  if (requireAll || input.idType !== undefined) {
    if (!idType) {
      throw new Error('ID type is required.');
    }
  }

  if (requireAll || input.idNumber !== undefined) {
    if (!idNumber || idNumber.length > 64) {
      throw new Error('ID number is required and cannot exceed 64 characters.');
    }
  }

  if (requireAll || input.joinDate !== undefined) {
    if (!String(input.joinDate ?? '').trim()) {
      throw new Error('Join date is required.');
    }
  }
}

function mapTenantSaveError(error: unknown): Error {
  const candidate = error as { message?: string; details?: string; code?: string } | null;
  const message = String(candidate?.message ?? '').toLowerCase();
  const details = String(candidate?.details ?? '').toLowerCase();
  const combined = `${message} ${details}`.trim();

  if (combined.includes('tenants_parent_phone_format') || combined.includes('parent_phone')) {
    return new Error('Parent phone format is invalid. Please enter digits only (for example +919876543210) without spaces.');
  }

  if (combined.includes('tenants_phone_format') || (combined.includes('phone') && combined.includes('constraint'))) {
    return new Error('Tenant phone format is invalid. Please enter digits only (for example +919876543210) without spaces.');
  }

  if (combined.includes('tenants_email_format')) {
    return new Error('Tenant email format is invalid. Enter a valid email address.');
  }

  if (combined.includes('row-level security') || combined.includes('rls')) {
    return new Error('Tenant save is blocked by Supabase RLS policy. Apply the latest database setup/migrations and verify owner scope policies.');
  }

  if (combined.includes('foreign key') && combined.includes('property_id')) {
    return new Error('Selected property is invalid or inaccessible for this account. Refresh properties and try again.');
  }

  if (combined.includes('duplicate key') && combined.includes('tenant')) {
    return new Error('A conflicting tenant record already exists. Check room/tenant details and try again.');
  }

  return normalizeError(error);
}

function mapPropertySaveError(error: unknown): Error {
  const candidate = error as { message?: string; details?: string; code?: string } | null;
  const message = String(candidate?.message ?? '').toLowerCase();
  const details = String(candidate?.details ?? '').toLowerCase();
  const combined = `${message} ${details}`.trim();

  if (combined.includes('row-level security') || combined.includes('rls')) {
    return new Error('Property save is blocked by Supabase RLS policy. Use an owner account for property create/update/delete, or update properties_owner_manage policy for scoped roles. Also confirm latest Supabase migrations are applied.');
  }

  if (combined.includes('duplicate key') && combined.includes('properties')) {
    return new Error('A property with similar details already exists. Update the existing property or change the name.');
  }

  if (combined.includes('properties_contact_email_format') || (combined.includes('contact_email') && combined.includes('constraint'))) {
    return new Error('Contact email format is invalid. Enter a valid email address or leave it blank.');
  }

  if (combined.includes('properties_contact_phone_format') || (combined.includes('contact_phone') && combined.includes('constraint'))) {
    return new Error('Property contact phone must be exactly 10 digits in this Supabase setup.');
  }

  return normalizeError(error);
}

async function shouldIncludeStarterRows(context: CurrentUserContext): Promise<boolean> {
  const profile = await supabaseAuthDataApi.getProfileById(context.userId);
  if (!profile) {
    return false;
  }
  return shouldBootstrapStarterData(profile.email);
}

async function assertPropertyDefinitionWriteAccess(): Promise<CurrentUserContext> {
  const context = await getCurrentUserContext();

  if (context.isPlatformAdmin) {
    return context;
  }

  if (context.role === 'owner') {
    return context;
  }

  if (context.role === 'owner_manager') {
    // This manager is creating their own PG — upgrade them to 'owner' so they
    // get their own data context. Existing manager scopes in
    // owner_user_property_scopes are preserved and will appear under
    // "Managing for Others" in their workspace.
    const { error: upgradeError } = await supabase
      .from('profiles')
      .update({ role: 'owner', owner_scope_id: null })
      .eq('id', context.userId);

    if (upgradeError) {
      throw new Error('Unable to upgrade your account to create properties. Please try again or contact support.');
    }

    // Refresh the JWT so subsequent getCurrentUserContext() reads pick up the
    // new role from the DB immediately (no page reload required).
    await supabase.auth.refreshSession().catch(() => {});

    // Signal the app shell that the user's role changed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-role-upgraded', { detail: { newRole: 'owner' } }));
    }

    return {
      ...context,
      role: 'owner' as UserRole,
      ownerId: context.userId,
      ownerScopeId: null,
    };
  }

  throw new Error('Property save is blocked by role policy. Only owner accounts can create/update/delete properties.');
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
    .select('id,role,owner_scope_id,is_suspended')
    .eq('id', userId)
    .maybeSingle<Pick<ProfileRow, 'id' | 'role' | 'owner_scope_id' | 'is_suspended'>>();

  if (profileError && isMissingColumnError(profileError, ['owner_scope_id', 'is_suspended'])) {
    const legacy = await supabase
      .from('profiles')
      .select('id,role')
      .eq('id', userId)
      .maybeSingle<Pick<ProfileRow, 'id' | 'role'>>();

    profileError = legacy.error;
    profile = legacy.data ? { ...legacy.data, owner_scope_id: null, is_suspended: false } : null;
  }

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error('Profile not found for authenticated user.');
  }

  let role = profile.role;
  let ownerScopeId = profile.owner_scope_id ?? null;
  let ownerId = role === 'owner'
    ? profile.id
    : (isScopedOwnerRole(role) ? (ownerScopeId ?? profile.id) : profile.id);

  // --- Admin Impersonation Support ---
  if (isPlatformAdminRole(role)) {
    try {
      if (typeof window !== 'undefined') {
        const impersonatedId = localStorage.getItem('admin_impersonate_id');
        if (impersonatedId) {
          ownerId = impersonatedId;
          role = 'owner' as any; // spoof the role for UI components
          ownerScopeId = null;
        }
      }
    } catch {}
  }

  // Suspension enforcement: block API access for suspended owners AND any manager/staff
  // scoped under a suspended owner — suspension must propagate through owner_scope_id,
  // not just the logged-in profile's own flag.
  let effectiveSuspended = profile.is_suspended ?? false;
  if (!effectiveSuspended && isScopedOwnerRole(role) && ownerScopeId && ownerScopeId !== profile.id) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', ownerScopeId)
      .maybeSingle<{ is_suspended?: boolean }>();
    effectiveSuspended = ownerProfile?.is_suspended ?? false;
  }

  if (effectiveSuspended && (role === 'owner' || isScopedOwnerRole(role))) {
    await supabase.auth.signOut();
    throw new Error('ACCOUNT_SUSPENDED');
  }

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

  let { data, error } = await supabase
    .from('owner_user_property_scopes')
    .select('property_id,can_view')
    .eq('owner_id', context.ownerId)
    .eq('user_id', context.userId)
    .returns<Array<{ property_id: string; can_view?: boolean }>>();

  if (error && isMissingColumnError(error, ['can_view'])) {
    const fallback = await supabase
      .from('owner_user_property_scopes')
      .select('property_id')
      .eq('owner_id', context.ownerId)
      .eq('user_id', context.userId)
      .returns<Array<{ property_id: string }>>();
    error = fallback.error;
    data = (fallback.data ?? []).map((row) => ({ property_id: row.property_id, can_view: true }));
  }

  if (error) {
    throw error;
  }

  return (data ?? []).filter((row) => row.can_view !== false).map((row) => row.property_id);
}

async function listCurrentUserScopeMap(context: CurrentUserContext): Promise<Map<string, TeamScopeRecord> | null> {
  if (context.isPlatformAdmin || context.role === 'owner') {
    return null;
  }

  if (!isScopedOwnerRole(context.role)) {
    return null;
  }

  const { data, error } = await supabase
    .from('owner_user_property_scopes')
    .select('*')
    .eq('owner_id', context.ownerId)
    .eq('user_id', context.userId)
    .returns<OwnerUserPropertyScopeRow[]>();

  if (error) {
    if (isMissingRelationError(error, 'owner_user_property_scopes')) {
      return new Map();
    }
    throw error;
  }

  const map = new Map<string, TeamScopeRecord>();
  (data ?? []).forEach((row) => {
    map.set(row.property_id, mapTeamScope(row));
  });

  return map;
}

type ScopeCapability = 'view' | 'tenants' | 'payments' | 'maintenance' | 'announcements' | 'properties';

async function assertScopeCapability(
  context: CurrentUserContext,
  propertyId: string | null | undefined,
  capability: ScopeCapability,
): Promise<void> {
  const scopeMap = await listCurrentUserScopeMap(context);
  if (!scopeMap) {
    return;
  }

  if (!propertyId) {
    throw new Error('This action requires a property assignment.');
  }

  const scope = scopeMap.get(propertyId);
  if (!scope || !scope.canView) {
    throw new Error('Access to this property has been revoked.');
  }

  if (capability === 'view') {
    return;
  }

  const allowed = (() => {
    switch (capability) {
      case 'tenants': return scope.canManageTenants;
      case 'payments': return scope.canManagePayments;
      case 'maintenance': return scope.canManageMaintenance;
      case 'announcements': return scope.canManageAnnouncements;
      case 'properties': return scope.canManageProperties;
      default: return false;
    }
  })();

  if (!allowed) {
    throw new Error('You do not have permission to perform this action for the selected property.');
  }
}

async function createOwnerNotification(
  ownerId: string,
  input: {
    type: 'payment' | 'maintenance' | 'tenant' | 'announcement';
    title: string;
    message: string;
    propertyId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      owner_id: ownerId,
      property_id: input.propertyId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
    });

  if (error) {
    throw error;
  }
}

async function logActivity(
  ownerId: string,
  propertyId: string | null | undefined,
  event: string,
  detail: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    owner_id: ownerId,
    property_id: propertyId ?? null,
    event,
    detail,
    metadata,
  });
  // Silently ignore if activity_logs table doesn't exist yet (migration pending)
  if (error && !isMissingRelationError(error, 'activity_logs')) {
    console.warn('[logActivity] insert failed:', error.message);
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

  const activeTenants = (tenantRows ?? []).filter((tenant) => isTenantCurrentlyInRoom(tenant.status));
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
    const variants = toPhoneSearchVariants(tenantPhone);
    if (variants.length === 0) {
      return null;
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .in('phone', variants)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<TenantRow[]>();

    if (error) {
      throw error;
    }

    if (data?.[0]) {
      return data[0];
    }

    const digits = normalizePhoneDigits(tenantPhone);
    if (!digits) {
      return null;
    }

    const suffix = digits.length > 10 ? digits.slice(-10) : digits;
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from('tenants')
      .select('*')
      .ilike('phone', `%${suffix}`)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<TenantRow[]>();

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackRows?.[0] ?? null;
  };

  let row: TenantRow | null = null;

  if (email) {
    row = await fetchTenantByEmail(email);
  }

  if (!row && phone) {
    row = await fetchTenantByPhone(phone);
  }

  // Non-tenant roles (owner, platform_admin, etc.) must never silently inherit a random
  // tenant record. If email/phone did not match, this is an unlinked or wrong-role account.

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
    roomCode: row.room_code ?? undefined,
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
    occupancyMode: row.occupancy_mode ?? 'BED_BASED',
    createdAt: row.created_at,
    rooms,
  };
}

function mapFloor(row: FloorRow): FloorRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    floorNumber: row.floor_number,
    label: row.label,
    createdAt: row.created_at,
  };
}

function mapBed(row: BedRow): BedRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    propertyId: row.property_id,
    bedCode: row.bed_code,
    position: row.position,
    status: row.status,
    tenantId: row.tenant_id,
    createdAt: row.created_at,
  };
}

function mapTenantDocument(row: TenantDocumentRow): TenantDocument {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    docType: row.doc_type,
    label: row.label,
    fileUrl: row.file_url,
    verified: row.verified,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}

function mapAgreement(row: AgreementRow): AgreementRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    ownerId: row.owner_id,
    status: row.status,
    agreementType: row.agreement_type,
    startDate: toDateOnly(row.start_date),
    endDate: row.end_date ? toDateOnly(row.end_date) : null,
    monthlyRent: toNumber(row.monthly_rent),
    securityDeposit: toNumber(row.security_deposit),
    htmlContent: row.html_content,
    pdfUrl: row.pdf_url,
    signedAt: row.signed_at,
    sentAt: row.sent_at,
    ownerSignatureName: row.owner_signature_name ?? null,
    ownerSignedAt: row.owner_signed_at ?? null,
    ownerSignatureImage: row.owner_signature_image ?? null,
    tenantSignatureName: row.tenant_signature_name ?? null,
    tenantSignedAt: row.tenant_signed_at ?? null,
    tenantSignatureImage: row.tenant_signature_image ?? null,
    isLocked: row.is_locked ?? false,
    version: row.version ?? 1,
    templateVersion: row.template_version ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSignatureProfile(row: OwnerSignatureProfileRow): OwnerSignatureProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    isActive: row.is_active,
    signatureType: row.signature_type,
    signatureImage: row.signature_image,
    signatureText: row.signature_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAgreementTemplate(row: AgreementTemplateRow): AgreementTemplate {
  return {
    id: row.id,
    ownerId: row.owner_id,
    version: row.version,
    isActive: row.is_active,
    houseRules: row.house_rules,
    visitorRules: row.visitor_rules,
    lateFeeClause: row.late_fee_clause,
    noticePeriodClause: row.notice_period_clause,
    refundPolicy: row.refund_policy,
    securityDepositTerms: row.security_deposit_terms,
    propertyRules: row.property_rules,
    miscellaneousTerms: row.miscellaneous_terms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTenant(row: TenantRow): TenantRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    phone: row.phone,
    // Surface synthetic placeholder emails as empty string so UI shows '—' naturally.
    email: isNoEmailPlaceholder(row.email) ? '' : row.email,
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
    vacateDate: row.vacate_date ? toDateOnly(row.vacate_date) : undefined,
    vacateReason: row.vacate_reason ?? undefined,
    createdAt: row.created_at,
    alternatePhone: row.alternate_phone ?? undefined,
    dob: row.dob ?? undefined,
    gender: row.gender ?? undefined,
    guardianRelationship: row.guardian_relationship ?? undefined,
    billingCycle: row.billing_cycle ?? 'monthly',
    invitationSentAt: row.invitation_sent_at ?? null,
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
    paymentMode: row.payment_mode ?? undefined,
    referenceNumber: row.reference_number ?? undefined,
    paymentNotes: row.payment_notes ?? undefined,
    ownerId: row.owner_id,
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
    assignedTo: row.assigned_to ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapMaintenanceThread(row: MaintenanceThreadRow): MaintenanceThreadEntry {
  const actorRoleNorm = (row.actor_role === 'owner' || row.actor_role === 'owner_manager')
    ? 'owner'
    : row.actor_role === 'system'
      ? 'system'
      : 'staff';

  const actorName = row.actor_role === 'system'
    ? 'System'
    : row.actor_role === 'tenant'
      ? 'Tenant'
      : row.actor_role === 'owner' || row.actor_role === 'owner_manager'
        ? 'Owner'
        : 'Staff';

  const entry: MaintenanceThreadEntry = {
    id: row.id,
    ticketId: row.ticket_id,
    actorName,
    actorRole: actorRoleNorm,
    message: row.body,
    isInternal: row.is_internal,
    createdAt: row.created_at,
  };

  if (row.status_from && row.status_to) {
    entry.statusTransition = {
      from: row.status_from as MaintenanceStatus,
      to: row.status_to as MaintenanceStatus,
    };
  }

  return entry;
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
    propertyId: row.property_id ?? null,
    read: row.read,
    createdAt: row.created_at,
  };
}

function deriveDisplayRoleFromScope(row: OwnerUserPropertyScopeRow): DisplayRole {
  if (row.display_role) return row.display_role;
  if (row.can_manage_payments || row.can_manage_announcements) return 'manager';
  if (row.can_manage_tenants || row.can_manage_maintenance) return 'editor';
  return 'viewer';
}

function mapTeamScope(row: OwnerUserPropertyScopeRow): TeamScopeRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    userId: row.user_id,
    propertyId: row.property_id,
    canView: row.can_view ?? true,
    canManageProperties: row.can_manage_properties,
    canManageTenants: row.can_manage_tenants,
    canManagePayments: row.can_manage_payments,
    canManageMaintenance: row.can_manage_maintenance,
    canManageAnnouncements: row.can_manage_announcements,
    displayRole: deriveDisplayRoleFromScope(row),
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

export const defaultSettings: OwnerSettingsRecord = {
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
    customFooter: '',
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
    upiId: '',
    bankAccount: '',
    bankAccountName: '',
    ifscCode: '',
    qrCodeUrl: '',
    latePaymentFee: 0,
    rentReminderEnabled: true,
    rentReminderDaysBefore: 3,
  },
  additionalSettings: {
    language: 'English',
    timezone: 'IST (UTC+5:30)',
    currency: 'INR (Rs)',
  },
  integrations: {
    smsProvider: { provider: 'supabase', enabled: false, config: {} },
    paymentGateway: { gateway: 'manual', enabled: false, config: {} },
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
      customFooter: String(ws.customFooter ?? ''),
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
      bankAccountName: String(wsPayment.bankAccountName ?? ''),
      ifscCode: String(wsPayment.ifscCode ?? ''),
      qrCodeUrl: String(wsPayment.qrCodeUrl ?? ''),
      latePaymentFee: Number(wsPayment.latePaymentFee ?? defaultSettings.paymentSettings.latePaymentFee),
      rentReminderEnabled: Boolean(wsPayment.rentReminderEnabled ?? true),
      rentReminderDaysBefore: Number(wsPayment.rentReminderDaysBefore ?? 3),
    },
    additionalSettings: {
      language: String(wsAdditional.language ?? defaultSettings.additionalSettings.language),
      timezone: String(wsAdditional.timezone ?? defaultSettings.additionalSettings.timezone),
      currency: String(wsAdditional.currency ?? defaultSettings.additionalSettings.currency),
    },
    integrations: (() => {
      const wsIntegrations = (ws.integrations as Record<string, unknown> | undefined) ?? {};
      const smsCfg = (wsIntegrations.smsProvider as Record<string, unknown> | undefined) ?? {};
      const gwCfg = (wsIntegrations.paymentGateway as Record<string, unknown> | undefined) ?? {};
      return {
        smsProvider: {
          provider: String(smsCfg.provider ?? 'supabase'),
          enabled: Boolean(smsCfg.enabled ?? false),
          config: (typeof smsCfg.config === 'object' && smsCfg.config !== null ? smsCfg.config : {}) as Record<string, string>,
        },
        paymentGateway: {
          gateway: String(gwCfg.gateway ?? 'manual'),
          enabled: Boolean(gwCfg.enabled ?? false),
          config: (typeof gwCfg.config === 'object' && gwCfg.config !== null ? gwCfg.config : {}) as Record<string, string>,
        },
      };
    })(),
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

async function ensureOwnerStarterData(ownerId: string, ownerName: string, ownerEmail: string): Promise<void> {
  const STARTER_ID_DOC_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const STARTER_PHOTO_URL = 'https://placehold.co/512x512/png?text=Tenant+Photo';

  const now = new Date();
  const ownerSuffix = ownerId.replace(/-/g, '').slice(0, 8);
  const fallbackOwnerName = ownerName?.trim() || 'Owner';
  const emailDomain = ownerEmail?.includes('@')
    ? ownerEmail.split('@')[1].trim().toLowerCase()
    : 'pgmanager.app';

  const toDateOnlyString = (value: Date): string => value.toISOString().split('T')[0];
  const shiftDays = (days: number): Date => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    return date;
  };
  const shiftMonthsWithDay = (monthOffset: number, dayOfMonth: number): Date => {
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, Math.min(Math.max(dayOfMonth, 1), 28));
    date.setHours(10, 0, 0, 0);
    return date;
  };

  const referenceProperties = [
    {
      key: 'vai',
      name: 'RentCare Residency (Vaishali Nagar)',
      address: '14, Sector 3, Vaishali Nagar',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302021',
      floors: 3,
      contactName: 'Rahul Sharma',
      contactPhone: '9876501234',
      addressLine1: '14, Sector 3',
      locality: 'Vaishali Nagar',
      landmark: 'Near DCM Chowk',
      formattedAddress: '14, Sector 3, Vaishali Nagar, Jaipur, Rajasthan 302021',
      rooms: [
        { number: '101', floor: 1, type: 'double' as const, beds: 2, rent: 9500 },
        { number: '102', floor: 1, type: 'single' as const, beds: 1, rent: 10200 },
        { number: '201', floor: 2, type: 'double' as const, beds: 2, rent: 9000 },
      ],
    },
    {
      key: 'mal',
      name: 'Sunrise Boys PG (Malviya Nagar)',
      address: '22, Adarsh Nagar, Malviya Nagar',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302017',
      floors: 2,
      contactName: 'Kavya Joshi',
      contactPhone: '9876502345',
      addressLine1: '22, Adarsh Nagar',
      locality: 'Malviya Nagar',
      landmark: 'Near Malviya Nagar Metro',
      formattedAddress: '22, Adarsh Nagar, Malviya Nagar, Jaipur, Rajasthan 302017',
      rooms: [
        { number: '001', floor: 0, type: 'single' as const, beds: 1, rent: 8500 },
        { number: '002', floor: 0, type: 'double' as const, beds: 2, rent: 8000 },
        { number: '101', floor: 1, type: 'triple' as const, beds: 3, rent: 7200 },
      ],
    },
    {
      key: 'csc',
      name: 'Green View Residency (C-Scheme)',
      address: '8, Pandit Madan Mohan Malviya Marg, C-Scheme',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
      floors: 2,
      contactName: 'Priya Agarwal',
      contactPhone: '9876503456',
      addressLine1: '8, PMM Marg',
      locality: 'C-Scheme',
      landmark: 'Near Polo Victory Cinema',
      formattedAddress: '8, PMM Marg, C-Scheme, Jaipur, Rajasthan 302001',
      rooms: [
        { number: 'A1', floor: 1, type: 'single' as const, beds: 1, rent: 12000 },
        { number: 'A2', floor: 1, type: 'double' as const, beds: 2, rent: 10500 },
      ],
    },
  ] as const;

  const referenceTenants = [
    {
      slug: 'meera',
      propertyKey: 'vai',
      name: 'Meera Sharma',
      phone: '+919988776655',
      floor: 1,
      room: '101',
      bed: '1',
      monthlyRent: 9500,
      securityDeposit: 19000,
      rentDueDate: 5,
      parentName: 'Sanjay Sharma',
      parentPhone: '+919988776601',
      idType: 'Aadhaar',
      idNumber: '987654321012',
      joinedDaysAgo: 120,
      status: 'active' as const,
    },
    {
      slug: 'karan',
      propertyKey: 'vai',
      name: 'Karan Malhotra',
      phone: '+919876509876',
      floor: 1,
      room: '102',
      bed: '1',
      monthlyRent: 10200,
      securityDeposit: 20400,
      rentDueDate: 7,
      parentName: 'Rakesh Malhotra',
      parentPhone: '+919876509800',
      idType: 'PAN',
      idNumber: 'ABCDE1234F',
      joinedDaysAgo: 70,
      status: 'active' as const,
    },
    {
      slug: 'nisha',
      propertyKey: 'mal',
      name: 'Nisha Verma',
      phone: '+919812304567',
      floor: 0,
      room: '001',
      bed: '1',
      monthlyRent: 8500,
      securityDeposit: 17000,
      rentDueDate: 3,
      parentName: 'Mahesh Verma',
      parentPhone: '+919812304500',
      idType: 'Passport',
      idNumber: 'Z3456789',
      joinedDaysAgo: 140,
      status: 'active' as const,
    },
    {
      slug: 'rohan',
      propertyKey: 'mal',
      name: 'Rohan Dsouza',
      phone: '+919765401234',
      floor: 0,
      room: '002',
      bed: '2',
      monthlyRent: 8000,
      securityDeposit: 16000,
      rentDueDate: 10,
      parentName: 'Anthony Dsouza',
      parentPhone: '+919765401200',
      idType: 'Driving License',
      idNumber: 'RJ0520240011234',
      joinedDaysAgo: 45,
      status: 'active' as const,
    },
    {
      slug: 'diya',
      propertyKey: 'csc',
      name: 'Diya Menon',
      phone: '+918971231234',
      floor: 1,
      room: 'A1',
      bed: '1',
      monthlyRent: 12000,
      securityDeposit: 24000,
      rentDueDate: 4,
      parentName: 'Ritu Menon',
      parentPhone: '+918971231200',
      idType: 'Aadhaar',
      idNumber: '123412341234',
      joinedDaysAgo: 30,
      status: 'active' as const,
    },
    {
      slug: 'aditya',
      propertyKey: 'csc',
      name: 'Aditya Nair',
      phone: '+919611123456',
      floor: 1,
      room: 'A2',
      bed: '1',
      monthlyRent: 10500,
      securityDeposit: 21000,
      rentDueDate: 8,
      parentName: 'Vikram Nair',
      parentPhone: '+919611123400',
      idType: 'PAN',
      idNumber: 'PQRSN4321K',
      joinedDaysAgo: 18,
      status: 'inactive' as const,
    },
  ] as const;

  const { data: starterPropertyRows, error: starterPropertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', ownerId)
    .ilike('landmark', `%${STARTER_MARKER}%`)
    .returns<PropertyRow[]>();

  if (starterPropertyError) {
    throw starterPropertyError;
  }

  const starterPropertyMap = new Map<string, PropertyRow>();
  (starterPropertyRows ?? []).forEach((row) => {
    starterPropertyMap.set(row.name, row);
  });

  const propertyByKey = new Map<string, PropertyRow>();

  for (const seedProperty of referenceProperties) {
    let propertyRow = starterPropertyMap.get(seedProperty.name);

    if (!propertyRow) {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          owner_id: ownerId,
          name: seedProperty.name,
          address: seedProperty.address,
          city: seedProperty.city,
          state: seedProperty.state,
          pincode: seedProperty.pincode,
          floors: seedProperty.floors,
          total_rooms: seedProperty.rooms.length,
          contact_name: seedProperty.contactName,
          contact_phone: seedProperty.contactPhone,
          contact_email: ownerEmail?.trim().toLowerCase() || `${ownerSuffix}@${emailDomain}`,
          address_line1: seedProperty.addressLine1,
          locality: seedProperty.locality,
          landmark: `${seedProperty.landmark} ${STARTER_MARKER}`,
          formatted_address: seedProperty.formattedAddress,
        })
        .select('*')
        .single<PropertyRow>();

      if (error) {
        throw error;
      }

      propertyRow = data;
      starterPropertyMap.set(seedProperty.name, propertyRow);
    }

    propertyByKey.set(seedProperty.key, propertyRow);

    const { data: existingRooms, error: roomFetchError } = await supabase
      .from('rooms')
      .select('number,floor')
      .eq('property_id', propertyRow.id)
      .returns<Array<{ number: string; floor: number }>>();

    if (roomFetchError) {
      throw roomFetchError;
    }

    const roomKeySet = new Set((existingRooms ?? []).map((room) => `${room.floor}::${room.number.toLowerCase()}`));
    const missingRooms = seedProperty.rooms.filter((room) => !roomKeySet.has(`${room.floor}::${room.number.toLowerCase()}`));

    if (missingRooms.length > 0) {
      const { error: roomInsertError } = await supabase
        .from('rooms')
        .insert(missingRooms.map((room) => ({
          property_id: propertyRow.id,
          number: room.number,
          floor: room.floor,
          type: room.type,
          beds: room.beds,
          rent: room.rent,
          status: 'vacant',
          occupied_beds: 0,
          tenant_id: null,
        })));

      if (roomInsertError) {
        throw roomInsertError;
      }
    }
  }

  const seededEmails = referenceTenants.map((tenant) => `starter.${tenant.slug}.${ownerSuffix}@${emailDomain}`);

  const { data: existingSeedTenants, error: existingTenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', ownerId)
    .in('email', seededEmails)
    .returns<TenantRow[]>();

  if (existingTenantError) {
    throw existingTenantError;
  }

  const tenantByEmail = new Map<string, TenantRow>();
  (existingSeedTenants ?? []).forEach((tenant) => {
    tenantByEmail.set(tenant.email.toLowerCase(), tenant);
  });

  for (const seedTenant of referenceTenants) {
    const tenantEmail = `starter.${seedTenant.slug}.${ownerSuffix}@${emailDomain}`.toLowerCase();
    if (tenantByEmail.has(tenantEmail)) {
      continue;
    }

    const property = propertyByKey.get(seedTenant.propertyKey);
    if (!property) {
      continue;
    }

    const joinDate = toDateOnlyString(shiftDays(-seedTenant.joinedDaysAgo));

    const { data: createdTenant, error: tenantInsertError } = await supabase
      .from('tenants')
      .insert({
        owner_id: ownerId,
        property_id: property.id,
        name: seedTenant.name,
        phone: seedTenant.phone,
        email: tenantEmail,
        photo_url: STARTER_PHOTO_URL,
        floor: seedTenant.floor,
        room: seedTenant.room,
        bed: seedTenant.bed,
        monthly_rent: seedTenant.monthlyRent,
        security_deposit: seedTenant.securityDeposit,
        rent_due_date: seedTenant.rentDueDate,
        parent_name: seedTenant.parentName,
        parent_phone: seedTenant.parentPhone,
        id_type: seedTenant.idType,
        id_number: seedTenant.idNumber,
        id_document_url: STARTER_ID_DOC_URL,
        join_date: joinDate,
        status: seedTenant.status,
      })
      .select('*')
      .single<TenantRow>();

    if (tenantInsertError) {
      throw tenantInsertError;
    }

    tenantByEmail.set(tenantEmail, createdTenant);
  }

  const seededTenants = referenceTenants
    .map((seedTenant) => {
      const tenantEmail = `starter.${seedTenant.slug}.${ownerSuffix}@${emailDomain}`.toLowerCase();
      const tenant = tenantByEmail.get(tenantEmail);
      const property = propertyByKey.get(seedTenant.propertyKey);
      if (!tenant || !property) {
        return null;
      }
      return {
        seed: seedTenant,
        tenant,
        property,
      };
    })
    .filter((entry): entry is { seed: typeof referenceTenants[number]; tenant: TenantRow; property: PropertyRow } => Boolean(entry));

  for (const property of propertyByKey.values()) {
    await syncRoomOccupancyForProperty(ownerId, property.id);
    await syncPropertyRoomCount(property.id);
  }

  const dueOffsets = [-2, -1, 0] as const;
  const paymentSeeds = seededTenants.flatMap(({ seed, tenant, property }, tenantIndex) => {
    return dueOffsets.map((offset, indexInOffsets) => {
      const dueDate = shiftMonthsWithDay(offset, seed.rentDueDate);
      const dueDateString = toDateOnlyString(dueDate);
      const isLatestCycle = indexInOffsets === dueOffsets.length - 1;
      const status: PaymentStatus = isLatestCycle
        ? (tenantIndex % 2 === 0 ? 'pending' : 'overdue')
        : 'paid';
      const extraCharges = isLatestCycle ? (tenantIndex % 3) * 300 : (indexInOffsets === 0 ? 200 : 0);
      const totalAmount = Number(seed.monthlyRent) + Number(extraCharges);
      const paidDate = status === 'paid'
        ? toDateOnlyString(shiftDays(-Math.max(3, 45 + (tenantIndex * 2) + (indexInOffsets * 25))))
        : null;
      const createdAt = new Date(dueDate);
      createdAt.setDate(createdAt.getDate() - 2);

      return {
        owner_id: ownerId,
        tenant_id: tenant.id,
        property_id: property.id,
        tenant_name: tenant.name,
        room: tenant.room,
        monthly_rent: seed.monthlyRent,
        extra_charges: extraCharges,
        total_amount: totalAmount,
        due_date: dueDateString,
        paid_date: paidDate,
        status,
        created_at: createdAt.toISOString(),
      };
    });
  });

  const { data: existingPayments, error: existingPaymentsError } = await supabase
    .from('payments')
    .select('tenant_id,due_date')
    .eq('owner_id', ownerId)
    .in('tenant_id', seededTenants.map((entry) => entry.tenant.id))
    .returns<Array<{ tenant_id: string; due_date: string }>>();

  if (existingPaymentsError) {
    throw existingPaymentsError;
  }

  const existingPaymentKeys = new Set((existingPayments ?? []).map((payment) => `${payment.tenant_id}::${payment.due_date}`));
  const paymentsToInsert = paymentSeeds.filter((payment) => !existingPaymentKeys.has(`${payment.tenant_id}::${payment.due_date}`));

  if (paymentsToInsert.length > 0) {
    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert(paymentsToInsert);

    if (paymentInsertError) {
      throw paymentInsertError;
    }
  }

  const maintenanceSeeds = seededTenants.slice(0, 5).map(({ seed, tenant, property }, index) => {
    const statuses: MaintenanceStatus[] = ['open', 'in-progress', 'resolved', 'open', 'resolved'];
    const priorities: MaintenancePriority[] = ['high', 'medium', 'low', 'high', 'medium'];
    const issues = [
      'Leaking tap in washroom',
      'Wi-Fi connectivity issue',
      'Fan making noise',
      'Water heater not working',
      'Room lock replacement',
    ];

    const date = shiftDays(-(index + 1) * 2);
    const createdAt = new Date(date);
    createdAt.setHours(11, 30, 0, 0);

    return {
      owner_id: ownerId,
      tenant_id: tenant.id,
      tenant: tenant.name,
      property_id: property.id,
      room: `${seed.room}${seed.bed ? `-${seed.bed}` : ''}`,
      issue: issues[index] ?? 'General maintenance request',
      description: 'Reference demo maintenance ticket for dashboard and tenant history preview.',
      source: index % 2 === 0 ? 'manual' as const : 'whatsapp' as const,
      status: statuses[index] ?? 'open',
      priority: priorities[index] ?? 'medium',
      phone: tenant.phone,
      date: toDateOnlyString(date),
      created_at: createdAt.toISOString(),
    };
  });

  const { data: existingMaintenance, error: existingMaintenanceError } = await supabase
    .from('maintenance_tickets')
    .select('property_id,room,issue,date')
    .eq('owner_id', ownerId)
    .in('issue', maintenanceSeeds.map((entry) => entry.issue))
    .returns<Array<{ property_id: string; room: string; issue: string; date: string }>>();

  if (existingMaintenanceError) {
    throw existingMaintenanceError;
  }

  const existingMaintenanceKeys = new Set((existingMaintenance ?? []).map((entry) => `${entry.property_id}::${entry.room}::${entry.issue}::${entry.date}`));
  const maintenanceToInsert = maintenanceSeeds.filter((entry) => !existingMaintenanceKeys.has(`${entry.property_id}::${entry.room}::${entry.issue}::${entry.date}`));

  if (maintenanceToInsert.length > 0) {
    const { error: maintenanceInsertError } = await supabase
      .from('maintenance_tickets')
      .insert(maintenanceToInsert);

    if (maintenanceInsertError) {
      throw maintenanceInsertError;
    }
  }

  const announcementSeeds = [
    {
      title: 'Reference Notice: Monthly Deep Cleaning',
      content: 'Common areas will be deep-cleaned this Sunday between 10 AM and 1 PM.',
      category: 'general' as const,
      is_pinned: true,
      sent_via_whatsapp: true,
      date: toDateOnlyString(shiftDays(-1)),
      created_at: shiftDays(-1).toISOString(),
    },
    {
      title: 'Reference Notice: Rent Reminder Window',
      content: 'Please clear rent dues by the 7th to avoid late fee auto-application.',
      category: 'payment' as const,
      is_pinned: false,
      sent_via_whatsapp: true,
      date: toDateOnlyString(shiftDays(-3)),
      created_at: shiftDays(-3).toISOString(),
    },
  ];

  const { data: existingAnnouncements, error: existingAnnouncementsError } = await supabase
    .from('announcements')
    .select('title')
    .eq('owner_id', ownerId)
    .in('title', announcementSeeds.map((entry) => entry.title))
    .returns<Array<{ title: string }>>();

  if (existingAnnouncementsError) {
    throw existingAnnouncementsError;
  }

  const existingAnnouncementTitles = new Set((existingAnnouncements ?? []).map((entry) => entry.title));
  const announcementsToInsert = announcementSeeds
    .filter((entry) => !existingAnnouncementTitles.has(entry.title))
    .map((entry) => ({
      owner_id: ownerId,
      property_id: null,
      ...entry,
    }));

  if (announcementsToInsert.length > 0) {
    const { error: announcementInsertError } = await supabase
      .from('announcements')
      .insert(announcementsToInsert);

    if (announcementInsertError) {
      throw announcementInsertError;
    }
  }
}

function shouldBootstrapStarterData(ownerEmail: string): boolean {
  const normalized = String(ownerEmail ?? '').trim().toLowerCase();
  // Restrict starter reference data to explicit demo-style accounts only.
  return normalized.endsWith('@pgmanager.app') || normalized.includes('.demo@');
}

async function uploadTenantFile(ownerId: string, tenantName: string, file: File, kind: 'photo' | 'document'): Promise<string | null> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeName = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const path = `${ownerId}/${kind}/${Date.now()}-${safeName}.${extension}`;

  const { error } = await supabase.storage
    .from(TENANT_FILES_BUCKET)
    .upload(path, file, { upsert: false });

  if (error) {
    const message = String(error.message ?? '').toLowerCase();
    if (message.includes('bucket') || message.includes('policy') || message.includes('permission') || message.includes('not found')) {
      console.warn('Tenant file upload skipped because storage is not configured for tenant-files bucket:', error.message ?? error);
      return null;
    }
    throw error;
  }

  const { data } = supabase.storage.from(TENANT_FILES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export const supabaseAuthDataApi = {
  async getProfileById(userId: string, options?: { bootstrapStarterData?: boolean }): Promise<AppUser | null> {
    let { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,owner_scope_id,pg_name,city,photo_url')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error && isMissingColumnError(error, ['owner_scope_id'])) {
      const legacy = await supabase
        .from('profiles')
        .select('id,email,full_name,phone,role,pg_name,city,photo_url')
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

    const mappedUser: AppUser = {
      id: data.id,
      name: data.full_name ?? data.email ?? 'Owner',
      email: data.email ?? '',
      phone: data.phone ?? '',
      role: data.role,
      ownerScopeId: data.owner_scope_id,
      pgName: data.pg_name ?? '',
      city: data.city ?? '',
      photoUrl: data.photo_url ?? null,
    };

    return mappedUser;
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
    if (input.photoUrl !== undefined) payload.photo_url = input.photoUrl;

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

  async uploadProfilePhoto(file: File): Promise<string> {
    const context = await getCurrentUserContext();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${context.userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    await this.updateCurrentProfile({ photoUrl: publicUrl });
    return publicUrl;
  },

  async uploadQrCode(file: File): Promise<string> {
    const context = await getCurrentUserContext();
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${context.userId}/payment-qr.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
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

    const properties = (propertyRows ?? []).filter((row) => !isStarterPropertyRow(row));
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
    validatePropertyInput(input as Partial<Property>, true);

    const context = await assertPropertyDefinitionWriteAccess();
    const ownerId = context.ownerId;

    const basePayload = {
      owner_id: ownerId,
      name: input.name.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      floors: Number(input.floors),
      total_rooms: input.totalRooms,
      contact_name: input.contactName.trim(),
      contact_phone: toPropertyContactPhoneForDatabase(input.contactPhone),
      contact_email: input.contactEmail.trim().toLowerCase(),
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
      occupancy_mode: (input as { occupancyMode?: string }).occupancyMode ?? 'BED_BASED',
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
        throw mapPropertySaveError(fallbackError);
      }

      createdRow = fallbackData;
    }

    if (!createdRow) {
      if (error) {
        throw mapPropertySaveError(error);
      }
      throw new Error('Property could not be created.');
    }

    const newProperty = mapProperty(createdRow, []);

    void logActivity(context.ownerId, newProperty.id, 'PROPERTY_CREATED',
      `Property "${newProperty.name}" created in ${newProperty.city}`,
      { propertyId: newProperty.id, name: newProperty.name },
    ).catch(() => {});

    return newProperty;
  },

  async update(id: string, input: Partial<Property>): Promise<Property> {
    validatePropertyInput(input, false);

    await assertPropertyDefinitionWriteAccess();

    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.address !== undefined) payload.address = input.address.trim();
    if (input.city !== undefined) payload.city = input.city.trim();
    if (input.state !== undefined) payload.state = input.state.trim();
    if (input.pincode !== undefined) payload.pincode = input.pincode.trim();
    if (input.floors !== undefined) payload.floors = Number(input.floors);
    if (input.totalRooms !== undefined) payload.total_rooms = input.totalRooms;
    if (input.contactName !== undefined) payload.contact_name = input.contactName.trim();
    if (input.contactPhone !== undefined) payload.contact_phone = toPropertyContactPhoneForDatabase(input.contactPhone);
    if (input.contactEmail !== undefined) payload.contact_email = input.contactEmail.trim().toLowerCase();

    const extendedPayload: Record<string, unknown> = { ...payload };
    if (input.addressLine1 !== undefined) extendedPayload.address_line1 = input.addressLine1;
    if (input.addressLine2 !== undefined) extendedPayload.address_line2 = input.addressLine2;
    if (input.locality !== undefined) extendedPayload.locality = input.locality;
    if (input.landmark !== undefined) extendedPayload.landmark = input.landmark;
    if (input.latitude !== undefined) extendedPayload.latitude = input.latitude;
    if (input.longitude !== undefined) extendedPayload.longitude = input.longitude;
    if (input.formattedAddress !== undefined) extendedPayload.formatted_address = input.formattedAddress;
    if ((input as { occupancyMode?: string }).occupancyMode !== undefined) extendedPayload.occupancy_mode = (input as { occupancyMode?: string }).occupancyMode;

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
        throw mapPropertySaveError(fallbackError);
      }

      updatedRow = fallbackData;
    }

    if (!updatedRow) {
      if (error) {
        throw mapPropertySaveError(error);
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
    await assertPropertyDefinitionWriteAccess();

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
    const newRoom = mapRoom(data);

    void (async () => {
      const context = await getCurrentUserContext();
      await logActivity(context.ownerId, propertyId, 'ROOM_CREATED',
        `Room ${newRoom.number} (Floor ${newRoom.floor}) added`,
        { propertyId, roomId: newRoom.id, number: newRoom.number, beds: newRoom.beds },
      );
    })().catch(() => {});

    return newRoom;
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

    const rows = (data ?? []).filter((row) => !isStarterTenantRow(row));

    return rows.map(mapTenant);
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
    validateTenantInput(input, true);
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    await assertScopeCapability(context, input.propertyId, 'tenants');

    // Resolve email: use provided value or generate a phone-based placeholder.
    const phoneDigits = input.phone.replace(/\D/g, '').slice(-10);
    const resolvedEmail = (input.email && input.email.trim())
      ? input.email.trim().toLowerCase()
      : `noemail.${phoneDigits}${NO_EMAIL_MARKER}`;

    // Block creation only when a real email conflicts with a privileged account.
    if (!resolvedEmail.includes(NO_EMAIL_MARKER)) {
      const { data: emailConflict } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', resolvedEmail)
        .not('role', 'eq', 'tenant')
        .maybeSingle<{ role: string }>();

      if (emailConflict) {
        const label = emailConflict.role === 'platform_admin' ? 'platform manager'
          : emailConflict.role === 'owner_manager' ? 'property manager'
          : emailConflict.role;
        throw new Error(
          `This email is already registered as a ${label} account. Tenant accounts must use a different email address.`,
        );
      }
    }

    if (input.phone) {
      const phoneDigits = input.phone.replace(/\D/g, '').slice(-10);
      const { data: phoneConflict } = await supabase
        .from('profiles')
        .select('role')
        .or(`phone.eq.${input.phone},phone.ilike.%${phoneDigits}`)
        .not('role', 'eq', 'tenant')
        .maybeSingle<{ role: string }>();

      if (phoneConflict) {
        const label = phoneConflict.role === 'platform_admin' ? 'platform manager'
          : phoneConflict.role === 'owner_manager' ? 'property manager'
          : phoneConflict.role;
        throw new Error(
          `This phone number is already registered as a ${label} account. Tenant accounts must use a different phone number.`,
        );
      }
    }

    let photoUrl: string | null = null;
    let idDocumentUrl: string | null = null;

    if (input.photo) {
      try {
        photoUrl = await uploadTenantFile(ownerId, input.name, input.photo, 'photo');
      } catch (uploadError) {
        console.warn('Tenant photo upload failed. Continuing without photo:', uploadError);
      }
    }
    if (input.idDocument) {
      try {
        idDocumentUrl = await uploadTenantFile(ownerId, input.name, input.idDocument, 'document');
      } catch (uploadError) {
        console.warn('Tenant ID upload failed. Continuing without ID document:', uploadError);
      }
    }

    const insertPayload: Record<string, unknown> = {
      owner_id: ownerId,
      property_id: input.propertyId,
      name: input.name,
      phone: input.phone,
      email: resolvedEmail,
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
      alternate_phone: input.alternatePhone ?? null,
      dob: input.dob ?? null,
      gender: input.gender ?? null,
      guardian_relationship: input.guardianRelationship ?? null,
      billing_cycle: input.billingCycle ?? 'monthly',
    };

    let data: TenantRow;
    let error: unknown;

    const result = await supabase
      .from('tenants')
      .insert(insertPayload)
      .select('*')
      .single<TenantRow>();

    if (result.error && isMissingColumnError(result.error, ['alternate_phone', 'dob', 'gender', 'guardian_relationship', 'billing_cycle'])) {
      // Fallback: insert without extended columns
      const basePayload = {
        owner_id: ownerId,
        property_id: input.propertyId,
        name: input.name,
        phone: input.phone,
        email: resolvedEmail,
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
      };
      const fallback = await supabase.from('tenants').insert(basePayload).select('*').single<TenantRow>();
      data = fallback.data!;
      error = fallback.error;
    } else {
      data = result.data!;
      error = result.error;
    }

    if (error) {
      throw mapTenantSaveError(error);
    }

    const created = mapTenant(data);

    void createOwnerNotification(ownerId, {
      type: 'tenant',
      title: 'New Tenant Added',
      message: `${created.name} added to room ${created.room}.`,
      propertyId: created.propertyId,
    }).catch(() => {
      // Notification should not block tenant creation.
    });

    try {
      await syncRoomOccupancyForProperty(ownerId, created.propertyId);
    } catch (syncError) {
      // Do not fail tenant creation when post-write occupancy sync has schema/policy issues.
      console.warn('Room occupancy sync skipped after tenant creation:', syncError);
    }

    void logActivity(ownerId, created.propertyId, 'TENANT_ASSIGNED',
      `${created.name} assigned to Room ${created.room}${created.bed ? `, Bed ${created.bed}` : ''}`,
      { tenantId: created.id, room: created.room, bed: created.bed },
    ).catch(() => {});

    // Initial payment — synchronous with compensating rollback on failure.
    // Ensures a tenant is never committed without a corresponding first invoice.
    try {
      const joinDate = new Date(input.joinDate);
      const dueDateCandidate = new Date(joinDate.getFullYear(), joinDate.getMonth(), Math.min(input.rentDueDate, 28));
      if (dueDateCandidate < joinDate) {
        dueDateCandidate.setMonth(dueDateCandidate.getMonth() + 1);
      }
      const dueDateStr = dueDateCandidate.toISOString().split('T')[0];
      const { data: existing } = await supabase.from('payments').select('id').eq('tenant_id', created.id).limit(1);
      if (!existing?.length) {
        const { error: paymentInsertError } = await supabase.from('payments').insert({
          owner_id: ownerId,
          tenant_id: created.id,
          property_id: created.propertyId,
          tenant_name: created.name,
          room: created.room,
          monthly_rent: created.rent,
          extra_charges: 0,
          total_amount: created.rent,
          due_date: dueDateStr,
          status: 'pending',
        });
        if (paymentInsertError) {
          // Compensating transaction: remove the tenant row so we don't leave orphaned records.
          await supabase.from('tenants').delete().eq('id', created.id).eq('owner_id', ownerId);
          throw new Error(`Tenant creation rolled back — initial invoice could not be created: ${paymentInsertError.message}`);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Tenant creation rolled back')) {
        throw err;
      }
      // Non-fatal: if the check query itself fails, log and continue (payment can be created manually).
      console.warn('Initial payment setup failed (non-fatal):', err);
    }

    domainEvents.tenantAssigned({
      tenantId: created.id,
      tenantName: created.name,
      propertyId: created.propertyId,
      room: created.room,
      bed: created.bed,
    });

    emitOwnerDataUpdated();

    return created;
  },

  async updateTenant(tenantId: string, input: Partial<TenantCreateInput>): Promise<TenantRecord> {
    validateTenantInput(input, false);
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: existingTenant, error: existingTenantError } = await supabase
      .from('tenants')
      .select('property_id')
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string }>();

    if (existingTenantError) {
      throw existingTenantError;
    }

    const existingPropertyId = existingTenant?.property_id ?? null;
    const nextPropertyId = input.propertyId ?? existingPropertyId;

    if (existingPropertyId && existingPropertyId !== nextPropertyId) {
      await assertScopeCapability(context, existingPropertyId, 'tenants');
    }
    await assertScopeCapability(context, nextPropertyId ?? null, 'tenants');

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
    if (input.alternatePhone !== undefined) payload.alternate_phone = input.alternatePhone ?? null;
    if (input.dob !== undefined) payload.dob = input.dob ?? null;
    if (input.gender !== undefined) payload.gender = input.gender ?? null;
    if (input.guardianRelationship !== undefined) payload.guardian_relationship = input.guardianRelationship ?? null;
    if (input.billingCycle !== undefined) payload.billing_cycle = input.billingCycle;

    let data: TenantRow;
    let error: unknown;

    const updateResult = await supabase
      .from('tenants')
      .update(payload)
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<TenantRow>();

    if (updateResult.error && isMissingColumnError(updateResult.error, ['alternate_phone', 'dob', 'gender', 'guardian_relationship', 'billing_cycle'])) {
      const basePayload = { ...payload };
      delete basePayload.alternate_phone;
      delete basePayload.dob;
      delete basePayload.gender;
      delete basePayload.guardian_relationship;
      delete basePayload.billing_cycle;
      const fallback = await supabase
        .from('tenants')
        .update(basePayload)
        .eq('id', tenantId)
        .eq('owner_id', ownerId)
        .select('*')
        .single<TenantRow>();
      data = fallback.data!;
      error = fallback.error;
    } else {
      data = updateResult.data!;
      error = updateResult.error;
    }

    if (error) {
      throw mapTenantSaveError(error);
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

      // Batch update: compute new total per payment and update in parallel (avoids N+1 sequential)
      const paymentsToSync = tenantPayments ?? [];
      await Promise.all(paymentsToSync.map(async (payment) => {
        const nextTotal = Number(updatedTenant.rent) + Number(payment.extra_charges ?? 0);
        const { error: totalSyncError } = await supabase
          .from('payments')
          .update({ total_amount: nextTotal })
          .eq('id', payment.id)
          .eq('owner_id', ownerId);
        if (totalSyncError) throw totalSyncError;
      }));
    }

    const propertyIdsToSync = new Set<string>();
    if (existingTenant?.property_id) {
      propertyIdsToSync.add(existingTenant.property_id);
    }
    propertyIdsToSync.add(updatedTenant.propertyId);

    await Promise.all(Array.from(propertyIdsToSync).map(async (propertyId) => {
      try {
        await syncRoomOccupancyForProperty(ownerId, propertyId);
      } catch (syncError) {
        console.warn('Room occupancy sync skipped after tenant update:', syncError);
      }
    }));
    emitOwnerDataUpdated();

    return updatedTenant;
  },

  async deleteTenant(tenantId: string): Promise<void> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: tenantRow, error: tenantError } = await supabase
      .from('tenants')
      .select('property_id')
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null }>();

    if (tenantError) {
      throw tenantError;
    }

    await assertScopeCapability(context, tenantRow?.property_id ?? null, 'tenants');

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
      try {
        await syncRoomOccupancyForProperty(ownerId, existingTenant.property_id);
      } catch (syncError) {
        console.warn('Room occupancy sync skipped after tenant delete:', syncError);
      }
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

    const filteredRows = await filterSyntheticPayments(data ?? []);

    return filteredRows.map(mapPayment);
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

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, meta?: { paymentMode?: string; referenceNumber?: string; paidDate?: string; paymentNotes?: string }): Promise<PaymentRecord> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: paymentRow, error: paymentFetchError } = await supabase
      .from('payments')
      .select('property_id, status')
      .eq('id', paymentId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null; status: PaymentStatus }>();

    if (paymentFetchError) {
      throw paymentFetchError;
    }

    await assertScopeCapability(context, paymentRow?.property_id ?? null, 'payments');

    // Completed-payment lock (defense in depth — the UI also enforces this).
    // A paid invoice has a receipt issued, a captured reference, and downstream
    // accounting/next-month generation. Reverting it to pending/overdue would
    // wipe paid_date and corrupt the record, so reject the transition at the
    // service layer regardless of which caller initiates it. Re-marking an
    // already-paid invoice as paid (idempotent) is still allowed.
    if (paymentRow?.status === 'paid' && status !== 'paid') {
      throw new Error('This payment is completed and locked. Paid invoices cannot be reverted.');
    }

    const payload: Record<string, unknown> = { status };

    if (status === 'paid') {
      payload.paid_date = meta?.paidDate ?? new Date().toISOString().split('T')[0];
      if (meta?.paymentMode) payload.payment_mode = meta.paymentMode;
      if (meta?.referenceNumber) payload.reference_number = meta.referenceNumber;
      if (meta?.paymentNotes) payload.payment_notes = meta.paymentNotes;
    } else {
      payload.paid_date = null;
    }

    let data: PaymentRow;

    const fullResult = await supabase
      .from('payments')
      .update(payload)
      .eq('id', paymentId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<PaymentRow>();

    if (fullResult.error && isMissingColumnError(fullResult.error, ['payment_mode', 'reference_number', 'payment_notes'])) {
      const basePayload = { ...payload };
      delete basePayload.payment_mode;
      delete basePayload.reference_number;
      delete basePayload.payment_notes;
      const fallback = await supabase
        .from('payments')
        .update(basePayload)
        .eq('id', paymentId)
        .eq('owner_id', ownerId)
        .select('*')
        .single<PaymentRow>();
      if (fallback.error) throw fallback.error;
      data = fallback.data!;
    } else {
      if (fullResult.error) throw fullResult.error;
      data = fullResult.data!;
    }

    const updated = mapPayment(data);

    void createOwnerNotification(ownerId, {
      type: 'payment',
      title: status === 'paid' ? 'Payment Marked Paid' : 'Payment Status Updated',
      message: `${updated.tenant} - ${updated.room} is now ${status}.`,
      propertyId: updated.propertyId,
    }).catch(() => {});

    if (status === 'paid') {
      void logActivity(ownerId, updated.propertyId, 'PAYMENT_RECEIVED',
        `Payment of ₹${updated.totalAmount.toLocaleString('en-IN')} received from ${updated.tenant} (Room ${updated.room})`,
        { paymentId: updated.id, tenantId: updated.tenantId, amount: updated.totalAmount },
      ).catch(() => {});

      domainEvents.paymentReceived({
        paymentId: updated.id,
        tenantId: updated.tenantId,
        tenantName: updated.tenant,
        propertyId: updated.propertyId,
        amount: updated.totalAmount,
      });

      // Auto-generate next-month payment if it doesn't already exist
      void (async () => {
        const existingDue = new Date(updated.dueDate);
        const nextDue = new Date(existingDue.getFullYear(), existingDue.getMonth() + 1, existingDue.getDate());
        const nextDueDateStr = nextDue.toISOString().split('T')[0];
        const { data: existingNext } = await supabase.from('payments').select('id')
          .eq('tenant_id', updated.tenantId).eq('due_date', nextDueDateStr).limit(1);
        if (!existingNext?.length) {
          await supabase.from('payments').insert({
            owner_id: ownerId,
            tenant_id: updated.tenantId,
            property_id: updated.propertyId,
            tenant_name: updated.tenant,
            room: updated.room,
            monthly_rent: updated.monthlyRent,
            extra_charges: 0,
            total_amount: updated.monthlyRent,
            due_date: nextDueDateStr,
            status: 'pending',
          });
        }
      })().catch((err) => {
        console.warn('Next-month payment generation failed:', err);
      });

      // Store receipt as a document in tenant_documents (best-effort).
      void (async () => {
        try {
          const { data: propRow } = await supabase
            .from('properties')
            .select('name')
            .eq('id', updated.propertyId)
            .maybeSingle<{ name: string }>();
          const propertyName = propRow?.name ?? '';
          const month = new Date(updated.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          const receiptLabel = `Receipt — ${month}`;
          const receiptNo = `RCP-${updated.id.slice(-8).toUpperCase()}`;
          const statusColor = '#16a34a';
          const fmtCur = (n: number) => `₹${n.toLocaleString('en-IN')}`;
          const fmtDt = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
          const modeLine = data.payment_mode
            ? `<p style="margin:4px 0;font-size:13px"><strong>Mode:</strong> ${String(data.payment_mode).replace(/_/g, ' ')}${data.reference_number ? ` &nbsp;|&nbsp; <strong>Ref:</strong> ${String(data.reference_number)}` : ''}</p>`
            : '';
          const notesLine = data.payment_notes
            ? `<p style="margin:4px 0;font-size:13px"><strong>Notes:</strong> ${String(data.payment_notes)}</p>`
            : '';
          const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>${receiptLabel}</title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;padding:24px;background:#f9fafb;color:#111827}
.card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
.hdr{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:24px 28px}
.hdr h1{margin:0;font-size:20px;font-weight:800}
.hdr p{margin:4px 0 0;font-size:12px;opacity:.75}
.body{padding:24px 28px}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
.row:last-child{border:none;font-weight:700;font-size:15px}
.amt{color:${statusColor};font-weight:800;font-size:18px}
.ftr{background:#f9fafb;padding:14px 28px;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body>
<div class="card">
  <div class="hdr"><h1>Rent Receipt</h1><p>${receiptNo} &nbsp;·&nbsp; ${fmtDt(new Date().toISOString())}</p></div>
  <div class="body">
    ${propertyName ? `<div class="row"><span>Property</span><span>${propertyName}</span></div>` : ''}
    <div class="row"><span>Tenant</span><span>${updated.tenant}</span></div>
    <div class="row"><span>Room</span><span>${updated.room}</span></div>
    <div class="row"><span>Due Date</span><span>${fmtDt(updated.dueDate)}</span></div>
    <div class="row"><span>Paid On</span><span>${fmtDt(updated.paidDate ?? new Date().toISOString().split('T')[0])}</span></div>
    <div class="row"><span>Base Rent</span><span>${fmtCur(updated.monthlyRent)}</span></div>
    ${updated.extraCharges > 0 ? `<div class="row"><span>Extra Charges</span><span>${fmtCur(updated.extraCharges)}</span></div>` : ''}
    <div class="row"><span>Total Amount</span><span class="amt">${fmtCur(updated.totalAmount)}</span></div>
  </div>
  ${(modeLine || notesLine) ? `<div style="padding:0 28px 16px">${modeLine}${notesLine}</div>` : ''}
  <div class="ftr"><p>Computer-generated receipt — does not require a physical signature.</p></div>
</div></body></html>`;

          await supabaseLifecycleApi.storeReceiptAsDocument({
            tenantId: updated.tenantId,
            paymentId: updated.id,
            htmlContent: html,
            label: receiptLabel,
          });
        } catch {
          // Non-fatal — storage may not be configured
        }
      })();
    }

    // Auto-apply late fee when payment transitions to overdue
    if (status === 'overdue') {
      void (async () => {
        try {
          const { data: settingsRow } = await supabase
            .from('owner_settings')
            .select('whatsapp_settings')
            .eq('owner_id', ownerId)
            .maybeSingle<Pick<OwnerSettingsRow, 'whatsapp_settings'>>();

          const ws = (settingsRow?.whatsapp_settings ?? {}) as Record<string, unknown>;
          const latePaymentFee = Number((ws.paymentSettings as Record<string, unknown> | undefined)?.latePaymentFee ?? 0);

          if (latePaymentFee > 0) {
            const { error: chargeError } = await supabase
              .from('payment_charges')
              .insert({
                payment_id: paymentId,
                type: 'late_fee',
                description: `Late payment fee`,
                amount: latePaymentFee,
              });

            if (!chargeError) {
              const newExtra = toNumber(data.extra_charges) + latePaymentFee;
              const newTotal = toNumber(data.monthly_rent) + newExtra;
              await supabase
                .from('payments')
                .update({ extra_charges: newExtra, total_amount: newTotal })
                .eq('id', paymentId)
                .eq('owner_id', ownerId);

              void createOwnerNotification(ownerId, {
                type: 'payment',
                title: `Late fee applied: ₹${latePaymentFee.toLocaleString('en-IN')}`,
                message: `Auto-applied to ${updated.tenant} (Room ${updated.room}) for overdue payment`,
                propertyId: updated.propertyId,
              }).catch(() => {});
            }
          }
        } catch {
          // Non-fatal: late fee auto-application is best-effort
        }
      })();
    }

    emitOwnerDataUpdated();

    return updated;
  },

  async addPaymentCharge(paymentId: string, input: {
    type: string;
    customType?: string;
    description?: string;
    amount: number;
  }): Promise<PaymentRecord> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: paymentRow, error: paymentFetchError } = await supabase
      .from('payments')
      .select('property_id,status')
      .eq('id', paymentId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null; status: PaymentStatus }>();

    if (paymentFetchError) {
      throw paymentFetchError;
    }

    if (paymentRow?.status === 'paid') {
      throw new Error('Extra charges cannot be added to a paid invoice. Select the current pending invoice instead.');
    }

    await assertScopeCapability(context, paymentRow?.property_id ?? null, 'payments');

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

    // Re-compute total from all charges so `payments.extra_charges` and `payments.total_amount` stay consistent.
    const { data: allCharges, error: chargesError } = await supabase
      .from('payment_charges')
      .select('amount')
      .eq('payment_id', paymentId)
      .returns<Array<{ amount: number | string }>>();

    if (chargesError) {
      throw chargesError;
    }

    const totalExtraCharges = (allCharges ?? []).reduce((sum, c) => sum + toNumber(c.amount), 0);

    const { data: currentPayment, error: currentPaymentError } = await supabase
      .from('payments')
      .select('monthly_rent')
      .eq('id', paymentId)
      .eq('owner_id', ownerId)
      .single<Pick<PaymentRow, 'monthly_rent'>>();

    if (currentPaymentError) {
      throw currentPaymentError;
    }

    const newTotal = toNumber(currentPayment.monthly_rent) + totalExtraCharges;

    const { error: updateError } = await supabase
      .from('payments')
      .update({ extra_charges: totalExtraCharges, total_amount: newTotal })
      .eq('id', paymentId)
      .eq('owner_id', ownerId);

    if (updateError) {
      throw updateError;
    }

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
    tenantId?: string | null;
    propertyId: string;
    room: string;
    issue: string;
    description: string;
    priority: MaintenancePriority;
    source?: MaintenanceSource;
    phone?: string;
    assignedTo?: string | null;
  }): Promise<MaintenanceTicketRecord> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    await assertScopeCapability(context, input.propertyId, 'maintenance');

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        owner_id: ownerId,
        tenant_id: input.tenantId ?? null,
        tenant: input.tenant,
        property_id: input.propertyId,
        room: input.room,
        issue: input.issue,
        description: input.description,
        source: input.source ?? 'manual',
        status: input.assignedTo ? 'assigned' : 'open',
        priority: input.priority,
        phone: input.phone ?? null,
        assigned_to: input.assignedTo ?? null,
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
      propertyId: created.propertyId,
    }).catch(() => {});

    void logActivity(ownerId, created.propertyId, 'MAINTENANCE_CREATED',
      `Maintenance ticket created: ${created.issue} (Room ${created.room})`,
      { ticketId: created.id, priority: created.priority, tenant: created.tenant },
    ).catch(() => {});

    domainEvents.maintenanceCreated({
      ticketId: created.id,
      propertyId: created.propertyId,
      issue: created.issue,
      tenant: created.tenant,
      priority: created.priority,
    });

    return created;
  },

  async updateMaintenanceStatus(ticketId: string, status: MaintenanceStatus): Promise<MaintenanceTicketRecord> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: ticketRow, error: ticketFetchError } = await supabase
      .from('maintenance_tickets')
      .select('property_id, status, issue, tenant, room')
      .eq('id', ticketId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null; status: MaintenanceStatus; issue: string; tenant: string; room: string }>();

    if (ticketFetchError) {
      throw ticketFetchError;
    }

    await assertScopeCapability(context, ticketRow?.property_id ?? null, 'maintenance');

    const previousStatus = ticketRow?.status;

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

    const STATUS_LABELS: Record<MaintenanceStatus, string> = {
      open: 'Open', assigned: 'Assigned', 'in-progress': 'In Progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
    };

    const actorRole = context.role === 'owner' || context.role === 'owner_manager'
      ? context.role
      : 'staff';

    void supabase.from('maintenance_threads').insert({
      ticket_id: ticketId,
      actor_id: context.userId,
      actor_role: actorRole,
      body: `Status changed to ${STATUS_LABELS[status]}`,
      is_internal: false,
      status_from: previousStatus ?? null,
      status_to: status,
    }).then(({ error: threadErr }) => {
      if (threadErr) console.warn('Thread insert failed:', threadErr.message);
    });

    void logActivity(ownerId, ticketRow?.property_id ?? null, 'MAINTENANCE_UPDATED',
      `Ticket status: ${previousStatus ?? '?'} → ${status} (${ticketRow?.issue ?? ''}, Room ${ticketRow?.room ?? ''})`,
      { ticketId, previousStatus, newStatus: status, tenant: ticketRow?.tenant },
    ).catch(() => {});

    const STATUS_LABELS_NOTIF: Record<MaintenanceStatus, string> = {
      open: 'Open', assigned: 'Assigned', 'in-progress': 'In Progress', waiting: 'Waiting for Parts',
      resolved: 'Resolved', closed: 'Closed',
    };

    if (status === 'resolved' || status === 'closed') {
      void createOwnerNotification(ownerId, {
        type: 'maintenance',
        title: `Ticket ${status === 'resolved' ? 'Resolved' : 'Closed'}: ${ticketRow?.issue ?? ''}`,
        message: `Room ${ticketRow?.room ?? ''} · ${ticketRow?.tenant ?? ''}`,
        propertyId: ticketRow?.property_id ?? null,
      }).catch(() => {});

      domainEvents.maintenanceResolved({
        ticketId,
        propertyId: ticketRow?.property_id ?? '',
        issue: ticketRow?.issue ?? '',
        tenant: ticketRow?.tenant ?? '',
      });
    } else {
      void createOwnerNotification(ownerId, {
        type: 'maintenance',
        title: `Ticket Updated: ${STATUS_LABELS_NOTIF[status]}`,
        message: `${ticketRow?.issue ?? ''} · Room ${ticketRow?.room ?? ''} · ${ticketRow?.tenant ?? ''}`,
        propertyId: ticketRow?.property_id ?? null,
      }).catch(() => {});

      domainEvents.maintenanceUpdated({
        ticketId,
        propertyId: ticketRow?.property_id ?? '',
        issue: ticketRow?.issue ?? '',
        fromStatus: previousStatus ?? '',
        toStatus: status,
      });
    }

    return mapMaintenanceTicket(data, notes ?? []);
  },

  async addMaintenanceNote(ticketId: string, note: string): Promise<void> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: ticketRow, error: ticketFetchError } = await supabase
      .from('maintenance_tickets')
      .select('property_id')
      .eq('id', ticketId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null }>();

    if (ticketFetchError) {
      throw ticketFetchError;
    }

    await assertScopeCapability(context, ticketRow?.property_id ?? null, 'maintenance');

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

  async getMaintenanceThreads(ticketId: string): Promise<MaintenanceThreadEntry[]> {
    const context = await getCurrentUserContext();

    const { data: ticketData, error: ticketError } = await supabase
      .from('maintenance_tickets')
      .select('id')
      .eq('id', ticketId)
      .eq('owner_id', context.ownerId)
      .maybeSingle<{ id: string }>();

    if (ticketError) throw ticketError;
    if (!ticketData) return [];

    const { data, error } = await supabase
      .from('maintenance_threads')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .returns<MaintenanceThreadRow[]>();

    if (error) throw error;

    return (data ?? []).map(mapMaintenanceThread);
  },

  async addMaintenanceThread(
    ticketId: string,
    message: string,
    isInternal: boolean,
  ): Promise<MaintenanceThreadEntry> {
    const context = await getCurrentUserContext();

    const { data: ticketRow, error: ticketFetchError } = await supabase
      .from('maintenance_tickets')
      .select('property_id')
      .eq('id', ticketId)
      .eq('owner_id', context.ownerId)
      .maybeSingle<{ property_id: string | null }>();

    if (ticketFetchError) throw ticketFetchError;

    await assertScopeCapability(context, ticketRow?.property_id ?? null, 'maintenance');

    const actorRole = context.role === 'owner' || context.role === 'owner_manager'
      ? context.role
      : 'staff';

    const { data, error } = await supabase
      .from('maintenance_threads')
      .insert({
        ticket_id: ticketId,
        actor_id: context.userId,
        actor_role: actorRole,
        body: message.trim(),
        is_internal: isInternal,
      })
      .select('*')
      .single<MaintenanceThreadRow>();

    if (error) throw error;

    return mapMaintenanceThread(data);
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
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    await assertScopeCapability(context, input.propertyId ?? null, 'announcements');

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
      propertyId: created.propertyId,
    }).catch(() => {});

    void logActivity(ownerId, created.propertyId, 'ANNOUNCEMENT_CREATED',
      `Announcement "${created.title}" published${input.sendViaWhatsApp ? ' · WhatsApp broadcast enabled' : ''}`,
      { announcementId: created.id, category: created.category, whatsapp: input.sendViaWhatsApp },
    ).catch(() => {});

    domainEvents.announcementCreated({
      announcementId: created.id,
      propertyId: created.propertyId,
      title: created.title,
      whatsappEnabled: input.sendViaWhatsApp,
    });

    return created;
  },

  async updateAnnouncement(announcementId: string, input: {
    title: string;
    content: string;
    category: AnnouncementCategory;
    isPinned: boolean;
  }): Promise<AnnouncementRecord> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: annRow, error: annFetchError } = await supabase
      .from('announcements')
      .select('property_id')
      .eq('id', announcementId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null }>();

    if (annFetchError) {
      throw annFetchError;
    }

    await assertScopeCapability(context, annRow?.property_id ?? null, 'announcements');

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
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: annRow, error: annFetchError } = await supabase
      .from('announcements')
      .select('property_id')
      .eq('id', announcementId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null }>();

    if (annFetchError) {
      throw annFetchError;
    }

    await assertScopeCapability(context, annRow?.property_id ?? null, 'announcements');

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
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data: annRow, error: annFetchError } = await supabase
      .from('announcements')
      .select('property_id')
      .eq('id', announcementId)
      .eq('owner_id', ownerId)
      .maybeSingle<{ property_id: string | null }>();

    if (annFetchError) {
      throw annFetchError;
    }

    await assertScopeCapability(context, annRow?.property_id ?? null, 'announcements');

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

  // Resolves the current user's role *per property* from the property_access
  // view (owner via properties.owner_id + manager/staff via scopes). This is
  // what makes "Owner of A, Manager of B" work instead of one global role.
  // Any failure (view/grant missing) returns [] so callers fall back safely.
  async listPropertyAccess(): Promise<Array<{ propertyId: string; accessRole: 'owner' | 'manager' | 'staff' }>> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('property_access')
        .select('property_id, access_role')
        .eq('user_id', userId);

      if (error) return [];

      return (data ?? []).map((row: { property_id: string; access_role: string }) => ({
        propertyId: row.property_id,
        accessRole: (row.access_role === 'owner' || row.access_role === 'manager' || row.access_role === 'staff')
          ? (row.access_role as 'owner' | 'manager' | 'staff')
          : 'staff',
      }));
    } catch {
      return [];
    }
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

    const updated = mapOwnerSubscription(data);

    void logActivity(ownerId, null, 'SUBSCRIPTION_UPDATED',
      `Subscription updated: plan=${updated.planCode}, status=${updated.status}`,
      { planCode: updated.planCode, status: updated.status, billingCycle: updated.billingCycle },
    ).catch(() => {});

    return updated;
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

  async listCurrentUserScopes(): Promise<TeamScopeRecord[]> {
    const context = await getCurrentUserContext();
    const scopeMap = await listCurrentUserScopeMap(context);
    if (!scopeMap) {
      return [];
    }
    return Array.from(scopeMap.values());
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

  // Authority for tenant-facing financial documents (receipts, invoices,
  // agreements, settlements) is always the registered property owner — never
  // the currently logged-in user, who may be a manager or staff member acting
  // on the owner's behalf. Resolves owner_id for the current scope, then loads
  // that profile's name/phone directly from the database.
  async getAuthorityProfile(): Promise<{ name: string; phone: string } | null> {
    const ownerId = await getOwnerId();
    const profile = await supabaseAuthDataApi.getProfileById(ownerId).catch(() => null);
    if (!profile) return null;
    return { name: profile.name, phone: profile.phone };
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
      integrations: settings.integrations,
    };

    const { error } = await supabase
      .from('owner_settings')
      .upsert({
        owner_id: ownerId,
        pg_rules: settings.pgRules,
        whatsapp_settings: serializedSettings,
      }, { onConflict: 'owner_id' });

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

  async getDashboardSnapshot(
    propertyId: string | 'all',
    dateRange?: { start: Date; end: Date },
  ): Promise<DashboardSnapshot> {
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
      const rangeStart = dateRange?.start ?? new Date(now.getFullYear(), now.getMonth(), 1);
      const rangeEnd = dateRange?.end ?? now;

      const monthlyRevenue = payments
        .filter((payment) => {
          if (payment.status !== 'paid') return false;
          const referenceDate = payment.paidDate ? new Date(payment.paidDate) : new Date(payment.dueDate);
          return referenceDate >= rangeStart && referenceDate <= rangeEnd;
        })
        .reduce((sum, payment) => sum + payment.totalAmount, 0);

      const pendingAmount = payments
        .filter((payment) => payment.status === 'pending' || payment.status === 'overdue')
        .reduce((sum, payment) => sum + payment.totalAmount, 0);

      const pendingIssues = maintenance.filter((ticket) => ticket.status === 'open').length;

      const recentPayments = [...payments]
        .filter((p) => {
          const d = new Date(p.createdAt);
          return d >= rangeStart && d <= rangeEnd;
        })
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
        .filter((a) => {
          const d = new Date(a.createdAt);
          return d >= rangeStart && d <= rangeEnd;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

      // Build chart buckets covering the range (capped at 12 months)
      const monthBuckets: Array<{ key: string; name: string; revenue: number }> = [];
      const bucketCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      while (bucketCursor <= rangeEnd && monthBuckets.length < 12) {
        monthBuckets.push({
          key: `${bucketCursor.getFullYear()}-${bucketCursor.getMonth()}`,
          name: toMonthName(bucketCursor),
          revenue: 0,
        });
        bucketCursor.setMonth(bucketCursor.getMonth() + 1);
      }
      if (monthBuckets.length === 0) {
        monthBuckets.push({ key: `${rangeEnd.getFullYear()}-${rangeEnd.getMonth()}`, name: toMonthName(rangeEnd), revenue: 0 });
      }

      payments.forEach((payment) => {
        if (payment.status !== 'paid') return;
        const referenceDate = payment.paidDate ? new Date(payment.paidDate) : new Date(payment.dueDate);
        const key = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}`;
        const bucket = monthBuckets.find((entry) => entry.key === key);
        if (bucket) bucket.revenue += payment.totalAmount;
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
        totalTenants: tenants.filter((tenant) => isTenantCurrentlyInRoom(tenant.status)).length,
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

  async processVacate(input: VacateWorkflowInput): Promise<TenantRecord> {
    const ownerId = await getOwnerId();

    const vacateDate = new Date(input.vacateDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isImmediateVacate = vacateDate <= today;

    const newStatus: TenantStatus = isImmediateVacate ? 'inactive' : 'notice_submitted';

    const totalDeduction = input.deductionItems && input.deductionItems.length > 0
      ? input.deductionItems.reduce((sum, d) => sum + d.amount, 0)
      : Number(input.depositDeduction) || 0;

    // Fetch tenant to compute deposit refund
    const { data: tenantRow, error: fetchError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', input.tenantId)
      .eq('owner_id', ownerId)
      .single<TenantRow>();

    if (fetchError || !tenantRow) {
      throw fetchError ?? new Error('Tenant not found');
    }

    const depositRefund = Math.max(0, Number(tenantRow.security_deposit ?? 0) - totalDeduction);

    // Update tenant status
    const { data: updatedRow, error: updateError } = await supabase
      .from('tenants')
      .update({
        status: newStatus,
        vacate_date: input.vacateDate,
        vacate_reason: input.reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.tenantId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<TenantRow>();

    if (updateError) throw updateError;

    // Create vacate_requests record
    const deductionSummary = input.deductionItems && input.deductionItems.length > 0
      ? input.deductionItems.map((d) => d.description).join('; ')
      : input.deductionReason;

    await supabase.from('vacate_requests').insert({
      owner_id: ownerId,
      tenant_id: input.tenantId,
      tenant_name: tenantRow.name,
      property_id: tenantRow.property_id,
      room: tenantRow.room,
      notice_date: new Date().toISOString().split('T')[0],
      planned_vacate_date: input.vacateDate,
      reason: input.reason,
      final_settlement_amount: tenantRow.monthly_rent ?? 0,
      deposit_refund: depositRefund,
      deposit_deduction: totalDeduction,
      deduction_reason: deductionSummary,
      status: isImmediateVacate ? 'completed' : 'confirmed',
    });

    // Log activity
    await supabase.from('activity_logs').insert({
      owner_id: ownerId,
      property_id: tenantRow.property_id,
      event: 'TENANT_VACATED',
      detail: isImmediateVacate
        ? `${tenantRow.name} vacated Room ${tenantRow.room} — deposit refund ₹${depositRefund.toLocaleString('en-IN')}`
        : `${tenantRow.name} submitted vacate notice — planned move-out ${input.vacateDate}`,
      metadata: {
        tenantId: input.tenantId,
        room: tenantRow.room,
        depositRefund,
        totalDeduction,
        vacateDate: input.vacateDate,
      },
    });

    // Archive all active agreements for this tenant (best-effort — missing table silently ignored)
    const { data: activeAgreements, error: agreementFetchErr } = await supabase
      .from('agreements')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('owner_id', ownerId)
      .not('status', 'in', '(archived,cancelled,expired)')
      .returns<Array<{ id: string }>>();

    if (agreementFetchErr && !isMissingRelationError(agreementFetchErr, 'agreements')) {
      console.warn('[processVacate] agreement fetch for archive failed:', agreementFetchErr.message);
    }

    if (!agreementFetchErr && (activeAgreements ?? []).length > 0) {
      const { error: archiveErr } = await supabase
        .from('agreements')
        .update({ status: 'archived' })
        .eq('tenant_id', input.tenantId)
        .eq('owner_id', ownerId)
        .not('status', 'in', '(archived,cancelled,expired)');

      if (archiveErr && !isMissingRelationError(archiveErr, 'agreements')) {
        console.warn('[processVacate] agreement archive failed:', archiveErr.message);
      }

      if (!archiveErr) {
        void Promise.all((activeAgreements ?? []).map((row) =>
          supabase.from('agreement_events').insert({
            agreement_id: row.id,
            actor_id: ownerId,
            actor_role: 'system',
            event_type: 'archived',
            event_detail: `Archived on tenant vacate — ${isImmediateVacate ? 'immediate' : 'notice submitted'}`,
          })
        )).catch(() => {});
      }
    }

    // If immediate vacate, sync room occupancy
    if (isImmediateVacate && tenantRow.property_id) {
      try {
        await syncRoomOccupancyForProperty(ownerId, tenantRow.property_id);
      } catch {
        // Non-fatal: room sync failure should not block vacate
      }
    }

    // Notify owner
    void createOwnerNotification(ownerId, {
      type: 'tenant',
      title: isImmediateVacate ? `${tenantRow.name} has vacated` : `Vacate notice: ${tenantRow.name}`,
      message: isImmediateVacate
        ? `Room ${tenantRow.room} is now available · Refund ₹${depositRefund.toLocaleString('en-IN')}`
        : `Scheduled move-out: ${input.vacateDate}`,
      propertyId: tenantRow.property_id,
    }).catch(() => {});

    // Farewell notification visible to tenant in their portal
    void createOwnerNotification(ownerId, {
      type: 'tenant',
      title: `Thank you, ${tenantRow.name}`,
      message: isImmediateVacate
        ? `Your stay in Room ${tenantRow.room} has been completed. Your deposit refund of ₹${depositRefund.toLocaleString('en-IN')} will be processed within 15 days. Thank you for being a valued resident.`
        : `Your vacate notice has been received. Your planned move-out is ${input.vacateDate}. Final settlement will be processed after your departure.`,
      propertyId: tenantRow.property_id,
    }).catch(() => {});

    // Auto-generate and store the final settlement receipt as a tenant document,
    // mirroring the auto-receipt-on-payment pattern (storeReceiptAsDocument dedupes by label).
    if (isImmediateVacate) {
      try {
        const [{ data: propertyRow }, { data: ownerProfile }] = await Promise.all([
          supabase.from('properties').select('name').eq('id', tenantRow.property_id).maybeSingle<{ name: string | null }>(),
          supabase.from('profiles').select('full_name, pg_name').eq('id', ownerId).maybeSingle<{ full_name: string | null; pg_name: string | null }>(),
        ]);

        const settlementHtml = generateSettlementReceiptHtml({
          tenantName: tenantRow.name,
          room: tenantRow.room,
          floor: String(tenantRow.floor ?? ''),
          joinDate: tenantRow.join_date,
          vacateDate: input.vacateDate,
          reason: input.reason,
          securityDeposit: Number(tenantRow.security_deposit ?? 0),
          deductionBreakdown: (input.deductionItems ?? []).map((d) => ({
            id: d.id,
            category: d.category as SettlementDeductionItem['category'],
            description: d.description,
            amount: d.amount,
          })),
          totalDeductions: totalDeduction,
          netRefund: depositRefund,
          pendingRentTotal: 0,
          settledAt: new Date().toISOString(),
          propertyName: propertyRow?.name ?? '',
          ownerName: ownerProfile?.full_name ?? ownerProfile?.pg_name ?? '',
        });

        await supabaseLifecycleApi.storeReceiptAsDocument({
          tenantId: input.tenantId,
          paymentId: `settlement-${input.tenantId}`,
          htmlContent: settlementHtml,
          label: `Settlement — ${input.vacateDate}`,
        });
      } catch {
        // Non-fatal: settlement document generation should not block vacate processing
      }
    }

    emitOwnerDataUpdated();
    return mapTenant(updatedRow!);
  },

  async archiveTenant(tenantId: string): Promise<TenantRecord> {
    const ownerId = await getOwnerId();

    const { data, error } = await supabase
      .from('tenants')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .eq('owner_id', ownerId)
      .select('*')
      .single<TenantRow>();

    if (error) throw error;

    await supabase.from('activity_logs').insert({
      owner_id: ownerId,
      property_id: data!.property_id,
      event: 'TENANT_ARCHIVED',
      detail: `${data!.name} archived`,
      metadata: { tenantId },
    });

    emitOwnerDataUpdated();
    return mapTenant(data!);
  },

  async getActivityLog(propertyId: string | 'all' = 'all', limit = 100): Promise<ActivityLogEntry[]> {
    const context = await getCurrentUserContext();

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!context.isPlatformAdmin) {
      query = query.eq('owner_id', context.ownerId);
    }

    const scopedPropertyIds = await listScopedPropertyIds(context);

    if (propertyId !== 'all') {
      if (scopedPropertyIds && !scopedPropertyIds.includes(propertyId)) {
        return [];
      }
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingRelationError(error, 'activity_logs')) return [];
      throw error;
    }

    let rows = data ?? [];
    if (scopedPropertyIds) {
      rows = rows.filter((row: Record<string, unknown>) => {
        const pid = row.property_id ? String(row.property_id) : null;
        // null property_id = global event (account-level) — always visible to scoped users
        return pid ? scopedPropertyIds.includes(pid) : true;
      });
    }

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      ownerId: String(row.owner_id),
      propertyId: row.property_id ? String(row.property_id) : null,
      event: String(row.event),
      detail: String(row.detail),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
    }));
  },
};

export const supabaseNotificationApi = {
  async listForCurrentUser(): Promise<NotificationRecord[]> {
    const context = await getCurrentUserContext();
    const ownerId = context.ownerId;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .returns<NotificationRow[]>();

    if (error) {
      throw error;
    }

    let rows = data ?? [];

    const scopedPropertyIds = await listScopedPropertyIds(context);
    if (scopedPropertyIds) {
      rows = rows.filter((row) => row.property_id && scopedPropertyIds.includes(row.property_id));
    }

    return rows.map(mapNotification);
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

// ── Tenant Account Provisioning ─────────────────────────────────────────────────
// Creates the Supabase auth user + profiles row for a new tenant so they can sign
// in via magic link without ever manually registering, and sends/records the
// invitation. The owner never has to create the tenant's auth account separately.
export const supabaseTenantProvisioningApi = {
  async provisionTenantAccount(email: string, name: string): Promise<{ userId: string; isNew: boolean }> {
    const serviceRoleKey = String((import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '');
    if (!serviceRoleKey) {
      // Graceful fallback: if service role key not configured, skip provisioning silently.
      // The owner can send the invite manually from TenantDetail.
      return { userId: '', isNew: false };
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if an auth user already exists for this email.
    const { data: listData } = await (adminClient.auth.admin.listUsers() as unknown as Promise<{ data: { users: Array<{ id: string; email?: string }> } }>);
    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (existingUser) {
      // Ensure profile row has role=tenant
      await supabase
        .from('profiles')
        .update({ role: 'tenant' })
        .eq('id', existingUser.id)
        .eq('role', 'owner'); // Only correct if accidentally created as owner
      return { userId: existingUser.id, isNew: false };
    }

    // Create new auth user (email_confirm:true so magic link works immediately)
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: { name, role: 'tenant' },
    });

    if (createError || !newUserData?.user?.id) {
      throw createError ?? new Error('Failed to create tenant auth account.');
    }

    const userId = newUserData.user.id;

    // Upsert profiles row
    await supabase.from('profiles').upsert({
      id: userId,
      email: email.toLowerCase(),
      name,
      role: 'tenant',
    }, { onConflict: 'id' });

    return { userId, isNew: true };
  },

  async sendTenantMagicLink(email: string, redirectTo?: string): Promise<void> {
    const serviceRoleKey = String((import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '');
    if (!serviceRoleKey) {
      // Fall back to anon magic link (works if account already exists and email provider enabled)
      const emailRedirectTo = redirectTo ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
      await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: { shouldCreateUser: false, ...(emailRedirectTo ? { emailRedirectTo } : {}) },
      });
      return;
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const emailRedirectTo = redirectTo ?? (typeof window !== 'undefined' ? window.location.origin : undefined);

    const { error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: { ...(emailRedirectTo ? { redirectTo: emailRedirectTo } : {}) },
    });

    if (error) throw error;

    // Supabase admin generateLink sends the email automatically when using the hosted platform.
    // If self-hosted, you must configure the SMTP settings.
  },

  // ── One-shot tenant invitation ────────────────────────────────────────────────
  // Provisions the auth identity (if missing), sends the magic-link invitation
  // email, stamps tenants.invitation_sent_at, writes an audit log, and creates a
  // welcome notification. Used on Add Tenant and on Resend Invitation. Returns the
  // ISO timestamp recorded so callers can patch their local state immediately.
  async inviteTenant(args: {
    tenantId: string;
    email: string;
    name: string;
    ownerId: string;
    propertyId: string;
  }): Promise<{ invitationSentAt: string }> {
    const email = args.email.trim().toLowerCase();
    if (!email || email.includes('noemail.') || email.includes(NO_EMAIL_MARKER)) {
      throw new Error('This tenant has no email address on file. Add an email before sending an invitation.');
    }

    // Resolve the post-login redirect from VITE_SITE_URL, falling back to the
    // current origin for local development.
    const configuredSiteUrl = String((import.meta as any).env?.VITE_SITE_URL ?? '').trim();
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const redirectTo = (isLocal ? origin : (configuredSiteUrl || origin)) || undefined;

    // 1 + 2: create the auth identity if it does not already exist.
    await this.provisionTenantAccount(email, args.name).catch((err) => {
      console.warn('Tenant account provisioning failed (continuing to magic link):', err);
    });

    // 5 + 6: generate + send the magic-link invitation email.
    await this.sendTenantMagicLink(email, redirectTo);

    const invitationSentAt = new Date().toISOString();

    // Stamp the invitation time on the tenant row (graceful — column may not exist yet).
    const { error: stampError } = await supabase
      .from('tenants')
      .update({ invitation_sent_at: invitationSentAt })
      .eq('id', args.tenantId);
    if (stampError && !isMissingColumnError(stampError, ['invitation_sent_at'])) {
      console.warn('Could not record invitation_sent_at:', stampError.message);
    }

    // 7: audit log.
    void logActivity(
      args.ownerId,
      args.propertyId,
      'TENANT_INVITED',
      `Invitation email sent to ${args.name} (${email})`,
      { tenantId: args.tenantId, email, invitationSentAt },
    ).catch(() => {});

    // 8: welcome notification for the owner's activity feed.
    void createOwnerNotification(args.ownerId, {
      type: 'tenant',
      title: 'Tenant Invitation Sent',
      message: `${args.name} has been invited to the Tenant Portal via ${email}.`,
      propertyId: args.propertyId,
    }).catch(() => {});

    return { invitationSentAt };
  },
};

export const supabaseTenantDataApi = {
  async getPortalSnapshot(): Promise<TenantPortalSnapshot> {
    const { profile, tenant } = await resolveTenantContextForCurrentUser();

    const [
      { data: propertyRow, error: propertyError },
      ownerProfile,
      paymentRows,
      maintenanceRows,
      announcementRows,
      notificationRows,
      ownerPaymentRpc,
      vacateRows,
      documentRows,
      agreementRows,
    ] = await Promise.all([
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
      supabase
        .from('notifications')
        .select('*')
        .eq('owner_id', tenant.ownerId)
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<NotificationRow[]>(),
      (supabase.rpc('get_owner_payment_info', { p_owner_id: tenant.ownerId }) as unknown as Promise<{ data: unknown; error: unknown }>),
      supabase
        .from('vacate_requests')
        .select('id,owner_id,tenant_id,tenant_name,property_id,room,notice_date,planned_vacate_date,reason,status,created_at,deposit_refund,deposit_deduction,deduction_reason,final_settlement_amount')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<Array<{
          id: string; owner_id: string; tenant_id: string; tenant_name: string;
          property_id: string; room: string; notice_date: string;
          planned_vacate_date: string; reason: string; status: string; created_at: string;
          deposit_refund: number | null; deposit_deduction: number | null;
          deduction_reason: string | null; final_settlement_amount: number | null;
        }>>(),
      (async () => {
        try {
          const res = await supabase
            .from('tenant_documents')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at')
            .returns<TenantDocumentRow[]>();
          return res.error ? { data: [] as TenantDocumentRow[], error: null } : res;
        } catch {
          return { data: [] as TenantDocumentRow[], error: null };
        }
      })(),
      (async () => {
        try {
          const res = await supabase
            .from('agreements')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })
            .returns<AgreementRow[]>();
          return res.error ? { data: [] as AgreementRow[], error: null } : res;
        } catch {
          return { data: [] as AgreementRow[], error: null };
        }
      })(),
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

    const maintenanceTicketRows: MaintenanceTicketRow[] = maintenanceRows.data ?? [];
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

    const rawPaymentInfo = (ownerPaymentRpc as { data: unknown; error: unknown } | null)?.data;
    const paymentInfoObj = (rawPaymentInfo && typeof rawPaymentInfo === 'object' ? rawPaymentInfo : {}) as Record<string, unknown>;
    const ownerPaymentInfo: TenantOwnerPaymentInfo = {
      upiId: String(paymentInfoObj.upiId ?? ''),
      qrCodeUrl: String(paymentInfoObj.qrCodeUrl ?? ''),
      pgRules: Array.isArray(paymentInfoObj.pgRules) ? (paymentInfoObj.pgRules as string[]) : [],
      ownerPhone: String(paymentInfoObj.ownerPhone ?? ownerProfile?.phone ?? ''),
      pgName: String(paymentInfoObj.pgName ?? ownerProfile?.pgName ?? ''),
    };

    const vacateRow = (vacateRows.data ?? [])[0] ?? null;
    const vacateRequest: VacateRequest | null = vacateRow
      ? {
          id: vacateRow.id,
          tenantId: vacateRow.tenant_id,
          tenantName: vacateRow.tenant_name,
          propertyId: vacateRow.property_id,
          room: vacateRow.room,
          noticeDate: vacateRow.notice_date,
          plannedVacateDate: vacateRow.planned_vacate_date,
          reason: vacateRow.reason,
          finalSettlementAmount: toNumber(vacateRow.final_settlement_amount ?? 0),
          depositRefund: toNumber(vacateRow.deposit_refund ?? 0),
          depositDeduction: toNumber(vacateRow.deposit_deduction ?? 0),
          deductionReason: vacateRow.deduction_reason ?? '',
          status: vacateRow.status as VacateRequest['status'],
          createdAt: vacateRow.created_at,
        }
      : null;

    // Scope notifications to this tenant: show announcements, system messages,
    // and messages that reference the tenant by name. This prevents other tenants'
    // payment/document/maintenance events from appearing in this portal.
    const scopedNotifications = (notificationRows.data ?? [])
      .filter((n) => {
        const type = String(n.type ?? '');
        if (type === 'announcement' || type === 'system') return true;
        const msg = String(n.message ?? '');
        const title = String(n.title ?? '');
        return msg.includes(tenant.name) || title.includes(tenant.name);
      })
      .slice(0, 20)
      .map(mapNotification);

    return {
      profile,
      tenant,
      property,
      owner: ownerProfile,
      payments: (paymentRows.data ?? []).map(mapPayment),
      maintenance: maintenanceTicketRows.map((ticket) => mapMaintenanceTicket(ticket, notesByTicket.get(ticket.id) ?? [])),
      announcements: (announcementRows.data ?? []).map(mapAnnouncement),
      notifications: scopedNotifications,
      ownerPaymentInfo,
      vacateRequest,
      documents: (documentRows.data ?? []).map(mapTenantDocument),
      agreements: (agreementRows.data ?? []).map(mapAgreement),
    };
  },

  async createMaintenanceTicket(input: {
    issue: string;
    description: string;
    priority: MaintenancePriority;
    imageUrl?: string;
  }): Promise<MaintenanceTicketRecord> {
    const { tenant } = await resolveTenantContextForCurrentUser();

    const fullDescription = input.imageUrl
      ? `${input.description}\n\n📷 Photo: ${input.imageUrl}`
      : input.description;

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        owner_id: tenant.ownerId,
        tenant_id: tenant.id,
        tenant: tenant.name,
        property_id: tenant.propertyId,
        room: tenant.room,
        issue: input.issue,
        description: fullDescription,
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

    const created = mapMaintenanceTicket(data, []);

    void createOwnerNotification(tenant.ownerId, {
      type: 'maintenance',
      title: 'New Tenant Complaint',
      message: `${tenant.name} reported: ${input.issue}`,
      propertyId: tenant.propertyId,
    }).catch(() => {});

    void logActivity(tenant.ownerId, tenant.propertyId, 'MAINTENANCE_CREATED',
      `${tenant.name} reported: ${input.issue} (Room ${tenant.room})`,
      { ticketId: created.id, priority: input.priority, tenant: tenant.name, source: 'portal' },
    ).catch(() => {});

    domainEvents.maintenanceCreated({
      ticketId: created.id,
      propertyId: tenant.propertyId,
      issue: input.issue,
      tenant: tenant.name,
      priority: input.priority,
    });

    return created;
  },

  async uploadMaintenanceImage(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('maintenance-images')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from('maintenance-images').getPublicUrl(path);
    return data.publicUrl;
  },

  async submitVacateRequest(input: { vacateDate: string; reason: string }): Promise<void> {
    const { tenant } = await resolveTenantContextForCurrentUser();

    const vacateDate = new Date(input.vacateDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (vacateDate < today) {
      throw new Error('Vacate date cannot be in the past. Please select today or a future date.');
    }

    const isImmediateVacate = vacateDate <= today;
    const newStatus: TenantStatus = isImmediateVacate ? 'inactive' : 'notice_submitted';

    const { error } = await supabase.from('vacate_requests').insert({
      owner_id: tenant.ownerId,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      property_id: tenant.propertyId,
      room: tenant.room,
      notice_date: new Date().toISOString().split('T')[0],
      planned_vacate_date: input.vacateDate,
      reason: input.reason,
      status: 'pending',
    });
    if (error) throw error;

    await supabase
      .from('tenants')
      .update({
        status: newStatus,
        vacate_date: input.vacateDate,
        vacate_reason: input.reason,
      })
      .eq('id', tenant.id);

    // Sync room occupancy when tenant vacates immediately so DB room.status matches reality
    if (isImmediateVacate && tenant.propertyId) {
      try {
        await syncRoomOccupancyForProperty(tenant.ownerId, tenant.propertyId);
      } catch {
        // Non-fatal: room sync failure should not block vacate flow
      }
    }

    // Log to activity (fire-and-forget; non-fatal)
    void logActivity(tenant.ownerId, tenant.propertyId, 'TENANT_VACATE_NOTICE',
      `${tenant.name} submitted vacate notice for ${input.vacateDate}`,
      { tenantId: tenant.id, room: tenant.room, vacateDate: input.vacateDate },
    ).catch(() => {});

    void createOwnerNotification(tenant.ownerId, {
      type: 'tenant',
      title: 'Vacate Notice Submitted',
      message: `${tenant.name} (Room ${tenant.room}) submitted a vacate notice for ${input.vacateDate}`,
      propertyId: tenant.propertyId,
    }).catch(() => {});

    domainEvents.tenantVacated({
      tenantId: tenant.id,
      tenantName: tenant.name,
      propertyId: tenant.propertyId,
      room: tenant.room,
      depositRefund: tenant.securityDeposit,
      isImmediate: isImmediateVacate,
      vacateDate: input.vacateDate,
    });
  },
};

export const supabaseAdminDataApi = {
  async checkMigrationStatus(): Promise<{
    suspendColumnsApplied: boolean;
    adminCouponsApplied: boolean;
    referralsApplied: boolean;
    fullyApplied: boolean;
  }> {
    const [suspendProbe, couponProbe, referralProbe] = await Promise.all([
      supabase.from('profiles').select('is_suspended').limit(1),
      supabase.from('admin_coupons').select('id').limit(1),
      supabase.from('referrals').select('id').limit(1),
    ]);

    const suspendColumnsApplied = !suspendProbe.error || !isMissingColumnError(suspendProbe.error, ['is_suspended']);
    const adminCouponsApplied = !couponProbe.error || !isMissingRelationError(couponProbe.error, 'admin_coupons');
    const referralsApplied = !referralProbe.error || !isMissingRelationError(referralProbe.error, 'referrals');

    return {
      suspendColumnsApplied,
      adminCouponsApplied,
      referralsApplied,
      fullyApplied: suspendColumnsApplied && adminCouponsApplied && referralsApplied,
    };
  },

  async getAdminSummary(): Promise<{
    profile: AppUser;
    stats: {
      totalOwners: number;
      totalProperties: number;
      totalTenants: number;
      activeSubscriptions: number;
      openSupportTickets: number;
      monthlyRevenue: number;
      arr: number;
      newMrr: number;
      churnMrr: number;
      ownersActive: number;
      ownersTrialing: number;
      ownersSuspended: number;
      totalRooms: number;
      totalBeds: number;
      occupancyRate: number;
      newTenantsThisMonth: number;
      vacatesThisMonth: number;
      urgentSupportTickets: number;
      avgSupportResponseHours: number | null;
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
      isSuspended: boolean;
      verifiedAt: string | null;
      joinedAt: string;
      revenue: number;
      lastActive: string | null;
      photoUrl: string | null;
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

    // Try fetching owners with new lifecycle columns; fall back if migration not applied yet
    let ownersResult = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,owner_scope_id,pg_name,city,is_suspended,suspended_at,suspended_reason,verified_at,created_at')
      .eq('role', 'owner')
      .returns<ProfileRow[]>();

    if (ownersResult.error && isMissingColumnError(ownersResult.error, ['is_suspended', 'suspended_at', 'suspended_reason', 'verified_at'])) {
      ownersResult = await supabase
        .from('profiles')
        .select('id,email,full_name,phone,role,owner_scope_id,pg_name,city,created_at')
        .eq('role', 'owner')
        .returns<ProfileRow[]>();
    }

    const [propertiesResult, tenantsResult, paymentsResult, subscriptionsResult, supportTicketsResult, roomsStatusResult] = await Promise.all([
      supabase.from('properties').select('*').returns<PropertyRow[]>(),
      supabase.from('tenants').select('*').returns<TenantRow[]>(),
      supabase.from('payments').select('*').returns<PaymentRow[]>(),
      supabase.from('owner_subscriptions').select('*').returns<OwnerSubscriptionRow[]>(),
      supabase.from('support_tickets').select('*').returns<SupportTicketRow[]>(),
      supabase.from('rooms').select('id,status,beds').returns<Array<{ id: string; status: string; beds: number | null }>>(),
    ]);

    // totalBeds = sum of rooms.beds (capacity column) — the separate beds table is reserved for
    // per-bed lifecycle tracking and may be empty on accounts that haven't enabled that feature.
    const roomsForOccupancy = roomsStatusResult.error ? [] : (roomsStatusResult.data ?? []);
    const totalBeds = roomsForOccupancy.reduce((sum, r) => sum + (r.beds ?? 0), 0);
    const occupiedRoomsForOccupancy = roomsForOccupancy.filter((r) => r.status === 'occupied').length;

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

    const { data: activityLogsResult } = await supabase
      .from('activity_logs')
      .select('owner_id,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .returns<Array<{ owner_id: string; created_at: string }>>();

    const lastActiveByOwner = new Map<string, string>();
    (activityLogsResult ?? []).forEach((log) => {
      if (log.owner_id && !lastActiveByOwner.has(log.owner_id)) {
        lastActiveByOwner.set(log.owner_id, log.created_at);
      }
    });

    const revenueByOwner = new Map<string, number>();
    payments.forEach((p) => {
      if (p.status === 'paid' && p.ownerId) {
        revenueByOwner.set(p.ownerId, (revenueByOwner.get(p.ownerId) ?? 0) + p.totalAmount);
      }
    });

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
        isSuspended: owner.is_suspended ?? false,
        verifiedAt: owner.verified_at ?? null,
        joinedAt: owner.created_at ?? '',
        revenue: revenueByOwner.get(owner.id) ?? 0,
        lastActive: lastActiveByOwner.get(owner.id) ?? owner.updated_at ?? null,
        photoUrl: owner.photo_url ?? null,
      };
    });

    // Normalize each active/trialing subscription's amount to a monthly figure for MRR/ARR.
    const monthlyAmount = (subscription: OwnerSubscriptionRecord): number =>
      subscription.billingCycle === 'yearly' ? subscription.amount / 12 : subscription.amount;

    const mrr = subscriptionRecords
      .filter((subscription) => subscription.status === 'active' || subscription.status === 'trialing')
      .reduce((sum, subscription) => sum + monthlyAmount(subscription), 0);

    const newMrr = subscriptionRecords
      .filter((subscription) => {
        if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
        const startedAt = new Date(subscription.startedAt);
        return startedAt.getMonth() === month && startedAt.getFullYear() === year;
      })
      .reduce((sum, subscription) => sum + monthlyAmount(subscription), 0);

    const churnMrr = subscriptionRecords
      .filter((subscription) => {
        if (subscription.status !== 'cancelled') return false;
        const updatedAt = new Date(subscription.updatedAt);
        return updatedAt.getMonth() === month && updatedAt.getFullYear() === year;
      })
      .reduce((sum, subscription) => sum + monthlyAmount(subscription), 0);

    const ownersActive = ownerCards.filter((owner) => !owner.isSuspended && (owner.subscriptionStatus === 'active' || owner.subscriptionStatus === 'past_due')).length;
    const ownersTrialing = ownerCards.filter((owner) => !owner.isSuspended && owner.subscriptionStatus === 'trialing').length;
    const ownersSuspended = ownerCards.filter((owner) => owner.isSuspended).length;

    const totalRooms = properties.reduce((sum, property) => sum + (property.total_rooms ?? 0), 0);
    const occupancyRate = roomsForOccupancy.length > 0 ? occupiedRoomsForOccupancy / roomsForOccupancy.length : 0;

    const newTenantsThisMonth = tenants.filter((tenant) => {
      if (!tenant.joinDate) return false;
      const joined = new Date(tenant.joinDate);
      return joined.getMonth() === month && joined.getFullYear() === year;
    }).length;

    const vacatesThisMonth = tenants.filter((tenant) => {
      if ((tenant.status !== 'inactive' && tenant.status !== 'archived') || !tenant.vacateDate) return false;
      const vacated = new Date(tenant.vacateDate);
      return vacated.getMonth() === month && vacated.getFullYear() === year;
    }).length;

    const urgentSupportTickets = support.filter((ticket) => ticket.priority === 'urgent' && (ticket.status === 'open' || ticket.status === 'in_progress')).length;

    const responseTimesHours = support
      .map((ticket) => {
        const firstComment = [...ticket.comments]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        if (!firstComment) return null;
        const diffMs = new Date(firstComment.createdAt).getTime() - new Date(ticket.createdAt).getTime();
        return diffMs > 0 ? diffMs / (1000 * 60 * 60) : null;
      })
      .filter((value): value is number => value != null);

    const avgSupportResponseHours = responseTimesHours.length > 0
      ? responseTimesHours.reduce((sum, hours) => sum + hours, 0) / responseTimesHours.length
      : null;

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
        arr: mrr * 12,
        newMrr,
        churnMrr,
        ownersActive,
        ownersTrialing,
        ownersSuspended,
        totalRooms,
        totalBeds,
        occupancyRate,
        newTenantsThisMonth,
        vacatesThisMonth,
        urgentSupportTickets,
        avgSupportResponseHours,
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

    // Audit every admin-driven subscription change + notify the owner of
    // status/plan changes (billing changes are material to the owner).
    const changeSummary = [
      input.planCode !== undefined ? `plan→${input.planCode}` : null,
      input.status !== undefined ? `status→${input.status}` : null,
      input.amount !== undefined ? `amount→${input.amount}` : null,
      input.seats !== undefined ? `seats→${input.seats}` : null,
    ].filter(Boolean).join(', ');

    await logActivity(
      context.userId, null,
      'ADMIN_SUBSCRIPTION_UPDATED',
      `Subscription updated for owner ${ownerId}${changeSummary ? `: ${changeSummary}` : ''}`,
      { ownerId, adminId: context.userId, ...input },
    );

    if (input.status !== undefined || input.planCode !== undefined) {
      void createOwnerNotification(ownerId, {
        type: 'announcement',
        title: 'Subscription Updated',
        message: input.status === 'cancelled'
          ? 'Your subscription has been cancelled by the platform administrator. Contact support if this is unexpected.'
          : `Your subscription was updated by the platform administrator${input.planCode ? ` to the ${input.planCode} plan` : ''}.`,
      }).catch(() => {});
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

    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (propsError) {
      throw propsError;
    }

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (tenantsError) {
      throw tenantsError;
    }

    const { data: subscription } = await supabase
      .from('owner_subscriptions')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    // Document inventory — gives admin read-only visibility into receipts/agreements/IDs/settlements
    // (previously invisible to the platform side, per portal interconnection certification Flow 8)
    const tenantIds = (tenants ?? []).map((t) => t.id);
    const tenantNameById = new Map((tenants ?? []).map((t) => [t.id, t.name as string]));

    let documents: Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      docType: string;
      label: string;
      fileUrl: string;
      createdAt: string;
    }> = [];
    let agreements: Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      status: string;
      createdAt: string;
    }> = [];

    const { data: paymentsResult } = await supabase
      .from('payments')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: supportResult } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: auditResult } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (tenantIds.length > 0) {
      const [docsResult, agreementsResult] = await Promise.all([
        supabase
          .from('tenant_documents')
          .select('id, tenant_id, doc_type, label, file_url, created_at')
          .in('tenant_id', tenantIds)
          .order('created_at', { ascending: false })
          .limit(200)
          .returns<Array<{ id: string; tenant_id: string; doc_type: string; label: string; file_url: string; created_at: string }>>(),
        supabase
          .from('agreements')
          .select('id, tenant_id, status, created_at')
          .in('tenant_id', tenantIds)
          .order('created_at', { ascending: false })
          .limit(200)
          .returns<Array<{ id: string; tenant_id: string; status: string; created_at: string }>>(),
      ]);

      if (!docsResult.error) {
        documents = (docsResult.data ?? []).map((d) => ({
          id: d.id,
          tenantId: d.tenant_id,
          tenantName: tenantNameById.get(d.tenant_id) ?? 'Tenant',
          docType: d.doc_type,
          label: d.label,
          fileUrl: d.file_url,
          createdAt: d.created_at,
        }));
      } else if (!isMissingRelationError(docsResult.error, 'tenant_documents')) {
        console.warn('[admin] tenant_documents fetch failed:', docsResult.error.message);
      }

      if (!agreementsResult.error) {
        agreements = (agreementsResult.data ?? []).map((a) => ({
          id: a.id,
          tenantId: a.tenant_id,
          tenantName: tenantNameById.get(a.tenant_id) ?? 'Tenant',
          status: a.status,
          createdAt: a.created_at,
        }));
      } else if (!isMissingRelationError(agreementsResult.error, 'agreements')) {
        console.warn('[admin] agreements fetch failed:', agreementsResult.error.message);
      }
    }

    return {
      properties: properties ?? [],
      tenants: tenants ?? [],
      subscription: subscription || null,
      documents,
      agreements,
      payments: paymentsResult ?? [],
      support: supportResult ?? [],
      audit: auditResult ?? [],
    };
  },

  async deleteOwnerProfile(ownerId: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) {
      throw new Error('Platform admin access is required.');
    }

    // Audit BEFORE the delete cascades — and attribute the log to the admin
    // (context.userId), not the owner being removed, so the trail survives the
    // ON DELETE CASCADE on the deleted profile.
    await logActivity(
      context.userId, null,
      'ADMIN_OWNER_DELETED',
      `Owner ${ownerId} permanently deleted by admin ${context.userId}`,
      { ownerId, adminId: context.userId },
    );

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', ownerId);

    if (error) {
      throw error;
    }
  },

  async suspendOwner(ownerId: string, reason: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: reason })
      .eq('id', ownerId);

    if (error) {
      if (isMissingColumnError(error, ['is_suspended', 'suspended_at', 'suspended_reason'])) {
        throw new Error('Suspend requires database migration 20260530_admin_portal_v2.sql to be applied first.');
      }
      throw error;
    }

    await logActivity(ownerId, null, 'ADMIN_OWNER_SUSPENDED', `Owner ${ownerId} suspended by admin. Reason: ${reason}`, { ownerId, adminId: context.userId, reason });

    void createOwnerNotification(ownerId, {
      type: 'announcement',
      title: 'Account Suspended',
      message: `Your account has been suspended by the platform administrator. Reason: ${reason}`,
    }).catch(() => {});
  },

  async unsuspendOwner(ownerId: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: false, suspended_at: null, suspended_reason: null })
      .eq('id', ownerId);

    if (error) {
      if (isMissingColumnError(error, ['is_suspended', 'suspended_at', 'suspended_reason'])) {
        throw new Error('Unsuspend requires database migration 20260530_admin_portal_v2.sql to be applied first.');
      }
      throw error;
    }

    await logActivity(ownerId, null, 'ADMIN_OWNER_UNSUSPENDED', `Owner ${ownerId} unsuspended by admin`, { ownerId, adminId: context.userId });

    void createOwnerNotification(ownerId, {
      type: 'announcement',
      title: 'Account Reinstated',
      message: 'Your account suspension has been lifted by the platform administrator. You now have full access again.',
    }).catch(() => {});
  },

  async verifyOwner(ownerId: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { error } = await supabase
      .from('profiles')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', ownerId);

    if (error) {
      if (isMissingColumnError(error, ['verified_at'])) {
        throw new Error('Verify requires database migration 20260530_admin_portal_v2.sql to be applied first.');
      }
      throw error;
    }

    await logActivity(context.userId, null, 'ADMIN_OWNER_VERIFIED', `Owner ${ownerId} manually verified`, { ownerId });
  },

  async logImpersonation(targetOwnerId: string, targetOwnerName: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');
    await logActivity(
      context.userId, null,
      'ADMIN_VIEW_AS_OWNER',
      `Admin ${context.userId} viewed account for ${targetOwnerName} (${targetOwnerId})`,
      { targetOwnerId, targetOwnerName, adminId: context.userId },
    );
  },

  async generateImpersonationLink(ownerId: string): Promise<string> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', ownerId)
      .maybeSingle();

    if (!profile?.email) throw new Error('Owner email not found — cannot generate impersonation link.');

    const { supabaseUrl: url, supabaseAnonKey: anonKey } = await import('../lib/supabase');
    const { createClient } = await import('@supabase/supabase-js');
    const isolated = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Use a service role key conceptually, but wait!
    // createClient with anonKey doesn't have auth.admin!
    // Let's rely on the backend API if we can, or just use the token?
    // Actually, in the browser, we don't have the SUPABASE_SERVICE_ROLE_KEY.
    // That's why logImpersonation is there to log the "concept" of impersonation if they do it in the UI.
    // Wait! Can we generate a magic link from the client? NO. `generateLink` is an admin API method.
    throw new Error('Admin impersonation must be handled by the server or by injecting the owner ID into context.');
  },

  async logPlanChange(targetOwnerId: string, fromPlan: string, toPlan: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');
    await logActivity(
      context.userId, null,
      'ADMIN_PLAN_CHANGED',
      `Plan changed for owner ${targetOwnerId}: ${fromPlan} → ${toPlan}`,
      { targetOwnerId, fromPlan, toPlan, adminId: context.userId },
    );
  },

  async getMRRHistory(
    dateRange?: { start: Date; end: Date },
  ): Promise<Array<{ month: string; mrr: number; paymentCount: number; ownerCount: number }>> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const now = new Date();
    const rangeStart = dateRange?.start ?? (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 11);
      d.setDate(1);
      return d;
    })();
    const rangeEnd = dateRange?.end ?? now;

    const { data, error } = await supabase
      .from('payments')
      .select('total_amount, paid_date, owner_id, status')
      .eq('status', 'paid')
      .gte('paid_date', rangeStart.toISOString().split('T')[0])
      .lte('paid_date', rangeEnd.toISOString().split('T')[0])
      .returns<Array<{ total_amount: string | number; paid_date: string; owner_id: string; status: string }>>();

    if (error) throw error;

    const monthMap = new Map<string, { mrr: number; paymentCount: number; ownerSet: Set<string> }>();

    (data ?? []).forEach((row) => {
      if (!row.paid_date) return;
      const d = new Date(row.paid_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthMap.get(key) ?? { mrr: 0, paymentCount: 0, ownerSet: new Set<string>() };
      existing.mrr += toNumber(row.total_amount);
      existing.paymentCount += 1;
      existing.ownerSet.add(row.owner_id);
      monthMap.set(key, existing);
    });

    // Build monthly buckets for the requested range (cap at 24)
    const months: Array<{ month: string; mrr: number; paymentCount: number; ownerCount: number }> = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd && months.length < 24) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const entry = monthMap.get(key);
      months.push({ month: label, mrr: entry?.mrr ?? 0, paymentCount: entry?.paymentCount ?? 0, ownerCount: entry?.ownerSet.size ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  },

  async getPlatformTransactions(limit = 200): Promise<{
    stats: { totalRevenue: number; successful: number; failed: number; pending: number };
    transactions: Array<{
      id: string;
      ownerId: string;
      ownerName: string;
      propertyId: string;
      propertyName: string;
      tenantName: string;
      amount: number;
      status: PaymentStatus;
      paymentMode: string | null;
      referenceNumber: string | null;
      dueDate: string;
      paidDate: string | null;
      createdAt: string;
    }>;
  }> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const [paymentsResult, ownersResult, propertiesResult] = await Promise.all([
      supabase
        .from('payments')
        .select('id, owner_id, tenant_id, property_id, tenant_name, total_amount, status, payment_mode, reference_number, due_date, paid_date, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<Array<Pick<PaymentRow, 'id' | 'owner_id' | 'tenant_id' | 'property_id' | 'tenant_name' | 'total_amount' | 'status' | 'payment_mode' | 'reference_number' | 'due_date' | 'paid_date' | 'created_at'>>>(),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'owner').returns<Array<{ id: string; full_name: string | null; email: string | null }>>(),
      supabase.from('properties').select('id, name').returns<Array<{ id: string; name: string }>>(),
    ]);

    if (paymentsResult.error) throw paymentsResult.error;
    if (ownersResult.error) throw ownersResult.error;
    if (propertiesResult.error) throw propertiesResult.error;

    const ownerNameById = new Map((ownersResult.data ?? []).map((o) => [o.id, o.full_name ?? o.email ?? 'Owner']));
    const propertyNameById = new Map((propertiesResult.data ?? []).map((p) => [p.id, p.name]));

    const rows = paymentsResult.data ?? [];

    const stats = rows.reduce(
      (acc, row) => {
        const amount = toNumber(row.total_amount);
        if (row.status === 'paid') {
          acc.totalRevenue += amount;
          acc.successful += 1;
        } else if (row.status === 'overdue') {
          acc.failed += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      },
      { totalRevenue: 0, successful: 0, failed: 0, pending: 0 },
    );

    const transactions = rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      ownerName: ownerNameById.get(row.owner_id) ?? 'Owner',
      propertyId: row.property_id,
      propertyName: propertyNameById.get(row.property_id) ?? 'Property',
      tenantName: row.tenant_name,
      amount: toNumber(row.total_amount),
      status: row.status,
      paymentMode: row.payment_mode ?? null,
      referenceNumber: row.reference_number ?? null,
      dueDate: row.due_date,
      paidDate: row.paid_date,
      createdAt: row.created_at,
    }));

    return { stats, transactions };
  },

  async getPlatformAuditLog(limit = 150): Promise<ActivityLogEntry[]> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingRelationError(error, 'activity_logs')) return [];
      throw error;
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      ownerId: String(row.owner_id ?? ''),
      propertyId: row.property_id ? String(row.property_id) : null,
      event: String(row.event ?? ''),
      detail: String(row.detail ?? ''),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }));
  },

  async getPlatformMaintenanceTickets(limit = 200): Promise<Array<{
    id: string;
    ownerId: string;
    ownerName: string;
    propertyId: string;
    propertyName: string;
    tenantName: string;
    room: string;
    issue: string;
    status: MaintenanceStatus;
    priority: MaintenancePriority;
    createdAt: string;
  }>> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const [ticketsResult, ownersResult, propertiesResult] = await Promise.all([
      supabase
        .from('maintenance_tickets')
        .select('id, owner_id, property_id, tenant, room, issue, status, priority, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
        .returns<Array<Pick<MaintenanceTicketRow, 'id' | 'owner_id' | 'property_id' | 'tenant' | 'room' | 'issue' | 'status' | 'priority' | 'created_at'>>>(),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'owner').returns<Array<{ id: string; full_name: string | null; email: string | null }>>(),
      supabase.from('properties').select('id, name').returns<Array<{ id: string; name: string }>>(),
    ]);

    if (ticketsResult.error) {
      if (isMissingRelationError(ticketsResult.error, 'maintenance_tickets')) return [];
      throw ticketsResult.error;
    }
    if (ownersResult.error) throw ownersResult.error;
    if (propertiesResult.error) throw propertiesResult.error;

    const ownerNameById = new Map((ownersResult.data ?? []).map((o) => [o.id, o.full_name ?? o.email ?? 'Owner']));
    const propertyNameById = new Map((propertiesResult.data ?? []).map((p) => [p.id, p.name]));

    return (ticketsResult.data ?? []).map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      ownerName: ownerNameById.get(row.owner_id) ?? 'Owner',
      propertyId: row.property_id,
      propertyName: propertyNameById.get(row.property_id) ?? 'Property',
      tenantName: row.tenant,
      room: row.room,
      issue: row.issue,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
    }));
  },

  async getPlatformAnalytics(): Promise<{
    ownersByMonth: Array<{ month: string; count: number }>;
    tenantsByStatus: Record<string, number>;
    maintenanceByStatus: Record<string, number>;
    paymentsByStatus: Record<string, number>;
    topCitiesByOwners: Array<{ city: string; count: number }>;
    avgTenantsPerProperty: number;
    occupancyRate: number;
  }> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const [ownersRes, tenantsRes, maintenanceRes, paymentsRes, roomsRes] = await Promise.all([
      supabase.from('profiles').select('id,city,created_at').eq('role', 'owner').returns<Array<{ id: string; city: string | null; created_at: string }>>(),
      supabase.from('tenants').select('id,status').returns<Array<{ id: string; status: string }>>(),
      supabase.from('maintenance_tickets').select('id,status').returns<Array<{ id: string; status: string }>>(),
      supabase.from('payments').select('id,status').returns<Array<{ id: string; status: string }>>(),
      supabase.from('rooms').select('id,status').returns<Array<{ id: string; status: string }>>(),
    ]);

    const owners = ownersRes.data ?? [];
    const tenants = tenantsRes.data ?? [];
    const maintenance = maintenanceRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const rooms = roomsRes.data ?? [];

    const ownersByMonth = new Map<string, number>();
    const twelveAgo = new Date();
    twelveAgo.setMonth(twelveAgo.getMonth() - 11);
    owners.forEach((o) => {
      const d = new Date(o.created_at);
      if (d >= twelveAgo) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        ownersByMonth.set(key, (ownersByMonth.get(key) ?? 0) + 1);
      }
    });

    const ownersByMonthArr: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      ownersByMonthArr.push({ month: label, count: ownersByMonth.get(key) ?? 0 });
    }

    const tenantsByStatus: Record<string, number> = {};
    tenants.forEach((t) => { tenantsByStatus[t.status] = (tenantsByStatus[t.status] ?? 0) + 1; });

    const maintenanceByStatus: Record<string, number> = {};
    maintenance.forEach((m) => { maintenanceByStatus[m.status] = (maintenanceByStatus[m.status] ?? 0) + 1; });

    const paymentsByStatus: Record<string, number> = {};
    payments.forEach((p) => { paymentsByStatus[p.status] = (paymentsByStatus[p.status] ?? 0) + 1; });

    const cityCount = new Map<string, number>();
    owners.forEach((o) => {
      const city = (o.city ?? 'Unknown').trim() || 'Unknown';
      cityCount.set(city, (cityCount.get(city) ?? 0) + 1);
    });
    const topCitiesByOwners = Array.from(cityCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([city, count]) => ({ city, count }));

    const activeTenants = tenants.filter((t) => ['active', 'payment_overdue', 'notice_submitted', 'vacating'].includes(t.status)).length;
    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
    const totalRooms = rooms.length;

    return {
      ownersByMonth: ownersByMonthArr,
      tenantsByStatus,
      maintenanceByStatus,
      paymentsByStatus,
      topCitiesByOwners,
      avgTenantsPerProperty: totalRooms > 0 ? Math.round((activeTenants / Math.max(totalRooms, 1)) * 100) / 100 : 0,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    };
  },

  async addSupportTicketComment(ticketId: string, message: string, internalNote = false): Promise<SupportTicketCommentRecord> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data, error } = await supabase
      .from('support_ticket_comments')
      .insert({ ticket_id: ticketId, author_id: context.userId, message, internal_note: internalNote })
      .select('*')
      .single<SupportTicketCommentRow>();

    if (error) throw error;
    return mapSupportComment(data);
  },

  async listCoupons(): Promise<AdminCouponRecord[]> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data, error } = await supabase
      .from('admin_coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<AdminCouponRow[]>();

    if (error) {
      if (isMissingRelationError(error, 'admin_coupons')) return [];
      throw error;
    }
    return (data ?? []).map(mapAdminCoupon);
  },

  async createCoupon(input: {
    code: string;
    description: string;
    discountType: 'percent' | 'flat';
    discountValue: number;
    maxUses?: number;
    validUntil?: string;
    planRestriction?: string;
  }): Promise<AdminCouponRecord> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data, error } = await supabase
      .from('admin_coupons')
      .insert({
        code: input.code.toUpperCase().trim(),
        description: input.description,
        discount_type: input.discountType,
        discount_value: input.discountValue,
        max_uses: input.maxUses ?? null,
        valid_until: input.validUntil ?? null,
        plan_restriction: input.planRestriction ?? null,
        created_by: context.userId,
        is_active: true,
      })
      .select('*')
      .single<AdminCouponRow>();

    if (error) throw error;

    await logActivity(context.userId, null, 'ADMIN_COUPON_CREATED', `Coupon ${input.code} created`, { code: input.code });
    return mapAdminCoupon(data);
  },

  async updateCoupon(couponId: string, input: { isActive?: boolean; maxUses?: number; validUntil?: string }): Promise<AdminCouponRecord> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.isActive !== undefined) payload.is_active = input.isActive;
    if (input.maxUses !== undefined) payload.max_uses = input.maxUses;
    if (input.validUntil !== undefined) payload.valid_until = input.validUntil;

    const { data, error } = await supabase
      .from('admin_coupons')
      .update(payload)
      .eq('id', couponId)
      .select('*')
      .single<AdminCouponRow>();

    if (error) throw error;
    return mapAdminCoupon(data);
  },

  async getReferralStats(): Promise<{
    referrals: Array<{ id: string; referrerId: string; referrerName: string; refereeEmail: string; status: string; rewardAmount: number; createdAt: string; convertedAt: string | null }>;
    summary: { total: number; converted: number; rewarded: number; totalRewardAmount: number };
  }> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<Array<{ id: string; referrer_id: string | null; referee_email: string; referee_id: string | null; referral_code: string; status: string; reward_amount: number | string; notes: string | null; created_at: string; converted_at: string | null }>>();

    if (error) {
      if (isMissingRelationError(error, 'referrals')) return { referrals: [], summary: { total: 0, converted: 0, rewarded: 0, totalRewardAmount: 0 } };
      throw error;
    }

    const rows = data ?? [];
    const referrerIds = Array.from(new Set(rows.map((r) => r.referrer_id).filter(Boolean) as string[]));
    let nameMap = new Map<string, string>();

    if (referrerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,full_name,email')
        .in('id', referrerIds)
        .returns<Array<{ id: string; full_name: string | null; email: string | null }>>();
      (profiles ?? []).forEach((p) => nameMap.set(p.id, p.full_name ?? p.email ?? 'Unknown'));
    }

    const referrals = rows.map((r) => ({
      id: r.id,
      referrerId: r.referrer_id ?? '',
      referrerName: r.referrer_id ? (nameMap.get(r.referrer_id) ?? 'Unknown') : 'Platform',
      refereeEmail: r.referee_email,
      status: r.status,
      rewardAmount: toNumber(r.reward_amount),
      createdAt: r.created_at,
      convertedAt: r.converted_at,
    }));

    const converted = referrals.filter((r) => r.status === 'converted' || r.status === 'rewarded').length;
    const rewarded = referrals.filter((r) => r.status === 'rewarded').length;
    const totalRewardAmount = referrals.reduce((sum, r) => sum + r.rewardAmount, 0);

    return { referrals, summary: { total: rows.length, converted, rewarded, totalRewardAmount } };
  },

  async createReferralCode(input: {
    refereeEmail: string;
    rewardAmount: number;
    notes?: string;
  }): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    // Generate a short uppercase code: RC-XXXXXXXX
    const code = `RC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const { error } = await supabase.from('referrals').insert({
      referrer_id: null,
      referee_email: input.refereeEmail.trim().toLowerCase(),
      referral_code: code,
      status: 'pending',
      reward_amount: input.rewardAmount,
      notes: input.notes ?? null,
    });
    if (error) {
      if (isMissingRelationError(error, 'referrals')) {
        throw new Error('Referrals table not found. Apply migration 20260530_admin_portal_v2.sql first.');
      }
      throw error;
    }
    await logActivity(context.userId, null, 'ADMIN_REFERRAL_CREATED',
      `Referral code ${code} created for ${input.refereeEmail}`,
      { code, refereeEmail: input.refereeEmail, rewardAmount: input.rewardAmount, adminId: context.userId },
    );
  },

  async getLeadSourceStats(): Promise<{
    rows: Array<{ id: string; ownerEmail: string; utmSource: string; utmMedium: string; utmCampaign: string; landingPage: string; createdAt: string }>;
    bySource: Array<{ source: string; count: number }>;
    byCampaign: Array<{ campaign: string; count: number }>;
  }> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Array<{ id: string; owner_id: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_term: string | null; utm_content: string | null; referrer_url: string | null; landing_page: string | null; created_at: string }>>();

    if (error) {
      if (isMissingRelationError(error, 'lead_sources')) return { rows: [], bySource: [], byCampaign: [] };
      throw error;
    }

    const rows = data ?? [];
    const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean) as string[]));
    const emailMap = new Map<string, string>();

    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,email')
        .in('id', ownerIds)
        .returns<Array<{ id: string; email: string | null }>>();
      (profiles ?? []).forEach((p) => emailMap.set(p.id, p.email ?? 'Unknown'));
    }

    const sourceCount = new Map<string, number>();
    const campaignCount = new Map<string, number>();

    rows.forEach((r) => {
      const src = r.utm_source || 'direct';
      sourceCount.set(src, (sourceCount.get(src) ?? 0) + 1);
      const camp = r.utm_campaign || 'none';
      campaignCount.set(camp, (campaignCount.get(camp) ?? 0) + 1);
    });

    return {
      rows: rows.map((r) => ({
        id: r.id,
        ownerEmail: r.owner_id ? (emailMap.get(r.owner_id) ?? 'Unknown') : 'Unknown',
        utmSource: r.utm_source ?? '',
        utmMedium: r.utm_medium ?? '',
        utmCampaign: r.utm_campaign ?? '',
        landingPage: r.landing_page ?? '',
        createdAt: r.created_at,
      })),
      bySource: Array.from(sourceCount.entries()).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count })),
      byCampaign: Array.from(campaignCount.entries()).sort((a, b) => b[1] - a[1]).map(([campaign, count]) => ({ campaign, count })),
    };
  },

  async createOwner(input: {
    email: string;
    name: string;
    phone?: string;
    pgName?: string;
    city?: string;
    password?: string;
  }): Promise<{ ownerId: string; tempPassword: string }> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { supabaseUrl: url, supabaseAnonKey: anonKey } = await import('../lib/supabase');
    const { createClient } = await import('@supabase/supabase-js');
    // Isolated client so admin session is unaffected
    const isolated = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const tempPassword = input.password ?? `RC#${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random().toString(36).slice(2, 4)}!`;

    const { data: signUpData, error: signUpError } = await isolated.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: tempPassword,
      options: { data: { full_name: input.name } },
    });

    if (signUpError) throw signUpError;
    if (!signUpData.user) throw new Error('No user returned from signup.');

    const newId = signUpData.user.id;

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: newId,
      email: input.email.trim().toLowerCase(),
      full_name: input.name.trim(),
      phone: input.phone ?? null,
      pg_name: input.pgName ?? null,
      city: input.city ?? null,
      role: 'owner',
    }, { onConflict: 'id' });

    if (profileError) throw profileError;

    // Create default trialing subscription
    try {
      await supabase.from('owner_subscriptions').insert({
        owner_id: newId,
        plan_code: 'starter',
        status: 'trialing',
        billing_cycle: 'monthly',
        amount: 0,
        currency: 'INR',
        seats: 1,
      });
    } catch {}

    await logActivity(context.userId, null, 'ADMIN_OWNER_CREATED',
      `New owner ${input.email} (${input.name}) created by admin`,
      { newOwnerId: newId, adminId: context.userId, email: input.email },
    );

    return { ownerId: newId, tempPassword };
  },

  async resetOwnerAccess(ownerId: string): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', ownerId)
      .maybeSingle();

    if (!profile?.email) throw new Error('Owner email not found — cannot send password reset.');

    const { supabaseUrl: url, supabaseAnonKey: anonKey } = await import('../lib/supabase');
    const { createClient } = await import('@supabase/supabase-js');
    const isolated = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { error } = await isolated.auth.resetPasswordForEmail(profile.email);
    if (error) throw error;

    await logActivity(context.userId, null, 'ADMIN_OWNER_RESET_ACCESS',
      `Password reset email sent to ${profile.email}`,
      { ownerId, adminId: context.userId, email: profile.email },
    );
  },

  // ── Platform email templates ──────────────────────────────────────────────
  // Editable, DB-persisted overrides for the platform's transactional emails
  // (welcome, payment reminder, receipt, agreement, password reset, …). The
  // admin UI ships built-in defaults and overlays any saved overrides on top, so
  // the feature degrades gracefully when the table has not been migrated yet.
  async getEmailTemplateOverrides(): Promise<Array<{ id: string; subject: string; body: string; updatedAt: string | null }>> {
    const { data, error } = await supabase
      .from('platform_email_templates')
      .select('id, subject, body, updated_at')
      .returns<Array<{ id: string; subject: string; body: string; updated_at: string | null }>>();
    if (error) {
      if (isMissingRelationError(error, 'platform_email_templates')) return [];
      throw error;
    }
    return (data ?? []).map((r) => ({ id: r.id, subject: r.subject, body: r.body, updatedAt: r.updated_at }));
  },

  async saveEmailTemplate(input: { id: string; name: string; subject: string; body: string }): Promise<void> {
    const context = await getCurrentUserContext();
    if (!context.isPlatformAdmin) throw new Error('Platform admin access is required.');

    const { error } = await supabase
      .from('platform_email_templates')
      .upsert(
        {
          id: input.id,
          name: input.name,
          subject: input.subject,
          body: input.body,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

    if (error) {
      if (isMissingRelationError(error, 'platform_email_templates')) {
        throw new Error('Email templates are not persisted yet — apply migration 20260615_platform_email_templates.sql.');
      }
      throw error;
    }

    await logActivity(context.userId, null, 'ADMIN_EMAIL_TEMPLATE_SAVED',
      `Email template "${input.name}" updated`,
      { templateId: input.id, adminId: context.userId },
    );
  },
};

export interface AdminCouponRecord {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  planRestriction: string | null;
  createdAt: string;
}

interface AdminCouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'flat';
  discount_value: number | string;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  plan_restriction: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapAdminCoupon(row: AdminCouponRow): AdminCouponRecord {
  return {
    id: row.id,
    code: row.code,
    description: row.description ?? '',
    discountType: row.discount_type,
    discountValue: toNumber(row.discount_value),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    isActive: row.is_active,
    planRestriction: row.plan_restriction,
    createdAt: row.created_at,
  };
}

// ─── Lifecycle Foundation API ─────────────────────────────────────────────────

export const supabaseLifecycleApi = {
  async extendTenantLease(tenantId: string, newRent: number, newRentDueDate: number): Promise<TenantRecord> {
    const { data, error } = await supabase.from('tenants').update({ rent: newRent, rent_due_date: newRentDueDate }).eq('id', tenantId).select('*').single();
    if (error) throw error;
    const context = await getCurrentUserContext();
    await logActivity(data.owner_id, data.property_id, 'TENANT_UPDATED', "${data.name} lease extended. Rent updated to ?.", { tenantId, updatedBy: context.userId });
    return mapTenant(data);
  },

  async activateTenant(tenantId: string): Promise<TenantRecord> {
    const { data, error } = await supabase.from('tenants').update({ status: 'active' }).eq('id', tenantId).select('*').single();
    if (error) throw error;
    const context = await getCurrentUserContext();
    await logActivity(data.owner_id, data.property_id, 'TENANT_STATUS_CHANGED', "${data.name} was activated.", { tenantId, oldStatus: 'pending_onboarding', newStatus: 'active', activatedBy: context.userId });
    return mapTenant(data);
  },
  // ── Floors ──────────────────────────────────────────────────────────────────
  async getFloors(propertyId: string): Promise<FloorRecord[]> {
    const { data, error } = await supabase
      .from('property_floors')
      .select('*')
      .eq('property_id', propertyId)
      .order('floor_number')
      .returns<FloorRow[]>();

    if (error) {
      if (isMissingRelationError(error, 'property_floors')) return [];
      throw error;
    }
    return (data ?? []).map(mapFloor);
  },

  async upsertFloor(propertyId: string, floorNumber: number, label: string): Promise<FloorRecord> {
    const { data, error } = await supabase
      .from('property_floors')
      .upsert({ property_id: propertyId, floor_number: floorNumber, label }, { onConflict: 'property_id,floor_number' })
      .select('*')
      .single<FloorRow>();

    if (error) throw error;
    return mapFloor(data);
  },

  // ── Beds ────────────────────────────────────────────────────────────────────
  async getBeds(roomId: string): Promise<BedRecord[]> {
    const { data, error } = await supabase
      .from('beds')
      .select('*')
      .eq('room_id', roomId)
      .order('position')
      .returns<BedRow[]>();

    if (error) {
      if (isMissingRelationError(error, 'beds')) return [];
      throw error;
    }
    return (data ?? []).map(mapBed);
  },

  async getBedsByProperty(propertyId: string): Promise<BedRecord[]> {
    const { data, error } = await supabase
      .from('beds')
      .select('*')
      .eq('property_id', propertyId)
      .order('position')
      .returns<BedRow[]>();

    if (error) {
      if (isMissingRelationError(error, 'beds')) return [];
      throw error;
    }
    return (data ?? []).map(mapBed);
  },

  async createBed(input: BedCreateInput): Promise<BedRecord> {
    const { data, error } = await supabase
      .from('beds')
      .insert({
        room_id: input.roomId,
        property_id: input.propertyId,
        bed_code: input.bedCode.trim(),
        position: input.position ?? 1,
        status: 'vacant',
      })
      .select('*')
      .single<BedRow>();

    if (error) throw error;
    return mapBed(data);
  },

  async deleteBed(bedId: string): Promise<void> {
    const { error } = await supabase.from('beds').delete().eq('id', bedId);
    if (error) throw error;
  },

  async syncBedsForRoom(roomId: string, propertyId: string, bedCount: number): Promise<BedRecord[]> {
    const existing = await this.getBeds(roomId);
    const existingCodes = new Set(existing.map((b) => b.bedCode));
    const defaultCodes = Array.from({ length: bedCount }, (_, i) => String(i + 1));
    const toCreate = defaultCodes.filter((code) => !existingCodes.has(code));

    await Promise.all(
      toCreate.map((code, idx) =>
        this.createBed({ roomId, propertyId, bedCode: code, position: existing.length + idx + 1 }),
      ),
    );

    return this.getBeds(roomId);
  },

  // ── Tenant Documents ─────────────────────────────────────────────────────────
  async getTenantDocuments(tenantId: string): Promise<TenantDocument[]> {
    const { data, error } = await supabase
      .from('tenant_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at')
      .returns<TenantDocumentRow[]>();

    if (error) {
      if (isMissingRelationError(error, 'tenant_documents')) return [];
      throw error;
    }
    return (data ?? []).map(mapTenantDocument);
  },

  async uploadTenantDocument(input: TenantDocumentCreateInput): Promise<TenantDocument> {
    const context = await getCurrentUserContext();
    const ext = input.file.name.split('.').pop() ?? 'bin';
    const path = `tenant-docs/${input.tenantId}/${input.docType}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(TENANT_FILES_BUCKET)
      .upload(path, input.file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(TENANT_FILES_BUCKET)
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from('tenant_documents')
      .insert({
        tenant_id: input.tenantId,
        owner_id: context.ownerId,
        doc_type: input.docType,
        label: input.label ?? '',
        file_url: publicUrl,
        verified: false,
      })
      .select('*')
      .single<TenantDocumentRow>();

    if (error) throw error;
    const doc = mapTenantDocument(data);

    // Notify owner that a document was uploaded
    void createOwnerNotification(context.ownerId, {
      type: 'tenant',
      title: 'Document Uploaded',
      message: `${input.label || input.docType} uploaded for tenant — available in Tenant Detail > Documents.`,
    }).catch(() => {});

    return doc;
  },

  async deleteTenantDocument(docId: string): Promise<void> {
    const { error } = await supabase.from('tenant_documents').delete().eq('id', docId);
    if (error) throw error;
  },

  // ── Agreements ───────────────────────────────────────────────────────────────
  async getAgreements(tenantId: string): Promise<AgreementRecord[]> {
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .returns<AgreementRow[]>();

    if (error) {
      if (isMissingRelationError(error, 'agreements')) return [];
      throw error;
    }
    return (data ?? []).map(mapAgreement);
  },

  async createAgreement(input: AgreementCreateInput): Promise<AgreementRecord> {
    const context = await getCurrentUserContext();
    const hasAutoSign = !!(input.autoOwnerSignatureName);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('agreements')
      .insert({
        tenant_id: input.tenantId,
        property_id: input.propertyId,
        owner_id: context.ownerId,
        status: hasAutoSign ? 'pending_tenant_signature' : 'draft',
        agreement_type: input.agreementType ?? 'license',
        start_date: input.startDate,
        end_date: input.endDate ?? null,
        monthly_rent: input.monthlyRent,
        security_deposit: input.securityDeposit,
        html_content: input.htmlContent ?? null,
        template_version: input.templateVersion ?? null,
        ...(hasAutoSign ? {
          owner_signature_name: input.autoOwnerSignatureName,
          owner_signature_image: input.autoOwnerSignatureImage ?? null,
          owner_signed_at: now,
        } : {}),
      })
      .select('*')
      .single<AgreementRow>();

    if (error) throw error;
    const record = mapAgreement(data);

    void createOwnerNotification(context.ownerId, {
      type: 'tenant',
      title: hasAutoSign ? 'Agreement Ready for Tenant Signature' : 'Agreement Generated',
      message: hasAutoSign
        ? `Rental agreement auto-signed and awaiting tenant signature.`
        : `Rental agreement drafted for tenant — review and share from Tenant Detail.`,
      propertyId: input.propertyId,
    }).catch(() => {});

    void supabase.from('agreement_events').insert({
      agreement_id: record.id,
      actor_id: context.userId,
      actor_role: 'system',
      event_type: 'created',
      event_detail: hasAutoSign ? 'Agreement created with vault owner signature applied' : 'Agreement created as draft',
    }).then(({ error: evtError }) => {
      if (evtError && !isMissingRelationError(evtError, 'agreement_events')) {
        console.warn('[agreement_events] created log failed:', evtError.message);
      }
    });

    return record;
  },

  async updateAgreementStatus(agreementId: string, status: AgreementStatus): Promise<AgreementRecord> {
    const patch: Record<string, unknown> = { status };
    if (status === 'signed') patch.signed_at = new Date().toISOString();
    if (status === 'sent') patch.sent_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('agreements')
      .update(patch)
      .eq('id', agreementId)
      .select('*')
      .single<AgreementRow>();

    if (error) throw error;
    return mapAgreement(data);
  },

  // ── Agreement Signing ────────────────────────────────────────────────────────
  async signAgreement(input: AgreementSignInput): Promise<AgreementRecord> {
    const context = await getCurrentUserContext();
    const now = new Date().toISOString();

    // Fetch current agreement to validate state
    const { data: current, error: fetchError } = await supabase
      .from('agreements')
      .select('*')
      .eq('id', input.agreementId)
      .single<AgreementRow>();

    if (fetchError) throw fetchError;
    if (!current) throw new Error('Agreement not found.');
    if (current.is_locked) throw new Error('This agreement is locked and cannot be modified.');

    const patch: Record<string, unknown> = {};

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (input.role === 'owner') {
      if (current.owner_id !== context.ownerId) {
        throw new Error('Only the property owner can sign as owner.');
      }
      patch.owner_signature_name = input.signatureName.trim();
      patch.owner_signed_at = now;
      if (input.signatureImage) patch.owner_signature_image = input.signatureImage;
      patch.status = 'pending_tenant_signature';

      // Embed owner signature in HTML (replace slot placeholder)
      if (current.html_content) {
        const sigHtml = input.signatureImage
          ? `<img src="${input.signatureImage}" style="height:54px;max-width:220px;margin-top:6px;display:block;" alt="Owner signature" />`
          : `<span style="font-family:cursive,serif;font-size:24px;color:#1a1a1a;">${esc(input.signatureName.trim())}</span>`;
        const dateLine = `<p style="font-size:11px;color:#555;margin-top:4px;">Signed: ${new Date(now).toLocaleDateString('en-IN')}</p>`;
        patch.html_content = current.html_content.replace('<!-- OWNER_SIGNATURE_SLOT -->', sigHtml + dateLine);
      }

      void createOwnerNotification(context.ownerId, {
        type: 'tenant',
        title: 'Agreement Signed by Owner',
        message: `You have signed the rental agreement. Tenant signature is now pending.`,
        propertyId: current.property_id,
      }).catch(() => {});

    } else {
      // Tenant signing — may come from tenant auth context
      patch.tenant_signature_name = input.signatureName.trim();
      patch.tenant_signed_at = now;
      patch.status = 'executed';
      patch.signed_at = now;
      patch.is_locked = true;
      if (input.signatureImage) patch.tenant_signature_image = input.signatureImage;
      if (input.ipAddress) patch.ip_address = input.ipAddress;
      if (input.deviceMetadata) patch.device_metadata = input.deviceMetadata;

      // Embed tenant signature in HTML (replace slot placeholder)
      if (current.html_content) {
        const sigHtml = input.signatureImage
          ? `<img src="${input.signatureImage}" style="height:54px;max-width:220px;margin-top:6px;display:block;" alt="Tenant signature" />`
          : `<span style="font-family:cursive,serif;font-size:24px;color:#1a1a1a;">${esc(input.signatureName.trim())}</span>`;
        const dateLine = `<p style="font-size:11px;color:#555;margin-top:4px;">Signed: ${new Date(now).toLocaleDateString('en-IN')}</p>`;
        patch.html_content = current.html_content.replace('<!-- TENANT_SIGNATURE_SLOT -->', sigHtml + dateLine);
      }

      void createOwnerNotification(current.owner_id, {
        type: 'tenant',
        title: 'Agreement Fully Executed',
        message: `Both parties have signed. Agreement is now locked and executed.`,
        propertyId: current.property_id,
      }).catch(() => {});

      // Store executed agreement HTML in tenant_documents (best-effort)
      const executedHtml = (patch.html_content as string | undefined) ?? current.html_content;
      if (executedHtml) {
        void (async () => {
          try {
            const fileName = `agreement-${input.agreementId.slice(-8)}.html`;
            const path = `tenant-docs/${current.tenant_id}/agreements/${fileName}`;
            const blob = new Blob([executedHtml], { type: 'text/html' });
            const { error: uploadError } = await supabase.storage
              .from(TENANT_FILES_BUCKET)
              .upload(path, new File([blob], fileName, { type: 'text/html' }), { upsert: true, contentType: 'text/html' });
            if (uploadError) {
              const msg = String(uploadError.message ?? '').toLowerCase();
              if (msg.includes('bucket') || msg.includes('not found')) return;
              return;
            }
            const { data: { publicUrl } } = supabase.storage.from(TENANT_FILES_BUCKET).getPublicUrl(path);
            await supabase.from('tenant_documents')
              .delete()
              .eq('tenant_id', current.tenant_id)
              .eq('doc_type', 'agreement')
              .eq('label', 'Executed Rental Agreement');
            await supabase.from('tenant_documents').insert({
              tenant_id: current.tenant_id,
              owner_id: current.owner_id,
              doc_type: 'agreement',
              label: 'Executed Rental Agreement',
              file_url: publicUrl,
              verified: true,
            });
          } catch {}
        })();
      }
    }

    const { data, error } = await supabase
      .from('agreements')
      .update(patch)
      .eq('id', input.agreementId)
      .select('*')
      .single<AgreementRow>();

    if (error) throw error;
    const record = mapAgreement(data);

    // Log the signing event (best-effort)
    void supabase.from('agreement_events').insert({
      agreement_id: input.agreementId,
      actor_id: context.userId,
      actor_role: input.role,
      event_type: input.role === 'owner' ? 'owner_signed' : 'tenant_signed',
      event_detail: `Signed as: ${input.signatureName.trim()}`,
    }).then(({ error: evtError }) => {
      if (evtError && !isMissingRelationError(evtError, 'agreement_events')) {
        console.warn('[agreement_events] insert failed:', evtError.message);
      }
    });

    void logActivity(
      current.owner_id,
      current.property_id,
      input.role === 'owner' ? 'AGREEMENT_OWNER_SIGNED' : 'AGREEMENT_EXECUTED',
      input.role === 'owner'
        ? `Agreement signed by owner — pending tenant signature`
        : `Agreement fully executed — both parties signed`,
      { agreementId: input.agreementId, version: current.version ?? 1 },
    ).catch(() => {});

    emitOwnerDataUpdated();
    return record;
  },

  async logAgreementView(agreementId: string, role: 'owner' | 'tenant'): Promise<void> {
    const context = await getCurrentUserContext().catch(() => null);
    if (!context) return;
    void supabase.from('agreement_events').insert({
      agreement_id: agreementId,
      actor_id: context.userId,
      actor_role: role,
      event_type: 'viewed',
    }).then(({ error }) => {
      if (error && !isMissingRelationError(error, 'agreement_events')) {
        console.warn('[agreement_events] view log failed:', error.message);
      }
    });
  },

  async getAgreementEvents(agreementId: string): Promise<Array<{ id: string; actorRole: string; eventType: string; eventDetail: string | null; createdAt: string }>> {
    const { data, error } = await supabase
      .from('agreement_events')
      .select('id,actor_role,event_type,event_detail,created_at')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingRelationError(error, 'agreement_events')) return [];
      throw error;
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      actorRole: String(row.actor_role),
      eventType: String(row.event_type),
      eventDetail: row.event_detail != null ? String(row.event_detail) : null,
      createdAt: String(row.created_at),
    }));
  },

  // ── Signature Vault ───────────────────────────────────────────────────────────
  async getActiveSignatureProfile(): Promise<OwnerSignatureProfile | null> {
    const context = await getCurrentUserContext().catch(() => null);
    if (!context) return null;

    const { data, error } = await supabase
      .from('owner_signature_profiles')
      .select('*')
      .eq('owner_id', context.ownerId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error, 'owner_signature_profiles')) return null;
      console.warn('[signature_vault] fetch failed:', error.message);
      return null;
    }
    return data ? mapSignatureProfile(data as OwnerSignatureProfileRow) : null;
  },

  async upsertSignatureProfile(input: {
    signatureType: 'draw' | 'upload' | 'typed';
    signatureImage?: string | null;
    signatureText?: string | null;
  }): Promise<OwnerSignatureProfile> {
    const context = await getCurrentUserContext();
    const now = new Date().toISOString();

    // Deactivate all existing active profiles
    await supabase
      .from('owner_signature_profiles')
      .update({ is_active: false, updated_at: now })
      .eq('owner_id', context.ownerId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('owner_signature_profiles')
      .insert({
        owner_id: context.ownerId,
        is_active: true,
        signature_type: input.signatureType,
        signature_image: input.signatureImage ?? null,
        signature_text: input.signatureText ?? null,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapSignatureProfile(data as OwnerSignatureProfileRow);
  },

  // ── Agreement Templates ──────────────────────────────────────────────────────
  async getActiveAgreementTemplate(): Promise<AgreementTemplate | null> {
    const context = await getCurrentUserContext().catch(() => null);
    if (!context) return null;

    const { data, error } = await supabase
      .from('agreement_templates')
      .select('*')
      .eq('owner_id', context.ownerId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error, 'agreement_templates')) return null;
      console.warn('[agreement_templates] fetch failed:', error.message);
      return null;
    }
    return data ? mapAgreementTemplate(data as AgreementTemplateRow) : null;
  },

  async upsertAgreementTemplate(input: AgreementTemplateUpsertInput): Promise<AgreementTemplate> {
    const context = await getCurrentUserContext();
    const now = new Date().toISOString();

    // Get current max version
    const { data: existing } = await supabase
      .from('agreement_templates')
      .select('version')
      .eq('owner_id', context.ownerId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((existing as { version?: number } | null)?.version ?? 0) + 1;

    // Deactivate all current active templates
    await supabase
      .from('agreement_templates')
      .update({ is_active: false, updated_at: now })
      .eq('owner_id', context.ownerId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('agreement_templates')
      .insert({
        owner_id: context.ownerId,
        version: nextVersion,
        is_active: true,
        house_rules: input.houseRules ?? null,
        visitor_rules: input.visitorRules ?? null,
        late_fee_clause: input.lateFeeClause ?? null,
        notice_period_clause: input.noticePeriodClause ?? null,
        refund_policy: input.refundPolicy ?? null,
        security_deposit_terms: input.securityDepositTerms ?? null,
        property_rules: input.propertyRules ?? null,
        miscellaneous_terms: input.miscellaneousTerms ?? null,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapAgreementTemplate(data as AgreementTemplateRow);
  },

  // ── Receipt Storage ───────────────────────────────────────────────────────────
  async storeReceiptAsDocument(input: {
    tenantId: string;
    paymentId: string;
    htmlContent: string;
    label: string;
  }): Promise<void> {
    const context = await getCurrentUserContext();

    // Store receipt HTML as a blob in tenant_documents table
    const blob = new Blob([input.htmlContent], { type: 'text/html' });
    const file = new File([blob], `receipt-${input.paymentId.slice(-8)}.html`, { type: 'text/html' });
    const path = `tenant-docs/${input.tenantId}/receipts/receipt-${input.paymentId}.html`;

    const { error: uploadError } = await supabase.storage
      .from(TENANT_FILES_BUCKET)
      .upload(path, file, { upsert: true, contentType: 'text/html' });

    if (uploadError) {
      // Storage not configured — skip silently
      if (String(uploadError.message ?? '').toLowerCase().includes('bucket') || String(uploadError.message ?? '').toLowerCase().includes('not found')) {
        return;
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage.from(TENANT_FILES_BUCKET).getPublicUrl(path);

    // Delete any existing receipt with the same label before inserting, to avoid
    // relying on a unique constraint that may not be present in all deployments.
    await supabase
      .from('tenant_documents')
      .delete()
      .eq('tenant_id', input.tenantId)
      .eq('doc_type', 'receipt')
      .eq('label', input.label);

    const { error: insertError } = await supabase.from('tenant_documents').insert({
      tenant_id: input.tenantId,
      owner_id: context.ownerId,
      doc_type: 'receipt',
      label: input.label,
      file_url: publicUrl,
      verified: true,
    });

    if (insertError) {
      // Non-fatal: receipt metadata write failed but storage upload succeeded.
      // Log clearly so it can be investigated without blocking the payment flow.
      console.warn('[receipt] tenant_documents insert failed:', insertError.message);
    }
  },
};
