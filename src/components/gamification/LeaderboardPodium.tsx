import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Zap } from 'lucide-react';
import { getLevelColor, getLevelTitle } from '@/hooks/useUserXP';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';

interface Props {
  top: LeaderboardEntry[];
}

const PODIUM_CONFIG = [
  { order: 1, height: 'h-32', icon: <Trophy className="h-5 w-5 text-amber-400" />, ring: 'ring-amber-400/50', glow: 'shadow-[0_0_30px_-5px_hsl(45_92%_55%/0.5)]', label: '1st' },
  { order: 0, height: 'h-24', icon: <Medal className="h-5 w-5 text-zinc-300" />, ring: 'ring-zinc-300/40', glow: 'shadow-[0_0_20px_-5px_hsl(0_0%_75%/0.4)]', label: '2nd' },
  { order: 2, height: 'h-20', icon: <Award className="h-5 w-5 text-amber-700" />, ring: 'ring-amber-700/40', glow: 'shadow-[0_0_18px_-5px_hsl(28_70%_45%/0.4)]', label: '3rd' },
];

export function LeaderboardPodium({ top }: Props) {
  const navigate = useNavigate();
  if (top.length === 0) return null;

  // top[0] = #1, top[1] = #2, top[2] = #3
  // Visual order: #2, #1, #3
  const arranged = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 items-end mb-4 px-2">
      {arranged.map((entry, idx) => {
        const cfg = PODIUM_CONFIG[idx];
        const realRank = entry === top[0] ? 1 : entry === top[1] ? 2 : 3;
        const colorClass = getLevelColor(entry.level);

        return (
          <button
            key={entry.userId}
            onClick={() => navigate(`/hr/employee/${entry.userId}`)}
            className="flex flex-col items-center group"
          >
            <div className="flex flex-col items-center mb-2">
              <Avatar
                className={cn(
                  'h-16 w-16 md:h-20 md:w-20 ring-4 transition-transform group-hover:scale-105',
                  cfg.ring,
                  cfg.glow
                )}
              >
                <AvatarImage src={entry.avatarUrl || undefined} />
                <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                  {entry.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <p className="text-xs md:text-sm font-semibold truncate max-w-[120px]">
                  {entry.fullName}
                </p>
                <p className={cn('text-[10px]', colorClass)}>
                  Lv.{entry.level} · {getLevelTitle(entry.level)}
                </p>
              </div>
            </div>
            <div
              className={cn(
                'w-full rounded-t-xl border border-b-0 flex flex-col items-center justify-start pt-3 px-2 bg-gradient-to-b from-card to-secondary/40',
                cfg.height
              )}
            >
              {cfg.icon}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                {cfg.label}
              </span>
              <span className="text-base md:text-lg font-bold flex items-center gap-1 mt-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                {entry.totalXP.toLocaleString()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
