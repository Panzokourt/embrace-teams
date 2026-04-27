import { useState } from 'react';
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { LeaderboardPodium } from '@/components/gamification/LeaderboardPodium';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy } from 'lucide-react';
import { useLeaderboard, type LeaderboardRange } from '@/hooks/useLeaderboard';

const RANGES: { value: LeaderboardRange; label: string }[] = [
  { value: 'today', label: 'Σήμερα' },
  { value: 'week', label: 'Εβδομάδα' },
  { value: 'month', label: 'Μήνας' },
  { value: 'all', label: 'All-time' },
];

export default function Leaderboard() {
  const [range, setRange] = useState<LeaderboardRange>('week');
  const { entries, loading } = useLeaderboard(range);
  const top3 = entries.slice(0, 3);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Κατάταξη ομάδας με βάση τους πόντους XP
            </p>
          </div>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as LeaderboardRange)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {!loading && top3.length >= 3 && <LeaderboardPodium top={top3} />}

      <LeaderboardTable
        entries={entries}
        loading={loading}
        startRank={top3.length >= 3 ? 4 : 1}
      />
    </div>
  );
}
