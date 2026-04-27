import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Award, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string | null;
  tier: string;
  xp_reward: number;
  sort_order: number;
}

interface UnlockedRow {
  achievement_id: string;
  unlocked_at: string;
}

const TIER_STYLES: Record<string, { ring: string; bg: string; text: string; label: string }> = {
  bronze: {
    ring: 'ring-amber-700/40',
    bg: 'bg-gradient-to-br from-amber-700/20 to-amber-900/10',
    text: 'text-amber-600',
    label: 'Bronze',
  },
  silver: {
    ring: 'ring-zinc-300/40',
    bg: 'bg-gradient-to-br from-zinc-300/20 to-zinc-500/10',
    text: 'text-zinc-300',
    label: 'Silver',
  },
  gold: {
    ring: 'ring-amber-400/50',
    bg: 'bg-gradient-to-br from-amber-300/25 to-amber-600/10',
    text: 'text-amber-400',
    label: 'Gold',
  },
  platinum: {
    ring: 'ring-violet-400/50',
    bg: 'bg-gradient-to-br from-violet-400/25 to-fuchsia-500/10',
    text: 'text-violet-300',
    label: 'Platinum',
  },
};

interface Props {
  userId: string;
}

export function AchievementsGrid({ userId }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cat }, { data: user }] = await Promise.all([
        supabase
          .from('achievements')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('user_achievements')
          .select('achievement_id, unlocked_at')
          .eq('user_id', userId),
      ]);
      setAchievements((cat as Achievement[]) || []);
      setUnlocked(
        new Map((user as UnlockedRow[] || []).map((r) => [r.achievement_id, r.unlocked_at]))
      );
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const unlockedCount = unlocked.size;
  const total = achievements.length;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Achievements
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {unlockedCount} / {total} • {pct}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Δεν υπάρχουν achievements ακόμα.
          </p>
        ) : (
          <TooltipProvider delayDuration={150}>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {achievements.map((a) => {
                const isUnlocked = unlocked.has(a.id);
                const tier = TIER_STYLES[a.tier] || TIER_STYLES.bronze;
                const unlockedAt = unlocked.get(a.id);
                return (
                  <Tooltip key={a.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 ring-1 transition-all cursor-help',
                          isUnlocked
                            ? `${tier.bg} ${tier.ring} hover:scale-105`
                            : 'bg-muted/20 ring-border/30 grayscale opacity-60'
                        )}
                      >
                        <span className="text-2xl">
                          {isUnlocked ? a.icon || '🏆' : <Lock className="h-4 w-4 text-muted-foreground" />}
                        </span>
                        {isUnlocked && (
                          <Sparkles className={cn('absolute top-1 right-1 h-3 w-3', tier.text)} />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{a.title}</span>
                          <span className={cn('text-[10px] font-bold', tier.text)}>
                            {tier.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{a.description}</p>
                        <div className="text-[10px] flex items-center justify-between pt-1 border-t border-border/40">
                          <span className="text-primary font-semibold">+{a.xp_reward} XP</span>
                          {isUnlocked && unlockedAt && (
                            <span className="text-muted-foreground">
                              {format(new Date(unlockedAt), 'd MMM yyyy', { locale: el })}
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
