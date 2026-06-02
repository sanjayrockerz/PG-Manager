import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bed, Home, Users, Wrench, ChevronRight, X,
  AlertTriangle, Clock, CheckCircle, User, IndianRupee,
  Calendar, MapPin, ArrowUpRight, AlertCircle, ZapIcon,
  TrendingUp, Shield,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useProperty } from '../contexts/PropertyContext';
import { getTenants } from '../services/dataService';
import { computePropertySnapshot } from '../services/occupancyEngine';
import type { RoomOccupancy } from '../services/occupancyEngine';
import type { TenantRecord } from '../services/supabaseData';
import { TENANT_STATUS_LABELS, TENANT_STATUS_COLORS } from '../services/supabaseData';
import type { Room } from '../contexts/PropertyContext';
import type { OccupancyMode } from '../services/supabaseData';

interface BuildingViewProps {
  onTenantClick?: (tenantId: string) => void;
  onNavigate?: (tab: string) => void;
}

// Priority: maintenance > overdue_risk > vacating > full > partial > vacant
const ROOM_STATUS_STYLES: Record<string, { border: string; bg: string; dot: string; ring?: string }> = {
  occupied_full:    { border: 'border-green-300',  bg: 'bg-green-50',   dot: 'bg-green-500' },
  occupied_partial: { border: 'border-amber-300',  bg: 'bg-amber-50',   dot: 'bg-amber-500' },
  vacant:           { border: 'border-blue-200',   bg: 'bg-blue-50',    dot: 'bg-blue-400' },
  maintenance:      { border: 'border-orange-300', bg: 'bg-orange-50',  dot: 'bg-orange-500' },
  vacating:         { border: 'border-yellow-400', bg: 'bg-yellow-50',  dot: 'bg-yellow-500' },
  overdue_risk:     { border: 'border-red-400',    bg: 'bg-red-50',     dot: 'bg-red-500', ring: 'ring-1 ring-red-300' },
};

function getRoomStyle(occ: RoomOccupancy): typeof ROOM_STATUS_STYLES[string] {
  if (occ.isUnderMaintenance) return ROOM_STATUS_STYLES.maintenance;
  if (occ.hasOverdueRisk) return ROOM_STATUS_STYLES.overdue_risk;
  if (occ.hasUpcomingVacate) return ROOM_STATUS_STYLES.vacating;
  if (occ.isFullyOccupied) return ROOM_STATUS_STYLES.occupied_full;
  if (occ.isPartiallyOccupied) return ROOM_STATUS_STYLES.occupied_partial;
  return ROOM_STATUS_STYLES.vacant;
}

function getRoomStatusLabel(occ: RoomOccupancy): string {
  if (occ.isUnderMaintenance) return 'Maintenance';
  if (occ.hasOverdueRisk) return `${occ.overdueCount} Overdue`;
  if (occ.hasUpcomingVacate) return 'Upcoming Vacate';
  if (occ.isFullyOccupied) return 'Fully Occupied';
  if (occ.isPartiallyOccupied) return 'Partially Occupied';
  return 'Vacant';
}

function BedGrid({ occ, mode }: { occ: RoomOccupancy; mode: OccupancyMode }) {
  if (mode !== 'BED_BASED' || occ.totalCapacity <= 1) return null;

  return (
    <div className="flex gap-1 mt-2 flex-wrap">
      {Array.from({ length: occ.totalCapacity }).map((_, i) => {
        const tenant = occ.tenantsInRoom[i];
        const isVacating = tenant && (tenant.status === 'notice_submitted' || tenant.status === 'vacating');
        const isOverdue = tenant && tenant.status === 'payment_overdue';
        return (
          <div
            key={i}
            title={
              tenant
                ? `Bed ${i + 1}: ${tenant.name}${isOverdue ? ' (overdue)' : isVacating ? ' (vacating)' : ''}`
                : `Bed ${i + 1}: Vacant`
            }
            className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border transition-colors ${
              tenant
                ? isOverdue
                  ? 'bg-red-100 border-red-400 text-red-700'
                  : isVacating
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
  const statusLabel = getRoomStatusLabel(occ);

  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-lg p-3 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer w-full ${style.border} ${style.bg} ${style.ring ?? ''}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
          <p className="text-sm font-semibold text-gray-900">Room {occ.roomNumber}</p>
        </div>
        <div className="flex items-center gap-1">
          {occ.hasOverdueRisk && (
            <span title={`${occ.overdueCount} tenant(s) with overdue payment`}>
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            </span>
          )}
          {occ.hasUpcomingVacate && !occ.hasOverdueRisk && (
            <span title="Upcoming vacate">
              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            </span>
          )}
          {occ.isUnderMaintenance && (
            <Wrench className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          )}
          {occ.isFullyOccupied && !occ.hasUpcomingVacate && !occ.hasOverdueRisk && (
            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          )}
        </div>
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

      <div className="flex items-center justify-between mt-2">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          occ.hasOverdueRisk
            ? 'bg-red-100 text-red-700'
            : occ.hasUpcomingVacate
              ? 'bg-yellow-100 text-yellow-700'
              : occ.isUnderMaintenance
                ? 'bg-orange-100 text-orange-700'
                : occ.isVacant
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
        }`}>
          {statusLabel}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
      </div>
    </button>
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
  const isOverdue = tenant.status === 'payment_overdue';
  const isVacating = tenant.status === 'notice_submitted' || tenant.status === 'vacating';

  return (
    <div className={`border rounded-lg p-3 bg-white ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isOverdue
              ? 'bg-gradient-to-br from-red-400 to-red-600'
              : isVacating
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gradient-to-br from-purple-400 to-blue-500'
          }`}>
            <span className="text-white text-xs font-bold">
              {tenant.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{tenant.name}</p>
            <p className="text-xs text-gray-500">
              {tenant.bed ? `Bed ${tenant.bed} · ` : ''}Joined {new Date(tenant.joinDate).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {isOverdue && (
        <div className="mt-2 flex items-center gap-1.5 bg-red-100 rounded-md px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700 font-medium">Payment overdue — action required</p>
        </div>
      )}

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

function RoomDetailSheet({
  occ,
  room,
  mode,
  propertyName,
  open,
  onClose,
  onTenantClick,
  onNavigate,
}: {
  occ: RoomOccupancy | null;
  room: Room | null;
  mode: OccupancyMode;
  propertyName: string;
  open: boolean;
  onClose: () => void;
  onTenantClick?: (tenantId: string) => void;
  onNavigate?: (tab: string) => void;
}) {
  if (!occ || !room) return null;

  const style = getRoomStyle(occ);
  const statusLabel = getRoomStatusLabel(occ);

  const monthlyRevenue = occ.tenantsInRoom.reduce((sum, t) => sum + t.rent, 0);
  const potentialRevenue = room.rent * (mode === 'BED_BASED' ? room.beds : 1);
  const revenueRate = potentialRevenue > 0 ? Math.round((monthlyRevenue / potentialRevenue) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${style.dot}`} />
            Room {occ.roomNumber} — Floor {occ.floor}
          </SheetTitle>
        </SheetHeader>

        {/* Overdue risk alert */}
        {occ.hasOverdueRisk && (
          <div className="mb-4 bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Payment Overdue Risk</p>
              <p className="text-xs text-red-700 mt-0.5">
                {occ.overdueCount} tenant{occ.overdueCount !== 1 ? 's have' : ' has'} overdue payments.
                Click on a tenant profile to manage.
              </p>
            </div>
          </div>
        )}

        {/* Room summary */}
        <div className={`rounded-xl p-4 mb-4 border ${style.border} ${style.bg}`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Type</p>
              <p className="font-semibold text-gray-900 capitalize">{room.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <p className={`font-semibold capitalize ${occ.hasOverdueRisk ? 'text-red-700' : 'text-gray-900'}`}>
                {statusLabel}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Listed Rent</p>
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

          {/* Revenue insight */}
          {occ.tenantsInRoom.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200/70">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1 text-gray-500">
                  <TrendingUp className="w-3 h-3" />
                  Monthly revenue
                </span>
                <span className="font-semibold text-gray-900">
                  ₹{monthlyRevenue.toLocaleString('en-IN')} / ₹{potentialRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${revenueRate >= 80 ? 'bg-green-500' : revenueRate >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                  style={{ width: `${revenueRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{revenueRate}% revenue utilization</p>
            </div>
          )}

          {mode === 'BED_BASED' && occ.totalCapacity > 1 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1.5">Bed Map</p>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: occ.totalCapacity }).map((_, i) => {
                  const tenant = occ.tenantsInRoom[i];
                  const isVacating = tenant && (tenant.status === 'notice_submitted' || tenant.status === 'vacating');
                  const isOverdue = tenant && tenant.status === 'payment_overdue';
                  return (
                    <div
                      key={i}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        tenant
                          ? isOverdue
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : isVacating
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
          <span className="text-gray-400">· Floor {occ.floor}</span>
        </div>

        {/* Tenants list */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {occ.tenantsInRoom.length > 0
              ? `Current Occupants (${occ.tenantsInRoom.length})`
              : 'No Occupants'}
          </h3>

          {occ.tenantsInRoom.length === 0 && (
            <div className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
              {occ.isUnderMaintenance
                ? <><Wrench className="w-5 h-5 mx-auto mb-1 text-orange-400" />Room is under maintenance.</>
                : <><Home className="w-5 h-5 mx-auto mb-1 text-blue-400" />This room is vacant and available.</>}
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
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
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

        {/* Quick actions */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Actions</p>
          <div className="space-y-2">
            {occ.isVacant && !occ.isUnderMaintenance && (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <ZapIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Room is vacant — assign a new tenant</span>
                </div>
                {onNavigate && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0"
                    onClick={() => { onClose(); onNavigate('tenants'); }}>
                    Go to Tenants
                  </Button>
                )}
              </div>
            )}
            {occ.hasOverdueRisk && (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{occ.overdueCount} tenant{occ.overdueCount !== 1 ? 's' : ''} with overdue payment</span>
                </div>
                {onNavigate && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0"
                    onClick={() => { onClose(); onNavigate('payments'); }}>
                    View Payments
                  </Button>
                )}
              </div>
            )}
            {occ.isUnderMaintenance && (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Room locked for maintenance</span>
                </div>
                {onNavigate && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0"
                    onClick={() => { onClose(); onNavigate('maintenance'); }}>
                    View Tickets
                  </Button>
                )}
              </div>
            )}
            {occ.hasUpcomingVacate && (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Upcoming vacate — settle deposit and free room</span>
                </div>
                {occ.tenantsInRoom.find((t) => t.status === 'notice_submitted' || t.status === 'vacating') && onTenantClick && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-100 flex-shrink-0"
                    onClick={() => {
                      const t = occ.tenantsInRoom.find((t) => t.status === 'notice_submitted' || t.status === 'vacating');
                      if (t) { onClose(); onTenantClick(t.id); }
                    }}>
                    Open Profile
                  </Button>
                )}
              </div>
            )}
            {occ.isFullyOccupied && !occ.hasOverdueRisk && !occ.hasUpcomingVacate && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                <span>All good — room is fully occupied with no issues</span>
              </div>
            )}
          </div>
        </div>

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

export function BuildingView({ onTenantClick, onNavigate }: BuildingViewProps) {
  const { selectedProperty, setSelectedProperty, properties } = useProperty();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ occ: RoomOccupancy; room: Room } | null>(null);
  const fetchSeq = useRef(0);

  // Auto-select first property if "All Properties" is selected
  useEffect(() => {
    if (selectedProperty === 'all' && properties.length > 0) {
      setSelectedProperty(properties[0].id);
    }
  }, [selectedProperty, properties, setSelectedProperty]);

  const currentProperty = selectedProperty === 'all'
    ? properties[0] ?? null
    : properties.find((p) => p.id === selectedProperty) ?? null;

  const occupancyMode = (currentProperty?.occupancyMode ?? 'BED_BASED') as OccupancyMode;

  const loadTenants = useCallback(async () => {
    if (!currentProperty) return;
    // Protect against rapid property switches and overlapping fetches
    const fetchId = ++fetchSeq.current;
    setLoadingTenants(true);
    try {
      const list = await getTenants(currentProperty.id);
      // only apply results if this fetch is still the latest
      if (fetchSeq.current === fetchId) {
        setTenants(list);
      }
    } catch {
      // keep last known
    } finally {
      if (fetchSeq.current === fetchId) {
        setLoadingTenants(false);
      }
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
    if (properties.length === 0) {
      return (
        <div className="ds-card p-12 text-center">
          <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0B' }}>No properties yet</p>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 6 }}>Add a property first to view building occupancy.</p>
        </div>
      );
    }
    return (
      <div className="ds-card p-12 text-center">
        <Home className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p style={{ fontSize: 13, color: '#A1A1AA' }}>Loading…</p>
      </div>
    );
  }

  if (!snapshot) return null;

  const upcomingVacates = snapshot.roomOccupancies.filter((r) => r.hasUpcomingVacate).length;
  const overdueRooms = snapshot.roomOccupancies.filter((r) => r.hasOverdueRisk).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Building View</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>Live room occupancy · click any room for details</p>
        </div>
        {/* Property switcher (only shown when multiple properties exist) */}
        {properties.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {properties.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProperty(p.id)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${currentProperty?.id === p.id ? '#6366F1' : '#E4E4E7'}`,
                  background: currentProperty?.id === p.id ? '#6366F1' : '#fff',
                  color: currentProperty?.id === p.id ? '#fff' : '#52525B',
                  transition: 'all 0.15s',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

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
                <span className="text-xs text-indigo-600 animate-pulse">Syncing…</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{currentProperty.address}{currentProperty.city ? `, ${currentProperty.city}` : ''}</p>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          {[
            { label: 'Total Rooms', value: snapshot.totalRooms, className: 'bg-gray-50' },
            { label: 'Occupied', value: snapshot.occupiedRooms, className: 'bg-green-50 text-green-700' },
            { label: 'Vacant', value: snapshot.vacantRooms, className: 'bg-blue-50 text-blue-700' },
            { label: 'Maintenance', value: snapshot.maintenanceRooms, className: 'bg-orange-50 text-orange-700' },
            { label: 'Upcoming Vacates', value: upcomingVacates, className: 'bg-amber-50 text-amber-700' },
            { label: 'Overdue Risk', value: overdueRooms, className: overdueRooms > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500' },
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
            { dot: 'bg-red-500', label: 'Overdue Risk' },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Global overdue alert */}
      {overdueRooms > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {overdueRooms} room{overdueRooms !== 1 ? 's' : ''} with overdue payments
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Rooms highlighted in red have tenants with overdue rent. Click to open the room and view tenant details.
            </p>
          </div>
        </div>
      )}

      {/* Floor-by-floor grid */}
      <div className="space-y-4">
        {floorData.map(({ floor, items }) => {
          const floorOccupied = items.filter((i) => i.occ.isFullyOccupied || i.occ.isPartiallyOccupied).length;
          const floorTotal = items.length;
          const floorOverdue = items.filter((i) => i.occ.hasOverdueRisk).length;

          return (
            <div key={floor} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 font-medium">Floor {floor}</p>
                  <span className="text-xs text-gray-500">
                    {floorOccupied}/{floorTotal} rooms occupied
                  </span>
                  {floorOverdue > 0 && (
                    <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {floorOverdue} overdue
                    </span>
                  )}
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
        onNavigate={onNavigate}
      />
    </div>
  );
}
