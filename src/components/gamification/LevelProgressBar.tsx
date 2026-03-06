import { useUserXP, getLevelColor, getLevelTitle, getNextLevelThreshold, getLevelThreshold } from '@/hooks/useUserXP';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelProgressBarProps {
  userId?: string;
}

export function LevelProgressBar({ userId }: LevelProgressBarProps) {
  const { level, totalXP, loading } = useUserXP(userId);

  if (loading) return null;

  const colorClass = getLevelColor(level);
  const currentThreshold = getLevelThreshold(level);
  const nextThreshold = getNextLevelThreshold(level);
  const xpInLevel = totalXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const pct = xpNeeded > 0 ? Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100)) : 100;

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