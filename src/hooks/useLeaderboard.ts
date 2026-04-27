import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type LeaderboardRange = 'today' | 'week' | 'month' | 'all';

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  totalXP: number;
  level: number;
  tasksCompleted: number;
  kudosReceived: number;
  onTimeStreak: number;
  rank: number;
}

function rangeStart(range: LeaderboardRange): Date | null {
  const now = new Date();
  if (range === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

export function useLeaderboard(range: LeaderboardRange = 'all') {
  const { company } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      const start = rangeStart(range);

      // Always pull summary for level/avatar/full_name
      const { data: summary } = await supabase
        .from('user_xp_summary')
        .select('user_id, total_xp, level, tasks_completed, kudos_received, on_time_streak')
        .eq('company_id', company.id);

      if (!summary?.length) {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
        return;
      }

      let xpByUser = new Map<string, number>();
      if (start) {
        const { data: rows } = await supabase
          .from('user_xp')
          .select('user_id, points')
          .eq('company_id', company.id)
          .gte('created_at', start.toISOString());
        (rows || []).forEach((r: any) => {
          xpByUser.set(r.user_id, (xpByUser.get(r.user_id) || 0) + r.points);
        });
      } else {
        summary.forEach((s: any) => xpByUser.set(s.user_id, s.total_xp));
      }

      const userIds = summary.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const summaryMap = new Map(summary.map((s: any) => [s.user_id, s]));

      const merged = userIds
        .map((uid: string) => {
          const s: any = summaryMap.get(uid);
          const p: any = profileMap.get(uid);
          return {
            userId: uid,
            fullName: p?.full_name || 'Unknown',
            avatarUrl: p?.avatar_url || null,
            totalXP: xpByUser.get(uid) || 0,
            level: s?.level || 1,
            tasksCompleted: s?.tasks_completed || 0,
            kudosReceived: s?.kudos_received || 0,
            onTimeStreak: s?.on_time_streak || 0,
          };
        })
        .filter((e) => e.totalXP > 0 || range === 'all')
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 50)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      if (!cancelled) {
        setEntries(merged);
        setLoading(false);
      }
    };

    fetch();
    return () => {
      cancelled = true;
    };
  }, [company?.id, range]);

  return { entries, loading };
}
