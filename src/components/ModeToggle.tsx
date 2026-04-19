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

  const label = useMemo(() => (mode === 'demo' ? 'Demo Mode ON' : 'Live Mode ON'), [mode]);

  const handleModeSwitch = (nextMode: AppMode) => {
    if (!canToggle || nextMode === mode) {
      return;
    }

    setModeState(nextMode);
    setAppMode(nextMode);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white text-xs">
        <button
          type="button"
          onClick={() => handleModeSwitch('demo')}
          className={`px-3 py-1.5 transition-colors ${mode === 'demo' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          disabled={!canToggle}
          aria-pressed={mode === 'demo'}
        >
          Demo Mode
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('live')}
          className={`border-l border-gray-300 px-3 py-1.5 transition-colors ${mode === 'live' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
          disabled={!canToggle}
          aria-pressed={mode === 'live'}
        >
          Live Mode
        </button>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${mode === 'demo' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
        {label}
      </span>
    </div>
  );
}
