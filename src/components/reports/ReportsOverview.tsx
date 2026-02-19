import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, FolderKanban, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { ReportsData } from '@/hooks/useReportsData';

const COLORS = ['hsl(43, 96%, 56%)', 'hsl(37, 92%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 50%)', 'hsl(24, 5%, 44%)'];

export function ReportsOverview({ data }: { data: ReportsData }) {
  const totalRevenue = data.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const activeProjects = data.projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
  const completedTasks = data.tasks.filter(t => t.status === 'done' || t.status === 'completed').length;

  // Revenue by month
  const revenueByMonth: Record<string, number> = {};
  data.invoices.filter(i => i.status === 'paid').forEach(inv => {
    const key = inv.paid_date ? format(parseISO(inv.paid_date), 'MMM yy', { locale: el }) : 'N/A';
    revenueByMonth[key] = (revenueByMonth[key] || 0) + (inv.amount || 0);
  });
  const revenueChart = Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));

  // Project status pie
  const statusCounts: Record<string, number> = {};
  data.projects.forEach(p => {
    const s = p.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const statusLabels: Record<string, string> = {
    active: 'Ενεργά', in_progress: 'Σε εξέλιξη', completed: 'Ολοκληρωμένα',
    on_hold: 'Σε αναμονή', tender: 'Διαγωνισμοί', cancelled: 'Ακυρωμένα',
  };
  const statusPie = Object.entries(statusCounts).map(([key, value]) => ({ name: statusLabels[key] || key, value }));

  const kpis = [
    { label: 'Έσοδα', value: `€${totalRevenue.toLocaleString('el-GR')}`, icon: DollarSign, color: 'text-success' },
    { label: 'Έξοδα', value: `€${totalExpenses.toLocaleString('el-GR')}`, icon: TrendingUp, color: 'text-destructive' },
    { label: 'Ενεργά Έργα', value: activeProjects, icon: FolderKanban, color: 'text-primary' },
    { label: 'Tasks Done', value: completedTasks, icon: CheckSquare, color: 'text-success' },
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-semibold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Έσοδα ανά Μήνα</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString('el-GR')}`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Κατάσταση Έργων</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
