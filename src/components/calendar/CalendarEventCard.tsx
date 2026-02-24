import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Video, MapPin, Phone, Calendar as CalIcon } from 'lucide-react';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  meeting: CalIcon,
  call: Phone,
  event: CalIcon,
  reminder: CalIcon,
  pr: CalIcon,
  campaign: CalIcon,
};

const defaultColors: Record<string, string> = {
  meeting: 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300',
  call: 'bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-300',
  event: 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300',
  reminder: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
  pr: 'bg-pink-500/15 border-pink-500/30 text-pink-700 dark:text-pink-300',
  campaign: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
};

interface Props {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (e: CalendarEvent) => void;
  onContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
}

export function CalendarEventCard({ event, compact, onClick, onContextMenu }: Props) {
  const Icon = typeIcons[event.event_type] || CalIcon;
  const colorClass = event.color
    ? ''
    : (defaultColors[event.event_type] || defaultColors.meeting);

  const customStyle = event.color
    ? { backgroundColor: `${event.color}20`, borderColor: `${event.color}50`, color: event.color }
    : {};

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(event)}
        onContextMenu={(e) => onContextMenu?.(e, event)}
        className={cn(
          'w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border truncate',
          colorClass
        )}
        style={customStyle}
      >
        {event.title}
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(event)}
      onContextMenu={(e) => onContextMenu?.(e, event)}
      className={cn(
        'w-full text-left px-2.5 py-1.5 rounded-lg border transition-all duration-150',
        'hover:shadow-sm active:scale-[0.98]',
        colorClass
      )}
      style={customStyle}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 opacity-70" />
        <span className="text-xs font-medium truncate">{event.title}</span>
      </div>
      {!event.all_day && (
        <div className="text-[10px] opacity-60 mt-0.5">
          {format(new Date(event.start_time), 'HH:mm')} – {format(new Date(event.end_time), 'HH:mm')}
        </div>
      )}
      {event.location && (
        <div className="flex items-center gap-1 text-[10px] opacity-50 mt-0.5">
          <MapPin className="h-2.5 w-2.5" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </button>
  );
}
