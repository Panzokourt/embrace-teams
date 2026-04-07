import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TaskDependencySelector } from './TaskDependencySelector';
import { Link2, AlertTriangle } from 'lucide-react';

interface TaskDependency {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task_title?: string;
  task_status?: string;
}

interface TaskDependenciesCardProps {
  taskId: string;
}

export function TaskDependenciesCard({ taskId }: TaskDependenciesCardProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [blocked, setBlocked] = useState(false);

  const fetchDependencies = useCallback(async () => {
    const { data } = await supabase
      .from('task_dependencies')
      .select('id, depends_on_task_id, dependency_type')
      .eq('task_id', taskId);

    if (data && data.length > 0) {
      const depIds = data.map(d => d.depends_on_task_id);
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status')
        .in('id', depIds);

      const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
      const enriched = data.map(d => ({
        ...d,
        task_title: taskMap.get(d.depends_on_task_id)?.title,
        task_status: taskMap.get(d.depends_on_task_id)?.status,
      }));
      setDependencies(enriched);
      setBlocked(enriched.some(d => d.task_status && d.task_status !== 'completed'));
    } else {
      setDependencies([]);
      setBlocked(false);
    }
  }, [taskId]);

  useEffect(() => { fetchDependencies(); }, [fetchDependencies]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Εξαρτήσεις
          </h4>
          {blocked && (
            <Badge variant="destructive" className="text-[9px] h-4 gap-0.5 px-1.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              Blocked
            </Badge>
          )}
        </div>

        {dependencies.length > 0 && (
          <div className="space-y-1">
            {dependencies.map(dep => (
              <div key={dep.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${dep.task_status === 'completed' ? 'bg-success' : 'bg-warning'}`} />
                <span className="flex-1 truncate">{dep.task_title || dep.depends_on_task_id}</span>
                <Badge variant="outline" className="text-[9px] px-1 h-4">
                  {dep.task_status === 'completed' ? '✓' : 'pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <TaskDependencySelector
          taskId={taskId}
          dependencies={dependencies}
          onUpdate={fetchDependencies}
        />
      </CardContent>
    </Card>
  );
}
