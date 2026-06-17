import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bed, Home, Users, Wrench, ChevronRight, X,
  AlertTriangle, Clock, CheckCircle, User, IndianRupee,
  Calendar, MapPin, ArrowUpRight, ArrowLeft, AlertCircle, ZapIcon,
  TrendingUp, Shield,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useProperty } from '../contexts/PropertyContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { getTenants } from '../services/dataService';
import { computePropertySnapshot } from '../services/occupancyEngine';
import type { RoomOccupancy } from '../services/occupancyEngine';
import type { TenantRecord } from '../services/supabaseData';
import { TENANT_STATUS_LABELS, TENANT_STATUS_COLORS } from '../services/supabaseData';
import type { Room } from '../contexts/PropertyContext';
import type { OccupancyMode } from '../services/supabaseData';
import { OCCUPANCY_TOKENS, occupancyDot } from '../utils/occupancyStatus';
import type { OccupancyTokens } from '../utils/occupancyStatus';

interface BuildingViewProps {
  onTenantClick?: (tenantId: string) => void;
  onNavigate?: (tab: string) => void;
  // History-aware back: returns to wherever Building View was opened from
  // (Properties, Dashboard, …) rather than a hardcoded redirect.
  onBack?: () => void;
}

// Occupancy colors come from the shared design tokens (utils/occupancyStatus)
// so Building View, Dashboard, Analytics and Admin never diverge. Priority:
// maintenance > overdue > vacating > occupied > vacant.
function getRoomStyle(occ: RoomOccupancy): OccupancyTokens {
  if (occ.isUnderMaintenance) return OCCUPANCY_TOKENS.maintenance;
  if (occ.hasOverdueRisk) return OCCUPANCY_TOKENS.overdue;
  if (occ.hasUpcomingVacate) return OCCUPANCY_TOKENS.vacating;
  if (occ.isFullyOccupied || occ.isPartiallyOccupied) return OCCUPANCY_TOKENS.occupied;
  return OCCUPANCY_TOKENS.vacant;
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
    // Wrap so high-capacity dorm rooms don't overflow a narrow card on mobile.
    <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
      {Array.from({ length: occ.totalCapacity }).map((_, i) => {
        const tenant = occ.tenantsInRoom[i];
        const isVacating = tenant && (tenant.status === 'notice_submitted' || tenant.status === 'vacating');
        const isOverdue = tenant && tenant.status === 'payment_overdue';
        // Shared semantics: vacant bed = green (available), occupied = neutral
        // grey, overdue = red, vacating = purple. Tokens are the single source.
        const dotColor = tenant
          ? isOverdue ? occupancyDot('overdue') : isVacating ? occupancyDot('vacating') : occupancyDot('occupied')
          : occupancyDot('vacant');
        const ringColor = dotColor;
        return (
          <span
            key={i}
            title={
              tenant
                ? `Bed ${i + 1}: ${tenant.name}${isOverdue ? ' (overdue)' : isVacating ? ' (vacating)' : ''}`
                : `Bed ${i + 1}: Vacant`
            }
            className="inline-block rounded-full transition-colors"
            style={{
              width: 10,
              height: 10,
              backgroundColor: dotColor,
              border: `1.5px solid ${ringColor}`,
            }}
          />
        );
      })}
      <span className="text-[11px] text-gray-400 ml-0.5">{occ.occupiedCount}/{occ.totalCapacity}</span>
    </div>
  );
}

function ProgressRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? '#16A34A' : percent >= 40 ? '#7C3AED' : '#64748B';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-gray-700">{percent}%</span>
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
  const primaryTenant = occ.tenantsInRoom[0];
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative group perspective-1000" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={onClick}
        className="text-left rounded-[20px] p-4 cursor-pointer w-full transition-all duration-300 ease-out backdrop-blur-sm relative overflow-hidden"
        style={{ 
          backgroundColor: style.bg, 
          border: `1px solid ${style.border}`,
          boxShadow: hovered ? style.shadow : '0 2px 8px rgba(0,0,0,0.02)',
          transform: hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        }}
      >
        {/* Subtle animated gradient background for specific states */}
        {occ.hasOverdueRisk && <div className="absolute inset-0 bg-red-500/5 opacity-50 mix-blend-multiply animate-pulse pointer-events-none" />}
        {occ.isUnderMaintenance && <div className="absolute inset-0 bg-orange-500/5 opacity-50 mix-blend-multiply animate-pulse pointer-events-none" />}

        {/* Room name + status icon */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[15px] font-semibold text-gray-900 tracking-tight">Room {occ.roomNumber}</p>
          <div className="flex items-center gap-1.5">
            {occ.hasOverdueRisk && (
              <span title={`${occ.overdueCount} tenant(s) with overdue payment`}>
                <AlertCircle className="w-4 h-4" style={{ color: OCCUPANCY_TOKENS.overdue.accent }} />
              </span>
            )}
            {occ.hasUpcomingVacate && !occ.hasOverdueRisk && (
              <span title="Upcoming vacate">
                <Clock className="w-4 h-4" style={{ color: OCCUPANCY_TOKENS.vacating.accent }} />
              </span>
            )}
            {occ.isUnderMaintenance && (
              <Wrench className="w-4 h-4" style={{ color: OCCUPANCY_TOKENS.maintenance.accent }} />
            )}
            {occ.isFullyOccupied && !occ.hasUpcomingVacate && !occ.hasOverdueRisk && (
              <CheckCircle className="w-4 h-4" style={{ color: OCCUPANCY_TOKENS.occupied.accent }} />
            )}
          </div>
        </div>

        {/* Occupancy + rent */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-gray-600/90">
            {mode === 'BED_BASED' ? (
              <>
                <div className="p-1 rounded-md bg-white shadow-sm border border-black/5"><Bed className="w-3.5 h-3.5 opacity-70" /></div>
                <span>{occ.occupiedCount}/{occ.totalCapacity} beds filled</span>
              </>
            ) : (
              <>
                <div className="p-1 rounded-md bg-white shadow-sm border border-black/5"><Users className="w-3.5 h-3.5 opacity-70" /></div>
                <span>{occ.isVacant ? 'Vacant' : 'Occupied'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-gray-600/90">
            <div className="p-1 rounded-md bg-white shadow-sm border border-black/5"><IndianRupee className="w-3.5 h-3.5 opacity-70" /></div>
            <span>₹{room.rent.toLocaleString('en-IN')} / mo</span>
          </div>
        </div>

        {/* Tenant summary */}
        {occ.tenantsInRoom.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 truncate">
            <User className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate text-[13px] text-gray-700">
              {occ.tenantsInRoom.length === 1
                ? occ.tenantsInRoom[0].name
                : `${occ.tenantsInRoom[0].name} +${occ.tenantsInRoom.length - 1}`}
            </span>
          </div>
        )}

        <BedGrid occ={occ} mode={mode} />

        {/* Status badge */}
        <div className="flex items-center justify-between mt-4 pt-3 relative" style={{ borderTop: `1px solid ${style.border}` }}>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider transition-colors"
            style={{ backgroundColor: hovered ? style.accent : '#fff', color: hovered ? '#fff' : style.accent, border: hovered ? `1px solid ${style.accent}` : `1px solid ${style.border}`, boxShadow: hovered ? style.shadow : 'none' }}
          >
            {statusLabel}
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${hovered ? 'translate-x-1' : ''}`} style={{ color: style.accent }} />
        </div>
      </button>

      {hovered && primaryTenant && (
        <div
          className="hidden md:block absolute z-30 left-1/2 -translate-x-1/2 top-full mt-3 w-64 rounded-[16px] bg-white/95 backdrop-blur-xl p-4 pointer-events-none opacity-0 animate-in fade-in slide-in-from-top-2 duration-200 fill-mode-forwards"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-3 border-b border-gray-100 pb-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
               <span className="text-gray-600 text-xs font-bold">{primaryTenant.name.charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-[14px] font-bold text-gray-900 truncate">{primaryTenant.name}</p>
          </div>
          <div className="space-y-2 text-[12px] font-medium text-gray-600/90">
            {primaryTenant.phone && (
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" /><span>{primaryTenant.phone}</span></div>
            )}
            <div className="flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 text-gray-400" /><span>₹{primaryTenant.rent.toLocaleString('en-IN')}/mo</span></div>
            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span>Due {primaryTenant.rentDueDate}th</span></div>
          </div>
        </div>
      )}
    </div>
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

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="ds-group-label mb-2">{label}</p>
      <div className="ds-card" style={{ borderRadius: 16 }}>
        <div className="ds-card-body">{children}</div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--ds-accent-subtle, #F4F4F5)' }}>
      <p className="ds-meta mb-0.5">{label}</p>
      <p className="text-[14px] font-semibold break-words" style={{ color: accent ?? 'var(--ds-text-1)' }}>{value}</p>
    </div>
  );
}

function HealthRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const toneColor = tone === 'good' ? '#16A34A' : tone === 'warn' ? '#D97706' : tone === 'bad' ? '#DC2626' : '#64748B';
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
      <div className="flex items-center gap-2 text-[13px] text-gray-600">
        <span style={{ color: toneColor }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-[13px] font-semibold" style={{ color: toneColor }}>{value}</span>
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

  const occupancyTypeLabel = mode === 'BED_BASED' ? 'Bed-based' : 'Room-based';
  const availableBeds = mode === 'BED_BASED' ? occ.totalCapacity - occ.occupiedCount : (occ.isVacant ? 1 : 0);
  const occupiedBeds = mode === 'BED_BASED' ? occ.occupiedCount : (occ.isVacant ? 0 : 1);

  const vacatingTenant = occ.tenantsInRoom.find((t) => t.status === 'notice_submitted' || t.status === 'vacating');
  const tenantsWithDocs = occ.tenantsInRoom.filter((t) => !!t.idDocumentUrl).length;

  const moveInReadiness =
    occ.isUnderMaintenance ? { label: 'Blocked — under maintenance', tone: 'bad' as const }
    : occ.isVacant ? { label: 'Ready to assign', tone: 'good' as const }
    : occ.hasOverdueRisk ? { label: 'Needs attention', tone: 'warn' as const }
    : { label: 'Occupied & stable', tone: 'good' as const };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" style={{ background: 'var(--ds-bg, #FAFAFA)' }}>
        <SheetHeader className="mb-1">
          <SheetTitle className="sr-only">Room {occ.roomNumber} details</SheetTitle>
        </SheetHeader>

        {/* Status-first hero */}
        <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#fff', border: `1px solid ${style.border}` }}
              >
                <Bed className="w-5 h-5" style={{ color: style.accent }} />
              </div>
              <div>
                <p className="text-[20px] font-semibold tracking-tight text-gray-900 leading-tight">Room {occ.roomNumber}</p>
                <p className="text-[12px] text-gray-500">{propertyName} · Floor {occ.floor}</p>
              </div>
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: '#fff', color: style.accent, border: `1px solid ${style.border}` }}
            >
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="Rent" value={`₹${room.rent.toLocaleString('en-IN')} / mo`} />
            <StatTile label="Occupancy Type" value={occupancyTypeLabel} />
            <StatTile label="Property" value={propertyName} />
            <StatTile label="Floor" value={`Floor ${occ.floor}`} />
          </div>
        </div>

        {/* Overview */}
        <DetailSection label="Overview">
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div>
              <p className="ds-meta mb-0.5">Room Type</p>
              <p className="text-[13px] font-semibold text-gray-900 capitalize">{room.type}</p>
            </div>
            <div>
              <p className="ds-meta mb-0.5">Listed Rent</p>
              <p className="text-[13px] font-semibold text-gray-900">₹{room.rent.toLocaleString('en-IN')}/mo</p>
            </div>
          </div>

          {occ.tenantsInRoom.length > 0 && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1 text-gray-500">
                  <TrendingUp className="w-3 h-3" />
                  Monthly revenue
                </span>
                <span className="font-semibold text-gray-900">
                  ₹{monthlyRevenue.toLocaleString('en-IN')} / ₹{potentialRevenue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: 'var(--ds-border-subtle)' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${revenueRate}%`, background: revenueRate >= 80 ? '#16A34A' : revenueRate >= 50 ? '#D97706' : '#DC2626' }}
                />
              </div>
              <p className="ds-meta mt-1">{revenueRate}% revenue utilization</p>
            </div>
          )}
        </DetailSection>

        {/* Occupancy */}
        <DetailSection label="Occupancy">
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <StatTile label="Available Beds" value={availableBeds} accent="#16A34A" />
            <StatTile label="Occupied Beds" value={occupiedBeds} accent={style.accent} />
          </div>

          {mode === 'BED_BASED' && occ.totalCapacity > 1 && (
            <div className="mb-3">
              <p className="ds-meta mb-1.5">Bed Map</p>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: occ.totalCapacity }).map((_, i) => {
                  const tenant = occ.tenantsInRoom[i];
                  const isVacating = tenant && (tenant.status === 'notice_submitted' || tenant.status === 'vacating');
                  const isOverdue = tenant && tenant.status === 'payment_overdue';
                  // Vacant bed = green (available), occupied = grey, overdue = red, vacating = purple.
                  const tone = !tenant ? '#16A34A' : isOverdue ? '#DC2626' : isVacating ? '#7C3AED' : '#64748B';
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium"
                      style={{ background: tenant ? `${tone}14` : 'var(--ds-border-subtle)', color: tenant ? tone : '#94A3B8' }}
                    >
                      <span className="inline-block rounded-full" style={{ width: 7, height: 7, background: tone }} />
                      Bed {i + 1}{tenant ? ` · ${tenant.name.split(' ')[0]}` : ' · Empty'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="ds-group-label mb-2">
            {occ.tenantsInRoom.length > 0 ? `Current Occupants (${occ.tenantsInRoom.length})` : 'No Occupants'}
          </p>
          {occ.tenantsInRoom.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center rounded-xl" style={{ border: '1px dashed var(--ds-border)' }}>
              {occ.isUnderMaintenance
                ? <><Wrench className="w-5 h-5 mx-auto mb-1 text-orange-400" />Room is under maintenance.</>
                : <><Home className="w-5 h-5 mx-auto mb-1 text-blue-400" />This room is vacant and available.</>}
            </div>
          ) : (
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
          )}
        </DetailSection>

        {/* Room Health */}
        <DetailSection label="Room Health">
          <HealthRow
            icon={<IndianRupee className="w-4 h-4" />}
            label="Rent Status"
            value={occ.hasOverdueRisk ? `${occ.overdueCount} overdue` : 'Healthy'}
            tone={occ.hasOverdueRisk ? 'bad' : 'good'}
          />
          <HealthRow
            icon={<Wrench className="w-4 h-4" />}
            label="Maintenance Status"
            value={occ.isUnderMaintenance ? 'Under maintenance' : 'Operational'}
            tone={occ.isUnderMaintenance ? 'warn' : 'good'}
          />
          <HealthRow
            icon={<Shield className="w-4 h-4" />}
            label="Document Status"
            value={
              occ.tenantsInRoom.length === 0 ? '—'
              : tenantsWithDocs === occ.tenantsInRoom.length ? 'All on file'
              : tenantsWithDocs > 0 ? `${tenantsWithDocs}/${occ.tenantsInRoom.length} on file`
              : 'Missing'
            }
            tone={
              occ.tenantsInRoom.length === 0 ? 'neutral'
              : tenantsWithDocs === occ.tenantsInRoom.length ? 'good'
              : tenantsWithDocs > 0 ? 'warn' : 'bad'
            }
          />
          <HealthRow
            icon={<CheckCircle className="w-4 h-4" />}
            label="Move-in Readiness"
            value={moveInReadiness.label}
            tone={moveInReadiness.tone}
          />
        </DetailSection>

        {/* Insights */}
        <DetailSection label="Insights">
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: style.accent }} />
              <div className="text-[13px]">
                <p className="font-medium text-gray-800">Revenue utilization</p>
                <p className="ds-meta">
                  {occ.tenantsInRoom.length > 0
                    ? `Earning ₹${monthlyRevenue.toLocaleString('en-IN')} of ₹${potentialRevenue.toLocaleString('en-IN')} potential (${revenueRate}%).`
                    : 'No active occupants — this room is currently earning ₹0.'}
                </p>
              </div>
            </div>

            {occ.hasOverdueRisk && (
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                <div className="text-[13px]">
                  <p className="font-medium text-red-700">Payment overdue risk</p>
                  <p className="ds-meta">
                    {occ.overdueCount} tenant{occ.overdueCount !== 1 ? 's have' : ' has'} overdue payments. Open their profile to follow up.
                  </p>
                </div>
              </div>
            )}

            {occ.hasUpcomingVacate && (
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="text-[13px]">
                  <p className="font-medium text-amber-700">Upcoming vacate</p>
                  <p className="ds-meta">
                    {occ.tenantsInRoom
                      .filter((t) => t.status === 'notice_submitted' || t.status === 'vacating')
                      .map((t) => `${t.name} — moving out ${t.vacateDate ? new Date(t.vacateDate).toLocaleDateString('en-IN') : 'date TBD'}`)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}

            {occ.isUnderMaintenance && (
              <div className="flex items-start gap-2.5">
                <Wrench className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
                <div className="text-[13px]">
                  <p className="font-medium text-orange-700">Maintenance in progress</p>
                  <p className="ds-meta">This room is locked from new assignments until maintenance is resolved.</p>
                </div>
              </div>
            )}

            {occ.isVacant && !occ.isUnderMaintenance && (
              <div className="flex items-start gap-2.5">
                <ZapIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <div className="text-[13px]">
                  <p className="font-medium text-blue-700">Available for assignment</p>
                  <p className="ds-meta">This room is vacant and ready — assign a new tenant to start earning.</p>
                </div>
              </div>
            )}
          </div>
        </DetailSection>

        {/* Actions */}
        <div className="mb-2">
          <p className="ds-group-label mb-2">Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {occ.isVacant && !occ.isUnderMaintenance && onNavigate && (
              <Button
                className="h-10 text-[13px] font-medium justify-start"
                style={{ background: 'var(--ds-accent, #6366F1)', color: '#fff' }}
                onClick={() => { onClose(); onNavigate('tenants'); }}
              >
                <User className="w-4 h-4 mr-2" /> Assign Tenant
              </Button>
            )}
            {occ.hasOverdueRisk && onNavigate && (
              <Button
                variant="outline"
                className="h-10 text-[13px] font-medium justify-start border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => { onClose(); onNavigate('payments'); }}
              >
                <IndianRupee className="w-4 h-4 mr-2" /> View Payments
              </Button>
            )}
            {occ.isUnderMaintenance && onNavigate && (
              <Button
                variant="outline"
                className="h-10 text-[13px] font-medium justify-start border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => { onClose(); onNavigate('maintenance'); }}
              >
                <Wrench className="w-4 h-4 mr-2" /> Mark Maintenance
              </Button>
            )}
            {!occ.isUnderMaintenance && onNavigate && (
              <Button
                variant="outline"
                className="h-10 text-[13px] font-medium justify-start"
                onClick={() => { onClose(); onNavigate('maintenance'); }}
              >
                <Wrench className="w-4 h-4 mr-2" /> Mark Maintenance
              </Button>
            )}
            {vacatingTenant && onTenantClick && (
              <Button
                variant="outline"
                className="h-10 text-[13px] font-medium justify-start border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => { onClose(); onTenantClick(vacatingTenant.id); }}
              >
                <Clock className="w-4 h-4 mr-2" /> Vacate Profile
              </Button>
            )}
            {occ.tenantsInRoom[0] && onTenantClick && (
              <Button
                variant="outline"
                className="h-10 text-[13px] font-medium justify-start"
                onClick={() => { onClose(); onTenantClick(occ.tenantsInRoom[0].id); }}
              >
                <User className="w-4 h-4 mr-2" /> View Tenant
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full mt-2 text-gray-500"
          onClick={onClose}
        >
          <X className="w-4 h-4 mr-2" /> Close
        </Button>
      </SheetContent>
    </Sheet>
  );
}

export function BuildingView({ onTenantClick, onNavigate, onBack }: BuildingViewProps) {
  const { selectedProperty, setSelectedProperty, properties } = useProperty();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ occ: RoomOccupancy; room: Room } | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
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

  // Listen for cross-module data updates (same-tab signal — fast path)
  useEffect(() => {
    const handler = () => void loadTenants();
    window.addEventListener('owner-data-updated', handler);
    return () => window.removeEventListener('owner-data-updated', handler);
  }, [loadTenants]);

  // Cross-session realtime — picks up tenant changes made by other managers/sessions
  useRealtimeRefresh({
    key: 'building-view-tenants',
    tables: ['tenants'],
    onChange: () => void loadTenants(),
  });

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

  const heroMetrics = [
    { label: 'Total Rooms', value: snapshot.totalRooms, icon: Home, accent: '#FFFFFF', sub: 'across all floors' },
    { label: 'Occupied', value: snapshot.occupiedRooms, icon: CheckCircle, accent: '#FFFFFF', sub: 'rooms with tenants' },
    { label: 'Vacant', value: snapshot.vacantRooms, icon: Bed, accent: '#FFFFFF', sub: 'ready to assign' },
    { label: 'Maintenance', value: snapshot.maintenanceRooms, icon: Wrench, accent: '#FFFFFF', sub: 'currently locked' },
  ];

  const summaryMetrics = [
    { label: 'Upcoming Vacates', value: upcomingVacates, icon: Clock, sub: 'tenants giving notice', bg: '#F5F3FF', accent: '#7C3AED' },
    { label: 'Overdue Risk', value: overdueRooms, icon: AlertCircle, sub: 'rooms with overdue rent', bg: overdueRooms > 0 ? '#FEF2F2' : '#F8FAFC', accent: overdueRooms > 0 ? '#DC2626' : '#64748B' },
    { label: 'Occupied', value: snapshot.occupiedRooms, icon: CheckCircle, sub: 'fully or partially filled', bg: '#F8FAFC', accent: '#64748B' },
    { label: 'Vacant', value: snapshot.vacantRooms, icon: Home, sub: 'available to rent', bg: '#ECFDF3', accent: '#16A34A' },
    { label: 'Maintenance', value: snapshot.maintenanceRooms, icon: Wrench, sub: 'awaiting service', bg: '#FFFBEB', accent: '#D97706' },
    { label: 'Occupancy', value: `${snapshot.occupancyRate}%`, icon: TrendingUp, sub: 'of total capacity', bg: '#EEF2FF', accent: '#4F46E5' },
  ];

  const legendItems = [
    { label: 'Occupied', bg: '#F8FAFC', accent: '#64748B' },
    { label: 'Vacant', bg: '#ECFDF3', accent: '#16A34A' },
    { label: 'Maintenance', bg: '#FFFBEB', accent: '#D97706' },
    { label: 'Upcoming Vacate', bg: '#F5F3FF', accent: '#7C3AED' },
    { label: 'Overdue Risk', bg: '#FEF2F2', accent: '#DC2626' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header + property switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          {(onBack || onNavigate) && (
            <button
              onClick={() => (onBack ? onBack() : onNavigate?.('properties'))}
              aria-label="Go back"
              className="flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors flex-shrink-0"
              style={{ width: 34, height: 34 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="ds-page-title">Building View</h1>
            <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>A live look at your property · click any room for details</p>
          </div>
        </div>
        {properties.length > 1 && (
          <div className="relative">
            <select
              value={currentProperty.id}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="appearance-none pr-9 pl-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{ border: '1px solid #E4E4E7' }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Property Hero Card — gradient used only here */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)' }}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold tracking-tight">{currentProperty.name}</h2>
              <Badge variant="outline" className="text-xs border-white/30 text-white bg-white/10">
                {occupancyMode === 'BED_BASED' ? 'Bed-Based' : 'Room-Based'}
              </Badge>
              {loadingTenants && <span className="text-xs text-white/70 animate-pulse">Syncing…</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-white/80">
              <MapPin className="w-3.5 h-3.5" />
              <span>{currentProperty.address}{currentProperty.city ? `, ${currentProperty.city}` : ''}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight">{snapshot.occupancyRate}%</p>
            <p className="text-xs text-white/70 mt-0.5">Occupancy</p>
          </div>
        </div>

        {/* Occupancy progress bar */}
        <div className="mt-5 relative z-10">
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-white transition-all" style={{ width: `${snapshot.occupancyRate}%` }} />
          </div>
        </div>

        {/* Hero stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative z-10">
          {heroMetrics.map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="rounded-xl p-3 bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-white/70">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-semibold mt-1">{value}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary metrics — soft semantic cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {summaryMetrics.map(({ label, value, icon: Icon, sub, bg, accent }) => (
          <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: bg, border: '1px solid rgba(15,23,42,0.04)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fff' }}>
              <Icon className="w-4 h-4" style={{ color: accent }} />
            </div>
            <p className="text-2xl font-semibold mt-2.5" style={{ color: '#0A0A0B' }}>{value}</p>
            <p className="text-[13px] font-medium mt-0.5" style={{ color: accent }}>{label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Legend — pills, directly above floors */}
      <div className="flex flex-wrap gap-2">
        {legendItems.map(({ label, bg, accent }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: bg, color: accent, border: '1px solid rgba(15,23,42,0.04)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
            {label}
          </span>
        ))}
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

      {/* Floor Tabs */}
      {floorData.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
          <button
            onClick={() => setSelectedFloor('all')}
            className={`flex-shrink-0 snap-start px-4 py-2 text-[13px] font-semibold rounded-full border transition-colors ${selectedFloor === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            All Floors
          </button>
          {floorData.map(({ floor }) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`flex-shrink-0 snap-start px-4 py-2 text-[13px] font-semibold rounded-full border transition-colors ${selectedFloor === floor ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              Floor {floor}
            </button>
          ))}
        </div>
      )}

      {/* Floor-by-floor grid */}
      <div className="space-y-6">
        {floorData.filter(f => selectedFloor === 'all' || f.floor === selectedFloor).map(({ floor, items }, index) => {
          const floorOccupied = items.filter((i) => i.occ.isFullyOccupied || i.occ.isPartiallyOccupied).length;
          const floorTotal = items.length;
          const floorOverdue = items.filter((i) => i.occ.hasOverdueRisk).length;
          const floorPercent = floorTotal > 0 ? Math.round((floorOccupied / floorTotal) * 100) : 0;

          return (
            <div 
              key={floor} 
              className="bg-white/40 backdrop-blur-md rounded-[24px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" 
              style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 8px 32px rgba(0,0,0,0.02)', animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col lg:flex-row">
                {/* Floor summary panel */}
                <div className="lg:w-64 shrink-0 px-6 py-6 flex lg:flex-col items-center lg:items-start gap-4 lg:gap-4 relative" style={{ backgroundColor: 'rgba(250, 250, 251, 0.5)', borderRight: '1px solid rgba(0,0,0,0.04)' }}>
                  <ProgressRing percent={floorPercent} size={56} />
                  <div className="mt-2 text-center lg:text-left">
                    <p className="text-[18px] font-bold text-gray-900 tracking-tight">Floor {floor}</p>
                    <p className="text-[13px] font-medium text-gray-500/80 mt-1">{floorTotal} room{floorTotal !== 1 ? 's' : ''} · {floorOccupied} occupied</p>
                    {floorOverdue > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold mt-3 px-2.5 py-1 rounded-full border border-red-200/50" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        {floorOverdue} OVERDUE
                      </span>
                    )}
                  </div>
                </div>

                {/* Rooms grid */}
                <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 bg-white/60">
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
