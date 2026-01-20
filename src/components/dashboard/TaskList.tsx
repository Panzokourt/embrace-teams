import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  title: string;
  project: string;
  dueDate: Date;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
}

interface TaskListProps {
  tasks: Task[];
  title: string;
  showProject?: boolean;
}

export default function TaskList({ tasks, title, showProject = true }: TaskListProps) {
  const getDateLabel = (date: Date) => {
    if (isPast(date) && !isToday(date)) return { label: 'Overdue', variant: 'destructive' as const };
    if (isToday(date)) return { label: 'Σήμερα', variant: 'destructive' as const };
    if (isTomorrow(date)) return { label: 'Αύριο', variant: 'secondary' as const };
    return { label: format(date, 'd MMM', { locale: el }), variant: 'outline' as const };
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress':
      case 'review':
        return <Circle className="h-4 w-4 text-primary fill-primary/20" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const overdueCount = tasks.filter(t => isPast(t.dueDate) && !isToday(t.dueDate) && t.status !== 'completed').length;

  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">📅</span> {title}
        </h3>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Δεν υπάρχουν επερχόμενα tasks
          </p>
        ) : (
          tasks.map((task) => {
            const dateInfo = getDateLabel(task.dueDate);
            const isOverdue = isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'completed';

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50",
                  isOverdue && "bg-destructive/5 border border-destructive/20"
                )}
              >
                {getStatusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {showProject && (
                    <p className="text-xs text-muted-foreground truncate">{task.project}</p>
                  )}
                </div>
                <Badge variant={dateInfo.variant}>{dateInfo.label}</Badge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
