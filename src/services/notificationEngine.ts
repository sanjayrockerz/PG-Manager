/**
 * Event-driven Notification Engine.
 *
 * Notifications are NEVER manually inserted.
 * They are generated automatically from domain events:
 *   MAINTENANCE_CREATED → maintenance notification
 *   MAINTENANCE_RESOLVED → maintenance notification
 *   PAYMENT_OVERDUE → payment notification
 *   TENANT_ASSIGNED → tenant notification
 *   TENANT_VACATED → tenant notification
 *   ANNOUNCEMENT_CREATED → announcement notification
 *   CSV_IMPORT_COMPLETED → system notification
 *
 * Architecture: subscribes to the event bus, writes to the demo store,
 * and dispatches the NOTIFICATION_GENERATED event so the bell re-renders.
 */

import type { NotificationRecord, NotificationType } from './supabaseData';
import { subscribe, domainEvents } from './eventBus';

// ─── Demo store coupling ──────────────────────────────────────────────────────
// We import read/write functions lazily to avoid circular deps at module load.
// The engine is initialized once via `initNotificationEngine()`.

type NotificationStore = {
  push: (n: NotificationRecord) => void;
  getAll: () => NotificationRecord[];
  markRead: (id: string) => void;
  markAllRead: () => void;
};

let store: NotificationStore | null = null;

const DEMO_NOTIF_KEY = 'pg-manager:notifications-v1';
const MAX_NOTIFICATIONS = 100;

const createId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── In-memory + localStorage store ──────────────────────────────────────────

function readFromStorage(): NotificationRecord[] {
  try {
    const raw = localStorage.getItem(DEMO_NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as NotificationRecord[];
  } catch {
    return [];
  }
}

function writeToStorage(records: NotificationRecord[]): void {
  try {
    localStorage.setItem(DEMO_NOTIF_KEY, JSON.stringify(records.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // best-effort
  }
}

function broadcastChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pg:notifications:updated'));
    window.dispatchEvent(new CustomEvent('owner-data-updated'));
  }
}

function createDemoNotificationStore(): NotificationStore {
  let records = readFromStorage();

  return {
    push(n: NotificationRecord) {
      records = [n, ...records].slice(0, MAX_NOTIFICATIONS);
      writeToStorage(records);
      broadcastChange();
      domainEvents.notificationGenerated({ type: n.type, title: n.title, propertyId: n.propertyId ?? null });
    },
    getAll() {
      records = readFromStorage();
      return records;
    },
    markRead(id: string) {
      records = records.map((r) => r.id === id ? { ...r, read: true } : r);
      writeToStorage(records);
      broadcastChange();
    },
    markAllRead() {
      records = records.map((r) => ({ ...r, read: true }));
      writeToStorage(records);
      broadcastChange();
    },
  };
}

function makeNotification(
  type: NotificationType,
  title: string,
  message: string,
  opts?: { entityType?: string; entityId?: string; propertyId?: string | null },
): NotificationRecord {
  return {
    id: createId(),
    ownerId: 'demo-owner-1',
    type,
    title,
    message,
    entityType: opts?.entityType,
    entityId: opts?.entityId,
    propertyId: opts?.propertyId,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

// ─── Engine lifecycle ─────────────────────────────────────────────────────────

let initialized = false;

export function initNotificationEngine(): void {
  if (initialized) return;
  initialized = true;

  store = createDemoNotificationStore();

  // Maintenance created
  subscribe<{ ticketId: string; propertyId: string; issue: string; tenant: string; priority: string }>(
    'MAINTENANCE_CREATED',
    ({ payload }) => {
      store!.push(makeNotification(
        'maintenance',
        `New ticket: ${payload.issue}`,
        `Reported by ${payload.tenant} · Priority: ${payload.priority.toUpperCase()}`,
        { entityType: 'maintenance_ticket', entityId: payload.ticketId, propertyId: payload.propertyId },
      ));
    },
  );

  // Maintenance resolved
  subscribe<{ ticketId: string; propertyId: string; issue: string; tenant: string }>(
    'MAINTENANCE_RESOLVED',
    ({ payload }) => {
      store!.push(makeNotification(
        'maintenance',
        `Ticket resolved: ${payload.issue}`,
        `Issue for ${payload.tenant} has been resolved`,
        { entityType: 'maintenance_ticket', entityId: payload.ticketId, propertyId: payload.propertyId },
      ));
    },
  );

  // Payment overdue
  subscribe<{ tenantId: string; propertyId: string; tenantName: string; amount: number }>(
    'PAYMENT_OVERDUE',
    ({ payload }) => {
      store!.push(makeNotification(
        'payment',
        `Overdue: ₹${payload.amount.toLocaleString('en-IN')}`,
        `${payload.tenantName} has an overdue payment`,
        { entityType: 'payment', entityId: payload.tenantId, propertyId: payload.propertyId },
      ));
    },
  );

  // Tenant assigned
  subscribe<{ tenantId: string; tenantName: string; propertyId: string; room: string; bed: string }>(
    'TENANT_ASSIGNED',
    ({ payload }) => {
      store!.push(makeNotification(
        'tenant',
        `Tenant onboarded: ${payload.tenantName}`,
        `Room ${payload.room}, Bed ${payload.bed}`,
        { entityType: 'tenant', entityId: payload.tenantId, propertyId: payload.propertyId },
      ));
    },
  );

  // Tenant vacated
  subscribe<{ tenantId: string; tenantName: string; propertyId: string; room: string; depositRefund: number; isImmediate?: boolean }>(
    'TENANT_VACATED',
    ({ payload }) => {
      const isImmediate = payload.isImmediate !== false;
      store!.push(makeNotification(
        'tenant',
        isImmediate
          ? `${payload.tenantName} has vacated`
          : `Vacate notice from ${payload.tenantName}`,
        isImmediate
          ? `Room ${payload.room} is now available · Refund ₹${payload.depositRefund.toLocaleString('en-IN')}`
          : `Room ${payload.room} · Scheduled move-out`,
        { entityType: 'tenant', entityId: payload.tenantId, propertyId: payload.propertyId },
      ));
    },
  );

  // Deposit settled
  subscribe<{ tenantId: string; tenantName: string; propertyId: string; securityDeposit: number; totalDeduction: number; netRefund: number }>(
    'DEPOSIT_SETTLED',
    ({ payload }) => {
      store!.push(makeNotification(
        'payment',
        `Deposit settled: ${payload.tenantName}`,
        `₹${payload.netRefund.toLocaleString('en-IN')} refund after ₹${payload.totalDeduction.toLocaleString('en-IN')} deductions`,
        { entityType: 'tenant', entityId: payload.tenantId, propertyId: payload.propertyId },
      ));
    },
  );

  // Payment received (marked paid)
  subscribe<{ tenantId: string; tenantName: string; propertyId: string; amount: number; paymentId: string }>(
    'PAYMENT_RECEIVED',
    ({ payload }) => {
      store!.push(makeNotification(
        'payment',
        `Payment received: ₹${payload.amount.toLocaleString('en-IN')}`,
        `From ${payload.tenantName}`,
        { entityType: 'payment', entityId: payload.paymentId, propertyId: payload.propertyId },
      ));
    },
  );

  // Team access changed
  subscribe<{ ownerId: string; targetEmail: string; action: 'invited' | 'revoked' | 'accepted' }>(
    'TEAM_ACCESS_CHANGED',
    ({ payload }) => {
      const titles: Record<string, string> = {
        invited: `Team invite sent`,
        accepted: `Team member joined`,
        revoked: `Team access revoked`,
      };
      const messages: Record<string, string> = {
        invited: `Invite sent to ${payload.targetEmail}`,
        accepted: `${payload.targetEmail} accepted the invite`,
        revoked: `Access removed for ${payload.targetEmail}`,
      };
      store!.push(makeNotification(
        'system',
        titles[payload.action] ?? 'Team access changed',
        messages[payload.action] ?? payload.targetEmail,
        { entityType: 'team', propertyId: null },
      ));
    },
  );

  // Announcement created
  subscribe<{ announcementId: string; propertyId: string | null; title: string; whatsappEnabled: boolean }>(
    'ANNOUNCEMENT_CREATED',
    ({ payload }) => {
      store!.push(makeNotification(
        'announcement',
        `Announcement published`,
        `"${payload.title}"${payload.whatsappEnabled ? ' · WhatsApp broadcast queued' : ''}`,
        { entityType: 'announcement', entityId: payload.announcementId, propertyId: payload.propertyId },
      ));
    },
  );

  // CSV import
  subscribe<{ propertyId: string | null; succeeded: number; failed: number; total: number }>(
    'CSV_IMPORT_COMPLETED',
    ({ payload }) => {
      store!.push(makeNotification(
        'system',
        `CSV import complete`,
        `${payload.succeeded} of ${payload.total} tenants imported${payload.failed > 0 ? ` · ${payload.failed} failed` : ''}`,
        { propertyId: payload.propertyId },
      ));
    },
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getNotifications(): NotificationRecord[] {
  if (!store) return readFromStorage();
  return store.getAll();
}

export function getUnreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

export function markNotificationRead(id: string): void {
  if (!store) return;
  store.markRead(id);
}

export function markAllNotificationsRead(): void {
  if (!store) return;
  store.markAllRead();
}

export function clearAllNotifications(): void {
  try {
    localStorage.removeItem(DEMO_NOTIF_KEY);
  } catch {
    // best-effort
  }
  broadcastChange();
}
