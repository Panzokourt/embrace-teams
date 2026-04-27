import { supabase } from '@/integrations/supabase/client';

/** Lightweight types for achievement detection. */
export interface AchievementCriteria {
  type:
    | 'tasks_completed'
    | 'on_time_streak'
    | 'kudos_received'
    | 'kudos_given'
    | 'hours_logged'
    | 'files_uploaded'
    | 'comments_written'
    | 'level'
    | 'daily_streak'
    | 'skill_kudos';
  value: number;
}

export interface AchievementRow {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xp_reward: number;
  criteria: AchievementCriteria;
  sort_order: number;
}

/**
 * Compute current numeric progress for a given criterion type for one user.
 * Uses already-aggregated data when possible to avoid heavy queries.
 */
export async function computeAchievementMetric(
  userId: string,
  type: AchievementCriteria['type']
): Promise<number> {
  switch (type) {
    case 'tasks_completed': {
      const { data } = await supabase
        .from('user_xp_summary').select('tasks_completed').eq('user_id', userId).maybeSingle();
      return data?.tasks_completed ?? 0;
    }
    case 'on_time_streak': {
      const { data } = await supabase
        .from('user_xp_summary').select('on_time_streak').eq('user_id', userId).maybeSingle();
      return data?.on_time_streak ?? 0;
    }
    case 'kudos_received': {
      const { data } = await supabase
        .from('user_xp_summary').select('kudos_received').eq('user_id', userId).maybeSingle();
      return data?.kudos_received ?? 0;
    }
    case 'kudos_given': {
      const { count } = await supabase
        .from('user_xp').select('*', { count: 'exact', head: true })
        .eq('given_by', userId).eq('reason', 'kudos_given');
      return count ?? 0;
    }
    case 'level': {
      const { data } = await supabase
        .from('user_xp_summary').select('level').eq('user_id', userId).maybeSingle();
      return data?.level ?? 1;
    }
    case 'hours_logged': {
      const { data } = await supabase
        .from('time_entries').select('duration_minutes').eq('user_id', userId);
      const minutes = (data || []).reduce((sum, e: any) => sum + (e.duration_minutes || 0), 0);
      return Math.round(minutes / 60);
    }
    case 'files_uploaded': {
      const { count } = await supabase
        .from('user_xp').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('reason', 'file_uploaded');
      return count ?? 0;
    }
    case 'comments_written': {
      const { count } = await supabase
        .from('user_xp').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).eq('reason', 'comment_added');
      return count ?? 0;
    }
    case 'daily_streak': {
      // Best-effort: count consecutive distinct days with any XP earned, ending today.
      const { data } = await supabase
        .from('user_xp').select('created_at').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(200);
      if (!data?.length) return 0;
      const days = Array.from(
        new Set(data.map((r: any) => new Date(r.created_at).toISOString().slice(0, 10)))
      ).sort().reverse();
      let streak = 0;
      let cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      // Allow today missing: start from latest day if it's today or yesterday
      for (const day of days) {
        const dDate = new Date(day);
        const diff = Math.round((cursor.getTime() - dDate.getTime()) / 86400000);
        if (diff === 0) { streak++; cursor.setDate(cursor.getDate() - 1); }
        else if (diff === 1 && streak === 0) { streak++; cursor = dDate; cursor.setDate(cursor.getDate() - 1); }
        else if (diff === 0) continue;
        else break;
      }
      return streak;
    }
    case 'skill_kudos': {
      const { data } = await supabase
        .from('user_xp').select('skill_tag')
        .eq('user_id', userId).eq('reason', 'kudos_received').not('skill_tag', 'is', null);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (r.skill_tag) counts[r.skill_tag] = (counts[r.skill_tag] || 0) + 1;
      });
      return Object.values(counts).reduce((m, v) => Math.max(m, v), 0);
    }
    default:
      return 0;
  }
}

/**
 * Returns achievements ready to be unlocked (criteria met, not yet unlocked).
 */
export async function findUnlockedAchievements(userId: string): Promise<AchievementRow[]> {
  const [{ data: catalog }, { data: existing }] = await Promise.all([
    supabase.from('achievements').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', userId),
  ]);

  if (!catalog?.length) return [];
  const unlockedIds = new Set(
    (existing || []).filter((r: any) => r.unlocked_at).map((r: any) => r.achievement_id)
  );

  const candidates = (catalog as AchievementRow[]).filter((a) => !unlockedIds.has(a.id));
  // Cache metric values per type to avoid redundant queries
  const metricCache = new Map<string, number>();
  const result: AchievementRow[] = [];

  for (const ach of candidates) {
    const c = (typeof ach.criteria === 'string' ? JSON.parse(ach.criteria) : ach.criteria) as AchievementCriteria;
    if (!c?.type || typeof c.value !== 'number') continue;
    let metric = metricCache.get(c.type);
    if (metric === undefined) {
      metric = await computeAchievementMetric(userId, c.type);
      metricCache.set(c.type, metric);
    }
    if (metric >= c.value) result.push(ach);
  }

  return result;
}
