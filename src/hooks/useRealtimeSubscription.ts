import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 
  | 'tasks' 
  | 'projects' 
  | 'tenders' 
  | 'deliverables' 
  | 'invoices' 
  | 'expenses' 
  | 'teams' 
  | 'team_members' 
  | 'clients' 
  | 'comments' 
  | 'activity_log'
  | 'profiles';

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  onDataChange: () => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to realtime changes on specified tables
 * Automatically refetches data when changes occur
 */
export function useRealtimeSubscription({
  tables,
  onDataChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onDataChangeRef = useRef(onDataChange);

  // Keep callback ref updated
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channelName = `realtime-${tables.join('-')}-${Date.now()}`;
    
    let channel = supabase.channel(channelName);
    
    // Subscribe to each table
    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`Realtime change on ${table}:`, payload.eventType);
          onDataChangeRef.current();
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to realtime changes on: ${tables.join(', ')}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tables.join(','), enabled]);

  return null;
}

/**
 * Hook specifically for Dashboard realtime updates
 */
export function useDashboardRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['tasks', 'projects', 'tenders', 'invoices', 'expenses'],
    onDataChange: onRefresh,
  });
}

/**
 * Hook for Tasks page realtime updates
 */
export function useTasksRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['tasks'],
    onDataChange: onRefresh,
  });
}

/**
 * Hook for Projects page realtime updates
 */
export function useProjectsRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['projects', 'deliverables', 'tasks', 'invoices', 'expenses'],
    onDataChange: onRefresh,
  });
}

/**
 * Hook for Tenders page realtime updates
 */
export function useTendersRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['tenders'],
    onDataChange: onRefresh,
  });
}

/**
 * Hook for Teams page realtime updates
 */
export function useTeamsRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['teams', 'team_members'],
    onDataChange: onRefresh,
  });
}

/**
 * Hook for Calendar page realtime updates
 */
export function useCalendarRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['tasks', 'tenders', 'deliverables', 'projects'],
    onDataChange: onRefresh,
  });
}

/**
 * Hook for Clients page realtime updates
 */
export function useClientsRealtime(onRefresh: () => void) {
  return useRealtimeSubscription({
    tables: ['clients'],
    onDataChange: onRefresh,
  });
}
