import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { Trophy } from 'lucide-react';

export default function Leaderboard() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Κατάταξη ομάδας με βάση τους πόντους XP</p>
        </div>
      </div>
      <LeaderboardTable />
    </div>
  );
}
