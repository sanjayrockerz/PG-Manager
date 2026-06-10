import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  X,
  Layers,
  BedDouble,
  DoorOpen,
} from 'lucide-react';
import {
  useWorkspace,
  type WorkspaceProperty,
  getSubscriptionLabel,
  getSubscriptionDate,
} from '../contexts/WorkspaceContext';

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: WorkspaceProperty['accessRole'] }) {
  const config = {
    owner:   { label: 'OWNER',   bg: '#EEF2FF', color: '#4F46E5' },
    manager: { label: 'MANAGER', bg: '#F0FDF4', color: '#15803D' },
    staff:   { label: 'STAFF',   bg: '#FFF7ED', color: '#C2410C' },
  }[role];

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '2px 7px',
        borderRadius: 4,
        background: config.bg,
        color: config.color,
        flexShrink: 0,
      }}
    >
      {config.label}
    </span>
  );
}

// ─── Subscription badge ───────────────────────────────────────────────────────

function SubscriptionBadge({ property }: { property: WorkspaceProperty }) {
  const { subscription } = property;
  if (!subscription) return null;

  const label = getSubscriptionLabel(subscription);
  const date = getSubscriptionDate(subscription);
  if (!label) return null;

  const color = subscription.status === 'active' ? '#15803D'
    : subscription.status === 'trialing' ? '#1D4ED8'
    : subscription.status === 'past_due' ? '#B45309'
    : '#71717A';

  const bg = subscription.status === 'active' ? '#F0FDF4'
    : subscription.status === 'trialing' ? '#EFF6FF'
    : subscription.status === 'past_due' ? '#FFFBEB'
    : '#F4F4F6';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color,
          background: bg,
          padding: '2px 7px',
          borderRadius: 4,
        }}
      >
        {label}
      </span>
      {date && (
        <span style={{ fontSize: 11, color: '#A1A1AA' }}>{date}</span>
      )}
    </div>
  );
}

// ─── Occupancy bar ────────────────────────────────────────────────────────────

function OccupancyBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? '#22C55E' : rate >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div
      style={{
        height: 3,
        borderRadius: 2,
        background: '#F1F1F3',
        width: '100%',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}

// ─── Property card ────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  isSelected,
  onSelect,
}: {
  property: WorkspaceProperty;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { occupancy } = property;
  const Icon = occupancy.mode === 'BED_BASED' ? BedDouble : DoorOpen;

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 10,
        border: isSelected ? '1.5px solid #6366F1' : '1px solid #E4E4E7',
        background: isSelected ? '#FAFAFF' : '#FFFFFF',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#C7D2FE';
          (e.currentTarget as HTMLElement).style.background = '#FAFAFF';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7';
          (e.currentTarget as HTMLElement).style.background = '#FFFFFF';
        }
      }}
    >
      {/* Top row: name + role badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', lineHeight: 1.3, marginBottom: 2 }}>
            {property.propertyName}
          </p>
          <p style={{ fontSize: 12, color: '#71717A', lineHeight: 1 }}>
            {property.locality !== property.city ? property.locality : property.city}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <RoleBadge role={property.accessRole} />
          {isSelected && (
            <div
              style={{
                width: 18, height: 18,
                borderRadius: '50%',
                background: '#6366F1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check style={{ width: 10, height: 10, color: '#fff' }} />
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Layers style={{ width: 11, height: 11, color: '#A1A1AA', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#71717A' }}>{property.floors} Floors</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon style={{ width: 11, height: 11, color: '#A1A1AA', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#71717A' }}>
            {occupancy.total} {occupancy.label}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500 }}>
          {occupancy.occupied} Occupied
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: occupancy.rate >= 80 ? '#15803D' : occupancy.rate >= 50 ? '#B45309' : '#B91C1C',
            marginLeft: 'auto',
          }}
        >
          {occupancy.rate}%
        </span>
      </div>

      {/* Occupancy bar */}
      <OccupancyBar rate={occupancy.rate} />

      {/* Subscription row — only for owned properties */}
      {property.subscription && (
        <SubscriptionBadge property={property} />
      )}
    </button>
  );
}

// ─── Group section ────────────────────────────────────────────────────────────

function PropertyGroup({
  title,
  properties,
  selectedId,
  onSelect,
}: {
  title: string;
  properties: WorkspaceProperty[];
  selectedId: string | null;
  onSelect: (ws: WorkspaceProperty) => void;
}) {
  if (properties.length === 0) return null;

  return (
    <div>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: '#A1A1AA',
          textTransform: 'uppercase',
          padding: '0 2px',
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {properties.map(p => (
          <PropertyCard
            key={p.propertyId}
            property={p}
            isSelected={selectedId === p.propertyId}
            onSelect={() => onSelect(p)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── All-properties summary card ──────────────────────────────────────────────

function AllPropertiesCard({
  isSelected,
  onSelect,
  totals,
}: {
  isSelected: boolean;
  onSelect: () => void;
  totals: { total: number; owned: number; managed: number; staff: number };
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 10,
        border: isSelected ? '1.5px solid #6366F1' : '1px solid #E4E4E7',
        background: isSelected ? 'linear-gradient(135deg, #FAFAFF, #EEF2FF)' : '#FAFAFA',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = '#F4F4F6';
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.background = '#FAFAFA';
        }
      }}
    >
      <div
        style={{
          width: 36, height: 36,
          borderRadius: 9,
          background: isSelected ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : '#E4E4E7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Building2 style={{ width: 16, height: 16, color: isSelected ? '#fff' : '#71717A' }} />
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0B', marginBottom: 3 }}>
          All Accessible Properties
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#52525B', fontWeight: 500 }}>
            {totals.total} {totals.total === 1 ? 'Property' : 'Properties'}
          </span>
          {totals.owned > 0 && (
            <span style={{ fontSize: 11, color: '#4F46E5' }}>Owner: {totals.owned}</span>
          )}
          {totals.managed > 0 && (
            <span style={{ fontSize: 11, color: '#15803D' }}>Manager: {totals.managed}</span>
          )}
          {totals.staff > 0 && (
            <span style={{ fontSize: 11, color: '#C2410C' }}>Staff: {totals.staff}</span>
          )}
        </div>
      </div>

      {isSelected && (
        <div
          style={{
            width: 20, height: 20,
            borderRadius: '50%',
            background: '#6366F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Check style={{ width: 11, height: 11, color: '#fff' }} />
        </div>
      )}
    </button>
  );
}

// ─── Main WorkspaceSelector ───────────────────────────────────────────────────

interface WorkspaceSelectorProps {
  /** When true, the selector is hidden (e.g. on the Properties page itself) */
  hidden?: boolean;
}

export function WorkspaceSelector({ hidden }: WorkspaceSelectorProps) {
  const {
    workspaceProperties,
    ownedProperties,
    managedProperties,
    staffProperties,
    selectedWorkspace,
    setSelectedWorkspace,
    totals,
    isLoading,
  } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (hidden) return null;

  const triggerLabel = selectedWorkspace
    ? selectedWorkspace.propertyName
    : 'All Properties';

  const openPanel = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(true);
  };

  const handleSelect = (ws: WorkspaceProperty) => {
    setSelectedWorkspace(ws);
    setOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedWorkspace(null);
    setOpen(false);
  };

  const selectedId = selectedWorkspace?.propertyId ?? null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => open ? setOpen(false) : openPanel()}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg transition-all"
        style={{
          height: 32,
          padding: '0 10px',
          background: open ? '#F4F4F6' : '#FAFAFA',
          border: '1px solid #E4E4E7',
          color: '#0A0A0B',
          fontSize: 13,
          fontWeight: 500,
          cursor: isLoading ? 'default' : 'pointer',
          gap: 8,
          maxWidth: 220,
        }}
      >
        <Building2 style={{ width: 13, height: 13, color: '#6366F1', flexShrink: 0 }} />
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {isLoading ? 'Loading…' : triggerLabel}
        </span>
        {!isLoading && totals.total > 1 && !selectedWorkspace && (
          <span style={{ color: '#A1A1AA', fontSize: 12 }}>({totals.total})</span>
        )}
        <ChevronDown
          style={{
            width: 13, height: 13, color: '#A1A1AA', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            className="fixed rounded-xl"
            style={{
              top: pos.top,
              left: pos.left,
              width: 340,
              maxHeight: 'calc(100vh - 80px)',
              overflowY: 'auto',
              zIndex: 9999,
              background: '#FFFFFF',
              border: '1px solid #E4E4E7',
              boxShadow: '0 8px 40px -8px rgb(0 0 0 / 0.18), 0 2px 10px -2px rgb(0 0 0 / 0.08)',
            }}
          >
            {/* Panel header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px 10px',
                borderBottom: '1px solid #F1F1F3',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: '#A1A1AA', textTransform: 'uppercase' }}>
                Workspaces
              </p>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-md hover:bg-zinc-100 transition-colors"
                style={{ width: 22, height: 22 }}
              >
                <X style={{ width: 12, height: 12, color: '#A1A1AA' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* All properties card */}
              <AllPropertiesCard
                isSelected={selectedId === null}
                onSelect={handleSelectAll}
                totals={totals}
              />

              {/* My Properties */}
              <PropertyGroup
                title="My Properties"
                properties={ownedProperties}
                selectedId={selectedId}
                onSelect={handleSelect}
              />

              {/* Managed Properties */}
              <PropertyGroup
                title="Managed Properties"
                properties={managedProperties}
                selectedId={selectedId}
                onSelect={handleSelect}
              />

              {/* Staff Access */}
              <PropertyGroup
                title="Staff Access"
                properties={staffProperties}
                selectedId={selectedId}
                onSelect={handleSelect}
              />

              {workspaceProperties.length === 0 && !isLoading && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#A1A1AA', fontSize: 13 }}>
                  No properties found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
