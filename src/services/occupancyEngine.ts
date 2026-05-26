/**
 * Occupancy Engine — mode-aware occupancy calculations.
 *
 * Each property can operate in BED_BASED or ROOM_BASED mode.
 * All occupancy numbers (occupied, vacant, rate) flow through this engine
 * so Dashboard, BuildingView, and Analytics always agree.
 */

import type { Room } from '../contexts/PropertyContext';
import type { OccupancyMode, TenantRecord } from './supabaseData';
import { isTenantCurrentlyInRoom } from './supabaseData';

export interface RoomOccupancy {
  roomId: string;
  roomNumber: string;
  floor: number;
  totalCapacity: number;
  occupiedCount: number;
  vacantCount: number;
  occupancyRate: number;
  isFullyOccupied: boolean;
  isPartiallyOccupied: boolean;
  isVacant: boolean;
  isUnderMaintenance: boolean;
  hasUpcomingVacate: boolean;
  hasOverdueRisk: boolean;
  overdueCount: number;
  tenantsInRoom: TenantRecord[];
}

export interface PropertyOccupancySnapshot {
  propertyId: string;
  mode: OccupancyMode;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  totalCapacity: number;
  occupiedCapacity: number;
  occupancyRate: number;
  roomOccupancies: RoomOccupancy[];
}

/**
 * Compute per-room occupancy for a single property.
 * Adapts to BED_BASED (beds as unit) or ROOM_BASED (full room as unit).
 */
export function computePropertyOccupancy(
  rooms: Room[],
  tenants: TenantRecord[],
  mode: OccupancyMode = 'BED_BASED',
): PropertyOccupancySnapshot['roomOccupancies'] {
  const activeTenantsByRoom = new Map<string, TenantRecord[]>();

  tenants.forEach((tenant) => {
    if (!isTenantCurrentlyInRoom(tenant.status)) return;
    const key = `${tenant.floor}::${tenant.room.toLowerCase()}`;
    const list = activeTenantsByRoom.get(key) ?? [];
    list.push(tenant);
    activeTenantsByRoom.set(key, list);
  });

  return rooms.map((room) => {
    const key = `${room.floor}::${room.number.toLowerCase()}`;
    const tenantsInRoom = activeTenantsByRoom.get(key) ?? [];

    const isUnderMaintenance = room.status === 'maintenance';

    const hasUpcomingVacate = tenantsInRoom.some(
      (t) => t.status === 'notice_submitted' || t.status === 'vacating',
    );

    const overdueTenants = tenantsInRoom.filter((t) => t.status === 'payment_overdue');
    const hasOverdueRisk = overdueTenants.length > 0;
    const overdueCount = overdueTenants.length;

    let occupiedCount: number;
    let totalCapacity: number;

    if (mode === 'BED_BASED') {
      totalCapacity = room.beds;
      occupiedCount = Math.min(tenantsInRoom.length, room.beds);
    } else {
      // ROOM_BASED: room is either fully occupied (1) or vacant (0)
      totalCapacity = 1;
      occupiedCount = tenantsInRoom.length > 0 ? 1 : 0;
    }

    const vacantCount = isUnderMaintenance ? 0 : Math.max(0, totalCapacity - occupiedCount);
    const occupancyRate = totalCapacity === 0 ? 0 : Math.round((occupiedCount / totalCapacity) * 100);

    return {
      roomId: room.id,
      roomNumber: room.number,
      floor: room.floor,
      totalCapacity,
      occupiedCount,
      vacantCount,
      occupancyRate,
      isFullyOccupied: !isUnderMaintenance && occupiedCount >= totalCapacity && totalCapacity > 0,
      isPartiallyOccupied: !isUnderMaintenance && occupiedCount > 0 && occupiedCount < totalCapacity,
      isVacant: !isUnderMaintenance && occupiedCount === 0,
      isUnderMaintenance,
      hasUpcomingVacate,
      hasOverdueRisk,
      overdueCount,
      tenantsInRoom,
    };
  });
}

export function computePropertySnapshot(
  propertyId: string,
  rooms: Room[],
  tenants: TenantRecord[],
  mode: OccupancyMode = 'BED_BASED',
): PropertyOccupancySnapshot {
  const roomOccupancies = computePropertyOccupancy(rooms, tenants, mode);

  const occupiedRooms = roomOccupancies.filter((r) => r.isFullyOccupied || r.isPartiallyOccupied).length;
  const vacantRooms = roomOccupancies.filter((r) => r.isVacant).length;
  const maintenanceRooms = roomOccupancies.filter((r) => r.isUnderMaintenance).length;

  const totalCapacity = roomOccupancies.reduce((sum, r) => sum + r.totalCapacity, 0);
  const occupiedCapacity = roomOccupancies.reduce((sum, r) => sum + r.occupiedCount, 0);
  const occupancyRate = totalCapacity === 0 ? 0 : Math.round((occupiedCapacity / totalCapacity) * 100);

  return {
    propertyId,
    mode,
    totalRooms: rooms.length,
    occupiedRooms,
    vacantRooms,
    maintenanceRooms,
    totalCapacity,
    occupiedCapacity,
    occupancyRate,
    roomOccupancies,
  };
}

/**
 * Determine the room status that should be persisted to the database,
 * based on the number of active tenants and current room state.
 */
export function resolveRoomStatus(
  currentStatus: Room['status'],
  activeTenantsInRoom: number,
  mode: OccupancyMode = 'BED_BASED',
): Room['status'] {
  if (currentStatus === 'maintenance') return 'maintenance';

  if (mode === 'BED_BASED') {
    return activeTenantsInRoom > 0 ? 'occupied' : 'vacant';
  }

  return activeTenantsInRoom > 0 ? 'occupied' : 'vacant';
}

/**
 * Calculate the deposit refund after deductions.
 */
export function calculateDepositRefund(
  securityDeposit: number,
  deductionAmount: number,
): { refundAmount: number; deductionAmount: number } {
  const safeDeduction = Math.min(Math.max(0, deductionAmount), securityDeposit);
  return {
    refundAmount: securityDeposit - safeDeduction,
    deductionAmount: safeDeduction,
  };
}
