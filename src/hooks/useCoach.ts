import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * useCoach — read & write coaching seen state for the current user.
 *
 * - `seen` is a Set of feature_keys the user has dismissed/seen.
 * - `markSeen(key)` records it in the DB and updates local state optimistically.
 * - `reset(key)` removes the record so the coach can re-appear (used by Settings).
 */
export function useCoach() {
  const { user } = useAuth();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load existing state
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('user_coaching_state')
        .select('feature_key')
        .eq('user_id', user.id);
      if (cancelled) return;
      setSeen(new Set((data ?? []).map((r: any) => r.feature_key as string)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasSeen = useCallback((key: string) => seen.has(key), [seen]);

  const markSeen = useCallback(async (key: string, dismissed = true) => {
    if (!user) return;
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    await (supabase as any)
      .from('user_coaching_state')
      .upsert(
        { user_id: user.id, feature_key: key, dismissed, seen_at: new Date().toISOString() },
        { onConflict: 'user_id,feature_key' }
      );
  }, [user?.id]);

  const reset = useCallback(async (key?: string) => {
    if (!user) return;
    if (key) {
      await (supabase as any).from('user_coaching_state').delete().eq('user_id', user.id).eq('feature_key', key);
      setSeen((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      await (supabase as any).from('user_coaching_state').delete().eq('user_id', user.id);
      setSeen(new Set());
    }
  }, [user?.id]);

  return { seen, hasSeen, markSeen, reset, loading };
}
