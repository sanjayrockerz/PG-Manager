import { useEffect, useMemo, useState } from 'react';
import { type AppMode, getAppMode, setAppMode } from '../config/appMode';

interface ModeToggleProps {
  canToggle: boolean;
}

export function ModeToggle({ canToggle }: ModeToggleProps) {
  const [mode, setModeState] = useState<AppMode>(() => getAppMode());

  useEffect(() => {
    setModeState(getAppMode());
  }, []);

  useEffect(() => {
    if (!canToggle && mode !== 'demo') {
      setAppMode('demo', { reload: false });
      setModeState('demo');
    }
  }, [canToggle, mode]);

  const isLive = mode === 'live';
  const label = useMemo(() => (isLive ? 'Live' : 'Demo'), [isLive]);

  const handleModeSwitch = (nextMode: AppMode) => {
    if (!canToggle || nextMode === mode) return;
    setModeState(nextMode);
    setAppMode(nextMode);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Pill toggle */}
      <div
        className={`flex items-center gap-0.5 p-0.5 rounded-full border text-xs font-semibold transition-colors ${
          isLive
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <button
          type="button"
          onClick={() => handleModeSwitch('demo')}
          disabled={!canToggle}
          aria-pressed={!isLive}
          className={`px-3 py-1 rounded-full transition-all duration-200 ${
            !isLive
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 disabled:opacity-40'
          }`}
        >
          Demo
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('live')}
          disabled={!canToggle}
          aria-pressed={isLive}
          className={`px-3 py-1 rounded-full transition-all duration-200 ${
            isLive
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 disabled:opacity-40'
          }`}
        >
          Live
        </button>
      </div>

      {/* Status dot + label */}
      <span
        className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
          isLive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}
        />
        {label}
      </span>
    </div>
  );
}
