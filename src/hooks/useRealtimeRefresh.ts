import { useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Fallback polling interval (ms) — triggers a refresh if realtime has been silent too long.
const STALE_FALLBACK_MS = 90_000;

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
  | 'support_ticket_comments'
  | 'activity_logs'
  | 'vacate_requests'
  | 'admin_coupons'
  | 'referrals'
  | 'lead_sources'
  | 'maintenance_threads'
  | 'tenant_documents'
  | 'agreements'
  | 'agreement_events'
  | 'agreement_templates'
  | 'owner_signature_profiles'
  | 'property_floors'
  | 'beds';

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
  const lastRefreshRef = useRef<number>(Date.now());
  const fallbackTimerRef = useRef<number | null>(null);

  const uniqueTables = useMemo(() => Array.from(new Set(tables)), [tables]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
        Promise.resolve(onChangeRef.current())
          .finally(() => {
            lastRefreshRef.current = Date.now();
            setIsSyncing(false);
            setLastUpdatedAt(new Date());
            setRefreshCount((value) => value + 1);
          });
      }, debounceMs);
    };

    // Fallback: if no realtime event arrives within STALE_FALLBACK_MS, poll once.
    const scheduleFallback = () => {
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = window.setTimeout(() => {
        if (Date.now() - lastRefreshRef.current >= STALE_FALLBACK_MS - 1000) {
          runRefresh();
        }
        scheduleFallback();
      }, STALE_FALLBACK_MS);
    };
    scheduleFallback();

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

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        // Connected successfully
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        // Disconnected or error - trigger a manual fetch so we don't miss data
        // while the socket tries to reconnect in the background
        runRefresh();
      } else if (status === 'TIMED_OUT') {
        runRefresh();
      }
    });

    const handleOnline = () => {
      // User's network came back online. Refresh data.
      runRefresh();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);

      window.removeEventListener('owner-data-updated', handleManualRefresh);
      window.removeEventListener('online', handleOnline);

      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [debounceMs, enabled, key, uniqueTables]);

  return {
    lastUpdatedAt,
    isSyncing,
    refreshCount,
  };
}
