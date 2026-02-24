import { useMemo } from 'react';
import { format, startOfYear, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns';
import { el } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';

interface Props {
  year: number;
  events: CalendarEvent[];
  onMonthClick: (month: Date) => void;
}

const dayLabels = ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ'];

export function CalendarYearView({ year, events, onMonthClick }: Props) {
  const months = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    return Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  }, [year]);

  const eventsByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach(ev => {
      const key = format(new Date(ev.start_time), 'yyyy-MM');
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {months.map((month) => {
        const monthKey = format(month, 'yyyy-MM');
        const count = eventsByMonth[monthKey] || 0;
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        // Monday=0 offset
        const firstDayOffset = (getDay(monthStart) + 6) % 7;

        return (
          <button
            key={monthKey}
            onClick={() => onMonthClick(month)}
            className={cn(
              'group relative rounded-2xl border border-border/40 p-3 transition-all duration-200',
              'hover:border-border hover:shadow-soft hover:scale-[1.02] active:scale-[0.98]',
              'bg-card cursor-pointer text-left'
            )}
          >
            {/* Month label */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">
                {format(month, 'LLLL', { locale: el })}
              </span>
              {count > 0 && (
                <span className="text-[10px] font-medium bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>

            {/* Mini calendar grid */}
            <div className="grid grid-cols-7 gap-px text-[9px]">
              {dayLabels.map((d, i) => (
                <div key={i} className="text-center text-muted-foreground/50 font-medium pb-0.5">{d}</div>
              ))}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'text-center leading-[18px] rounded-sm',
                    isToday(day) && 'bg-primary text-primary-foreground font-bold',
                    !isSameMonth(day, month) && 'opacity-30'
                  )}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
