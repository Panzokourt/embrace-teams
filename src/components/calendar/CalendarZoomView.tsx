import { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarYearView } from './CalendarYearView';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';
import { cn } from '@/lib/utils';
import { format, startOfWeek } from 'date-fns';
import { el } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ZoomLevel = 'year' | 'month' | 'week' | 'day';

interface Props {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  onCreateEvent?: (date: Date, hour?: number, minutes?: number) => void;
}

export function CalendarZoomView({ events, onEventClick, onEventContextMenu, onCreateEvent }: Props) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [animClass, setAnimClass] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const animateTransition = useCallback((direction: 'in' | 'out', callback: () => void) => {
    setAnimClass(direction === 'in' ? 'calendar-zoom-exit' : 'calendar-zoom-exit');
    setTimeout(() => {
      callback();
      setAnimClass(direction === 'in' ? 'calendar-zoom-enter' : 'calendar-zoom-enter');
      setTimeout(() => setAnimClass(''), 300);
    }, 150);
  }, []);

  const zoomIn = useCallback((targetDate: Date, newLevel: ZoomLevel) => {
    animateTransition('in', () => {
      setCurrentDate(targetDate);
      setZoomLevel(newLevel);
    });
  }, [animateTransition]);

  const zoomOut = useCallback((newLevel: ZoomLevel) => {
    animateTransition('out', () => {
      setZoomLevel(newLevel);
    });
  }, [animateTransition]);

  // Navigate prev/next
  const navigate = useCallback((direction: 1 | -1) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      switch (zoomLevel) {
        case 'year': d.setFullYear(d.getFullYear() + direction); break;
        case 'month': d.setMonth(d.getMonth() + direction); break;
        case 'week': d.setDate(d.getDate() + 7 * direction); break;
        case 'day': d.setDate(d.getDate() + direction); break;
      }
      return d;
    });
  }, [zoomLevel]);

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Breadcrumb label
  const getLabel = () => {
    switch (zoomLevel) {
      case 'year': return format(currentDate, 'yyyy');
      case 'month': return format(currentDate, 'LLLL yyyy', { locale: el });
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        return `Εβδομάδα ${format(ws, 'd MMM', { locale: el })} - ${format(new Date(ws.getTime() + 6 * 86400000), 'd MMM yyyy', { locale: el })}`;
      }
      case 'day': return format(currentDate, 'EEEE d MMMM yyyy', { locale: el });
    }
  };

  // Breadcrumb navigation
  const breadcrumbs = () => {
    const items: { label: string; onClick?: () => void }[] = [];
    if (zoomLevel !== 'year') {
      items.push({ label: format(currentDate, 'yyyy'), onClick: () => zoomOut('year') });
    }
    if (zoomLevel === 'week' || zoomLevel === 'day') {
      items.push({
        label: format(currentDate, 'LLLL', { locale: el }),
        onClick: () => zoomOut('month'),
      });
    }
    if (zoomLevel === 'day') {
      items.push({
        label: `Εβδ. ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: el })}`,
        onClick: () => zoomOut('week'),
      });
    }
    return items;
  };

  // Keyboard / wheel zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        const levels: ZoomLevel[] = ['year', 'month', 'week', 'day'];
        const idx = levels.indexOf(zoomLevel);
        if (idx < levels.length - 1) zoomIn(currentDate, levels[idx + 1]);
      }
      if (e.key === '-') {
        const levels: ZoomLevel[] = ['year', 'month', 'week', 'day'];
        const idx = levels.indexOf(zoomLevel);
        if (idx > 0) zoomOut(levels[idx - 1]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomLevel, currentDate, zoomIn, zoomOut]);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm">
            {breadcrumbs().map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                <button
                  onClick={bc.onClick}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {bc.label}
                </button>
                <span className="text-muted-foreground/40">/</span>
              </span>
            ))}
            <span className="font-semibold text-foreground">{getLabel()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>
            Σήμερα
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Zoom level buttons */}
          <div className="ml-3 flex items-center bg-muted/50 rounded-lg p-0.5">
            {(['year', 'month', 'week', 'day'] as ZoomLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => {
                  const levels: ZoomLevel[] = ['year', 'month', 'week', 'day'];
                  const curIdx = levels.indexOf(zoomLevel);
                  const newIdx = levels.indexOf(level);
                  if (newIdx > curIdx) zoomIn(currentDate, level);
                  else if (newIdx < curIdx) zoomOut(level);
                }}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-150',
                  zoomLevel === level
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {{ year: 'Έτος', month: 'Μήνας', week: 'Εβδομάδα', day: 'Ημέρα' }[level]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar content */}
      <div className={cn('flex-1 overflow-hidden', animClass)}>
        {zoomLevel === 'year' && (
          <CalendarYearView
            year={currentDate.getFullYear()}
            events={events}
            onMonthClick={(month) => zoomIn(month, 'month')}
          />
        )}
        {zoomLevel === 'month' && (
          <CalendarMonthView
            date={currentDate}
            events={events}
            onDayClick={(day) => zoomIn(day, 'day')}
            onEventClick={onEventClick}
            onEventContextMenu={onEventContextMenu}
            onEmptyDoubleClick={(day) => onCreateEvent?.(day)}
          />
        )}
        {zoomLevel === 'week' && (
          <CalendarWeekView
            date={currentDate}
            events={events}
            onTimeSlotClick={(day, hour) => onCreateEvent?.(day, hour)}
            onEventClick={onEventClick}
            onEventContextMenu={onEventContextMenu}
          />
        )}
        {zoomLevel === 'day' && (
          <CalendarDayView
            date={currentDate}
            events={events}
            onTimeSlotClick={(hour, min) => onCreateEvent?.(currentDate, hour, min)}
            onEventClick={onEventClick}
            onEventContextMenu={onEventContextMenu}
          />
        )}
      </div>
    </div>
  );
}
