import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
const LEVEL_TITLES = ['Rookie', 'Apprentice', 'Contributor', 'Professional', 'Expert', 'Specialist', 'Master', 'Elite', 'Champion', 'Legend'];

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || 'Legend';
}

export function getLevelThreshold(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level - 1, LEVEL_THRESHOLDS.length - 1)] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

export function getNextLevelThreshold(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
  return LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
}

export function getLevelProgress(totalXP: number, level: number): number {
  const current = getLevelThreshold(level);
  const next = getNextLevelThreshold(level);
  if (next <= current) return 100;
  return Math.min(100, Math.round(((totalXP - current) / (next - current)) * 100));
}

export function getLevelColor(level: number): string {
  if (level >= 20) return 'text-amber-400';
  if (level >= 15) return 'text-violet-400';
  if (level >= 10) return 'text-blue-400';
  if (level >= 5) return 'text-emerald-400';
  return 'text-muted-foreground';
}

export function getLevelGlow(level: number): string {
  if (level >= 20) return 'shadow-[0_0_12px_hsl(38_92%_50%/0.4)]';
  if (level >= 15) return 'shadow-[0_0_10px_hsl(270_60%_55%/0.3)]';
  if (level >= 10) return 'shadow-[0_0_8px_hsl(210_80%_55%/0.25)]';
  return '';
}

interface XPSummary {
  totalXP: number;
  level: number;
  levelTitle: string;
  levelProgress: number;
  tasksCompleted: number;
  onTimeStreak: number;
  kudosReceived: number;
  loading: boolean;
}

export function useUserXP(userId?: string): XPSummary {
  const [data, setData] = useState<XPSummary>({
    totalXP: 0, level: 1, levelTitle: 'Rookie', levelProgress: 0,
    tasksCompleted: 0, onTimeStreak: 0, kudosReceived: 0, loading: true,
  });

  useEffect(() => {
    if (!userId) { setData(prev => ({ ...prev, loading: false })); return; }

    const fetch = async () => {
      const { data: row } = await supabase
        .from('user_xp_summary')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (row) {
        setData({
          totalXP: row.total_xp,
          level: row.level,
          levelTitle: getLevelTitle(row.level),
          levelProgress: getLevelProgress(row.total_xp, row.level),
          tasksCompleted: row.tasks_completed,
          onTimeStreak: row.on_time_streak,
          kudosReceived: row.kudos_received,
          loading: false,
        });
      } else {
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetch();

    // Realtime subscription
    const channel = supabase
      .channel(`xp-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_xp_summary',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row) {
          setData({
            totalXP: row.total_xp,
            level: row.level,
            levelTitle: getLevelTitle(row.level),
            levelProgress: getLevelProgress(row.total_xp, row.level),
            tasksCompleted: row.tasks_completed,
            onTimeStreak: row.on_time_streak,
            kudosReceived: row.kudos_received,
            loading: false,
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return data;
}
