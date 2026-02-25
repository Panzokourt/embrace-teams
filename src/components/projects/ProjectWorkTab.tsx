import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectDeliverablesTable } from '@/components/projects/ProjectDeliverablesTable';
import { ProjectGanttView } from '@/components/projects/ProjectGanttView';
import TasksPage from '@/pages/Tasks';
import { List, Columns3, GanttChartSquare, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectWorkTabProps {
  projectId: string;
  projectName: string;
}

type WorkView = 'list' | 'kanban' | 'gantt' | 'calendar';

const views: { id: WorkView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

export function ProjectWorkTab({ projectId, projectName }: ProjectWorkTabProps) {
  const [view, setView] = useState<WorkView>('list');

  return (
    <div className="space-y-4">
      {/* Sub-nav toggle buttons */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {views.map(v => (
          <Button
            key={v.id}
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs rounded-lg',
              view === v.id && 'bg-background shadow-sm text-foreground font-semibold'
            )}
            onClick={() => setView(v.id)}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {view === 'list' && (
        <ProjectDeliverablesTable projectId={projectId} projectName={projectName} />
      )}
      {view === 'kanban' && (
        <TasksPage embedded projectId={projectId} />
      )}
      {view === 'gantt' && (
        <ProjectGanttView projectId={projectId} />
      )}
      {view === 'calendar' && (
        <TasksPage embedded projectId={projectId} />
      )}
    </div>
  );
}
