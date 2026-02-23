import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

export function useLeaderboard() {
  const { company } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;

    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_xp_summary')
        .select('user_id, total_xp, level, tasks_completed, kudos_received, on_time_streak')
        .eq('company_id', company.id)
        .order('total_xp', { ascending: false })
        .limit(50);

      if (!data?.length) { setEntries([]); setLoading(false); return; }

      // Fetch profiles
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const mapped: LeaderboardEntry[] = data.map((d, i) => {
        const p = profileMap.get(d.user_id);
        return {
          userId: d.user_id,
          fullName: p?.full_name || 'Unknown',
          avatarUrl: p?.avatar_url || null,
          totalXP: d.total_xp,
          level: d.level,
          tasksCompleted: d.tasks_completed,
          kudosReceived: d.kudos_received,
          onTimeStreak: d.on_time_streak,
          rank: i + 1,
        };
      });

      setEntries(mapped);
      setLoading(false);
    };

    fetch();
  }, [company?.id]);

  return { entries, loading };
}
