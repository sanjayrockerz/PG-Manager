import type { Property, Room } from '../contexts/PropertyContext';
import { getAppMode, type AppMode } from '../config/appMode';
import {
  buildDemoDashboardSnapshot,
  demoActivityLog,
  demoAnnouncements,
  demoMaintenanceTickets,
  demoPayments,
  demoProperties,
  demoSupportTickets,
  demoTenants,
  demoVacateRequests,
} from '../data/demoData';
import type { TenantPortalSnapshot } from './supabaseData';
import {
  type ActivityLogEntry,
  type AnnouncementCategory,
  type AnnouncementRecord,
  type CSVImportResult,
  type DashboardSnapshot,
  type MaintenancePriority,
  type MaintenanceSource,
  type MaintenanceStatus,
  type MaintenanceTicketRecord,
  type MaintenanceThreadEntry,
  type PaymentRecord,
  type PaymentStatus,
  type SupportTicketRecord,
  type WhatsAppQueueEntry,
  supabaseAuthDataApi,
  supabaseOwnerDataApi,
  supabasePropertyApi,
  supabaseTenantDataApi,
  supabaseTenantProvisioningApi,
  type TenantCreateInput,
  type TenantRecord,
  type VacateRequest,
  type VacateWorkflowInput,
  isTenantCurrentlyInRoom,
} from './supabaseData';
import { domainEvents } from './eventBus';
import { prepareImportRows, buildImportResult } from './csvImport';
import { initNotificationEngine } from './notificationEngine';
import { createAndStoreAgreement } from './agreementService';

// Initialize the event-driven notification engine once at module load
initNotificationEngine();

const DEMO_LEAK_ERROR = 'Data leakage detected';
const DEMO_STORE_KEY = 'pg-manager:demo-data-store-v2';

interface DemoDataStore {
  properties: Property[];
  tenants: TenantRecord[];
  payments: PaymentRecord[];
  maintenanceTickets: MaintenanceTicketRecord[];
  maintenanceThreads: MaintenanceThreadEntry[];
  announcements: AnnouncementRecord[];
  vacateRequests: VacateRequest[];
  activityLog: ActivityLogEntry[];
  whatsappQueue: WhatsAppQueueEntry[];
  supportTickets: SupportTicketRecord[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const filterByProperty = <T extends { propertyId: string }>(rows: T[], propertyId: string | 'all'): T[] => {
  if (propertyId === 'all') {
    return rows;
  }
  return rows.filter((row) => row.propertyId === propertyId);
};

const createDemoId = (prefix: string): string => `demo-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDateOnly = (value: Date): string => value.toISOString().split('T')[0];

const getSeedDemoStore = (): DemoDataStore => ({
  properties: clone(demoProperties),
  tenants: clone(demoTenants),
  payments: clone(demoPayments),
  maintenanceTickets: clone(demoMaintenanceTickets),
  maintenanceThreads: [],
  announcements: clone(demoAnnouncements),
  vacateRequests: clone(demoVacateRequests),
  activityLog: clone(demoActivityLog),
  whatsappQueue: [],
  supportTickets: clone(demoSupportTickets),
});

const hasDemoStoreShape = (value: unknown): value is DemoDataStore => {
  const candidate = value as DemoDataStore | null;
  return candidate !== null
    && Boolean(candidate)
    && Array.isArray(candidate?.properties)
    && Array.isArray(candidate?.tenants)
    && Array.isArray(candidate?.payments);
  // maintenanceTickets and announcements are checked separately for graceful migration
};

const readDemoStore = (): DemoDataStore => {
  if (typeof window === 'undefined') {
    return getSeedDemoStore();
  }

  try {
    const raw = window.localStorage.getItem(DEMO_STORE_KEY);
    if (!raw) {
      const seed = getSeedDemoStore();
      window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(seed));
      return seed;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!hasDemoStoreShape(parsed)) {
      throw new Error('Invalid demo store shape');
    }

    const stored = parsed as DemoDataStore & Record<string, unknown>;
    return {
      properties: clone(stored.properties),
      tenants: clone(stored.tenants),
      payments: clone(stored.payments),
      // Graceful migration: seed new domains if not yet in stored data
      maintenanceTickets: Array.isArray(stored.maintenanceTickets)
        ? clone(stored.maintenanceTickets as MaintenanceTicketRecord[])
        : clone(demoMaintenanceTickets),
      maintenanceThreads: Array.isArray(stored.maintenanceThreads)
        ? clone(stored.maintenanceThreads as MaintenanceThreadEntry[])
        : [],
      announcements: Array.isArray(stored.announcements)
        ? clone(stored.announcements as AnnouncementRecord[])
        : clone(demoAnnouncements),
      vacateRequests: Array.isArray(stored.vacateRequests)
        ? clone(stored.vacateRequests as VacateRequest[])
        : clone(demoVacateRequests),
      activityLog: Array.isArray(stored.activityLog)
        ? clone(stored.activityLog as ActivityLogEntry[])
        : clone(demoActivityLog),
      whatsappQueue: Array.isArray(stored.whatsappQueue)
        ? clone(stored.whatsappQueue as WhatsAppQueueEntry[])
        : [],
      supportTickets: Array.isArray(stored.supportTickets)
        ? clone(stored.supportTickets as SupportTicketRecord[])
        : clone(demoSupportTickets),
    };
  } catch {
    const seed = getSeedDemoStore();
    try {
      window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(seed));
    } catch {
      // Ignore storage failures and continue with in-memory seed.
    }
    return seed;
  }
};

const writeDemoStore = (store: DemoDataStore): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort persistence for demo-only state.
  }
};

const emitDataUpdated = (): void => {
  if (typeof window !== 'undefined') {
    // Centralized, debounced refresh via the eventBus
    // Import lazily to avoid module cycles
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const { requestRefresh } = require('./eventBus');
      requestRefresh();
    } catch {
      // Fallback to direct dispatch if eventBus is unavailable
      window.dispatchEvent(new CustomEvent('owner-data-updated'));
    }
  }
};

const withDemoStoreMutation = <T>(mutator: (store: DemoDataStore) => T): T => {
  const store = readDemoStore();
  const result = mutator(store);
  writeDemoStore(store);
  // Broadcast cross-module refresh so Dashboard and other listeners stay in sync
  emitDataUpdated();
  return result;
};

const getDemoOwnerId = (store: DemoDataStore): string => store.tenants[0]?.ownerId ?? 'demo-owner-1';

const buildDemoRevenueChartData = (
  payments: PaymentRecord[],
  rangeStart?: Date,
  rangeEnd?: Date,
): DashboardSnapshot['revenueChartData'] => {
  const now = new Date();
  const end = rangeEnd ?? now;
  const start = rangeStart ?? new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Build monthly buckets covering the full range
  const buckets: Array<{ key: string; name: string; revenue: number; target: number }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    buckets.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      name: cursor.toLocaleDateString('en-US', { month: 'short' }),
      revenue: 0,
      target: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
    if (buckets.length > 12) break; // safety cap
  }

  // Ensure at least 1 bucket
  if (buckets.length === 0) {
    buckets.push({ key: `${now.getFullYear()}-${now.getMonth()}`, name: now.toLocaleDateString('en-US', { month: 'short' }), revenue: 0, target: 0 });
  }

  // "target" (Expected) is the real amount billed/due that month — not a flat average
  // of collected revenue, which would make Gap mathematically circular (always ~0
  // plus rounding noise).
  payments.forEach((payment) => {
    const due = new Date(payment.dueDate);
    const dueBucket = buckets.find((entry) => entry.key === `${due.getFullYear()}-${due.getMonth()}`);
    if (dueBucket) dueBucket.target += Number(payment.totalAmount) || 0;

    if (payment.status !== 'paid') return;
    const paid = new Date(payment.paidDate || payment.dueDate);
    const paidBucket = buckets.find((entry) => entry.key === `${paid.getFullYear()}-${paid.getMonth()}`);
    if (paidBucket) paidBucket.revenue += Number(payment.totalAmount) || 0;
  });

  return buckets.map((entry) => ({
    name: entry.name,
    revenue: entry.revenue,
    target: entry.target,
  }));
};

const buildDemoDashboardSnapshotFromStore = (
  store: DemoDataStore,
  propertyId: string | 'all',
  dateRange?: { start: Date; end: Date },
): DashboardSnapshot => {
  const properties = propertyId === 'all'
    ? store.properties
    : store.properties.filter((property) => property.id === propertyId);
  const tenants = filterByProperty(store.tenants, propertyId);
  const payments = filterByProperty(store.payments, propertyId);
  const fallback = buildDemoDashboardSnapshot(propertyId);

  const rooms = properties.flatMap((property) => property.rooms);
  const occupiedRooms = rooms.filter((room) => room.status === 'occupied').length;
  const totalRooms = rooms.length;

  const now = new Date();
  const rangeStart = dateRange?.start ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = dateRange?.end ?? now;

  const monthlyRevenue = payments
    .filter((payment) => {
      if (payment.status !== 'paid') return false;
      const d = new Date(payment.paidDate || payment.dueDate);
      return d >= rangeStart && d <= rangeEnd;
    })
    .reduce((sum, payment) => sum + (Number(payment.totalAmount) || 0), 0);

  const pendingAmount = payments
    .filter((payment) => payment.status === 'pending' || payment.status === 'overdue')
    .reduce((sum, payment) => sum + (Number(payment.totalAmount) || 0), 0);

  const recentPayments = [...payments]
    .filter((p) => {
      const d = new Date(p.createdAt);
      return d >= rangeStart && d <= rangeEnd;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalTenants: tenants.filter((tenant) => isTenantCurrentlyInRoom(tenant.status)).length,
    occupiedRooms,
    totalRooms,
    monthlyRevenue,
    pendingAmount,
    pendingIssues: fallback.pendingIssues,
    recentPayments,
    recentActivity: fallback.recentActivity.filter((a) => {
      const d = new Date(a.createdAt);
      return d >= rangeStart && d <= rangeEnd;
    }),
    // Fixed trailing-6-month trend, independent of the selected date filter — see
    // the matching live-data comment in supabaseData.ts getDashboardSnapshot.
    revenueChartData: buildDemoRevenueChartData(payments),
  };
};

const mapTenantCreateInputToRecord = (
  store: DemoDataStore,
  input: TenantCreateInput,
): TenantRecord => {
  const now = new Date().toISOString();
  return {
    id: createDemoId('tenant'),
    ownerId: getDemoOwnerId(store),
    name: input.name.trim(),
    phone: input.phone,
    email: (input.email ?? '').trim().toLowerCase(),
    photoUrl: '',
    propertyId: input.propertyId,
    floor: input.floor,
    room: input.room.trim(),
    bed: input.bed.trim(),
    rent: Number(input.monthlyRent) || 0,
    securityDeposit: Number(input.securityDeposit) || 0,
    rentDueDate: Number(input.rentDueDate) || 1,
    parentName: input.parentName.trim(),
    parentPhone: input.parentPhone,
    idType: input.idType.trim(),
    idNumber: input.idNumber.trim(),
    idDocumentUrl: '',
    joinDate: input.joinDate,
    status: input.status,
    createdAt: now,
  };
};

const applyTenantPatch = (
  current: TenantRecord,
  input: Partial<TenantCreateInput>,
): TenantRecord => ({
  ...current,
  name: input.name?.trim() ?? current.name,
  phone: input.phone ?? current.phone,
  email: input.email?.trim().toLowerCase() ?? current.email,
  propertyId: input.propertyId ?? current.propertyId,
  floor: input.floor ?? current.floor,
  room: input.room?.trim() ?? current.room,
  bed: input.bed?.trim() ?? current.bed,
  rent: input.monthlyRent !== undefined ? Number(input.monthlyRent) || 0 : current.rent,
  securityDeposit: input.securityDeposit !== undefined ? Number(input.securityDeposit) || 0 : current.securityDeposit,
  rentDueDate: input.rentDueDate !== undefined ? Number(input.rentDueDate) || 1 : current.rentDueDate,
  parentName: input.parentName?.trim() ?? current.parentName,
  parentPhone: input.parentPhone ?? current.parentPhone,
  idType: input.idType?.trim() ?? current.idType,
  idNumber: input.idNumber?.trim() ?? current.idNumber,
  joinDate: input.joinDate ?? current.joinDate,
  status: input.status ?? current.status,
});

const makeDemoPendingPaymentForTenant = (tenant: TenantRecord): PaymentRecord => {
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(Math.max(tenant.rentDueDate, 1), 28));
  return {
    id: createDemoId('payment'),
    tenantId: tenant.id,
    tenant: tenant.name,
    propertyId: tenant.propertyId,
    room: tenant.room,
    monthlyRent: tenant.rent,
    extraCharges: 0,
    totalAmount: tenant.rent,
    dueDate: toDateOnly(dueDate),
    paidDate: '',
    status: 'pending',
    createdAt: now.toISOString(),
  };
};

const assertNoLeakage = (mode: AppMode, supabaseCallDetected: boolean): void => {
  if (mode === 'demo' && supabaseCallDetected) {
    throw new Error(DEMO_LEAK_ERROR);
  }
};

const runSupabase = async <T>(mode: AppMode, query: () => Promise<T>): Promise<T> => {
  const supabaseCallDetected = true;
  assertNoLeakage(mode, supabaseCallDetected);
  return query();
};

export const isDemoModeEnabled = (): boolean => getAppMode() === 'demo';

export const getCurrentAppMode = (): AppMode => getAppMode();

export async function getDashboardData(
  propertyId: string | 'all',
  dateRange?: { start: Date; end: Date },
): Promise<DashboardSnapshot> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(buildDemoDashboardSnapshotFromStore(readDemoStore(), propertyId, dateRange));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.getDashboardSnapshot(propertyId, dateRange));
}

// ─── Caches ───────────────────────────────────────────────────────────────────
const tenantCache: Record<string, { ts: number; data: TenantRecord[] }> = {};
const paymentCache: Record<string, { ts: number; data: PaymentRecord[] }> = {};
const CACHE_TTL = 60_000 * 15; // 15 minutes

export function invalidateTenantCache(propertyId?: string | 'all') {
  if (propertyId) delete tenantCache[propertyId];
  else for (const key in tenantCache) delete tenantCache[key];
}

export function invalidatePaymentCache(propertyId?: string | 'all') {
  if (propertyId) delete paymentCache[propertyId];
  else for (const key in paymentCache) delete paymentCache[key];
}

export function patchTenantCache(tenantId: string, patch: Partial<TenantRecord>) {
  for (const key in tenantCache) {
    const list = tenantCache[key].data;
    const idx = list.findIndex(t => t.id === tenantId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
    }
  }
}

export function getTenantFromCache(tenantId: string): TenantRecord | null {
  for (const key in tenantCache) {
    const found = tenantCache[key].data.find(t => t.id === tenantId);
    if (found) return structuredClone(found);
  }
  return null;
}

export function patchPaymentCache(paymentId: string, patch: Partial<PaymentRecord>) {
  for (const key in paymentCache) {
    const list = paymentCache[key].data;
    const idx = list.findIndex(p => p.id === paymentId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
    }
  }
}

export async function getTenants(propertyId: string | 'all' = 'all'): Promise<TenantRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(filterByProperty(readDemoStore().tenants, propertyId));
  }

  const now = Date.now();
  if (tenantCache[propertyId] && (now - tenantCache[propertyId].ts < CACHE_TTL)) {
    return structuredClone(tenantCache[propertyId].data);
  }

  const data = await runSupabase(mode, () => supabaseOwnerDataApi.listTenants(propertyId));
  tenantCache[propertyId] = { ts: now, data };
  return structuredClone(data);
}

export async function getProperties(): Promise<Property[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(readDemoStore().properties);
  }

  return runSupabase(mode, () => supabasePropertyApi.list());
}

export async function getPayments(propertyId: string | 'all' = 'all'): Promise<PaymentRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(filterByProperty(readDemoStore().payments, propertyId));
  }

  const now = Date.now();
  if (paymentCache[propertyId] && (now - paymentCache[propertyId].ts < CACHE_TTL)) {
    return structuredClone(paymentCache[propertyId].data);
  }

  const data = await runSupabase(mode, () => supabaseOwnerDataApi.listPayments(propertyId));
  paymentCache[propertyId] = { ts: now, data };
  return structuredClone(data);
}

export async function getSupportTickets(propertyId: string | 'all' = 'all'): Promise<SupportTicketRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const tickets = readDemoStore().supportTickets;
    if (propertyId === 'all') return clone(tickets);
    return clone(tickets.filter((t) => t.propertyId === propertyId || t.propertyId == null));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.listSupportTickets(propertyId));
}

export async function createPropertyRecord(input: Omit<Property, 'id' | 'createdAt' | 'rooms'>): Promise<Property> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const created: Property = {
        ...input,
        id: createDemoId('property'),
        createdAt: new Date().toISOString(),
        rooms: [],
        totalRooms: 0,
      };
      store.properties.unshift(created);
      return created;
    }));
  }

  return runSupabase(mode, () => supabasePropertyApi.create(input));
}

export async function updatePropertyRecord(id: string, input: Partial<Property>): Promise<Property> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const propertyIndex = store.properties.findIndex((property) => property.id === id);
      if (propertyIndex < 0) {
        throw new Error('Property not found.');
      }

      const current = store.properties[propertyIndex];
      const updated: Property = {
        ...current,
        ...input,
        id: current.id,
        createdAt: current.createdAt,
        rooms: current.rooms,
      };
      updated.totalRooms = updated.rooms.length;
      store.properties[propertyIndex] = updated;
      return updated;
    }));
  }

  return runSupabase(mode, () => supabasePropertyApi.update(id, input));
}

export async function deletePropertyRecord(id: string): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      store.properties = store.properties.filter((property) => property.id !== id);
      store.tenants = store.tenants.filter((tenant) => tenant.propertyId !== id);
      store.payments = store.payments.filter((payment) => payment.propertyId !== id);
    });
    return;
  }

  await runSupabase(mode, () => supabasePropertyApi.remove(id));
}

export async function addRoomToProperty(propertyId: string, input: Omit<Room, 'id'>): Promise<Room> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const property = store.properties.find((entry) => entry.id === propertyId);
      if (!property) {
        throw new Error('Property not found.');
      }

      const roomExists = property.rooms.some((room) =>
        room.floor === input.floor && room.number.trim().toLowerCase() === input.number.trim().toLowerCase());
      if (roomExists) {
        throw new Error('Room already exists for the selected floor.');
      }

      const createdRoom: Room = {
        ...input,
        id: createDemoId('room'),
        number: input.number.trim(),
        beds: Math.max(1, Number(input.beds) || 1),
        rent: Number(input.rent) || 0,
        occupiedBeds: Number(input.occupiedBeds) || 0,
      };

      property.rooms.push(createdRoom);
      property.totalRooms = property.rooms.length;
      return createdRoom;
    }));
  }

  return runSupabase(mode, () => supabasePropertyApi.addRoom(propertyId, input));
}

export async function updateRoomInProperty(propertyId: string, roomId: string, input: Partial<Room>): Promise<Room> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const property = store.properties.find((entry) => entry.id === propertyId);
      if (!property) {
        throw new Error('Property not found.');
      }

      const roomIndex = property.rooms.findIndex((room) => room.id === roomId);
      if (roomIndex < 0) {
        throw new Error('Room not found.');
      }

      const currentRoom = property.rooms[roomIndex];
      const updatedRoom: Room = {
        ...currentRoom,
        ...input,
        id: currentRoom.id,
        beds: input.beds !== undefined ? Math.max(1, Number(input.beds) || 1) : currentRoom.beds,
        rent: input.rent !== undefined ? Number(input.rent) || 0 : currentRoom.rent,
      };
      if (updatedRoom.occupiedBeds !== undefined) {
        updatedRoom.occupiedBeds = Math.max(0, Math.min(updatedRoom.occupiedBeds, updatedRoom.beds));
      }
      property.rooms[roomIndex] = updatedRoom;
      property.totalRooms = property.rooms.length;

      if (currentRoom.number !== updatedRoom.number || currentRoom.floor !== updatedRoom.floor) {
        store.tenants = store.tenants.map((tenant) => {
          if (tenant.propertyId !== propertyId) {
            return tenant;
          }
          if (tenant.floor !== currentRoom.floor || tenant.room !== currentRoom.number) {
            return tenant;
          }
          return {
            ...tenant,
            floor: updatedRoom.floor,
            room: updatedRoom.number,
          };
        });

        store.payments = store.payments.map((payment) => {
          if (payment.propertyId !== propertyId || payment.room !== currentRoom.number) {
            return payment;
          }
          return {
            ...payment,
            room: updatedRoom.number,
          };
        });
      }

      return updatedRoom;
    }));
  }

  return runSupabase(mode, () => supabasePropertyApi.updateRoom(propertyId, roomId, input));
}

export async function deleteRoomFromProperty(propertyId: string, roomId: string): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      const property = store.properties.find((entry) => entry.id === propertyId);
      if (!property) {
        throw new Error('Property not found.');
      }

      const room = property.rooms.find((entry) => entry.id === roomId);
      if (!room) {
        throw new Error('Room not found.');
      }

      const hasAssignedTenant = store.tenants.some((tenant) =>
        tenant.propertyId === propertyId
        && tenant.floor === room.floor
        && tenant.room === room.number
        && tenant.status === 'active');
      if (hasAssignedTenant) {
        throw new Error('Cannot delete a room with active tenants assigned.');
      }

      property.rooms = property.rooms.filter((entry) => entry.id !== roomId);
      property.totalRooms = property.rooms.length;
    });
    return;
  }

  await runSupabase(mode, () => supabasePropertyApi.removeRoom(propertyId, roomId));
}

export async function createTenantRecord(input: TenantCreateInput): Promise<TenantRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const property = store.properties.find((entry) => entry.id === input.propertyId);
      if (!property) {
        throw new Error('Selected property was not found.');
      }

      const tenant = mapTenantCreateInputToRecord(store, input);
      store.tenants.unshift(tenant);
      store.payments.unshift(makeDemoPendingPaymentForTenant(tenant));

      // Auto-update room occupancy
      syncDemoRoomOccupancy(store, input.propertyId);

      // Activity log
      appendDemoActivity(store, {
        propertyId: input.propertyId,
        event: 'TENANT_ASSIGNED',
        detail: `${tenant.name} assigned to Room ${tenant.room}, Bed ${tenant.bed}`,
        metadata: { tenantId: tenant.id, room: tenant.room, bed: tenant.bed },
      });

      return tenant;
    }));
  }

  return runSupabase(mode, async () => {
    const created = await supabaseOwnerDataApi.createTenant(input);

    // Auto-provision tenant auth account + send magic-link invitation (fire-and-forget,
    // non-blocking). The owner never has to create the tenant's account separately.
    void (async () => {
      try {
        if (input.email && !input.email.includes('noemail.')) {
          const propertyName = await getProperties()
            .then((list) => list.find((p) => p.id === created.propertyId)?.name ?? null)
            .catch(() => null);
          await supabaseTenantProvisioningApi.inviteTenant({
            tenantId: created.id,
            email: input.email,
            name: created.name,
            ownerId: created.ownerId,
            propertyId: created.propertyId,
            phone: created.phone,
            propertyName,
          });
        }
      } catch (provisionErr) {
        // Non-blocking — invitation failure doesn't block tenant creation.
        console.warn('Tenant invitation failed (non-blocking):', provisionErr);
      }
    })();

    // Fire-and-forget agreement draft creation
    void (async () => {
      try {
        const propertyList = await getProperties();
        const prop = propertyList.find((p) => p.id === created.propertyId);
        if (prop) {
          // Resolve the real owner of record (never a placeholder). The draft is
          // attributed to the registered owner profile tied to the tenant.
          const ownerProfile = await supabaseAuthDataApi
            .getProfileById(created.ownerId)
            .catch(() => null);
          await createAndStoreAgreement({
            tenant: created,
            propertyName: prop.name,
            propertyAddress: prop.address,
            propertyCity: `${prop.city}, ${prop.state}`,
            ownerName: ownerProfile?.name?.trim() || prop.name,
            ownerPhone: ownerProfile?.phone?.trim() || prop.contactPhone,
            generatedAt: new Date().toISOString(),
          });
        }
      } catch (agreementErr) {
        // Non-blocking — agreement can be regenerated manually from TenantDetail.
        // Write a notification so the owner knows to generate it manually.
        void (async () => {
          try {
            const { supabase } = await import('../lib/supabase');
            const { data: profile } = await supabase.auth.getUser();
            const ownerId = profile.user?.id;
            if (ownerId) {
              await supabase.from('notifications').insert({
                owner_id: ownerId,
                property_id: created.propertyId,
                type: 'tenant',
                title: 'Agreement not generated',
                message: `Auto-generation failed for ${created.name}. Open Tenant Detail to generate manually.`,
                read: false,
              });
            }
          } catch { /* best-effort */ }
        })();
        console.warn('Agreement generation failed (non-blocking):', agreementErr);
      }
    })();

    return created;
  });
}

/**
 * Re-send the magic-link invitation for an existing tenant and record the new
 * send time. Returns the ISO timestamp of the invitation just sent.
 */
export async function resendTenantInvitation(tenant: {
  id: string;
  email: string;
  name: string;
  ownerId: string;
  propertyId: string;
  phone?: string | null;
  propertyName?: string | null;
}): Promise<{ invitationSentAt: string; whatsappSent: boolean }> {
  const mode = getAppMode();
  if (mode === 'demo') {
    // Demo mode never touches Supabase Auth — just simulate a successful send.
    return { invitationSentAt: new Date().toISOString(), whatsappSent: false };
  }
  if (!tenant.email || tenant.email.includes('noemail.')) {
    throw new Error('This tenant has no email address on file. Add an email before sending an invitation.');
  }
  return runSupabase(mode, () => supabaseTenantProvisioningApi.inviteTenant({
    tenantId: tenant.id,
    email: tenant.email,
    name: tenant.name,
    ownerId: tenant.ownerId,
    propertyId: tenant.propertyId,
    phone: tenant.phone ?? null,
    propertyName: tenant.propertyName ?? null,
  }));
}


export async function updateTenantRecord(tenantId: string, input: Partial<TenantCreateInput>): Promise<TenantRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const tenantIndex = store.tenants.findIndex((tenant) => tenant.id === tenantId);
      if (tenantIndex < 0) {
        throw new Error('Tenant not found.');
      }

      const current = store.tenants[tenantIndex];
      const updated = applyTenantPatch(current, input);
      store.tenants[tenantIndex] = updated;

      store.payments = store.payments.map((payment) => {
        if (payment.tenantId !== tenantId) {
          return payment;
        }
        return {
          ...payment,
          tenant: updated.name,
          propertyId: updated.propertyId,
          room: updated.room,
          monthlyRent: updated.rent,
          totalAmount: updated.rent + payment.extraCharges,
        };
      });

      // Sync room occupancy on any status change
      if (input.status !== undefined && input.status !== current.status) {
        syncDemoRoomOccupancy(store, updated.propertyId);
        appendDemoActivity(store, {
          propertyId: updated.propertyId,
          event: 'TENANT_STATUS_CHANGED',
          detail: `${updated.name} status changed: ${current.status} → ${updated.status}`,
          metadata: { tenantId: updated.id, previousStatus: current.status, newStatus: updated.status },
        });
      }

      return updated;
    }));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.updateTenant(tenantId, input));
}

export async function deleteTenantRecord(tenantId: string): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      store.tenants = store.tenants.filter((tenant) => tenant.id !== tenantId);
      store.payments = store.payments.filter((payment) => payment.tenantId !== tenantId);
    });
    return;
  }

  await runSupabase(mode, () => supabaseOwnerDataApi.deleteTenant(tenantId));
}

export async function updatePaymentStatusRecord(paymentId: string, status: PaymentStatus, meta?: { paymentMode?: string; referenceNumber?: string; paidDate?: string; paymentNotes?: string }): Promise<PaymentRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const paymentIndex = store.payments.findIndex((payment) => payment.id === paymentId);
      if (paymentIndex < 0) {
        throw new Error('Payment not found.');
      }

      const payment = store.payments[paymentIndex];
      const updated: PaymentRecord = {
        ...payment,
        status,
        paidDate: status === 'paid' ? toDateOnly(new Date()) : '',
      };
      store.payments[paymentIndex] = updated;

      // Auto-generate next month's payment when this one is marked paid
      if (status === 'paid') {
        const tenant = store.tenants.find((t) => t.id === payment.tenantId);
        if (tenant && isTenantCurrentlyInRoom(tenant.status)) {
          const dueDate = new Date(payment.dueDate);
          const nextDue = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, Math.min(tenant.rentDueDate, 28));
          const nextDueDateStr = toDateOnly(nextDue);

          const alreadyExists = store.payments.some(
            (p) => p.tenantId === tenant.id && p.dueDate === nextDueDateStr,
          );

          if (!alreadyExists) {
            store.payments.unshift({
              id: createDemoId('payment'),
              tenantId: tenant.id,
              tenant: tenant.name,
              propertyId: tenant.propertyId,
              room: tenant.room,
              monthlyRent: tenant.rent,
              extraCharges: 0,
              totalAmount: tenant.rent,
              dueDate: nextDueDateStr,
              paidDate: '',
              status: 'pending',
              createdAt: new Date().toISOString(),
            });
          }
        }

        appendDemoActivity(store, {
          propertyId: payment.propertyId,
          event: 'PAYMENT_RECEIVED',
          detail: `Payment of ₹${updated.totalAmount.toLocaleString('en-IN')} received from ${updated.tenant} (Room ${updated.room})`,
          metadata: { paymentId: updated.id, tenantId: updated.tenantId, amount: updated.totalAmount },
        });

        // Emit payment received event for notifications
        domainEvents.paymentReceived({
          paymentId: updated.id,
          tenantId: updated.tenantId,
          tenantName: updated.tenant,
          propertyId: updated.propertyId,
          amount: updated.totalAmount,
        });
      }

      return updated;
    }));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.updatePaymentStatus(paymentId, status, meta));
}

export async function addPaymentChargeRecord(
  paymentId: string,
  input: { type: string; customType?: string; description?: string; amount: number },
): Promise<PaymentRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const paymentIndex = store.payments.findIndex((payment) => payment.id === paymentId);
      if (paymentIndex < 0) {
        throw new Error('Payment not found.');
      }

      const amount = Number(input.amount) || 0;
      if (amount <= 0) {
        throw new Error('Charge amount must be greater than zero.');
      }

      const payment = store.payments[paymentIndex];
      const updated: PaymentRecord = {
        ...payment,
        extraCharges: payment.extraCharges + amount,
        totalAmount: payment.monthlyRent + payment.extraCharges + amount,
      };
      store.payments[paymentIndex] = updated;
      return updated;
    }));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.addPaymentCharge(paymentId, input));
}

// ─── Tenant detail helpers ────────────────────────────────────────────────────

export async function getTenantById(tenantId: string): Promise<TenantRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const tenant = readDemoStore().tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found.');
    return clone(tenant);
  }
  const result = await runSupabase(mode, () => supabaseOwnerDataApi.getTenantById(tenantId));
  if (!result) throw new Error('Tenant not found.');
  return result;
}

export async function getPaymentsForTenant(tenantId: string): Promise<PaymentRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(readDemoStore().payments.filter((p) => p.tenantId === tenantId));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.listPaymentsForTenant(tenantId));
}

export async function getMaintenanceForTenant(tenantId: string): Promise<MaintenanceTicketRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const store = readDemoStore();
    const tenant = store.tenants.find((t) => t.id === tenantId);
    if (!tenant) return [];
    return clone(store.maintenanceTickets.filter((t) => t.tenant === tenant.name));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.listMaintenanceForTenant(tenantId));
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export async function getMaintenanceTickets(propertyId: string | 'all' = 'all'): Promise<MaintenanceTicketRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(filterByProperty(readDemoStore().maintenanceTickets, propertyId));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.listMaintenanceTickets(propertyId));
}

export async function createMaintenanceTicketRecord(input: {
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
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const ticketNumber = store.maintenanceTickets.length + 1;
      const now = new Date().toISOString();
      const ticketId = createDemoId('ticket');

      const ticket: MaintenanceTicketRecord = {
        id: ticketId,
        ticketId: `TKT-${String(ticketNumber).padStart(3, '0')}`,
        tenant: input.tenant.trim(),
        propertyId: input.propertyId,
        room: input.room.trim(),
        issue: input.issue.trim(),
        description: input.description.trim(),
        source: input.source ?? 'manual',
        status: 'open',
        priority: input.priority,
        date: toDateOnly(new Date()),
        phone: input.phone ?? '',
        notes: [],
        threads: [],
        assignedTo: input.assignedTo ?? undefined,
        updatedAt: now,
      };

      store.maintenanceTickets.unshift(ticket);

      // System thread entry: ticket opened
      const thread: MaintenanceThreadEntry = {
        id: createDemoId('thread'),
        ticketId: ticketId,
        actorName: 'System',
        actorRole: 'system',
        message: `Ticket opened — Priority: ${input.priority.toUpperCase()}${input.assignedTo ? ` · Assigned to ${input.assignedTo}` : ''}`,
        isInternal: false,
        createdAt: now,
      };
      store.maintenanceThreads.push(thread);

      // Activity
      appendDemoActivity(store, {
        propertyId: input.propertyId,
        event: 'MAINTENANCE_CREATED',
        detail: `Maintenance ticket ${ticket.ticketId} created: ${ticket.issue} (Room ${ticket.room})`,
        metadata: { ticketId: ticket.id, priority: ticket.priority, tenant: ticket.tenant },
      });

      // Domain event → triggers notification
      domainEvents.maintenanceCreated({
        ticketId: ticket.id,
        propertyId: input.propertyId,
        issue: ticket.issue,
        tenant: ticket.tenant,
        priority: ticket.priority,
      });

      return ticket;
    }));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.createMaintenanceTicket(input));
}

export async function updateMaintenanceStatusRecord(
  ticketId: string,
  status: MaintenanceStatus,
  note?: string,
): Promise<MaintenanceTicketRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const idx = store.maintenanceTickets.findIndex((t) => t.id === ticketId);
      if (idx < 0) throw new Error('Ticket not found.');

      const previous = store.maintenanceTickets[idx];
      const now = new Date().toISOString();
      const updated = {
        ...previous,
        status,
        updatedAt: now,
        resolvedAt: (status === 'resolved' || status === 'closed') ? now : previous.resolvedAt,
      };
      store.maintenanceTickets[idx] = updated;

      // Thread entry for transition
      const statusLabels: Record<MaintenanceStatus, string> = {
        open: 'Open',
        assigned: 'Assigned',
        'in-progress': 'In Progress',
        waiting: 'Waiting',
        resolved: 'Resolved',
        closed: 'Closed',
      };
      const thread: MaintenanceThreadEntry = {
        id: createDemoId('thread'),
        ticketId,
        actorName: 'Owner',
        actorRole: 'owner',
        message: note?.trim() || `Status changed to ${statusLabels[status]}`,
        isInternal: false,
        statusTransition: { from: previous.status, to: status },
        createdAt: now,
      };
      store.maintenanceThreads.push(thread);

      // Activity
      appendDemoActivity(store, {
        propertyId: previous.propertyId,
        event: 'MAINTENANCE_UPDATED',
        detail: `${previous.ticketId} status: ${previous.status} → ${status}`,
        metadata: { ticketId, previousStatus: previous.status, newStatus: status },
      });

      // Domain events
      if (status === 'resolved' || status === 'closed') {
        domainEvents.maintenanceResolved({
          ticketId,
          propertyId: previous.propertyId,
          issue: previous.issue,
          tenant: previous.tenant,
        });
      } else {
        domainEvents.maintenanceUpdated({
          ticketId,
          propertyId: previous.propertyId,
          issue: previous.issue,
          fromStatus: previous.status,
          toStatus: status,
        });
      }

      return updated;
    }));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.updateMaintenanceStatus(ticketId, status));
}

export async function addMaintenanceNoteRecord(ticketId: string, note: string): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      const ticket = store.maintenanceTickets.find((t) => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');
      ticket.notes.push(note.trim());

      // Also add as thread entry
      store.maintenanceThreads.push({
        id: createDemoId('thread'),
        ticketId,
        actorName: 'Owner',
        actorRole: 'owner',
        message: note.trim(),
        isInternal: false,
        createdAt: new Date().toISOString(),
      });
    });
    return;
  }
  await runSupabase(mode, () => supabaseOwnerDataApi.addMaintenanceNote(ticketId, note));
}

export async function addMaintenanceThreadEntry(
  ticketId: string,
  message: string,
  isInternal = false,
): Promise<MaintenanceThreadEntry> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const ticket = store.maintenanceTickets.find((t) => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');

      const entry: MaintenanceThreadEntry = {
        id: createDemoId('thread'),
        ticketId,
        actorName: 'Owner',
        actorRole: 'owner',
        message: message.trim(),
        isInternal,
        createdAt: new Date().toISOString(),
      };

      store.maintenanceThreads.push(entry);
      ticket.notes.push(isInternal ? `[Internal] ${message.trim()}` : message.trim());
      ticket.updatedAt = entry.createdAt;

      return entry;
    }));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.addMaintenanceThread(ticketId, message, isInternal));
}

export async function getMaintenanceThreads(ticketId: string): Promise<MaintenanceThreadEntry[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const store = readDemoStore();
    return clone(store.maintenanceThreads.filter((t) => t.ticketId === ticketId));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.getMaintenanceThreads(ticketId));
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function getAnnouncements(propertyId: string | 'all' = 'all'): Promise<AnnouncementRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const all = readDemoStore().announcements;
    const filtered = propertyId === 'all'
      ? all
      : all.filter((a) => a.propertyId === null || a.propertyId === propertyId);
    return clone([...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.listAnnouncements(propertyId));
}

export async function createAnnouncementRecord(input: {
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  sendViaWhatsApp: boolean;
  propertyId?: string | null;
}): Promise<AnnouncementRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const announcementId = createDemoId('announcement');
      const announcement: AnnouncementRecord = {
        id: announcementId,
        title: input.title.trim(),
        content: input.content.trim(),
        category: input.category,
        date: toDateOnly(new Date()),
        isPinned: input.isPinned,
        views: 0,
        sentViaWhatsApp: input.sendViaWhatsApp,
        propertyId: input.propertyId ?? null,
      };
      store.announcements.unshift(announcement);

      // WhatsApp queue entry if enabled
      if (input.sendViaWhatsApp) {
        const propertyTenants = input.propertyId
          ? store.tenants.filter((t) => t.propertyId === input.propertyId && isTenantCurrentlyInRoom(t.status))
          : store.tenants.filter((t) => isTenantCurrentlyInRoom(t.status));

        const queueEntry: WhatsAppQueueEntry = {
          id: createDemoId('wa-queue'),
          announcementId,
          propertyId: input.propertyId ?? null,
          status: 'queued',
          recipientCount: propertyTenants.length,
          sentCount: 0,
          createdAt: new Date().toISOString(),
        };
        store.whatsappQueue.unshift(queueEntry);

        domainEvents.whatsappQueued({
          announcementId,
          propertyId: input.propertyId ?? null,
          recipientCount: propertyTenants.length,
        });
      }

      // Activity log
      appendDemoActivity(store, {
        propertyId: input.propertyId ?? null,
        event: 'ANNOUNCEMENT_CREATED',
        detail: `Announcement "${announcement.title}" published${input.sendViaWhatsApp ? ' · WhatsApp broadcast queued' : ''}`,
        metadata: { announcementId, category: input.category, whatsapp: input.sendViaWhatsApp },
      });

      // Domain event → triggers notification
      domainEvents.announcementCreated({
        announcementId,
        propertyId: input.propertyId ?? null,
        title: announcement.title,
        whatsappEnabled: input.sendViaWhatsApp,
      });

      return announcement;
    }));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.createAnnouncement(input));
}

export async function updateAnnouncementRecord(
  announcementId: string,
  input: { title: string; content: string; category: AnnouncementCategory; isPinned: boolean },
): Promise<AnnouncementRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const idx = store.announcements.findIndex((a) => a.id === announcementId);
      if (idx < 0) throw new Error('Announcement not found.');
      store.announcements[idx] = { ...store.announcements[idx], ...input };
      return store.announcements[idx];
    }));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.updateAnnouncement(announcementId, input));
}

export async function deleteAnnouncementRecord(announcementId: string): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      store.announcements = store.announcements.filter((a) => a.id !== announcementId);
    });
    return;
  }
  await runSupabase(mode, () => supabaseOwnerDataApi.deleteAnnouncement(announcementId));
}

export async function toggleAnnouncementPinRecord(announcementId: string, isPinned: boolean): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      const ann = store.announcements.find((a) => a.id === announcementId);
      if (!ann) throw new Error('Announcement not found.');
      ann.isPinned = isPinned;
    });
    return;
  }
  await runSupabase(mode, () => supabaseOwnerDataApi.toggleAnnouncementPin(announcementId, isPinned));
}

// ─── Demo store helpers ───────────────────────────────────────────────────────

/** Recalculate occupiedBeds and status for all rooms in a property. */
function syncDemoRoomOccupancy(store: DemoDataStore, propertyId: string): void {
  const property = store.properties.find((p) => p.id === propertyId);
  if (!property) return;

  const activeTenants = store.tenants.filter(
    (t) => t.propertyId === propertyId && isTenantCurrentlyInRoom(t.status),
  );

  property.rooms = property.rooms.map((room) => {
    if (room.status === 'maintenance') return room;

    const tenantsInRoom = activeTenants.filter(
      (t) => t.floor === room.floor && t.room.toLowerCase() === room.number.toLowerCase(),
    );

    const occupiedBeds = Math.min(tenantsInRoom.length, room.beds);
    const newStatus: Room['status'] = occupiedBeds > 0 ? 'occupied' : 'vacant';

    return { ...room, occupiedBeds, status: newStatus };
  });
}

const createDemoActivityId = (): string =>
  `demo-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function appendDemoActivity(
  store: DemoDataStore,
  entry: { propertyId: string | null; event: string; detail: string; metadata: Record<string, unknown> },
): void {
  const log: ActivityLogEntry = {
    id: createDemoActivityId(),
    ownerId: getDemoOwnerId(store),
    propertyId: entry.propertyId,
    event: entry.event,
    detail: entry.detail,
    metadata: entry.metadata,
    createdAt: new Date().toISOString(),
  };
  store.activityLog.unshift(log);
  // Trim to last 200 entries
  if (store.activityLog.length > 200) {
    store.activityLog = store.activityLog.slice(0, 200);
  }
}

// ─── Vacate workflow ──────────────────────────────────────────────────────────

export async function processVacateWorkflow(input: VacateWorkflowInput): Promise<TenantRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const tenantIndex = store.tenants.findIndex((t) => t.id === input.tenantId);
      if (tenantIndex < 0) throw new Error('Tenant not found.');

      const tenant = store.tenants[tenantIndex];

      const vacateDate = new Date(input.vacateDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isImmediateVacate = vacateDate <= today;

      const newStatus = isImmediateVacate ? 'inactive' : 'notice_submitted';

      // Use multi-item deductions if provided; fall back to legacy single deduction
      const totalDeduction = input.deductionItems && input.deductionItems.length > 0
        ? input.deductionItems.reduce((sum, d) => sum + d.amount, 0)
        : Number(input.depositDeduction) || 0;
      const depositRefund = Math.max(0, tenant.securityDeposit - totalDeduction);

      const updated: TenantRecord = {
        ...tenant,
        status: newStatus,
        vacateDate: input.vacateDate,
        vacateReason: input.reason,
      };
      store.tenants[tenantIndex] = updated;

      // Archive pending/overdue payments for this tenant on immediate vacate
      if (isImmediateVacate) {
        store.payments = store.payments.map((p) => {
          if (p.tenantId !== tenant.id) return p;
          if (p.status === 'pending' || p.status === 'overdue') {
            return { ...p, status: 'overdue' as const }; // keep as overdue but track separately
          }
          return p;
        });
      }

      // Create vacate request record
      const deductionSummary = input.deductionItems && input.deductionItems.length > 0
        ? input.deductionItems.map((d) => d.description).join('; ')
        : input.deductionReason;

      const vacateRequest: VacateRequest = {
        id: createDemoId('vacate'),
        tenantId: tenant.id,
        tenantName: tenant.name,
        propertyId: tenant.propertyId,
        room: tenant.room,
        noticeDate: toDateOnly(new Date()),
        plannedVacateDate: input.vacateDate,
        reason: input.reason,
        finalSettlementAmount: tenant.rent,
        depositRefund,
        depositDeduction: totalDeduction,
        deductionReason: deductionSummary,
        status: isImmediateVacate ? 'completed' : 'confirmed',
        createdAt: new Date().toISOString(),
      };
      store.vacateRequests.unshift(vacateRequest);

      // If immediate vacate: release room + emit events
      if (isImmediateVacate) {
        syncDemoRoomOccupancy(store, tenant.propertyId);
        appendDemoActivity(store, {
          propertyId: tenant.propertyId,
          event: 'TENANT_VACATED',
          detail: `${tenant.name} vacated Room ${tenant.room} — deposit refund ₹${depositRefund.toLocaleString('en-IN')}`,
          metadata: { tenantId: tenant.id, room: tenant.room, depositRefund, totalDeduction, vacateDate: input.vacateDate },
        });
        appendDemoActivity(store, {
          propertyId: tenant.propertyId,
          event: 'ROOM_VACATED',
          detail: `Room ${tenant.room} is now vacant at ${store.properties.find((p) => p.id === tenant.propertyId)?.name ?? tenant.propertyId}`,
          metadata: { room: tenant.room, floor: tenant.floor },
        });
        if (totalDeduction > 0) {
          appendDemoActivity(store, {
            propertyId: tenant.propertyId,
            event: 'DEPOSIT_SETTLED',
            detail: `Deposit settlement: ₹${tenant.securityDeposit.toLocaleString('en-IN')} held, ₹${totalDeduction.toLocaleString('en-IN')} deducted, ₹${depositRefund.toLocaleString('en-IN')} refunded to ${tenant.name}`,
            metadata: { tenantId: tenant.id, securityDeposit: tenant.securityDeposit, totalDeduction, depositRefund, items: input.deductionItems ?? [] },
          });
        }
      } else {
        appendDemoActivity(store, {
          propertyId: tenant.propertyId,
          event: 'TENANT_VACATED',
          detail: `${tenant.name} submitted vacate notice — planned move-out ${input.vacateDate}`,
          metadata: { tenantId: tenant.id, room: tenant.room, vacateDate: input.vacateDate },
        });
      }

      // Emit domain event for notifications
      domainEvents.tenantVacated({
        tenantId: tenant.id,
        tenantName: tenant.name,
        propertyId: tenant.propertyId,
        room: tenant.room,
        depositRefund,
        isImmediate: isImmediateVacate,
      });

      return updated;
    }));
  }

  // ─── Live Supabase vacate workflow ────────────────────────────────────────
  return runSupabase(mode, () => supabaseOwnerDataApi.processVacate(input));
}

/**
 * Finalizes any tenant whose notice period has elapsed (status='notice_submitted',
 * vacate_date <= today): frees the bed/room, archives agreements, generates the
 * settlement document, and sends the closure WhatsApp — same as an immediate vacate.
 * No-op in demo mode. Safe to call opportunistically (e.g. on dashboard load).
 */
export async function finalizeDueVacates(): Promise<number> {
  const mode = getAppMode();
  if (mode === 'demo') return 0;
  return runSupabase(mode, () => supabaseOwnerDataApi.finalizeDueVacates());
}

export async function archiveTenantRecord(tenantId: string): Promise<TenantRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const idx = store.tenants.findIndex((t) => t.id === tenantId);
      if (idx < 0) throw new Error('Tenant not found.');

      const tenant = store.tenants[idx];
      if (isTenantCurrentlyInRoom(tenant.status)) {
        throw new Error('Cannot archive a tenant who is still occupying a room. Process vacate first.');
      }

      const archived: TenantRecord = { ...tenant, status: 'archived' };
      store.tenants[idx] = archived;

      appendDemoActivity(store, {
        propertyId: tenant.propertyId,
        event: 'TENANT_STATUS_CHANGED',
        detail: `${tenant.name} archived`,
        metadata: { tenantId: tenant.id, previousStatus: tenant.status, newStatus: 'archived' },
      });

      return archived;
    }));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.archiveTenant(tenantId));
}

// ─── Team Members ─────────────────────────────────────────────────────────────

export async function getTeamMembers(): Promise<import('./supabaseData').TeamMemberRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') return [];
  return runSupabase(mode, () => supabaseOwnerDataApi.listTeamMembers());
}

// ─── Vacate requests ──────────────────────────────────────────────────────────

export async function getVacateRequests(propertyId: string | 'all' = 'all'): Promise<VacateRequest[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const all = readDemoStore().vacateRequests;
    return clone(propertyId === 'all' ? all : all.filter((v) => v.propertyId === propertyId));
  }
  return [];
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function getActivityLog(propertyId: string | 'all' = 'all', limit = 50): Promise<ActivityLogEntry[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const all = readDemoStore().activityLog;
    const filtered = propertyId === 'all' ? all : all.filter((e) => e.propertyId === propertyId || e.propertyId === null);
    return clone(filtered.slice(0, limit));
  }
  return runSupabase(mode, () => supabaseOwnerDataApi.getActivityLog(propertyId, limit));
}

// ─── WhatsApp Queue ───────────────────────────────────────────────────────────

export async function getWhatsAppQueue(propertyId?: string | null): Promise<WhatsAppQueueEntry[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const store = readDemoStore();
    const all = store.whatsappQueue;
    if (!propertyId) return clone(all);
    return clone(all.filter((e) => e.propertyId === propertyId || e.propertyId === null));
  }
  return [];
}

// ─── CSV Bulk Import ──────────────────────────────────────────────────────────

export async function importTenantsFromCSV(
  csvText: string,
  properties: Property[],
): Promise<CSVImportResult> {
  const mode = getAppMode();
  const existingTenants = await getTenants('all');
  const rows = prepareImportRows(csvText, properties, existingTenants);

  const validRows = rows.filter((row) => row.isValid && row.input !== null);
  const createdTenants: TenantRecord[] = [];
  const runtimeErrors: Array<{ row: number; field: string; message: string }> = [];

  for (const row of validRows) {
    if (!row.input) continue;
    try {
      const created = await createTenantRecord(row.input);
      createdTenants.push(created);
    } catch (err) {
      runtimeErrors.push({
        row: row.rowIndex + 2,
        field: 'general',
        message: err instanceof Error ? err.message : 'Failed to create tenant',
      });
    }
  }

  if (mode === 'demo' && createdTenants.length > 0) {
    withDemoStoreMutation((store) => {
      appendDemoActivity(store, {
        propertyId: null,
        event: 'CSV_IMPORT_COMPLETED',
        detail: `CSV import: ${createdTenants.length} tenants onboarded (${rows.length - validRows.length + runtimeErrors.length} failed)`,
        metadata: { total: rows.length, succeeded: createdTenants.length },
      });
    });
  }

  domainEvents.csvImportCompleted({
    propertyId: null,
    succeeded: createdTenants.length,
    failed: rows.length - createdTenants.length,
    total: rows.length,
  });

  return buildImportResult(rows, createdTenants, runtimeErrors);
}

// ─── Tenant portal ────────────────────────────────────────────────────────────

export async function getTenantPortalSnapshot(): Promise<TenantPortalSnapshot> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const store = readDemoStore();
    const tenant = store.tenants.find((t) => t.id === 'demo-tenant-1') ?? store.tenants[0];
    const property = demoProperties.find((p) => p.id === tenant.propertyId) ?? null;
    const payments = store.payments.filter((p) => p.tenantId === tenant.id);
    const maintenance = store.maintenanceTickets.filter(
      (t) => t.tenant === tenant.name || t.propertyId === tenant.propertyId,
    ).slice(0, 5);
    const announcements = demoAnnouncements.filter(
      (a) => a.propertyId === null || a.propertyId === tenant.propertyId,
    );
    const vacateRequest = demoVacateRequests.find((v) => v.tenantId === tenant.id) ?? null;

    return {
      profile: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        role: 'tenant',
        ownerScopeId: null,
        pgName: property?.name ?? 'Shree Niwas PG',
        city: 'Jaipur',
        photoUrl: null,
      },
      tenant,
      property: property
        ? { ...property, rooms: [] }
        : null,
      owner: {
        id: 'demo-owner-1',
        name: 'Vikram Singhania',
        email: 'owner.demo@rentcare.demo',
        phone: '+919887654321',
        role: 'owner',
        ownerScopeId: null,
        pgName: 'Singhania PG Network',
        city: 'Jaipur',
        photoUrl: null,
      },
      payments,
      maintenance,
      announcements,
      notifications: [],
      ownerPaymentInfo: {
        upiId: 'vikram.singhania@upi',
        qrCodeUrl: '',
        pgRules: [
          'Rent due by the 7th of every month.',
          'Late fee of ₹250 after the 10th.',
          'Guests allowed till 9 PM only.',
          'No cooking in rooms.',
          'Noise curfew after 11 PM.',
        ],
        ownerPhone: '+919887654321',
        pgName: 'Singhania PG Network',
      },
      vacateRequest,
      // Demo personas carry no real agreements/documents. These MUST be present
      // (even as empty arrays) — TenantPortal destructures and iterates them at
      // render time, so omitting them crashes the portal in demo mode.
      documents: [],
      agreements: [],
    };
  }
  return runSupabase(mode, () => supabaseTenantDataApi.getPortalSnapshot());
}

export interface OwnerTenantSnapshot {
  tenant: TenantRecord;
  payments: PaymentRecord[];
  maintenance: import('./supabaseData').MaintenanceTicketRecord[];
  agreements: import('./supabaseData').AgreementRecord[];
  documents: import('./supabaseData').TenantDocument[];
}

export async function getOwnerTenantSnapshot(tenantId: string): Promise<OwnerTenantSnapshot> {
  const mode = getAppMode();
  if (mode === 'demo') {
    const tenant = await getTenantById(tenantId);
    const payments = await getPaymentsForTenant(tenantId);
    const maintenance = await getMaintenanceForTenant(tenantId);
    return {
      tenant,
      payments,
      maintenance,
      agreements: [],
      documents: [],
    };
  }
  return runSupabase(mode, async () => {
    const [tenant, payments, maintenance, agreements, documents] = await Promise.all([
      supabaseOwnerDataApi.getTenantById(tenantId),
      supabaseOwnerDataApi.listPayments('all').then(list => list.filter(p => p.tenantId === tenantId)),
      supabaseOwnerDataApi.listMaintenanceTickets('all').then(list => list.filter(m => m.tenant === tenantId || m.phone)), // Approximate for demo
      import('./supabaseData').then(m => m.supabaseLifecycleApi.getAgreements(tenantId)).catch(() => []),
      import('./supabaseData').then(m => m.supabaseLifecycleApi.getTenantDocuments(tenantId)).catch(() => []),
    ]);
    
    // For maintenance, the API returns it by property or all, so filtering by phone/tenant name is done on client if needed,
    // but a proper API call should filter by tenant_id. Since we don't have getMaintenanceForTenant in supabaseOwnerDataApi,
    // we'll filter the list.
    if (!tenant) throw new Error('Tenant not found');
    const actualMaintenance = maintenance.filter(m => m.tenant === tenant.name || m.phone === tenant.phone);

    return { tenant, payments, maintenance: actualMaintenance, agreements, documents };
  });
}

export async function submitTenantVacateRequest(input: { vacateDate: string; reason: string }): Promise<void> {
  const mode = getAppMode();
  if (mode === 'demo') {
    withDemoStoreMutation((store) => {
      const tenant = store.tenants.find((t) => t.id === 'demo-tenant-1');
      if (!tenant) return;
      const vacateDate = new Date(input.vacateDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newStatus = vacateDate <= today ? 'inactive' : 'notice_submitted';
      const idx = store.tenants.indexOf(tenant);
      store.tenants[idx] = { ...tenant, status: newStatus, vacateDate: input.vacateDate, vacateReason: input.reason };
    });
    return;
  }
  return runSupabase(mode, () => supabaseTenantDataApi.submitVacateRequest(input));
}

export async function createTenantMaintenanceTicket(input: {
  issue: string;
  description: string;
  priority: MaintenancePriority;
  imageUrl?: string;
}): Promise<MaintenanceTicketRecord> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(withDemoStoreMutation((store) => {
      const tenant = store.tenants.find((t) => t.id === 'demo-tenant-1') ?? store.tenants[0];
      const ticketId = createDemoId('ticket');
      const now = new Date().toISOString();
      const ticket: MaintenanceTicketRecord = {
        id: ticketId,
        ticketId: `TKT-${String(store.maintenanceTickets.length + 1).padStart(3, '0')}`,
        tenant: tenant.name,
        propertyId: tenant.propertyId,
        room: tenant.room,
        issue: input.issue.trim(),
        description: input.imageUrl ? `${input.description}\n\n📷 Photo: ${input.imageUrl}` : input.description.trim(),
        source: 'portal',
        status: 'open',
        priority: input.priority,
        date: toDateOnly(new Date()),
        phone: tenant.phone,
        notes: [],
        threads: [],
        updatedAt: now,
      };
      store.maintenanceTickets.unshift(ticket);
      appendDemoActivity(store, {
        propertyId: tenant.propertyId,
        event: 'MAINTENANCE_CREATED',
        detail: `${tenant.name} reported: ${input.issue} (Room ${tenant.room})`,
        metadata: { ticketId, priority: input.priority },
      });
      return ticket;
    }));
  }
  return runSupabase(mode, () => supabaseTenantDataApi.createMaintenanceTicket(input));
}
