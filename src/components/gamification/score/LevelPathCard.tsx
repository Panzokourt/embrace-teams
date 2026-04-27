import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useUserXP,
  getLevelColor,
  getLevelTitle,
  getLevelThreshold,
} from '@/hooks/useUserXP';
import { Zap, Lock, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERKS: Record<number, string> = {
  2: 'Custom avatar frame',
  3: 'Streak badge',
  5: 'Pro icon στο leaderboard',
  7: 'Profile theme accent',
  10: 'Elite tier glow',
  15: 'Golden trophy badge',
  20: 'Legend status',
};

interface Props {
  userId?: string;
}

export function LevelPathCard({ userId }: Props) {
  const { level, totalXP, loading } = useUserXP(userId);

  if (loading) return <Card className="h-64 animate-pulse" />;

  const path: number[] = [];
  for (let l = Math.max(1, level - 1); l <= Math.min(10, level + 4); l++) path.push(l);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" />
          Η διαδρομή σου
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {path.map((l) => {
            const reached = level >= l;
            const isCurrent = level === l;
            const threshold = getLevelThreshold(l);
            const color = getLevelColor(l);

            return (
              <div
                key={l}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  isCurrent
                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                    : reached
                    ? 'border-border/50 bg-secondary/30'
                    : 'border-dashed border-border/40 opacity-70'
                )}
              >
                <div
                  className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                    reached ? 'bg-primary/15' : 'bg-muted'
                  )}
                >
                  {reached ? (
                    isCurrent ? (
                      <Zap className={cn('h-4 w-4', color)} />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Level {l}</span>
                    <span className={cn('text-xs', color)}>{getLevelTitle(l)}</span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
                        εδώ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {PERKS[l] ? `🎁 ${PERKS[l]}` : 'Συνεχίζεις δυνατά'}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground tabular-nums">
                  {threshold.toLocaleString()} XP
                </span>
              </div>
            );
          })}
        </div>

        {level < 10 && (
          <p className="text-[11px] text-center text-muted-foreground mt-4">
            Έχεις {totalXP.toLocaleString()} XP. Συνέχισε να ολοκληρώνεις tasks εμπρόθεσμα για
            να ανέβεις πιο γρήγορα!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
