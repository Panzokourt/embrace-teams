import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [period, setPeriod] = useState('6');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inv, exp, cli] = await Promise.all([
        supabase.from('invoices').select('*, client:clients(name), project:projects(name)'),
        supabase.from('expenses').select('*, project:projects(name)'),
        supabase.from('clients').select('id, name'),
      ]);
      setInvoices(inv.data || []);
      setExpenses(exp.data || []);
      setClients(cli.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalRevenue = invoices.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalOutstanding = invoices.filter(i => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Monthly trend
  const months = parseInt(period);
  const monthsInterval = eachMonthOfInterval({
    start: subMonths(new Date(), months - 1),
    end: new Date(),
  });

  const monthlyTrend = monthsInterval.map(month => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    const rev = invoices.filter(i => { const d = new Date(i.issued_date); return i.paid && d >= ms && d <= me; })
      .reduce((s, i) => s + Number(i.amount), 0);
    const exp = expenses.filter(e => { const d = new Date(e.expense_date); return d >= ms && d <= me; })
      .reduce((s, e) => s + Number(e.amount), 0);
    return { name: format(month, 'MMM yy', { locale: el }), revenue: rev, expenses: exp, profit: rev - exp };
  });

  // Expenses by category
  const expCat = expenses.reduce((acc, e) => {
    const c = e.category || 'Άλλο';
    acc[c] = (acc[c] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(expCat).map(([name, value]) => ({ name, value }));

  // Aging analysis
  const unpaidInvoices = invoices.filter(i => !i.paid && i.due_date);
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  unpaidInvoices.forEach(inv => {
    const days = differenceInDays(new Date(), new Date(inv.due_date));
    if (days <= 30) aging['0-30'] += Number(inv.amount);
    else if (days <= 60) aging['31-60'] += Number(inv.amount);
    else if (days <= 90) aging['61-90'] += Number(inv.amount);
    else aging['90+'] += Number(inv.amount);
  });
  const agingData = Object.entries(aging).map(([name, value]) => ({ name, value }));

  // Top clients by revenue
  const clientRevenue = clients.map(c => {
    const rev = invoices.filter(i => i.client_id === c.id && i.paid).reduce((s, i) => s + Number(i.amount), 0);
    return { name: c.name, value: rev };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 μήνες</SelectItem>
            <SelectItem value="6">6 μήνες</SelectItem>
            <SelectItem value="12">12 μήνες</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Έσοδα</p>
                <p className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Έξοδα</p>
                <p className="text-2xl font-bold">€{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Καθαρό Κέρδος</p>
                <p className="text-2xl font-bold">€{netProfit.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Margin: {profitMargin}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ανείσπρακτα</p>
                <p className="text-2xl font-bold">€{totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Μηνιαία Πορεία</CardTitle>
            <CardDescription>Έσοδα vs Έξοδα</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="fd-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="fd-exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name="Έσοδα" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#fd-rev)" />
                  <Area type="monotone" dataKey="expenses" name="Έξοδα" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#fd-exp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Έξοδα ανά Κατηγορία</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aging Analysis</CardTitle>
            <CardDescription>Ανείσπρακτα ανά ηλικία</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="value" name="Ποσό" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Πελάτες</CardTitle>
            <CardDescription>Κατά έσοδα</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientRevenue.length === 0 && <p className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</p>}
              {clientRevenue.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm">{c.name}</span>
                  </div>
                  <span className="text-sm font-medium">€{c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
