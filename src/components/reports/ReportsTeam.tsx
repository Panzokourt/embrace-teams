import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { ReportsData } from '@/hooks/useReportsData';

const COLORS = ['hsl(43, 96%, 56%)', 'hsl(37, 92%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 50%)', 'hsl(24, 5%, 44%)', 'hsl(200, 70%, 50%)'];

export function ReportsTeam({ data }: { data: ReportsData }) {
  // Per-member stats
  const memberStats = data.profiles.map(p => {
    const myTasks = data.tasks.filter(t => t.assigned_to === p.id);
    const done = myTasks.filter(t => t.status === 'done' || t.status === 'completed').length;
    const total = myTasks.length;
    const myTime = data.timeEntries.filter((te: any) => te.user_id === p.id);
    const totalMinutes = myTime.reduce((s: number, te: any) => s + (te.duration_minutes || 0), 0);

    return {
      id: p.id,
      name: p.full_name || p.email,
      jobTitle: p.job_title || '-',
      tasksDone: done,
      tasksTotal: total,
      completion: total > 0 ? Math.round((done / total) * 100) : 0,
      hours: Math.round(totalMinutes / 60 * 10) / 10,
    };
  }).filter(m => m.tasksTotal > 0 || m.hours > 0).sort((a, b) => b.tasksTotal - a.tasksTotal);

  // Task status distribution
  const taskStatusCounts: Record<string, number> = {};
  data.tasks.forEach(t => {
    const s = t.status || 'unknown';
    taskStatusCounts[s] = (taskStatusCounts[s] || 0) + 1;
  });
  const statusLabels: Record<string, string> = {
    todo: 'Εκκρεμή', in_progress: 'Σε εξέλιξη', done: 'Ολοκληρωμένα',
    completed: 'Ολοκληρωμένα', review: 'Αξιολόγηση', blocked: 'Μπλοκαρισμένα',
  };
  const taskPie = Object.entries(taskStatusCounts).map(([key, value]) => ({ name: statusLabels[key] || key, value }));

  // Workload chart (top 10 by tasks)
  const workloadChart = memberStats.slice(0, 10).map(m => ({
    name: (m.name || '').split(' ')[0]?.slice(0, 10) || 'N/A',
    'Ολοκληρωμένα': m.tasksDone,
    'Εκκρεμή': m.tasksTotal - m.tasksDone,
  }));

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Κατανομή Εργασιών</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskPie} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {taskPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Φόρτος Εργασίας ανά Μέλος</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="Ολοκληρωμένα" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Εκκρεμή" stackId="a" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Απόδοση Ομάδας</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Μέλος</TableHead>
                <TableHead>Ρόλος</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
                <TableHead>Ολοκλήρωση</TableHead>
                <TableHead className="text-right">Ώρες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberStats.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.jobTitle}</TableCell>
                  <TableCell className="text-right">{m.tasksDone}/{m.tasksTotal}</TableCell>
                  <TableCell className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={m.completion} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{m.completion}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{m.hours}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
