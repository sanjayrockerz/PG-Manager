interface LiveStatusBadgeProps {
  lastUpdatedAt: Date;
  isSyncing?: boolean;
  label?: string;
}

function formatLastUpdated(lastUpdatedAt: Date): string {
  const now = Date.now();
  const diffSeconds = Math.max(1, Math.floor((now - lastUpdatedAt.getTime()) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

export function LiveStatusBadge({ lastUpdatedAt, isSyncing = false, label = 'Live' }: LiveStatusBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
      <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
      <span>{isSyncing ? 'Syncing...' : label}</span>
      <span className="text-emerald-600/80">Updated {formatLastUpdated(lastUpdatedAt)}</span>
    </div>
  );
}
