import { Timer } from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { cn } from '@/lib/utils';

interface ActiveTimerIndicatorProps {
  collapsed?: boolean;
}

export function ActiveTimerIndicator({ collapsed = false }: ActiveTimerIndicatorProps) {
  const { activeTimer, elapsed, formatElapsed } = useTimeTracking();

  if (!activeTimer?.is_running) return null;

  return (
    <div className={cn(
      "mx-3 mb-2 rounded-xl bg-muted border border-foreground/20 p-2.5 animate-fade-in",
      collapsed && "mx-2 p-2"
    )}>
      <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
        <Timer className="h-4 w-4 text-foreground animate-pulse" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {(activeTimer as any)?.task?.title || 'Timer'}
            </p>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatElapsed(elapsed)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
