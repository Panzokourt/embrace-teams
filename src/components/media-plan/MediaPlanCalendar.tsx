import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, type MediaActionStatus } from './mediaConstants';
import { cn } from '@/lib/utils';

interface CalendarItem {
  id: string;
  title: string | null;
  medium: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  budget: number | null;
}

interface MediaPlanCalendarProps {
  items: CalendarItem[];
  onSelectItem: (id: string) => void;
}

export function MediaPlanCalendar({ items, onSelectItem }: MediaPlanCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;

  const itemsInMonth = useMemo(() => {
    return items.filter(item => {
      if (!item.start_date) return false;
      const start = new Date(item.start_date);
      const end = item.end_date ? new Date(item.end_date) : start;
      return start <= monthEnd && end >= monthStart;
    });
  }, [items, monthStart, monthEnd]);

  const getItemsForDay = (day: Date) => {
    return itemsInMonth.filter(item => {
      if (!item.start_date) return false;
      const start = new Date(item.start_date);
      const end = item.end_date ? new Date(item.end_date) : start;
      return day >= start && day <= end;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-muted/50 text-center py-2 text-xs font-medium text-muted-foreground">{d}</div>
        ))}

        {Array.from({ length: paddingDays }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card min-h-[80px]" />
        ))}

        {days.map(day => {
          const dayItems = getItemsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'bg-card min-h-[80px] p-1 space-y-0.5',
                isToday(day) && 'ring-1 ring-primary/50'
              )}
            >
              <p className={cn(
                'text-xs tabular-nums px-1',
                isToday(day) ? 'font-bold text-primary' : 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </p>
              {dayItems.slice(0, 3).map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  className={cn(
                    'w-full text-left rounded px-1 py-0.5 text-[10px] truncate transition-colors hover:opacity-80',
                    STATUS_COLORS[item.status as MediaActionStatus] || 'bg-muted text-muted-foreground'
                  )}
                >
                  {item.title || item.medium}
                </button>
              ))}
              {dayItems.length > 3 && (
                <p className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
