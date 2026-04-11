import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subMonths, format, parseISO, startOfMonth } from 'date-fns';
import { el } from 'date-fns/locale';
import type { ReportsData } from '@/hooks/useReportsData';

interface Props { data: ReportsData; }

export function ReportsForecasting({ data }: Props) {
  const chartData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; expenses: number; projected: number }> = {};
    
    // Past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      months[key] = { month: format(d, 'MMM yy', { locale: el }), revenue: 0, expenses: 0, projected: 0 };
    }

    // Future 3 months (projection)
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const key = format(d, 'yyyy-MM');
      months[key] = { month: format(d, 'MMM yy', { locale: el }), revenue: 0, expenses: 0, projected: 0 };
    }

    // Fill actuals
    data.invoices.filter(i => i.status === 'paid' && i.issued_date).forEach((inv: any) => {
      const key = format(parseISO(inv.issued_date), 'yyyy-MM');
      if (months[key]) months[key].revenue += inv.amount || 0;
    });

    data.expenses.filter(e => e.expense_date).forEach((exp: any) => {
      const key = format(parseISO(exp.expense_date), 'yyyy-MM');
      if (months[key]) months[key].expenses += exp.amount || 0;
    });

    // Simple projection: average of last 3 months
    const pastEntries = Object.entries(months).filter(([k]) => k <= format(new Date(), 'yyyy-MM'));
    const last3 = pastEntries.slice(-3);
    const avgRevenue = last3.reduce((s, [, v]) => s + v.revenue, 0) / Math.max(last3.length, 1);
    const avgExpenses = last3.reduce((s, [, v]) => s + v.expenses, 0) / Math.max(last3.length, 1);

    // Fill projections for future months
    Object.entries(months).forEach(([key, val]) => {
      if (key > format(new Date(), 'yyyy-MM')) {
        val.projected = Math.round(avgRevenue);
        val.expenses = Math.round(avgExpenses);
      }
    });

    return Object.values(months);
  }, [data]);

  const totals = useMemo(() => {
    const rev = data.invoices.filter(i => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const exp = data.expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const pending = data.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s: number, i: any) => s + (i.amount || 0), 0);
    return { rev, exp, pending, profit: rev - exp };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Εισπραχθέντα</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{totals.rev.toLocaleString('el-GR')}€</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Έξοδα</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{totals.exp.toLocaleString('el-GR')}€</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Εκκρεμή</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{totals.pending.toLocaleString('el-GR')}€</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Κέρδος</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{totals.profit.toLocaleString('el-GR')}€</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Πρόβλεψη Εσόδων & Εξόδων (6 μήνες + 3 projected)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(v: number) => `${v.toLocaleString('el-GR')}€`} />
              <Legend />
              <Bar dataKey="revenue" name="Έσοδα" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected" name="Projected" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Έξοδα" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
