import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ReportsData } from '@/hooks/useReportsData';

export function ReportsFinancial({ data }: { data: ReportsData }) {
  const totalRevenue = data.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;
  const unpaid = data.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.amount || 0), 0);

  // Revenue vs Expenses by month
  const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
  data.invoices.filter(i => i.status === 'paid').forEach(inv => {
    const key = inv.paid_date ? format(parseISO(inv.paid_date), 'yyyy-MM') : null;
    if (!key) return;
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0 };
    monthlyData[key].revenue += inv.amount || 0;
  });
  data.expenses.forEach(exp => {
    const key = format(parseISO(exp.expense_date), 'yyyy-MM');
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0 };
    monthlyData[key].expenses += exp.amount || 0;
  });
  const trendData = Object.entries(monthlyData).sort().map(([key, v]) => ({
    name: format(parseISO(key + '-01'), 'MMM yy', { locale: el }),
    Έσοδα: v.revenue,
    Έξοδα: v.expenses,
    Κέρδος: v.revenue - v.expenses,
  }));

  // Aging analysis
  const unpaidInvoices = data.invoices.filter(i => i.status !== 'paid');
  const aging = { current: 0, '30': 0, '60': 0, '90': 0 };
  unpaidInvoices.forEach(inv => {
    const days = inv.due_date ? differenceInDays(new Date(), parseISO(inv.due_date)) : 0;
    if (days <= 0) aging.current += inv.amount || 0;
    else if (days <= 30) aging['30'] += inv.amount || 0;
    else if (days <= 60) aging['60'] += inv.amount || 0;
    else aging['90'] += inv.amount || 0;
  });
  const agingData = [
    { name: 'Εμπρόθεσμα', value: aging.current },
    { name: '1-30 ημ.', value: aging['30'] },
    { name: '31-60 ημ.', value: aging['60'] },
    { name: '60+ ημ.', value: aging['90'] },
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Έσοδα', value: totalRevenue, color: 'text-success' },
          { label: 'Έξοδα', value: totalExpenses, color: 'text-destructive' },
          { label: 'Κέρδος', value: profit, color: profit >= 0 ? 'text-success' : 'text-destructive' },
          { label: 'Ανείσπρακτα', value: unpaid, color: 'text-warning' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-lg font-semibold ${k.color}`}>€{k.value.toLocaleString('el-GR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Τάσεις Εσόδων & Εξόδων</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString('el-GR')}`} />
                  <Legend />
                  <Area type="monotone" dataKey="Έσοδα" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="Έξοδα" stroke="hsl(0, 72%, 50%)" fill="hsl(0, 72%, 50%)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Aging Ανείσπρακτων</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString('el-GR')}`} />
                  <Bar dataKey="value" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Τελευταία Τιμολόγια</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Αριθμός</TableHead>
                <TableHead>Πελάτης</TableHead>
                <TableHead>Έργο</TableHead>
                <TableHead className="text-right">Ποσό</TableHead>
                <TableHead>Κατάσταση</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.slice(0, 10).map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.clients?.name || '-'}</TableCell>
                  <TableCell>{inv.projects?.name || '-'}</TableCell>
                  <TableCell className="text-right">€{(inv.amount || 0).toLocaleString('el-GR')}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>
                      {inv.status === 'paid' ? 'Πληρωμένο' : inv.status === 'overdue' ? 'Εκπρόθεσμο' : 'Ανοιχτό'}
                    </Badge>
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
