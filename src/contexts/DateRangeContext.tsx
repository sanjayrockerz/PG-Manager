import { createContext, useContext, useMemo, useState, ReactNode } from 'react';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  custom: 'Custom Range',
};

export const PRESETS_ORDERED: DatePreset[] = [
  'today', 'yesterday', 'last7', 'last30',
  'this_month', 'last_month', 'this_quarter', 'custom',
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function computePresetRange(preset: DatePreset, customStart: string, customEnd: string): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday': {
      const yd = new Date(y, m, d - 1);
      return { start: startOfDay(yd), end: endOfDay(yd) };
    }
    case 'last7': {
      const s = new Date(y, m, d - 6);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case 'last30': {
      const s = new Date(y, m, d - 29);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case 'this_month':
      return { start: new Date(y, m, 1, 0, 0, 0), end: endOfDay(now) };
    case 'last_month':
      return {
        start: new Date(y, m - 1, 1, 0, 0, 0),
        end: new Date(y, m, 0, 23, 59, 59, 999),
      };
    case 'this_quarter': {
      const qStart = new Date(y, Math.floor(m / 3) * 3, 1, 0, 0, 0);
      return { start: qStart, end: endOfDay(now) };
    }
    case 'custom': {
      const s = customStart ? new Date(customStart) : new Date(y, m, 1);
      const e = customEnd ? new Date(customEnd) : now;
      return { start: startOfDay(s), end: endOfDay(e) };
    }
  }
}

interface DateRangeContextType {
  preset: DatePreset;
  customStart: string;
  customEnd: string;
  range: DateRange;
  label: string;
  setPreset: (preset: Exclude<DatePreset, 'custom'>) => void;
  setCustomRange: (start: string, end: string) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

const SESSION_KEY = 'rc:daterange';

function readSession(): { preset: DatePreset; customStart: string; customEnd: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { preset?: string; customStart?: string; customEnd?: string };
    if (!parsed?.preset || !PRESETS_ORDERED.includes(parsed.preset as DatePreset)) return null;
    return {
      preset: parsed.preset as DatePreset,
      customStart: parsed.customStart ?? '',
      customEnd: parsed.customEnd ?? '',
    };
  } catch { return null; }
}

function writeSession(preset: DatePreset, customStart: string, customEnd: string): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ preset, customStart, customEnd })); } catch {}
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const saved = readSession();
  const [preset, setPresetState] = useState<DatePreset>(saved?.preset ?? 'this_month');
  const [customStart, setCustomStart] = useState(saved?.customStart ?? '');
  const [customEnd, setCustomEnd] = useState(saved?.customEnd ?? '');

  const range = useMemo(
    () => computePresetRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const label = useMemo(() => {
    if (preset !== 'custom') return DATE_PRESET_LABELS[preset];
    if (customStart && customEnd) {
      const fmt = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
      return `${fmt(customStart)} – ${fmt(customEnd)}`;
    }
    return 'Custom Range';
  }, [preset, customStart, customEnd]);

  const setPreset = (p: Exclude<DatePreset, 'custom'>) => {
    setPresetState(p);
    writeSession(p, customStart, customEnd);
  };

  const setCustomRange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPresetState('custom');
    writeSession('custom', start, end);
  };

  return (
    <DateRangeContext.Provider value={{ preset, customStart, customEnd, range, label, setPreset, setCustomRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextType {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider');
  return ctx;
}

/** Filter any array of records by date range using a date accessor. */
export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  range: DateRange,
): T[] {
  return items.filter((item) => {
    const raw = getDate(item);
    if (!raw) return false;
    const d = new Date(raw);
    return d >= range.start && d <= range.end;
  });
}
