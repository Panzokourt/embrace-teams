import { useMemo, useState } from 'react';
import { format, differenceInDays, addDays, startOfDay, max, min } from 'date-fns';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS, type MediaActionStatus } from './mediaConstants';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface GanttItem {
  id: string;
  title: string | null;
  medium: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  budget: number | null;
}

interface MediaPlanGanttProps {
  items: GanttItem[];
  onSelectItem: (id: string) => void;
  selectedItemId: string | null;
}

type ZoomLevel = 'day' | 'week' | 'month';

export function MediaPlanGantt({ items, onSelectItem, selectedItemId }: MediaPlanGanttProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');

  const validItems = useMemo(() => items.filter(i => i.start_date), [items]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (validItems.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: today, timelineEnd: addDays(today, 30), totalDays: 30 };
    }
    const starts = validItems.map(i => new Date(i.start_date!));
    const ends = validItems.map(i => i.end_date ? new Date(i.end_date) : new Date(i.start_date!));
    const earliest = addDays(min(starts), -3);
    const latest = addDays(max(ends), 7);
    return {
      timelineStart: earliest,
      timelineEnd: latest,
      totalDays: Math.max(differenceInDays(latest, earliest), 7),
    };
  }, [validItems]);

  const dayWidth = zoom === 'day' ? 40 : zoom === 'week' ? 16 : 5;
  const timelineWidth = totalDays * dayWidth;

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers: { date: Date; label: string; isToday: boolean }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(timelineStart, i);
      const isT = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      if (zoom === 'day') {
        headers.push({ date: d, label: format(d, 'dd'), isToday: isT });
      } else if (zoom === 'week' && d.getDay() === 1) {
        headers.push({ date: d, label: format(d, 'dd/MM'), isToday: false });
      } else if (zoom === 'month' && d.getDate() === 1) {
        headers.push({ date: d, label: format(d, 'MMM'), isToday: false });
      }
    }
    return headers;
  }, [totalDays, timelineStart, zoom]);

  const todayOffset = differenceInDays(startOfDay(new Date()), timelineStart) * dayWidth;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setZoom('day')} className={zoom === 'day' ? 'bg-accent' : ''}>Day</Button>
        <Button variant="outline" size="sm" onClick={() => setZoom('week')} className={zoom === 'week' ? 'bg-accent' : ''}>Week</Button>
        <Button variant="outline" size="sm" onClick={() => setZoom('month')} className={zoom === 'month' ? 'bg-accent' : ''}>Month</Button>
      </div>

      <div className="border rounded-xl overflow-auto" style={{ maxHeight: '60vh' }}>
        <div className="flex">
          {/* Labels */}
          <div className="sticky left-0 z-20 bg-card border-r min-w-[200px]">
            <div className="h-8 border-b bg-muted/30 flex items-center px-3 text-xs font-medium text-muted-foreground">
              Action
            </div>
            {validItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  'h-10 border-b px-3 flex items-center text-xs cursor-pointer truncate transition-colors',
                  selectedItemId === item.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                )}
                onClick={() => onSelectItem(item.id)}
              >
                {item.title || item.medium}
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ minWidth: timelineWidth }} className="relative">
            {/* Header */}
            <div className="h-8 border-b bg-muted/30 flex items-end relative">
              {dateHeaders.map((h, i) => {
                const offset = differenceInDays(h.date, timelineStart) * dayWidth;
                return (
                  <div
                    key={i}
                    className={cn(
                      'absolute text-[10px] text-muted-foreground',
                      h.isToday && 'text-primary font-bold'
                    )}
                    style={{ left: offset, bottom: 2 }}
                  >
                    {h.label}
                  </div>
                );
              })}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= timelineWidth && (
              <div
                className="absolute top-8 bottom-0 w-px bg-primary/50 z-10"
                style={{ left: todayOffset }}
              />
            )}

            {/* Bars */}
            {validItems.map(item => {
              const start = differenceInDays(new Date(item.start_date!), timelineStart);
              const end = item.end_date
                ? differenceInDays(new Date(item.end_date), timelineStart)
                : start;
              const barLeft = start * dayWidth;
              const barWidth = Math.max((end - start + 1) * dayWidth, dayWidth);
              const statusColor = STATUS_COLORS[item.status as MediaActionStatus] || 'bg-primary/20';

              return (
                <div key={item.id} className="h-10 border-b relative flex items-center">
                  <div
                    className={cn(
                      'absolute h-6 rounded-md cursor-pointer transition-opacity hover:opacity-80',
                      statusColor
                    )}
                    style={{ left: barLeft, width: barWidth }}
                    onClick={() => onSelectItem(item.id)}
                    title={`${item.title || item.medium} (${item.start_date} → ${item.end_date || item.start_date})`}
                  >
                    <span className="text-[10px] font-medium px-1.5 truncate block leading-6">
                      {zoom !== 'month' && (item.title || item.medium)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {validItems.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No actions with dates to display. Add start dates to your actions.
        </p>
      )}
    </div>
  );
}
