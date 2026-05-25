import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bed, Home, Users, Wrench, ChevronRight, X,
  AlertTriangle, Clock, CheckCircle, User, IndianRupee,
  Calendar, MapPin, ArrowUpRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useProperty } from '../contexts/PropertyContext';
import { getTenants, isDemoModeEnabled } from '../services/dataService';
import { computePropertySnapshot } from '../services/occupancyEngine';
import type { RoomOccupancy } from '../services/occupancyEngine';
import type { TenantRecord } from '../services/supabaseData';
import { TENANT_STATUS_LABELS, TENANT_STATUS_COLORS } from '../services/supabaseData';
import type { Room } from '../contexts/PropertyContext';
import type { OccupancyMode } from '../services/supabaseData';

interface BuildingViewProps {
  onTenantClick?: (tenantId: string) => void;
}

const ROOM_STATUS_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  occupied_full:    { border: 'border-green-300', bg: 'bg-green-50', dot: 'bg-green-500' },
  occupied_partial: { border: 'border-amber-300', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  vacant:           { border: 'border-blue-200',  bg: 'bg-blue-50',  dot: 'bg-blue-400' },
  maintenance:      { border: 'border-orange-300', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  vacating:         { border: 'border-yellow-400', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
};

function getRoomStyle(occ: RoomOccupancy): typeof ROOM_STATUS_STYLES[string] {
  if (occ.isUnderMaintenance) return ROOM_STATUS_STYLES.maintenance;
  if (occ.hasUpcomingVacate) return ROOM_STATUS_STYLES.vacating;
  if (occ.isFullyOccupied) return ROOM_STATUS_STYLES.occupied_full;
  if (occ.isPartiallyOccupied) return ROOM_STATUS_STYLES.occupied_partial;
  return ROOM_STATUS_STYLES.vacant;
}

function BedGrid({ occ, mode }: { occ: RoomOccupancy; mode: OccupancyMode }) {
  if (mode !== 'BED_BASED' || occ.totalCapacity <= 1) return null;

  return (
    <div className="flex gap-1 mt-2 flex-wrap">
      {Array.from({ length: occ.totalCapacity }).map((_, i) => {
        const occupied = i < occ.occupiedCount;
        const tenant = occ.tenantsInRoom[i];
        const isVacating = tenant && (tenant.status === 'notice_submitted' || tenant.status === 'vacating');
        return (
          <div
            key={i}
            title={tenant ? `Bed ${i + 1}: ${tenant.name}` : `Bed ${i + 1}: Vacant`}
            className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border transition-colors ${
              occupied
                ? isVacating
                  ? 'bg-amber-100 border-amber-400 text-amber-700'
                  : 'bg-green-100 border-green-400 text-green-700'
                : 'bg-gray-100 border-gray-300 text-gray-400'
            }`}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

function RoomCard({
  occ,
  room,
  mode,
  onClick,
}: {
  occ: RoomOccupancy;
  room: Room;
  mode: OccupancyMode;
  onClick: () => void;
}) {
  const style = getRoomStyle(occ);

  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-lg p-3 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer w-full ${style.border} ${style.bg}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
          <p className="text-sm font-semibold text-gray-900">Room {occ.roomNumber}</p>
        </div>
        {occ.hasUpcomingVacate && (
          <span title="Upcoming vacate">
            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          </span>
        )}
        {occ.isUnderMaintenance && (
          <Wrench className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
        )}
        {occ.isFullyOccupied && !occ.hasUpcomingVacate && (
          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-0.5">
        <div className="flex items-center gap-1">
          {mode === 'BED_BASED' ? (
            <>
              <Bed className="w-3 h-3" />
              <span>{occ.occupiedCount}/{occ.totalCapacity} beds</span>
            </>
          ) : (
            <>
              <Users className="w-3 h-3" />
              <span>{occ.isVacant ? 'Vacant' : 'Occupied'}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IndianRupee className="w-3 h-3" />
          <span>₹{room.rent.toLocaleString('en-IN')}/mo</span>
        </div>
        {occ.tenantsInRoom.length > 0 && (
          <div className="flex items-center gap-1 mt-1 truncate">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate text-gray-700">
              {occ.tenantsInRoom.length === 1
                ? occ.tenantsInRoom[0].name
                : `${occ.tenantsInRoom[0].name} +${occ.tenantsInRoom.length - 1}`}
            </span>
          </div>
        )}
      </div>

      <BedGrid occ={occ} mode={mode} />

      <div className="flex items-center justify-end mt-2">
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </button>
  );
}

function RoomDetailSheet({
  occ,
  room,
  mode,
  propertyName,
  open,
  onClose,
  onTenantClick,
}: {
  occ: RoomOccupancy | null;
  room: Room | null;
  mode: OccupancyMode;
  propertyName: string;
  open: boolean;
  onClose: () => void;
  onTenantClick?: (tenantId: string) => void;
}) {
  if (!occ || !room) return null;

  const style = getRoomStyle(occ);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${style.dot}`} />
            Room {occ.roomNumber} — Floor {occ.floor}
          </SheetTitle>
        </SheetHeader>

        {/* Room summary */}
        <div className={`rounded-xl p-4 mb-4 border ${style.border} ${style.bg}`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Type</p>
              <p className="font-semibold text-gray-900 capitalize">{room.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <p className="font-semibold text-gray-900 capitalize">
                {occ.isUnderMaintenance
                  ? 'Maintenance'
                  : occ.hasUpcomingVacate
                    ? 'Upcoming Vacate'
                    : occ.isFullyOccupied
                      ? 'Fully Occupied'
                      : occ.isPartiallyOccupied
                        ? 'Partially Occupied'
                        : 'Vacant'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Rent</p>
              <p className="font-semibold text-gray-900">₹{room.rent.toLocaleString('en-IN')}/mo</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Capacity</p>
              <p className="font-semibold text-gray-900">
                {mode === 'BED_BASED'
                  ? `${occ.occupiedCount}/${occ.totalCapacity} beds`
                  : occ.isVacant ? 'Vacant' : 'Occupied'}
              </p>
            </div>
          </div>

          {mode === 'BED_BASED' && occ.totalCapacity > 1 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1.5">Bed Map</p>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: occ.totalCapacity }).map((_, i) => {
                  const tenant = occ.tenantsInRoom[i];
                  const isVacating = tenant && (tenant.status === 'notice_submitted' || tenant.status === 'vacating');
                  return (
                    <div
                      key={i}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        tenant
                          ? isVacating
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      Bed {i + 1}{tenant ? ` · ${tenant.name.split(' ')[0]}` : ' · Empty'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Property context */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <MapPin className="w-4 h-4" />
          <span>{propertyName}</span>
        </div>

        {/* Tenants list */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {occ.tenantsInRoom.length > 0 ? 'Current Occupants' : 'No Occupants'}
          </h3>

          {occ.tenantsInRoom.length === 0 && (
            <div className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">
              {occ.isUnderMaintenance ? 'Room is under maintenance.' : 'This room is vacant.'}
            </div>
          )}

          <div className="space-y-2">
            {occ.tenantsInRoom.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                onViewProfile={() => {
                  onClose();
                  onTenantClick?.(tenant.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* Upcoming vacate warning */}
        {occ.hasUpcomingVacate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Upcoming Vacate</p>
              <p className="text-amber-700 text-xs mt-0.5">
                {occ.tenantsInRoom
                  .filter((t) => t.status === 'notice_submitted' || t.status === 'vacating')
                  .map((t) => `${t.name} — ${t.vacateDate ? new Date(t.vacateDate).toLocaleDateString('en-IN') : 'date TBD'}`)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={onClose}
        >
          <X className="w-4 h-4 mr-2" /> Close
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function TenantCard({
  tenant,
  onViewProfile,
}: {
  tenant: TenantRecord;
  onViewProfile: () => void;
}) {
  const statusClass = TENANT_STATUS_COLORS[tenant.status] ?? 'bg-gray-100 text-gray-600';
  const statusLabel = TENANT_STATUS_LABELS[tenant.status] ?? tenant.status;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {tenant.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{tenant.name}</p>
            <p className="text-xs text-gray-500">Bed {tenant.bed} · Joined {new Date(tenant.joinDate).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <IndianRupee className="w-3 h-3" />
          <span>₹{tenant.rent.toLocaleString('en-IN')}/mo</span>
          <span className="text-gray-400">· Due {tenant.rentDueDate}th</span>
        </div>
        {tenant.vacateDate && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Calendar className="w-3 h-3" />
            <span>Out {new Date(tenant.vacateDate).toLocaleDateString('en-IN')}</span>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        onClick={onViewProfile}
      >
        View Profile <ArrowUpRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

export function BuildingView({ onTenantClick }: BuildingViewProps) {
  const { selectedProperty, properties } = useProperty();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ occ: RoomOccupancy; room: Room } | null>(null);

  const currentProperty = selectedProperty === 'all'
    ? null
    : properties.find((p) => p.id === selectedProperty) ?? null;

  const occupancyMode = (currentProperty?.occupancyMode ?? 'BED_BASED') as OccupancyMode;

  const loadTenants = useCallback(async () => {
    if (!currentProperty) return;
    setLoadingTenants(true);
    try {
      const list = await getTenants(currentProperty.id);
      setTenants(list);
    } catch {
      // keep last known
    } finally {
      setLoadingTenants(false);
    }
  }, [currentProperty]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  // Listen for cross-module data updates
  useEffect(() => {
    const handler = () => void loadTenants();
    window.addEventListener('owner-data-updated', handler);
    return () => window.removeEventListener('owner-data-updated', handler);
  }, [loadTenants]);

  const snapshot = useMemo(() => {
    if (!currentProperty) return null;
    return computePropertySnapshot(
      currentProperty.id,
      currentProperty.rooms,
      tenants,
      occupancyMode,
    );
  }, [currentProperty, tenants, occupancyMode]);

  const floorData = useMemo(() => {
    if (!snapshot || !currentProperty) return [];

    const roomMap = new Map(currentProperty.rooms.map((r) => [r.id, r]));
    const floorMap = new Map<number, Array<{ occ: RoomOccupancy; room: Room }>>();

    snapshot.roomOccupancies.forEach((occ) => {
      const room = roomMap.get(occ.roomId);
      if (!room) return;
      const list = floorMap.get(occ.floor) ?? [];
      list.push({ occ, room });
      floorMap.set(occ.floor, list);
    });

    return Array.from(floorMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, items]) => ({
        floor,
        items: items.sort((a, b) => a.room.number.localeCompare(b.room.number)),
      }));
  }, [snapshot, currentProperty]);

  if (!currentProperty) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Home className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-gray-900 text-lg">Select a property</h3>
        <p className="text-sm text-gray-600 mt-2">
          Pick a specific property from the top selector to view the live building occupancy.
        </p>
      </div>
    );
  }

  if (!snapshot) return null;

  const upcomingVacates = snapshot.roomOccupancies.filter((r) => r.hasUpcomingVacate).length;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 font-semibold">{currentProperty.name}</h3>
              <Badge variant="outline" className="text-xs">
                {occupancyMode === 'BED_BASED' ? 'Bed-Based' : 'Room-Based'}
              </Badge>
              {loadingTenants && (
                <span className="text-xs text-purple-600 animate-pulse">Syncing…</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Live building occupancy · Click any room for details</p>
          </div>
          <div className="text-sm font-semibold text-gray-700">
            {snapshot.occupancyRate}% occupancy
          </div>
        </div>

        {/* Occupancy progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                snapshot.occupancyRate >= 80 ? 'bg-green-500' :
                snapshot.occupancyRate >= 50 ? 'bg-amber-500' : 'bg-blue-400'
              }`}
              style={{ width: `${snapshot.occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Total Rooms', value: snapshot.totalRooms, className: 'bg-gray-50' },
            { label: 'Occupied', value: snapshot.occupiedRooms, className: 'bg-green-50 text-green-700' },
            { label: 'Vacant', value: snapshot.vacantRooms, className: 'bg-blue-50 text-blue-700' },
            { label: 'Maintenance', value: snapshot.maintenanceRooms, className: 'bg-orange-50 text-orange-700' },
            { label: 'Upcoming Vacates', value: upcomingVacates, className: 'bg-amber-50 text-amber-700' },
          ].map(({ label, value, className }) => (
            <div key={label} className={`rounded-lg p-3 ${className}`}>
              <p className="text-xs text-gray-600">{label}</p>
              <p className="text-xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
          {[
            { dot: 'bg-green-500', label: 'Fully Occupied' },
            { dot: 'bg-amber-500', label: 'Partially Occupied' },
            { dot: 'bg-blue-400', label: 'Vacant' },
            { dot: 'bg-orange-500', label: 'Maintenance' },
            { dot: 'bg-yellow-500', label: 'Upcoming Vacate' },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floor-by-floor grid */}
      <div className="space-y-4">
        {floorData.map(({ floor, items }) => {
          const floorOccupied = items.filter((i) => i.occ.isFullyOccupied || i.occ.isPartiallyOccupied).length;
          const floorTotal = items.length;

          return (
            <div key={floor} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 font-medium">Floor {floor}</p>
                  <span className="text-xs text-gray-500">
                    {floorOccupied}/{floorTotal} rooms occupied
                  </span>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${floorTotal > 0 ? Math.round((floorOccupied / floorTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map(({ occ, room }) => (
                  <RoomCard
                    key={room.id}
                    occ={occ}
                    room={room}
                    mode={occupancyMode}
                    onClick={() => setSelectedRoom({ occ, room })}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {floorData.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500 text-center">
            No rooms added for this property yet.
          </div>
        )}
      </div>

      {/* Room detail sheet */}
      <RoomDetailSheet
        occ={selectedRoom?.occ ?? null}
        room={selectedRoom?.room ?? null}
        mode={occupancyMode}
        propertyName={currentProperty.name}
        open={selectedRoom !== null}
        onClose={() => setSelectedRoom(null)}
        onTenantClick={onTenantClick}
      />
    </div>
  );
}
