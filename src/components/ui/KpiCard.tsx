import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared premium KPI card — filled gradient surface,
   white text, gradient icon tile, count-up metric.
   This is the single source of truth for stat cards
   across Owner / Tenant / Admin portals.
───────────────────────────────────────────── */

export type KpiAccent =
  | 'violet' | 'rose' | 'blue' | 'emerald' | 'amber' | 'cyan' | 'purple';

/** Count-up: animates 0 → target on mount/change. Respects reduced-motion. */
export function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(target);
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (prefersReduced.current || !Number.isFinite(target)) { setVal(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export interface KpiCardProps {
  label: string;
  value: number;
  accent: KpiAccent;
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  trend?: number;
  trendLabel?: string;
  meta?: string;
  tag?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function KpiCard({
  label, value, accent, icon: Icon,
  prefix, suffix, format = (n) => Math.round(n).toLocaleString('en-IN'),
  trend, trendLabel, meta, tag, onClick, className = '', style,
}: KpiCardProps) {
  const up = trend !== undefined && trend >= 0;
  const animated = useCountUp(value);
  return (
    <div
      className={`ds-kpi kpi-${accent} ds-fade-rise${onClick ? ' ds-kpi-clickable' : ''} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="ds-kpi-top">
        <span className="ds-kpi-label">{label}</span>
        <div className="ds-kpi-icon">
          <Icon style={{ width: 20, height: 20, strokeWidth: 2 }} />
        </div>
      </div>

      <div className="ds-kpi-metric">
        {prefix && <span className="ds-kpi-affix" style={{ marginRight: 1 }}>{prefix}</span>}
        {format(animated)}
        {suffix && <span className="ds-kpi-affix" style={{ marginLeft: 1 }}>{suffix}</span>}
      </div>

      <div className="ds-kpi-foot">
        {trend !== undefined && (
          <span className="ds-kpi-badge">
            {up
              ? <ArrowUpRight style={{ width: 11, height: 11 }} />
              : <ArrowDownRight style={{ width: 11, height: 11 }} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {tag && <span className="ds-kpi-badge">{tag}</span>}
        {(trendLabel || meta) && (
          <span className="ds-kpi-foot-text">{trendLabel ?? meta}</span>
        )}
      </div>

      {meta && trendLabel && (
        <p className="ds-kpi-foot-text" style={{ marginTop: -4, position: 'relative', zIndex: 1 }}>{meta}</p>
      )}
    </div>
  );
}
