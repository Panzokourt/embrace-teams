import { useEffect } from 'react';
import { useXPNotifications } from '@/contexts/XPNotificationsContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getLevelColor, getNextLevelThreshold, getLevelThreshold } from '@/hooks/useUserXP';
import { Zap, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

const PERKS_BY_LEVEL: Record<number, string[]> = {
  5: ['Ξεκλειδώθηκε ο τίτλος Apprentice', 'Νέο badge στο leaderboard'],
  10: ['Νέος τίτλος: Professional', 'Glow ring στο XP badge'],
  15: ['Specialist tier — golden ring', 'Έμφαση στο leaderboard'],
  20: ['Legend status — platinum tier', 'Permanent leaderboard hall of fame'],
};

export default function LevelUpModal() {
  const { levelUp, dismissLevelUp } = useXPNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!levelUp) return;
    // Fire confetti burst
    const duration = 1800;
    const end = Date.now() + duration;
    const tick = () => {
      confetti({
        particleCount: 4,
        startVelocity: 35,
        spread: 70,
        origin: { x: Math.random(), y: Math.random() * 0.4 + 0.1 },
        colors: ['#fbbf24', '#f59e0b', '#a78bfa', '#60a5fa', '#34d399'],
        scalar: 0.9,
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, [levelUp]);

  if (!levelUp) return null;

  const colorClass = getLevelColor(levelUp.newLevel);
  const next = getNextLevelThreshold(levelUp.newLevel);
  const current = getLevelThreshold(levelUp.newLevel);
  const xpForNext = next - current;
  const perks = PERKS_BY_LEVEL[levelUp.newLevel] || ['Νέα μετάλλια & πρόοδος', 'Συνέχισε για περισσότερα XP'];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) dismissLevelUp(); }}>
      <DialogContent className="max-w-md border-0 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 -z-10 opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/30 blur-3xl animate-pulse" />
        </div>

        <div className="text-center space-y-4 py-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Level Up
            <Sparkles className="h-3.5 w-3.5" />
          </div>

          {/* Big level ring */}
          <div className="relative mx-auto w-32 h-32 rounded-full grid place-items-center"
               style={{ background: 'conic-gradient(from -90deg, hsl(var(--primary)) 0deg 360deg)' }}>
            <div className="absolute inset-1.5 rounded-full bg-card grid place-items-center">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</div>
                <div className={cn('text-5xl font-black', colorClass)}>{levelUp.newLevel}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold">Έγινες <span className={colorClass}>{levelUp.newTitle}</span>!</div>
            <div className="text-sm text-muted-foreground mt-1">
              Ανέβηκες από Level {levelUp.oldLevel} → {levelUp.newLevel}
            </div>
          </div>

          {/* Perks */}
          <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-left space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400" /> Ξεκλείδωσες
            </div>
            {perks.map((p, i) => (
              <div key={i} className="text-xs flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>{p}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground">
            Χρειάζεσαι {xpForNext} XP για το επόμενο level
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={dismissLevelUp}>
              Συνέχισε
            </Button>
            <Button className="flex-1 gap-1.5" onClick={() => { dismissLevelUp(); navigate('/leaderboard'); }}>
              Δες leaderboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
