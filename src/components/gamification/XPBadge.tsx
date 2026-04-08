import { useUserXP, getLevelColor, getLevelGlow } from '@/hooks/useUserXP';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface XPBadgeProps {
  userId?: string;
  size?: 'sm' | 'md';
  showXP?: boolean;
  className?: string;
}

export function XPBadge({ userId, size = 'sm', showXP = false, className }: XPBadgeProps) {
  const { level, totalXP, levelTitle, loading } = useUserXP(userId);

  if (loading || !userId) return null;

  const colorClass = getLevelColor(level);
  const glowClass = getLevelGlow(level);

  if (size === 'sm') {
    return (
      <span
        className={cn("inline-flex items-center gap-1 rounded-full border font-bold border-border/50 px-[23px] text-sm my-0 py-[4px] bg-blue-600 text-primary-foreground",
        glowClass,
        className
        )}
        title={`Level ${level} — ${levelTitle} — ${totalXP} XP`}>
        
        <Zap className="h-3 w-3 bg-transparent text-primary-foreground" />
        <span className={colorClass}>{level}</span>
        {showXP && <span className="font-normal ml-0.5 text-primary-foreground">{totalXP}</span>}
      </span>);

  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5',
        'border-border/50 bg-card',
        glowClass,
        className
      )}
      title={`Level ${level} — ${levelTitle}`}>
      
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full border-2',
        level >= 20 ? 'border-amber-400 bg-amber-400/10' :
        level >= 15 ? 'border-violet-400 bg-violet-400/10' :
        level >= 10 ? 'border-blue-400 bg-blue-400/10' :
        level >= 5 ? 'border-emerald-400 bg-emerald-400/10' :
        'border-border bg-muted'
      )}>
        <span className={cn('text-sm font-bold', colorClass)}>{level}</span>
      </div>
      <div className="flex flex-col">
        <span className={cn('text-xs font-bold', colorClass)}>{levelTitle}</span>
        <span className="text-[10px] text-muted-foreground">{totalXP} XP</span>
      </div>
    </div>);

}