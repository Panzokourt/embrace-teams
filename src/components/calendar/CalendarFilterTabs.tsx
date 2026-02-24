import { cn } from '@/lib/utils';
import { CalendarDays, Megaphone, CheckSquare, FolderKanban, Radio, Archive } from 'lucide-react';

export type CalendarFilter = 'all' | 'campaigns' | 'tasks' | 'projects' | 'events' | 'backlog';

const TABS: { id: CalendarFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'Όλα', icon: CalendarDays },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'projects', label: 'Έργα', icon: FolderKanban },
  { id: 'events', label: 'PR & Events', icon: Radio },
  { id: 'backlog', label: 'Backlog', icon: Archive },
];

interface Props {
  active: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
}

export function CalendarFilterTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/30 rounded-xl p-1">
      {TABS.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150',
              active === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
