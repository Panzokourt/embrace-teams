import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Zap, Flame, Heart } from 'lucide-react';
import { getLevelColor, getLevelTitle } from '@/hooks/useUserXP';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const rankIcons = [
  <Trophy className="h-5 w-5 text-amber-400" />,
  <Medal className="h-5 w-5 text-zinc-400" />,
  <Award className="h-5 w-5 text-amber-700" />,
];

interface Props {
  entries?: LeaderboardEntry[];
  loading?: boolean;
  startRank?: number;
}

export function LeaderboardTable({ entries: entriesProp, loading: loadingProp, startRank = 1 }: Props = {}) {
  const fallback = useLeaderboard();
  const entries = entriesProp ?? fallback.entries;
  const loading = loadingProp ?? fallback.loading;
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Δεν υπάρχουν δεδομένα ακόμα. Ολοκληρώστε tasks για να μαζέψετε XP!
        </CardContent>
      </Card>
    );
  }

  const visible = entries.filter((e) => e.rank >= startRank);

  return (
    <div className="space-y-3">
      {visible.map((entry) => {
        const colorClass = getLevelColor(entry.level);
        const isTop3 = entry.rank <= 3;

        return (
          <div
            key={entry.userId}
            onClick={() => navigate(`/hr/employee/${entry.userId}`)}
            className={cn(
              'flex items-center gap-4 rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-soft',
              isTop3
                ? 'bg-card border-primary/20'
                : 'bg-card/50 border-border/50 hover:bg-card'
            )}
          >
            {/* Rank */}
            <div className="w-8 flex justify-center">
              {isTop3 ? rankIcons[entry.rank - 1] : (
                <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.avatarUrl || undefined} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {entry.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            {/* Name + Level */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{entry.fullName}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Zap className={cn('h-3 w-3 mr-0.5', colorClass)} />
                  Lv.{entry.level}
                </Badge>
              </div>
              <span className={cn('text-xs', colorClass)}>{getLevelTitle(entry.level)}</span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title="Tasks">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                {entry.tasksCompleted}
              </span>
              <span className="flex items-center gap-1" title="Kudos">
                <Heart className="h-3.5 w-3.5 text-pink-400" />
                {entry.kudosReceived}
              </span>
            </div>

            {/* XP */}
            <div className="text-right min-w-[60px]">
              <span className="text-sm font-bold">{entry.totalXP.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground ml-1">XP</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
