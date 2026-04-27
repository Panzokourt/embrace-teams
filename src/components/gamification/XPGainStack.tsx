import { useXPNotifications } from '@/contexts/XPNotificationsContext';
import { Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatXPReason } from '@/hooks/useXPEngine';

/**
 * Floating stack of XP-gain toasts. Mounted once in AppLayout.
 * Position: bottom-right above the dock.
 */
export default function XPGainStack() {
  const { xpGains } = useXPNotifications();

  if (!xpGains.length) return null;

  return (
    <div className="fixed bottom-28 right-6 z-[70] pointer-events-none flex flex-col gap-2 items-end">
      {xpGains.map((g) => {
        const positive = g.points >= 0;
        return (
          <div
            key={g.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md shadow-lg',
              'animate-in slide-in-from-right-4 fade-in zoom-in-95 duration-300',
              positive
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-50'
                : 'bg-destructive/20 border-destructive/40 text-destructive-foreground'
            )}
            style={{ animation: 'xp-pop 2.6s ease-out forwards' }}
          >
            {positive ? (
              <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
            ) : (
              <Sparkles className="h-4 w-4 text-destructive" />
            )}
            <span className="font-bold text-sm tabular-nums">
              {positive ? '+' : ''}{g.points} XP
            </span>
            <span className="text-xs opacity-80">{formatXPReason(g.reason)}</span>
          </div>
        );
      })}
    </div>
  );
}
