import { useUserXP, getLevelColor, getLevelGlow, getNextLevelThreshold } from '@/hooks/useUserXP';
import { useAuth } from '@/contexts/AuthContext';
import { Flame, Zap, CheckCircle2, Clock } from 'lucide-react';

interface CCHeroZoneProps {
  tasksCompletedToday: number;
  hoursToday: number;
}

function XPRing({ progress, level }: { progress: number; level: number }) {
  const radius = 54;
  const stroke = 6;
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  const glowColor = level >= 20 ? 'hsl(38 92% 50%)' :
    level >= 15 ? 'hsl(270 60% 55%)' :
    level >= 10 ? 'hsl(210 80% 55%)' :
    'hsl(var(--primary))';

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none"
          stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.3} />
        <circle cx="60" cy="60" r={radius} fill="none"
          stroke={glowColor} strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${normalizedProgress} ${100 - normalizedProgress}`}
          strokeDashoffset="0"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{level}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</span>
      </div>
    </div>
  );
}

export default function CCHeroZone({ tasksCompletedToday, hoursToday }: CCHeroZoneProps) {
  const { user, profile } = useAuth();
  const xp = useUserXP(user?.id);
  const nextThreshold = getNextLevelThreshold(xp.level);
  const xpRemaining = Math.max(0, nextThreshold - xp.totalXP);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Καλημέρα';
    if (h < 18) return 'Καλησπέρα';
    return 'Καλό βράδυ';
  })();

  const firstName = profile?.full_name?.split(' ')[0] || 'Agent';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card p-6">
      {/* Subtle scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 3px)' }} />

      <div className="relative flex flex-col md:flex-row items-center gap-6">
        {/* XP Ring */}
        <XPRing progress={xp.levelProgress} level={xp.level} />

        {/* Info */}
        <div className="flex-1 text-center md:text-left space-y-1">
          <h1 className="text-xl font-bold text-foreground">
            {greeting}, <span className="text-primary">{firstName}</span>
          </h1>
          <p className={`text-sm font-semibold ${getLevelColor(xp.level)}`}>
            {xp.levelTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {xp.totalXP.toLocaleString()} XP · {xpRemaining} XP μέχρι το Level {xp.level + 1}
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex gap-3 flex-wrap justify-center">
          <StatPill icon={Flame} label="Streak" value={xp.onTimeStreak} accent />
          <StatPill icon={CheckCircle2} label="Σήμερα" value={tasksCompletedToday} />
          <StatPill icon={Clock} label="Ώρες" value={`${hoursToday.toFixed(1)}h`} />
          <StatPill icon={Zap} label="Kudos" value={xp.kudosReceived} />
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm
      ${accent
        ? 'border-warning/30 bg-warning/10 text-warning'
        : 'border-border/30 bg-muted/30 text-foreground'}`}>
      <Icon className="h-4 w-4" />
      <div className="leading-tight">
        <div className="font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
