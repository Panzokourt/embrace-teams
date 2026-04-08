import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Play, Square, Clock, Calendar, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkDay, type WorkStatus } from '@/hooks/useWorkDay';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<WorkStatus, { label: string; color: string }> = {
  online: { label: 'Ενεργός', color: 'text-emerald-500' },
  busy: { label: 'Απασχολημένος', color: 'text-red-500' },
  away: { label: 'Εκτός', color: 'text-yellow-500' },
  on_leave: { label: 'Σε Άδεια', color: 'text-blue-500' },
  offline: { label: 'Εκτός Σύνδεσης', color: 'text-muted-foreground' },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function WorkDayClockInner({ compact = false }: { compact?: boolean }) {
  const {
    isClockedIn, clockIn, clockOut,
    elapsedSeconds, scheduledMinutes,
    isOvertime, isNearEnd,
    workStatus, setWorkStatus, loading,
  } = useWorkDay();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });

  const timerColor = isOvertime ? 'text-red-500' : isNearEnd ? 'text-orange-500' : 'text-emerald-500';
  const currentStatus = statusConfig[workStatus];

  return (
    <div className="flex items-center gap-1.5 text-sm min-w-0 shrink-0">
      {/* Date & Time — hidden in compact */}
      {!compact && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="hidden lg:flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold text-foreground">{dateStr}</span>
              <span className="text-xs font-bold text-foreground">{timeStr}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent mode="single" selected={now} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      )}

      {!compact && <div className="hidden lg:block w-px h-4 bg-border shrink-0" />}

      {/* Work Timer */}
      {isClockedIn && (
        <>
          <div className={cn('flex items-center gap-1 font-mono text-xs font-semibold shrink-0', timerColor, isOvertime && 'animate-pulse')}>
            <Clock className="h-3 w-3" />
            <span>{formatTime(elapsedSeconds)}</span>
            {!compact && scheduledMinutes > 0 && (
              <span className="text-muted-foreground font-normal">/ {Math.floor(scheduledMinutes / 60)}ω</span>
            )}
          </div>
          <div className="w-px h-4 bg-border shrink-0" />
        </>
      )}

      {/* Start / End Day */}
      {!isClockedIn ? (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0 px-2" onClick={clockIn} disabled={loading}>
          <Play className="h-3 w-3" />
          {!compact && <span>Start</span>}
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0 px-2" onClick={clockOut}>
          <Square className="h-3 w-3" />
          {!compact && <span>End</span>}
        </Button>
      )}

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <Circle className={cn('h-2.5 w-2.5 fill-current shrink-0', currentStatus.color)} />
            {!compact && <span className="hidden md:inline truncate max-w-[80px]">{currentStatus.label}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {(Object.entries(statusConfig) as [WorkStatus, { label: string; color: string }][]).map(([key, cfg]) => (
            <DropdownMenuItem key={key} onClick={() => setWorkStatus(key)} className="gap-2 text-xs">
              <Circle className={cn('h-2.5 w-2.5 fill-current', cfg.color)} />
              {cfg.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function WorkDayClock({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;
  return <WorkDayClockInner compact={compact} />;
}
