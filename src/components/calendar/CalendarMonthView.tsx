import { useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
} from 'date-fns';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarEventCard } from './CalendarEventCard';
import { cn } from '@/lib/utils';

const dayLabels = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];

interface Props {
  date: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  onEmptyDoubleClick?: (day: Date) => void;
}

export function CalendarMonthView({ date, events, onDayClick, onEventClick, onEventContextMenu, onEmptyDoubleClick }: Props) {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
  }, [date]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const key = format(new Date(ev.start_time), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const numWeeks = weeks.length;

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/40">
        {dayLabels.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks - use explicit row count so grid fills the space evenly */}
      <div
        className="flex-1 grid"
        style={{ gridTemplateRows: `repeat(${numWeeks}, 1fr)` }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-b-0 min-h-0">
            {week.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[key] || [];
              const inMonth = isSameMonth(day, date);

              return (
                <div
                  key={key}
                  className={cn(
                    'relative border-r border-border/20 last:border-r-0 p-1.5 cursor-pointer transition-colors overflow-hidden rounded-lg',
                    'hover:bg-accent/20',
                    !inMonth && 'opacity-40 bg-muted/20'
                  )}
                  onClick={() => onDayClick(day)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEmptyDoubleClick?.(day);
                  }}
                >
                  <div className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5',
                    isToday(day) && 'bg-primary text-primary-foreground font-bold shadow-sm',
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        compact
                        onClick={onEventClick}
                        onContextMenu={onEventContextMenu}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground px-1">
                        +{dayEvents.length - 3} ακόμη
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
