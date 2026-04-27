import { Card, CardContent } from '@/components/ui/card';
import { useUserXP, getNextLevelThreshold, getLevelTitle } from '@/hooks/useUserXP';
import { Sparkles, Target, Flame, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Props {
  userId?: string;
}

export function MotivationCard({ userId }: Props) {
  const navigate = useNavigate();
  const { level, totalXP, onTimeStreak, loading } = useUserXP(userId);

  if (loading) return null;

  const next = getNextLevelThreshold(level);
  const remaining = Math.max(0, next - totalXP);

  // Pick a tip
  const tips: { icon: React.ReactNode; text: string; cta?: () => void; ctaLabel?: string }[] = [];

  if (remaining > 0 && remaining <= 50) {
    tips.push({
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      text: `Είσαι μόλις ${remaining} XP πριν το Level ${level + 1} (${getLevelTitle(level + 1)})!`,
    });
  } else if (remaining > 0) {
    tips.push({
      icon: <Target className="h-4 w-4 text-primary" />,
      text: `Στόχος: άλλα ${remaining} XP για να γίνεις ${getLevelTitle(level + 1)}.`,
    });
  }

  if (onTimeStreak === 0) {
    tips.push({
      icon: <Flame className="h-4 w-4 text-orange-400" />,
      text: 'Ολοκλήρωσε ένα task εμπρόθεσμα για να ξεκινήσει το streak σου 🔥',
    });
  } else if (onTimeStreak >= 3) {
    tips.push({
      icon: <Flame className="h-4 w-4 text-orange-400" />,
      text: `Έχεις ${onTimeStreak} συνεχόμενα εμπρόθεσμα tasks — μη σπάσεις το streak!`,
    });
  }

  tips.push({
    icon: <Trophy className="h-4 w-4 text-amber-400" />,
    text: 'Δες πού βρίσκεσαι σε σχέση με την υπόλοιπη ομάδα.',
    cta: () => navigate('/leaderboard'),
    ctaLabel: 'Άνοιξε το Leaderboard',
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0 border border-border/50">
              {tip.icon}
            </div>
            <p className="text-sm flex-1">{tip.text}</p>
            {tip.cta && (
              <Button size="sm" variant="ghost" onClick={tip.cta} className="text-xs h-7">
                {tip.ctaLabel}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
