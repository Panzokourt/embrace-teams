import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ReportsData } from '@/hooks/useReportsData';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { differenceInDays, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { formatters } from '@/utils/exportUtils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const PAGE_SIZE = 15;

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  in_review: '#a855f7',
  done: '#22c55e',
  blocked: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Προς υλοποίηση',
  in_progress: 'Σε εξέλιξη',
  in_review: 'Σε έλεγχο',
  done: 'Ολοκληρωμένα',
  blocked: 'Μπλοκαρισμένα',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Κρίσιμη',
  high: 'Υψηλή',
  medium: 'Μεσαία',
  low: 'Χαμηλή',
};

interface Props {
  data: ReportsData;
}

export function ReportsTasks({ data }: Props) {
  const today = new Date();

  const stats = useMemo(() => {
    const total = data.tasks.length;
    const inProgress = data.tasks.filter(t => t.status === 'in_progress').length;
    const done = data.tasks.filter(t => t.status === 'done').length;
    const overdue = data.tasks.filter(t =>
      t.due_date && t.status !== 'done' && isBefore(parseISO(t.due_date), today)
    ).length;
    return { total, inProgress, done, overdue };
  }, [data.tasks]);

  const criticalTasks = useMemo(() => {
    return data.tasks
      .filter(t => t.due_date && t.status !== 'done')
      .map(t => {
        const dueDate = parseISO(t.due_date);
        const daysLeft = differenceInDays(dueDate, today);
        let urgency: 'overdue' | 'critical' | 'soon';
        if (isBefore(dueDate, today)) urgency = 'overdue';
        else if (daysLeft <= 3) urgency = 'critical';
        else if (daysLeft <= 7) urgency = 'soon';
        else return null;
        const project = data.projects.find(p => p.id === t.project_id);
        const assignee = data.profiles.find(p => p.id === t.assigned_to);
        return { ...t, daysLeft, urgency, projectName: project?.name || '-', assigneeName: assignee?.full_name || '-' };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
  }, [data.tasks, data.projects, data.profiles]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || '#94a3b8',
    }));
  }, [data.tasks]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.tasks.forEach(t => { const p = t.priority || 'medium'; counts[p] = (counts[p] || 0) + 1; });
    return ['critical', 'high', 'medium', 'low']
      .filter(p => counts[p])
      .map(p => ({ name: PRIORITY_LABELS[p], value: counts[p], fill: PRIORITY_COLORS[p] }));
  }, [data.tasks]);

  const urgencyBadge = (urgency: string) => {
    if (urgency === 'overdue') return <Badge variant="destructive">Εκπρόθεσμο</Badge>;
    if (urgency === 'critical') return <Badge className="bg-orange-500 text-white">Κρίσιμο</Badge>;
    return <Badge variant="secondary">Σύντομα</Badge>;
  };

  // Pagination for critical tasks
  const pagination = usePagination(PAGE_SIZE);
  const totalCritical = criticalTasks.length;
  if (pagination.totalCount !== totalCritical) pagination.setTotalCount(totalCritical);
  const pagedCritical = criticalTasks.slice(pagination.from, pagination.to + 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ListTodo className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Σύνολο</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">Σε εξέλιξη</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.done}</p>
                <p className="text-sm text-muted-foreground">Ολοκληρωμένα</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-sm text-muted-foreground">Εκπρόθεσμα</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Deadlines */}
      {criticalTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Κρίσιμες Προθεσμίες
              <span className="text-sm font-normal text-muted-foreground ml-1">({totalCritical})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Εργασία</TableHead>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Ανατεθειμένο σε</TableHead>
                  <TableHead>Προθεσμία</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCritical.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.projectName}</TableCell>
                    <TableCell>{t.assigneeName}</TableCell>
                    <TableCell>{formatters.date(t.due_date)}</TableCell>
                    <TableCell>{urgencyBadge(t.urgency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4">
              <PaginationControls pagination={pagination} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Κατανομή ανά Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Κατανομή ανά Προτεραιότητα</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Εργασίες" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
