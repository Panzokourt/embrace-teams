import { Timer, Square } from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { ActiveTimerPopover } from '@/components/time-tracking/ActiveTimerPopover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function DockActiveTimer() {
  const { activeTimer, elapsed, formatElapsed, stopTimer, fetchActiveTimer } = useTimeTracking();

  if (!activeTimer?.is_running) return null;

  return (
    <div className="flex items-center gap-1 pl-1">
      <ActiveTimerPopover
        activeTimer={activeTimer}
        elapsed={elapsed}
        formatElapsed={formatElapsed}
        onUpdated={fetchActiveTimer}
      >
        <button
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white transition-all"
          title="Λεπτομέρειες timer"
        >
          <Timer className="h-3.5 w-3.5 animate-pulse text-emerald-200" />
          <span className="text-[11px] font-mono font-bold">{formatElapsed(elapsed)}</span>
        </button>
      </ActiveTimerPopover>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); stopTimer(); }}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-red-500/40 backdrop-blur-sm flex items-center justify-center text-white transition-all"
            aria-label="Τερματισμός timer"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="text-xs">Τερματισμός Timer</TooltipContent>
      </Tooltip>
    </div>
  );
}
