import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import type { ReportsData } from '@/hooks/useReportsData';

interface Props { data: ReportsData; }

export function ReportsPerformance({ data }: Props) {
  const memberStats = useMemo(() => {
    return data.profiles.map(p => {
      const myTasks = data.tasks.filter(t => t.assigned_to === p.id);
      const completed = myTasks.filter(t => t.status === 'completed').length;
      const total = myTasks.length;
      const hours = data.timeEntries
        .filter((te: any) => te.user_id === p.id)
        .reduce((s: number, te: any) => s + (te.hours || 0), 0);
      const utilization = hours > 0 ? Math.min(100, Math.round((hours / (40 * 4)) * 100)) : 0;
      return { ...p, completed, total, hours: Math.round(hours), utilization, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }).filter(m => m.total > 0 || m.hours > 0).sort((a, b) => b.completed - a.completed);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Ολοκληρωμένες Εργασίες</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.tasks.filter(t => t.status === 'completed').length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Σύνολο Ωρών</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{Math.round(data.timeEntries.reduce((s: number, te: any) => s + (te.hours || 0), 0))}h</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Ενεργά Μέλη</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{memberStats.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Απόδοση ανά Μέλος</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberStats.map(m => (
              <div key={m.id} className="flex items-center gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px]">{(m.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{m.full_name}</p>
                    <span className="text-xs text-muted-foreground">{m.completed}/{m.total} tasks • {m.hours}h</span>
                  </div>
                  <Progress value={m.completionRate} className="h-1.5" />
                </div>
                <span className="text-xs font-medium w-12 text-right">{m.completionRate}%</span>
              </div>
            ))}
            {memberStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν δεδομένα</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
