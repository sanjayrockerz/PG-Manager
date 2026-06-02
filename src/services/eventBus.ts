/**
 * Centralized event propagation system.
 *
 * Emits typed domain events so all modules (Dashboard, BuildingView,
 * TenantList, OccupancyMetrics) stay synchronized without tight coupling.
 *
 * Events propagate via DOM CustomEvents so any React component can subscribe
 * with a plain addEventListener without importing this module.
 */

export type DomainEventType =
  | 'TENANT_ASSIGNED'
  | 'TENANT_VACATED'
  | 'TENANT_ARCHIVED'
  | 'TENANT_STATUS_CHANGED'
  | 'ROOM_VACATED'
  | 'ROOM_OCCUPIED'
  | 'ROOM_MAINTENANCE'
  | 'OCCUPANCY_UPDATED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'DEPOSIT_SETTLED'
  | 'CSV_IMPORT_COMPLETED'
  | 'PROPERTY_UPDATED'
  | 'ACTIVITY_LOGGED'
  | 'MAINTENANCE_CREATED'
  | 'MAINTENANCE_UPDATED'
  | 'MAINTENANCE_RESOLVED'
  | 'MAINTENANCE_CLOSED'
  | 'ANNOUNCEMENT_CREATED'
  | 'WHATSAPP_QUEUED'
  | 'TEAM_ACCESS_CHANGED'
  | 'PROPERTY_SCOPE_ADDED'
  | 'PROPERTY_SCOPE_UPDATED'
  | 'PROPERTY_SCOPE_REMOVED'
  | 'NOTIFICATION_GENERATED';

export interface DomainEvent<T = Record<string, unknown>> {
  type: DomainEventType;
  propertyId: string | null;
  payload: T;
  timestamp: string;
}

type EventHandler<T = Record<string, unknown>> = (event: DomainEvent<T>) => void;

const CUSTOM_EVENT_NAME = 'owner-data-updated';
const DOMAIN_EVENT_PREFIX = 'pg:domain:';

const subscribers = new Map<DomainEventType, Set<EventHandler>>();

function emit<T = Record<string, unknown>>(event: DomainEvent<T>): void {
  // Persist to subscribers registered via subscribe()
  const handlers = subscribers.get(event.type);
  if (handlers) {
    handlers.forEach((handler) => {
      try {
        handler(event as DomainEvent);
      } catch {
        // Subscriber errors must not crash the emitter
      }
    });
  }

  if (typeof window === 'undefined') return;

  // Schedule a debounced generic refresh event to coalesce rapid emissions
  requestRefresh();

  // Also dispatch a typed event for fine-grained listeners
  window.dispatchEvent(
    new CustomEvent(`${DOMAIN_EVENT_PREFIX}${event.type}`, { detail: event }),
  );
}

let refreshTimeout: number | null = null;
export function requestRefresh(delay = 60): void {
  if (typeof window === 'undefined') return;
  if (refreshTimeout !== null) return;
  refreshTimeout = window.setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME));
    } finally {
      refreshTimeout = null;
    }
  }, delay) as unknown as number;
}

export function subscribe<T = Record<string, unknown>>(
  type: DomainEventType,
  handler: EventHandler<T>,
): () => void {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set());
  }
  subscribers.get(type)!.add(handler as EventHandler);
  return () => {
    subscribers.get(type)?.delete(handler as EventHandler);
  };
}

// ─── Domain event emitters ────────────────────────────────────────────────────

export const domainEvents = {
  tenantAssigned(payload: {
    tenantId: string;
    tenantName: string;
    propertyId: string;
    room: string;
    bed: string;
  }): void {
    emit({ type: 'TENANT_ASSIGNED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  tenantVacated(payload: {
    tenantId: string;
    tenantName: string;
    propertyId: string;
    room: string;
    depositRefund: number;
    isImmediate?: boolean;
    vacateDate?: string;
  }): void {
    emit({ type: 'TENANT_VACATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  tenantArchived(payload: { tenantId: string; tenantName: string; propertyId: string }): void {
    emit({ type: 'TENANT_ARCHIVED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  depositSettled(payload: {
    tenantId: string;
    tenantName: string;
    propertyId: string;
    securityDeposit: number;
    totalDeduction: number;
    netRefund: number;
  }): void {
    emit({ type: 'DEPOSIT_SETTLED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  paymentReceived(payload: { tenantId: string; tenantName: string; propertyId: string; amount: number; paymentId: string }): void {
    emit({ type: 'PAYMENT_RECEIVED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  teamAccessChanged(payload: { ownerId: string; targetEmail: string; action: 'invited' | 'revoked' | 'accepted' }): void {
    emit({ type: 'TEAM_ACCESS_CHANGED', propertyId: null, payload, timestamp: new Date().toISOString() });
  },

  propertyScopeAdded(payload: { ownerId: string; userId: string; userEmail: string; propertyId: string; displayRole: string }): void {
    emit({ type: 'PROPERTY_SCOPE_ADDED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  propertyScopeUpdated(payload: { ownerId: string; userId: string; userEmail: string; propertyId: string; displayRole: string }): void {
    emit({ type: 'PROPERTY_SCOPE_UPDATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  propertyScopeRemoved(payload: { ownerId: string; userId: string; userEmail: string; propertyId: string }): void {
    emit({ type: 'PROPERTY_SCOPE_REMOVED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  tenantStatusChanged(payload: {
    tenantId: string;
    tenantName: string;
    propertyId: string;
    previousStatus: string;
    newStatus: string;
  }): void {
    emit({ type: 'TENANT_STATUS_CHANGED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  roomVacated(payload: { propertyId: string; room: string; floor: number }): void {
    emit({ type: 'ROOM_VACATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  roomOccupied(payload: { propertyId: string; room: string; floor: number; occupiedBeds: number; totalBeds: number }): void {
    emit({ type: 'ROOM_OCCUPIED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  occupancyUpdated(payload: { propertyId: string; occupiedRooms: number; totalRooms: number; occupancyRate: number }): void {
    emit({ type: 'OCCUPANCY_UPDATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  paymentRecorded(payload: { tenantId: string; propertyId: string; amount: number; status: string }): void {
    emit({ type: 'PAYMENT_RECORDED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  csvImportCompleted(payload: { propertyId: string | null; succeeded: number; failed: number; total: number }): void {
    emit({ type: 'CSV_IMPORT_COMPLETED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  propertyUpdated(payload: { propertyId: string }): void {
    emit({ type: 'PROPERTY_UPDATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  activityLogged(payload: { propertyId: string | null; event: string; detail: string }): void {
    emit({ type: 'ACTIVITY_LOGGED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  maintenanceCreated(payload: { ticketId: string; propertyId: string; issue: string; tenant: string; priority: string }): void {
    emit({ type: 'MAINTENANCE_CREATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  maintenanceUpdated(payload: { ticketId: string; propertyId: string; issue: string; fromStatus: string; toStatus: string }): void {
    emit({ type: 'MAINTENANCE_UPDATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  maintenanceResolved(payload: { ticketId: string; propertyId: string; issue: string; tenant: string }): void {
    emit({ type: 'MAINTENANCE_RESOLVED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  announcementCreated(payload: { announcementId: string; propertyId: string | null; title: string; whatsappEnabled: boolean }): void {
    emit({ type: 'ANNOUNCEMENT_CREATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  whatsappQueued(payload: { announcementId: string; propertyId: string | null; recipientCount: number }): void {
    emit({ type: 'WHATSAPP_QUEUED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  paymentOverdue(payload: { tenantId: string; propertyId: string; tenantName: string; amount: number }): void {
    emit({ type: 'PAYMENT_OVERDUE', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },

  notificationGenerated(payload: { type: string; title: string; propertyId: string | null }): void {
    emit({ type: 'NOTIFICATION_GENERATED', propertyId: payload.propertyId, payload, timestamp: new Date().toISOString() });
  },
} as const;
