import { useUserXP, getLevelColor, getLevelTitle, getNextLevelThreshold } from '@/hooks/useUserXP';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelProgressBarProps {
  userId?: string;
}

export function LevelProgressBar({ userId }: LevelProgressBarProps) {
  const { level, totalXP, levelProgress, loading } = useUserXP(userId);

  if (loading) return null;

  const colorClass = getLevelColor(level);
  const nextThreshold = getNextLevelThreshold(level);

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
      <Progress value={levelProgress} className="h-2" />
    </div>
  );
}
