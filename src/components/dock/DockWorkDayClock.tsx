import { useState, useEffect } from 'react';
import { Play, Square, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkDay, type WorkStatus } from '@/hooks/useWorkDay';
import { useAuth } from '@/contexts/AuthContext';
import WorkDayClockPopover from '@/components/topbar/WorkDayClockPopover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const statusConfig: Record<WorkStatus, { label: string; color: string }> = {
  online: { label: 'Ενεργός', color: 'text-emerald-300' },
  busy: { label: 'Απασχολημένος', color: 'text-red-300' },
  away: { label: 'Εκτός', color: 'text-yellow-300' },
  on_leave: { label: 'Σε Άδεια', color: 'text-blue-300' },
  offline: { label: 'Εκτός Σύνδεσης', color: 'text-white/60' },
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function DockWorkDayClockInner() {
  const {
    isClockedIn, clockIn, clockOut,
    elapsedSeconds, scheduledMinutes,
    isOvertime, isNearEnd,
    workStatus, setWorkStatus, loading,
    todayLog, schedule, fetchSchedule,
  } = useWorkDay();

  const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
  const todaySchedule = schedule.find(s => s.day_of_week === todayDow);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const timerColor = isOvertime ? 'text-red-200' : isNearEnd ? 'text-orange-200' : 'text-emerald-200';
  const currentStatus = statusConfig[workStatus];

  return (
    <div className="flex items-center gap-1 pl-1 pr-1">
      {/* Work Timer (when clocked in) */}
      {isClockedIn && (
        <WorkDayClockPopover
          todayLog={todayLog as any}
          todaySchedule={todaySchedule}
          elapsedSeconds={elapsedSeconds}
          scheduledMinutes={scheduledMinutes}
          isOvertime={isOvertime}
          isNearEnd={isNearEnd}
          isClockedIn={isClockedIn}
          clockOut={clockOut}
          refresh={fetchSchedule}
        >
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 font-mono text-[11px] font-semibold rounded-full px-2 py-1 transition-all',
              'bg-white/10 hover:bg-white/20 backdrop-blur-sm',
              timerColor,
              isOvertime && 'animate-pulse',
            )}
          >
            <Clock className="h-3 w-3" />
            <span>{formatTime(elapsedSeconds)}</span>
            {scheduledMinutes > 0 && (
              <span className="text-white/60 font-normal">/ {Math.floor(scheduledMinutes / 60)}ω</span>
            )}
          </button>
        </WorkDayClockPopover>
      )}

      {/* Start / End Day */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {!isClockedIn ? (
            <button
              onClick={clockIn}
              disabled={loading}
              className="h-8 px-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center gap-1 text-[11px] font-semibold text-white transition-all disabled:opacity-50"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Start</span>
            </button>
          ) : (
            <button
              onClick={clockOut}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-red-500/40 backdrop-blur-sm flex items-center justify-center text-white transition-all"
              aria-label="End workday"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="text-xs">
          {isClockedIn ? 'Τέλος ημέρας' : 'Έναρξη ημέρας'}
        </TooltipContent>
      </Tooltip>

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all"
            aria-label="Work status"
          >
            <Circle className={cn('h-2.5 w-2.5 fill-current', currentStatus.color)} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-44">
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

export default function DockWorkDayClock() {
  const { user } = useAuth();
  if (!user) return null;
  return <DockWorkDayClockInner />;
}
