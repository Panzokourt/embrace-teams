import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { el } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarEventCard } from './CalendarEventCard';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 - 22:00

interface Props {
  date: Date;
  events: CalendarEvent[];
  onTimeSlotClick?: (day: Date, hour: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
}

export function CalendarWeekView({ date, events, onTimeSlotClick, onEventClick, onEventContextMenu }: Props) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const key = format(new Date(ev.start_time), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 sticky top-0 bg-background z-10">
        <div className="px-2 py-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'px-2 py-2 text-center border-l border-border/20',
              isToday(day) && 'bg-accent/50'
            )}
          >
            <div className="text-[10px] text-muted-foreground uppercase">
              {format(day, 'EEE', { locale: el })}
            </div>
            <div className={cn(
              'text-lg font-semibold mt-0.5',
              isToday(day) && 'text-foreground'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/10 min-h-[60px]">
            <div className="px-2 py-1 text-[10px] text-muted-foreground text-right pr-3 -mt-1.5">
              {String(hour).padStart(2, '0')}:00
            </div>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = (eventsByDay[key] || []).filter(ev => {
                const h = new Date(ev.start_time).getHours();
                return h === hour;
              });

              return (
                <div
                  key={`${key}-${hour}`}
                  className="border-l border-border/20 px-0.5 py-0.5 cursor-pointer hover:bg-accent/20 transition-colors"
                  onClick={() => onTimeSlotClick?.(day, hour)}
                >
                  {dayEvents.map((ev) => (
                    <CalendarEventCard
                      key={ev.id}
                      event={ev}
                      onClick={onEventClick}
                      onContextMenu={onEventContextMenu}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
