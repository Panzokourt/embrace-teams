import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserXP } from '@/hooks/useUserXP';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface DockXPBadgeProps {
  userId?: string;
}

export default function DockXPBadge({ userId }: DockXPBadgeProps) {
  const { level, totalXP, levelTitle, loading } = useUserXP(userId);
  const navigate = useNavigate();

  if (loading || !userId) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate('/leaderboard')}
          className={cn(
            'h-8 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold text-white',
            'bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all'
          )}
          aria-label="Δείτε leaderboard"
        >
          <Zap className="h-3 w-3 fill-current text-amber-200" />
          <span>{level}</span>
          <span className="font-normal text-white/70 ml-0.5">{totalXP}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="text-xs">
        Level {level} — {levelTitle} — {totalXP} XP · Δείτε leaderboard
      </TooltipContent>
    </Tooltip>
  );
}
