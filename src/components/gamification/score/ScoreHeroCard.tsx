import { Card } from '@/components/ui/card';
import { Zap, Flame, Heart, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  useUserXP,
  getLevelColor,
  getLevelTitle,
  getLevelThreshold,
  getNextLevelThreshold,
} from '@/hooks/useUserXP';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Props {
  userId?: string;
}

export function ScoreHeroCard({ userId }: Props) {
  const { level, totalXP, tasksCompleted, onTimeStreak, kudosReceived, levelTitle, loading } =
    useUserXP(userId);
  const [animatedXP, setAnimatedXP] = useState(0);

  useEffect(() => {
    if (loading) return;
    const start = animatedXP;
    const target = totalXP;
    const duration = 800;
    const startTime = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedXP(Math.round(start + (target - start) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalXP, loading]);

  if (loading) {
    return <Card className="h-48 animate-pulse" />;
  }

  const current = getLevelThreshold(level);
  const next = getNextLevelThreshold(level);
  const xpInLevel = totalXP - current;
  const xpNeeded = next - current;
  const pct = xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
  const colorClass = getLevelColor(level);
  const remaining = Math.max(0, next - totalXP);

  // Conic ring
  const ringStyle = {
    background: `conic-gradient(hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}% 100%)`,
  };

  return (
    <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card to-secondary/30 border-primary/10">
      {/* Glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center gap-6">
        {/* Ring */}
        <div className="relative shrink-0">
          <div
            className="h-32 w-32 rounded-full flex items-center justify-center transition-all duration-700"
            style={ringStyle}
          >
            <div className="h-[110px] w-[110px] rounded-full bg-card flex flex-col items-center justify-center">
              <Zap className={cn('h-5 w-5 mb-0.5', colorClass)} />
              <span className="text-3xl font-bold leading-none">{level}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                Level
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {levelTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {remaining > 0 ? (
                <>
                  Ακόμη <span className="font-semibold text-foreground">{remaining} XP</span> για
                  Level {level + 1}
                </>
              ) : (
                'Είσαι στο μέγιστο level — απίθανη επίδοση! 🏆'
              )}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{current.toLocaleString()} XP</span>
              <span className="font-semibold text-foreground">
                {animatedXP.toLocaleString()} XP
              </span>
              <span>{next.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/50">
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          label="Tasks"
          value={tasksCompleted}
        />
        <Stat
          icon={<Flame className="h-4 w-4 text-orange-400" />}
          label="On-time streak"
          value={onTimeStreak}
          suffix={onTimeStreak > 0 ? '🔥' : ''}
        />
        <Stat
          icon={<Heart className="h-4 w-4 text-pink-400" />}
          label="Kudos"
          value={kudosReceived}
        />
        <Stat
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          label="Total XP"
          value={totalXP}
        />
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center md:items-start gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-xl font-bold tabular-nums">
        {value.toLocaleString()} {suffix}
      </span>
    </div>
  );
}
