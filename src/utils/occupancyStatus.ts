/**
 * Canonical Occupancy Status Design Tokens
 *
 * Single source of truth for occupancy color semantics across the whole app —
 * Dashboard, Building View, Analytics, Admin Portal and mobile layouts must all
 * import from here so the colors never diverge or invert between screens.
 *
 * Business standard (do NOT invert):
 *   Vacant         → Green   (revenue opportunity / available inventory)
 *   Occupied       → Neutral grey/blue (normal operational state)
 *   Maintenance    → Amber
 *   Vacating Soon  → Purple
 *   Overdue        → Red
 */

export type OccupancyStatus =
  | 'vacant'
  | 'occupied'
  | 'maintenance'
  | 'vacating'
  | 'overdue';

export interface OccupancyTokens {
  /** Human label for the status. */
  label: string;
  /** Soft card background. */
  bg: string;
  /** Card / chip border. */
  border: string;
  /** Accent + text color. */
  accent: string;
  /** Status dot / indicator color (solid). */
  dot: string;
  /** Elevated hover shadow. */
  shadow: string;
}

export const OCCUPANCY_TOKENS: Record<OccupancyStatus, OccupancyTokens> = {
  // Vacant = green (healthy availability — ready to earn)
  vacant: {
    label: 'Vacant',
    bg: 'hsla(142, 76%, 97%, 0.7)',
    border: 'hsla(142, 71%, 85%, 0.5)',
    accent: 'hsl(142, 71%, 45%)',
    dot: '#16A34A',
    shadow: '0 4px 20px hsla(142, 71%, 45%, 0.05)',
  },
  // Occupied = neutral grey/blue (steady state, no action needed)
  occupied: {
    label: 'Occupied',
    bg: 'hsla(210, 40%, 98%, 0.8)',
    border: 'hsla(214, 32%, 91%, 0.8)',
    accent: 'hsl(215, 16%, 47%)',
    dot: '#64748B',
    shadow: '0 4px 20px hsla(215, 16%, 47%, 0.03)',
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'hsla(45, 100%, 96%, 0.7)',
    border: 'hsla(45, 93%, 80%, 0.5)',
    accent: 'hsl(38, 92%, 50%)',
    dot: '#F59E0B',
    shadow: '0 4px 20px hsla(38, 92%, 50%, 0.08)',
  },
  vacating: {
    label: 'Vacating Soon',
    bg: 'hsla(250, 100%, 98%, 0.7)',
    border: 'hsla(250, 80%, 90%, 0.5)',
    accent: 'hsl(262, 83%, 58%)',
    dot: '#7C3AED',
    shadow: '0 4px 20px hsla(262, 83%, 58%, 0.08)',
  },
  overdue: {
    label: 'Overdue',
    bg: 'hsla(0, 100%, 98%, 0.7)',
    border: 'hsla(0, 93%, 90%, 0.5)',
    accent: 'hsl(0, 84%, 60%)',
    dot: '#DC2626',
    shadow: '0 4px 20px hsla(0, 84%, 60%, 0.08)',
  },
};

/** Convenience accessor for a status's tokens. */
export function occupancyTokens(status: OccupancyStatus): OccupancyTokens {
  return OCCUPANCY_TOKENS[status];
}

/** The solid dot/indicator color for a status (most common single-value need). */
export function occupancyDot(status: OccupancyStatus): string {
  return OCCUPANCY_TOKENS[status].dot;
}
