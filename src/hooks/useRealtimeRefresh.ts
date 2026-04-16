import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type TableName =
  | 'profiles'
  | 'properties'
  | 'rooms'
  | 'tenants'
  | 'payments'
  | 'payment_charges'
  | 'maintenance_tickets'
  | 'maintenance_notes'
  | 'announcements'
  | 'notifications'
  | 'owner_user_property_scopes'
  | 'owner_subscriptions'
  | 'support_tickets'
  | 'support_ticket_comments';

interface UseRealtimeRefreshOptions {
  key: string;
  tables: TableName[];
  onChange: () => void | Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useRealtimeRefresh({
  key,
  tables,
  onChange,
  enabled = true,
  debounceMs = 450,
}: UseRealtimeRefreshOptions) {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const debounceRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const uniqueTables = useMemo(() => Array.from(new Set(tables)), [tables]);

  useEffect(() => {
    if (!enabled || uniqueTables.length === 0) {
      return;
    }

    const channel = supabase.channel(`live-${key}-${Date.now()}`);
    channelRef.current = channel;

    const runRefresh = () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        setIsSyncing(true);
        Promise.resolve(onChange())
          .finally(() => {
            setIsSyncing(false);
            setLastUpdatedAt(new Date());
            setRefreshCount((value) => value + 1);
          });
      }, debounceMs);
    };

    uniqueTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        runRefresh,
      );
    });

    const handleManualRefresh = () => {
      runRefresh();
    };

    window.addEventListener('owner-data-updated', handleManualRefresh);

    channel.subscribe();

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      window.removeEventListener('owner-data-updated', handleManualRefresh);

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [debounceMs, enabled, key, onChange, uniqueTables]);

  return {
    lastUpdatedAt,
    isSyncing,
    refreshCount,
  };
}
