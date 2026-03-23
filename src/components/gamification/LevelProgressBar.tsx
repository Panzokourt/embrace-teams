import { useUserXP, getLevelColor, getLevelTitle, getNextLevelThreshold, getLevelThreshold } from '@/hooks/useUserXP';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelProgressBarProps {
  userId?: string;
  variant?: 'default' | 'compact';
}

export function LevelProgressBar({ userId, variant = 'default' }: LevelProgressBarProps) {
  const { level, totalXP, loading } = useUserXP(userId);

  if (loading) return null;

  const colorClass = getLevelColor(level);
  const currentThreshold = getLevelThreshold(level);
  const nextThreshold = getNextLevelThreshold(level);
  const xpInLevel = totalXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const pct = xpNeeded > 0 ? Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100)) : 100;

  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 h-7">
        <Zap className={cn('h-3.5 w-3.5 shrink-0', colorClass)} />
        <span className="text-xs font-semibold whitespace-nowrap">Lv {level}</span>
        <div className="relative h-1.5 w-12 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{totalXP}/{nextThreshold}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn('h-4 w-4', colorClass)} />
          <span className="text-sm font-semibold">Level {level}</span>
          <span className={cn('text-xs font-medium', colorClass)}>{getLevelTitle(level)}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalXP} / {nextThreshold} XP
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
