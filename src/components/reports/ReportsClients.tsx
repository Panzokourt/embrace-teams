import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportsData } from '@/hooks/useReportsData';

export function ReportsClients({ data }: { data: ReportsData }) {
  const clientStats = data.clients.map(c => {
    const cProjects = data.projects.filter(p => p.client_id === c.id);
    const revenue = data.invoices.filter(i => i.client_id === c.id && i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
    const expenses = data.expenses.filter(e => {
      const proj = data.projects.find(p => p.id === e.project_id);
      return proj?.client_id === c.id;
    }).reduce((s, e) => s + (e.amount || 0), 0);
    const unpaid = data.invoices.filter(i => i.client_id === c.id && i.status !== 'paid').reduce((s, i) => s + (i.amount || 0), 0);

    return {
      id: c.id,
      name: c.name,
      projects: cProjects.length,
      revenue,
      expenses,
      profit: revenue - expenses,
      unpaid,
      margin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const chartData = clientStats.filter(c => c.revenue > 0).slice(0, 10).map(c => ({
    name: c.name?.slice(0, 15) || 'N/A',
    Έσοδα: c.revenue,
    Κέρδος: c.profit,
  }));

  return (
    <div className="space-y-6 print:space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Έσοδα & Κέρδος ανά Πελάτη</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={12} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `€${v.toLocaleString('el-GR')}`} />
                <Bar dataKey="Έσοδα" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Κέρδος" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Αναλυτικά ανά Πελάτη</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Πελάτης</TableHead>
                <TableHead className="text-right">Έργα</TableHead>
                <TableHead className="text-right">Έσοδα</TableHead>
                <TableHead className="text-right">Έξοδα</TableHead>
                <TableHead className="text-right">Κέρδος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Ανείσπρακτα</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientStats.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right">{c.projects}</TableCell>
                  <TableCell className="text-right">€{c.revenue.toLocaleString('el-GR')}</TableCell>
                  <TableCell className="text-right">€{c.expenses.toLocaleString('el-GR')}</TableCell>
                  <TableCell className={`text-right font-medium ${c.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    €{c.profit.toLocaleString('el-GR')}
                  </TableCell>
                  <TableCell className="text-right">{c.margin}%</TableCell>
                  <TableCell className="text-right text-warning">€{c.unpaid.toLocaleString('el-GR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
