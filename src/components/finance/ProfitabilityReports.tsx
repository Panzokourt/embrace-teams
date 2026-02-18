import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { el } from 'date-fns/locale';

export default function ProfitabilityReports() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [view, setView] = useState<'client' | 'project' | 'monthly'>('client');
  const [period, setPeriod] = useState('12');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [inv, exp, proj, cli] = await Promise.all([
      supabase.from('invoices').select('*, client:clients(name), project:projects(name, client_id)'),
      supabase.from('expenses').select('*, project:projects(name, client_id)'),
      supabase.from('projects').select('id, name, budget, agency_fee_percentage, client_id, client:clients(name)'),
      supabase.from('clients').select('id, name'),
    ]);
    setInvoices(inv.data || []);
    setExpenses(exp.data || []);
    setProjects(proj.data || []);
    setClients(cli.data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Client P&L
  const clientPL = clients.map(c => {
    const rev = invoices.filter(i => i.client_id === c.id && i.paid).reduce((s, i) => s + Number(i.amount), 0);
    const cost = expenses.filter(e => e.project?.client_id === c.id || e.client_id === c.id).reduce((s, e) => s + Number(e.amount), 0);
    const profit = rev - cost;
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';
    const outstanding = invoices.filter(i => i.client_id === c.id && !i.paid).reduce((s, i) => s + Number(i.amount), 0);
    return { id: c.id, name: c.name, revenue: rev, expenses: cost, profit, margin, outstanding };
  }).filter(c => c.revenue > 0 || c.expenses > 0).sort((a, b) => b.revenue - a.revenue);

  // Project P&L
  const projectPL = projects.map(p => {
    const rev = invoices.filter(i => i.project_id === p.id && i.paid).reduce((s, i) => s + Number(i.amount), 0);
    const cost = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
    const profit = rev - cost;
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0';
    return { id: p.id, name: p.name, client: p.client?.name || '—', revenue: rev, expenses: cost, profit, margin, budget: Number(p.budget) || 0 };
  }).filter(p => p.revenue > 0 || p.expenses > 0).sort((a, b) => b.revenue - a.revenue);

  // Monthly P&L
  const months = parseInt(period);
  const monthsInterval = eachMonthOfInterval({ start: subMonths(new Date(), months - 1), end: new Date() });
  const monthlyPL = monthsInterval.map(month => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);
    const rev = invoices.filter(i => { const d = new Date(i.issued_date); return i.paid && d >= ms && d <= me; })
      .reduce((s, i) => s + Number(i.amount), 0);
    const cost = expenses.filter(e => { const d = new Date(e.expense_date); return d >= ms && d <= me; })
      .reduce((s, e) => s + Number(e.amount), 0);
    return { name: format(month, 'MMM yy', { locale: el }), revenue: rev, expenses: cost, profit: rev - cost };
  });

  const handleExport = () => {
    const data = view === 'client' ? clientPL : view === 'project' ? projectPL : monthlyPL;
    const headers = view === 'monthly' ? 'Μήνας,Έσοδα,Έξοδα,Κέρδος' : 'Όνομα,Έσοδα,Έξοδα,Κέρδος,Margin%';
    const rows = data.map((d: any) => view === 'monthly'
      ? `${d.name},${d.revenue},${d.expenses},${d.profit}`
      : `${d.name},${d.revenue},${d.expenses},${d.profit},${d.margin}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pl-report-${view}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Εξαγωγή CSV!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="client">P&L ανά Πελάτη</SelectItem>
              <SelectItem value="project">P&L ανά Έργο</SelectItem>
              <SelectItem value="monthly">Μηνιαίο P&L</SelectItem>
            </SelectContent>
          </Select>
          {view === 'monthly' && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 μήνες</SelectItem>
                <SelectItem value="12">12 μήνες</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {/* Monthly Chart */}
      {view === 'monthly' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Μηνιαίο P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPL}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Έσοδα" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Έξοδα" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Κέρδος" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client P&L Table */}
      {view === 'client' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Πελάτης</TableHead>
                <TableHead className="text-right">Έσοδα</TableHead>
                <TableHead className="text-right">Έξοδα</TableHead>
                <TableHead className="text-right">Κέρδος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Ανείσπρακτα</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientPL.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right">€{c.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">€{c.expenses.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={c.profit >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                      €{c.profit.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={Number(c.margin) >= 20 ? 'default' : 'destructive'}>{c.margin}%</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.outstanding > 0 ? <span className="text-amber-500">€{c.outstanding.toLocaleString()}</span> : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {clientPL.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-8">Δεν υπάρχουν δεδομένα</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Project P&L Table */}
      {view === 'project' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Έργο</TableHead>
                <TableHead>Πελάτης</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Έσοδα</TableHead>
                <TableHead className="text-right">Έξοδα</TableHead>
                <TableHead className="text-right">Κέρδος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectPL.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.client}</TableCell>
                  <TableCell className="text-right">€{p.budget.toLocaleString()}</TableCell>
                  <TableCell className="text-right">€{p.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">€{p.expenses.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={p.profit >= 0 ? 'text-emerald-500' : 'text-destructive'}>€{p.profit.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={Number(p.margin) >= 20 ? 'default' : 'destructive'}>{p.margin}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {projectPL.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-8">Δεν υπάρχουν δεδομένα</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
