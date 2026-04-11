import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ReportsData } from '@/hooks/useReportsData';

interface Props { data: ReportsData; }

export function ReportsCrossClient({ data }: Props) {
  const clientStats = useMemo(() => {
    return data.clients.map(c => {
      const clientProjects = data.projects.filter(p => p.client_id === c.id);
      const projIds = new Set(clientProjects.map(p => p.id));
      
      const revenue = data.invoices
        .filter(i => i.client_id === c.id && i.status === 'paid')
        .reduce((s: number, i: any) => s + (i.amount || 0), 0);
      
      const expenses = data.expenses
        .filter((e: any) => projIds.has(e.project_id))
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      
      const hours = data.timeEntries
        .filter((te: any) => projIds.has(te.project_id))
        .reduce((s: number, te: any) => s + (te.hours || 0), 0);
      
      const tasks = data.tasks.filter(t => projIds.has(t.project_id)).length;
      const profit = revenue - expenses;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      
      return { ...c, revenue, expenses, profit, margin, hours: Math.round(hours), tasks, projectCount: clientProjects.length };
    }).filter(c => c.revenue > 0 || c.tasks > 0 || c.hours > 0).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  const chartData = clientStats.slice(0, 10).map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    revenue: c.revenue,
    expenses: c.expenses,
  }));

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Έσοδα vs Έξοδα ανά Πελάτη</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('el-GR')}€`} />
                <Bar dataKey="revenue" name="Έσοδα" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Έξοδα" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Σύγκριση Πελατών</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientStats.map(c => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.name}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{c.projectCount} έργα</span>
                    <span>{c.hours}h</span>
                    <span className={c.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}>{c.margin}% margin</span>
                    <span className="font-medium text-foreground">{c.revenue.toLocaleString('el-GR')}€</span>
                  </div>
                </div>
                <Progress value={clientStats[0]?.revenue ? (c.revenue / clientStats[0].revenue) * 100 : 0} className="h-1.5" />
              </div>
            ))}
            {clientStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν δεδομένα</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
