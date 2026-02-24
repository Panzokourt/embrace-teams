import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { el } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarEventCard } from './CalendarEventCard';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 30 }, (_, i) => ({ hour: Math.floor(i / 2) + 8, half: i % 2 === 1 }));

interface Props {
  date: Date;
  events: CalendarEvent[];
  onTimeSlotClick?: (hour: number, minutes: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
}

export function CalendarDayView({ date, events, onTimeSlotClick, onEventClick, onEventContextMenu }: Props) {
  const dayEvents = useMemo(
    () => events.filter(ev => isSameDay(new Date(ev.start_time), date)),
    [events, date]
  );

  const allDayEvents = dayEvents.filter(ev => ev.all_day);
  const timedEvents = dayEvents.filter(ev => !ev.all_day);

  return (
    <div className="flex h-full overflow-auto">
      {/* Timeline */}
      <div className="flex-1">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-b border-border/40 p-2 space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Ολοήμερα</div>
            {allDayEvents.map(ev => (
              <CalendarEventCard
                key={ev.id}
                event={ev}
                onClick={onEventClick}
                onContextMenu={onEventContextMenu}
              />
            ))}
          </div>
        )}

        {/* Time slots */}
        <div>
          {HOURS.map(({ hour, half }) => {
            const slotEvents = timedEvents.filter(ev => {
              const d = new Date(ev.start_time);
              return d.getHours() === hour && (half ? d.getMinutes() >= 30 : d.getMinutes() < 30);
            });

            return (
              <div
                key={`${hour}-${half}`}
                className={cn(
                  'grid grid-cols-[60px_1fr] min-h-[40px] border-b',
                  half ? 'border-border/5' : 'border-border/15'
                )}
              >
                <div className="px-2 text-right pr-3 -mt-1.5">
                  {!half && (
                    <span className="text-[10px] text-muted-foreground">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  )}
                </div>
                <div
                  className="px-1 py-0.5 cursor-pointer hover:bg-accent/20 transition-colors"
                  onClick={() => onTimeSlotClick?.(hour, half ? 30 : 0)}
                >
                  {slotEvents.map(ev => (
                    <CalendarEventCard
                      key={ev.id}
                      event={ev}
                      onClick={onEventClick}
                      onContextMenu={onEventContextMenu}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
