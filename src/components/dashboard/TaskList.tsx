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
        return <Circle className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  const overdueCount = tasks.filter(t => isPast(t.dueDate) && !isToday(t.dueDate) && t.status !== 'completed').length;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
          <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            📅
          </span>
          {title}
        </h3>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground/60">
              Δεν υπάρχουν επερχόμενα tasks
            </p>
          </div>
        ) : (
          tasks.map((task, index) => {
            const dateInfo = getDateLabel(task.dueDate);
            const isOverdue = isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'completed';

            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ease-apple",
                  "hover:bg-secondary/50 cursor-pointer",
                  isOverdue && "bg-destructive/[0.03] border border-destructive/10"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <span className="transition-transform duration-200 group-hover:scale-110">
                  {getStatusIcon(task.status)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-foreground/90 group-hover:text-foreground">
                    {task.title}
                  </p>
                  {showProject && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {task.project}
                    </p>
                  )}
                </div>
                <Badge 
                  variant={dateInfo.variant} 
                  className="text-[11px] font-medium shrink-0"
                >
                  {dateInfo.label}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
