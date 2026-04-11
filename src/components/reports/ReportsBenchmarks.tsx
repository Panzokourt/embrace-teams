import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ReportsData } from '@/hooks/useReportsData';

interface Props { data: ReportsData; }

const TARGETS = {
  utilization: 75,
  avgMargin: 30,
  onTimeDelivery: 85,
  taskCompletionRate: 80,
};

export function ReportsBenchmarks({ data }: Props) {
  const kpis = useMemo(() => {
    // Utilization: total hours / (profiles * 160h/month)
    const totalHours = data.timeEntries.reduce((s: number, te: any) => s + (te.hours || 0), 0);
    const activeProfiles = data.profiles.length || 1;
    const utilization = Math.min(100, Math.round((totalHours / (activeProfiles * 160)) * 100));

    // Average margin
    const revenue = data.invoices.filter(i => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const expenses = data.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const avgMargin = revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0;

    // On-time delivery
    const completedTasks = data.tasks.filter(t => t.status === 'completed');
    const onTime = completedTasks.filter(t => {
      if (!t.due_date || !t.completed_at) return true;
      return new Date(t.completed_at) <= new Date(t.due_date);
    }).length;
    const onTimeDelivery = completedTasks.length > 0 ? Math.round((onTime / completedTasks.length) * 100) : 0;

    // Task completion rate
    const totalTasks = data.tasks.length || 1;
    const taskCompletionRate = Math.round((completedTasks.length / totalTasks) * 100);

    return [
      { label: 'Utilization Rate', value: utilization, target: TARGETS.utilization, unit: '%' },
      { label: 'Μέσο Margin', value: avgMargin, target: TARGETS.avgMargin, unit: '%' },
      { label: 'On-time Delivery', value: onTimeDelivery, target: TARGETS.onTimeDelivery, unit: '%' },
      { label: 'Task Completion', value: taskCompletionRate, target: TARGETS.taskCompletionRate, unit: '%' },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {kpis.map(kpi => {
        const ratio = kpi.value / kpi.target;
        const color = ratio >= 1 ? 'text-emerald-600' : ratio >= 0.7 ? 'text-amber-600' : 'text-red-600';
        return (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-bold ${color}`}>{kpi.value}{kpi.unit}</span>
                <span className="text-sm text-muted-foreground">Στόχος: {kpi.target}{kpi.unit}</span>
              </div>
              <Progress value={Math.min(100, (kpi.value / kpi.target) * 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {ratio >= 1 ? '✓ Πάνω από στόχο' : ratio >= 0.7 ? '⚠ Κοντά στο στόχο' : '✗ Κάτω από στόχο'}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
