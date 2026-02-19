import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportsData } from '@/hooks/useReportsData';

export function ReportsProjects({ data }: { data: ReportsData }) {
  // Budget vs Actual per project (top 10 by budget)
  const projectFinancials = data.projects
    .filter(p => p.budget && p.budget > 0)
    .map(p => {
      const projectExpenses = data.expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + (e.amount || 0), 0);
      const projectRevenue = data.invoices.filter(i => i.project_id === p.id && i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
      return { name: p.name?.slice(0, 20) || 'N/A', Budget: p.budget, Έσοδα: projectRevenue, Έξοδα: projectExpenses };
    })
    .sort((a, b) => b.Budget - a.Budget)
    .slice(0, 8);

  // Task completion stats per project
  const projectStats = data.projects.map(p => {
    const pTasks = data.tasks.filter(t => t.project_id === p.id);
    const done = pTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
    const total = pTasks.length;
    return {
      ...p,
      tasksDone: done,
      tasksTotal: total,
      completion: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const statusColors: Record<string, string> = {
    active: 'default', in_progress: 'default', completed: 'secondary',
    on_hold: 'outline', tender: 'outline', cancelled: 'destructive',
  };
  const statusLabels: Record<string, string> = {
    active: 'Ενεργό', in_progress: 'Σε εξέλιξη', completed: 'Ολοκληρωμένο',
    on_hold: 'Σε αναμονή', tender: 'Διαγωνισμός', cancelled: 'Ακυρωμένο',
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Budget vs Πραγματικά (Top Έργα)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectFinancials} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={12} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" fontSize={11} width={120} />
                <Tooltip formatter={(v: number) => `€${v.toLocaleString('el-GR')}`} />
                <Legend />
                <Bar dataKey="Budget" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Έσοδα" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Έξοδα" fill="hsl(0, 72%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Πρόοδος Έργων</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Έργο</TableHead>
                <TableHead>Πελάτης</TableHead>
                <TableHead>Κατάσταση</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Πρόοδος</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectStats.slice(0, 15).map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.clients?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[p.status] as any || 'outline'}>
                      {statusLabels[p.status] || p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.tasksDone}/{p.tasksTotal}</TableCell>
                  <TableCell className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={p.progress || p.completion} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{p.progress || p.completion}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
