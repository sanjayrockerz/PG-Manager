import type { Property, Room } from '../contexts/PropertyContext';
import { getAppMode, type AppMode } from '../config/appMode';
import {
  buildDemoDashboardSnapshot,
  demoPayments,
  demoProperties,
  demoTenants,
} from '../data/demoData';
import {
  type DashboardSnapshot,
  type PaymentRecord,
  type PaymentStatus,
  supabaseOwnerDataApi,
  supabasePropertyApi,
  type TenantCreateInput,
  type TenantRecord,
} from './supabaseData';

const DEMO_READONLY_ERROR = 'Demo mode is enabled. Data changes are disabled to protect live Supabase data.';
const DEMO_LEAK_ERROR = 'Data leakage detected';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const filterByProperty = <T extends { propertyId: string }>(rows: T[], propertyId: string | 'all'): T[] => {
  if (propertyId === 'all') {
    return rows;
  }
  return rows.filter((row) => row.propertyId === propertyId);
};

const assertWritable = (): void => {
  if (getAppMode() === 'demo') {
    throw new Error(DEMO_READONLY_ERROR);
  }
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

export async function getDashboardData(propertyId: string | 'all'): Promise<DashboardSnapshot> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(buildDemoDashboardSnapshot(propertyId));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.getDashboardSnapshot(propertyId));
}

export async function getTenants(propertyId: string | 'all' = 'all'): Promise<TenantRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(filterByProperty(demoTenants, propertyId));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.listTenants(propertyId));
}

export async function getProperties(): Promise<Property[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(demoProperties);
  }

  return runSupabase(mode, () => supabasePropertyApi.list());
}

export async function getPayments(propertyId: string | 'all' = 'all'): Promise<PaymentRecord[]> {
  const mode = getAppMode();
  if (mode === 'demo') {
    return clone(filterByProperty(demoPayments, propertyId));
  }

  return runSupabase(mode, () => supabaseOwnerDataApi.listPayments(propertyId));
}

export async function createPropertyRecord(input: Omit<Property, 'id' | 'createdAt' | 'rooms'>): Promise<Property> {
  assertWritable();
  return supabasePropertyApi.create(input);
}

export async function updatePropertyRecord(id: string, input: Partial<Property>): Promise<Property> {
  assertWritable();
  return supabasePropertyApi.update(id, input);
}

export async function deletePropertyRecord(id: string): Promise<void> {
  assertWritable();
  await supabasePropertyApi.remove(id);
}

export async function addRoomToProperty(propertyId: string, input: Omit<Room, 'id'>): Promise<Room> {
  assertWritable();
  return supabasePropertyApi.addRoom(propertyId, input);
}

export async function updateRoomInProperty(propertyId: string, roomId: string, input: Partial<Room>): Promise<Room> {
  assertWritable();
  return supabasePropertyApi.updateRoom(propertyId, roomId, input);
}

export async function deleteRoomFromProperty(propertyId: string, roomId: string): Promise<void> {
  assertWritable();
  await supabasePropertyApi.removeRoom(propertyId, roomId);
}

export async function createTenantRecord(input: TenantCreateInput): Promise<TenantRecord> {
  assertWritable();
  return supabaseOwnerDataApi.createTenant(input);
}

export async function updateTenantRecord(tenantId: string, input: Partial<TenantCreateInput>): Promise<TenantRecord> {
  assertWritable();
  return supabaseOwnerDataApi.updateTenant(tenantId, input);
}

export async function deleteTenantRecord(tenantId: string): Promise<void> {
  assertWritable();
  await supabaseOwnerDataApi.deleteTenant(tenantId);
}

export async function updatePaymentStatusRecord(paymentId: string, status: PaymentStatus): Promise<PaymentRecord> {
  assertWritable();
  return supabaseOwnerDataApi.updatePaymentStatus(paymentId, status);
}

export async function addPaymentChargeRecord(
  paymentId: string,
  input: { type: string; customType?: string; description?: string; amount: number },
): Promise<PaymentRecord> {
  assertWritable();
  return supabaseOwnerDataApi.addPaymentCharge(paymentId, input);
}
