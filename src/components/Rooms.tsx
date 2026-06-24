import { useMemo, useState } from 'react';
import { Bed, Building2, DoorClosed, DoorOpen, Grid3x3, Users } from 'lucide-react';
import { BuildingView } from './BuildingView';
import { useProperty } from '../contexts/PropertyContext';

type RoomFilter = 'all' | 'vacant' | 'occupied' | 'maintenance';

const ROOM_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  occupied:    { label: 'Occupied',    bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  vacant:      { label: 'Vacant',      bg: '#F4F4F6', color: '#52525B', border: '#E4E4E7' },
  maintenance: { label: 'Maintenance', bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
};

const FILTER_BORDER: Record<RoomFilter, string> = {
  all:         '#E4E4E7',
  occupied:    '#A7F3D0',
  vacant:      '#E4E4E7',
  maintenance: '#FDE68A',
};

export function Rooms() {
  const { selectedProperty, properties } = useProperty();
  const [filterStatus, setFilterStatus] = useState<RoomFilter>('all');
  const [viewMode, setViewMode] = useState<'building' | 'grid'>('building');

  const rooms = useMemo(() => {
    if (selectedProperty === 'all') {
      return properties.flatMap((p) => p.rooms.map((r) => ({ ...r, propertyName: p.name })));
    }
    const prop = properties.find((p) => p.id === selectedProperty);
    return prop ? prop.rooms.map((r) => ({ ...r, propertyName: prop.name })) : [];
  }, [properties, selectedProperty]);

  const filteredRooms = filterStatus === 'all' ? rooms : rooms.filter((r) => r.status === filterStatus);

  const stats = {
    total:       rooms.length,
    occupied:    rooms.filter((r) => r.status === 'occupied').length,
    vacant:      rooms.filter((r) => r.status === 'vacant').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  };

  const filterOptions: { key: RoomFilter; label: string; count: number }[] = [
    { key: 'all',         label: 'All',         count: stats.total },
    { key: 'occupied',    label: 'Occupied',    count: stats.occupied },
    { key: 'vacant',      label: 'Vacant',      count: stats.vacant },
    { key: 'maintenance', label: 'Maintenance', count: stats.maintenance },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ─────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Rooms &amp; Beds</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            Live inventory — {stats.occupied} occupied · {stats.vacant} vacant · {stats.maintenance} maintenance
          </p>
        </div>
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #E4E4E7', background: '#fff' }}>
          <button
            onClick={() => setViewMode('building')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: viewMode === 'building' ? '#6366F1' : 'transparent',
              color: viewMode === 'building' ? '#fff' : '#52525B',
              border: 'none', borderRight: '1px solid #E4E4E7',
              transition: 'all 0.15s',
            }}
          >
            <Building2 style={{ width: 13, height: 13 }} />
            Building
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              background: viewMode === 'grid' ? '#6366F1' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : '#52525B',
              border: 'none',
              transition: 'all 0.15s',
            }}
          >
            <Grid3x3 style={{ width: 13, height: 13 }} />
            Grid
          </button>
        </div>
      </div>

      {viewMode === 'building' ? (
        <BuildingView />
      ) : (
        <>
          {/* ── Stat strip ──────────────────── */}
          <div className="ds-card grid grid-cols-2 sm:flex sm:items-center" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { label: 'Total Rooms', value: stats.total,       icon: Bed,        iconBg: '#EEF2FF', iconColor: '#6366F1' },
              { label: 'Occupied',    value: stats.occupied,    icon: DoorClosed,  iconBg: '#ECFDF5', iconColor: '#059669' },
              { label: 'Vacant',      value: stats.vacant,      icon: DoorOpen,    iconBg: '#F4F4F6', iconColor: '#52525B' },
              { label: 'Maintenance', value: stats.maintenance, icon: Grid3x3,    iconBg: '#FFFBEB', iconColor: '#D97706' },
            ].map(({ label, value, icon: Icon, iconBg, iconColor }, i, arr) => (
              <div
                key={label}
                className={`flex items-center ${i % 2 === 0 ? 'border-r border-[#F1F1F3] sm:border-r-0' : ''} ${i < 2 ? 'border-b border-[#F1F1F3] sm:border-b-0' : ''}`}
                style={{ flex: 1, minWidth: 0 }}
              >
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 14, height: 14, color: iconColor }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0B', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <div className="hidden sm:block" style={{ width: 1, height: 36, background: '#F1F1F3', flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {/* ── Filter bar ──────────────────── */}
          <div className="ds-card" style={{ padding: '8px 12px' }}>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {filterOptions.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  style={{
                    fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    border: `1px solid ${filterStatus === key ? '#6366F1' : '#E4E4E7'}`,
                    background: filterStatus === key ? '#6366F1' : '#fff',
                    color: filterStatus === key ? '#fff' : '#52525B',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                  <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Room grid ───────────────────── */}
          {filteredRooms.length === 0 ? (
            <div className="ds-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <DoorOpen style={{ width: 32, height: 32, color: '#D4D4D8', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: '#52525B' }}>No rooms match this filter</p>
              <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4 }}>Try selecting a different status</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {filteredRooms.map((room) => {
                const st = ROOM_STATUS[room.status] ?? ROOM_STATUS['vacant'];
                return (
                  <div
                    key={room.id}
                    className="ds-card"
                    style={{ padding: '14px 16px', borderLeft: `3px solid ${st.border}` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0B' }}>Room {room.number}</p>
                        <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{room.propertyName}</p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                        background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                        textTransform: 'capitalize', flexShrink: 0,
                      }}>
                        {st.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[
                        { label: 'Floor',  value: `Floor ${room.floor}` },
                        { label: 'Type',   value: room.type.charAt(0).toUpperCase() + room.type.slice(1) },
                        { label: 'Rent',   value: `₹${room.rent.toLocaleString('en-IN')}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span style={{ fontSize: 11, color: '#A1A1AA' }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#52525B' }}>{value}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 11, color: '#A1A1AA' }}>Beds</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#52525B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users style={{ width: 11, height: 11 }} />
                          {typeof room.occupiedBeds === 'number' ? `${room.occupiedBeds}/${room.beds}` : room.beds}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
