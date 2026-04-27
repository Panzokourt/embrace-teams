import { useXPNotifications } from '@/contexts/XPNotificationsContext';
import { cn } from '@/lib/utils';
import { Trophy, X } from 'lucide-react';

const TIER_STYLES: Record<string, string> = {
  bronze: 'from-amber-700/30 to-amber-900/30 border-amber-700/50 text-amber-100',
  silver: 'from-slate-300/30 to-slate-500/30 border-slate-300/50 text-slate-50',
  gold: 'from-amber-400/30 to-yellow-600/30 border-amber-400/60 text-amber-50 shadow-[0_0_24px_hsl(45_90%_55%/0.4)]',
  platinum: 'from-violet-400/30 to-fuchsia-500/30 border-violet-300/60 text-violet-50 shadow-[0_0_28px_hsl(280_80%_60%/0.5)]',
};

/**
 * Achievement unlocked toasts (top-right). Mounted once in AppLayout.
 */
export default function AchievementToastStack() {
  const { achievementUnlocks, dismissAchievement } = useXPNotifications();
  if (!achievementUnlocks.length) return null;

  return (
    <div className="fixed top-20 right-6 z-[70] flex flex-col gap-2 pointer-events-none max-w-sm">
      {achievementUnlocks.map((a) => (
        <div
          key={a.id}
          className={cn(
            'pointer-events-auto relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl px-4 py-3',
            'animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-500',
            TIER_STYLES[a.tier] || TIER_STYLES.bronze
          )}
        >
          <button
            onClick={() => dismissAchievement(a.id)}
            className="absolute top-2 right-2 rounded-full p-1 hover:bg-white/10 transition-colors"
            aria-label="Κλείσιμο"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0 animate-bounce">{a.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest opacity-70">
                <Trophy className="h-3 w-3" />
                Επίτευγμα {a.tier}
              </div>
              <div className="font-bold text-sm mt-0.5">{a.title}</div>
              <div className="text-xs opacity-80 mt-0.5">{a.description}</div>
              {a.xpReward > 0 && (
                <div className="text-[11px] font-bold mt-1.5 text-amber-300">
                  +{a.xpReward} XP bonus
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
