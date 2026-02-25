import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusCount { status: string; count: number; color: string }

const STATUS_META: Record<string, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'bg-muted-foreground/20' },
  in_progress: { label: 'In Progress', color: 'bg-primary/60' },
  review: { label: 'Review', color: 'bg-warning/60' },
  completed: { label: 'Completed', color: 'bg-success/60' },
};

export default function TasksByStatus() {
  const [data, setData] = useState<StatusCount[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    supabase.from('tasks').select('status').then(({ data: tasks }) => {
      if (!tasks) return;
      const map = new Map<string, number>();
      tasks.forEach(t => map.set(t.status, (map.get(t.status) || 0) + 1));
      const result = Object.entries(STATUS_META).map(([k, v]) => ({
        status: v.label,
        count: map.get(k) || 0,
        color: v.color,
      }));
      setData(result);
      setTotal(tasks.length);
    });
  }, []);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <CheckSquare className="h-4 w-4 text-foreground" />
        </span>
        Tasks ανά Status
      </h3>
      <div className="space-y-3">
        {data.map(d => (
          <div key={d.status} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/80">{d.status}</span>
              <span className="font-medium text-foreground">{d.count}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', d.color)}
                style={{ width: total ? `${(d.count / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
