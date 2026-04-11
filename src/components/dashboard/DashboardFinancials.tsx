import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialData {
  revenue: number;
  expenses: number;
  profit: number;
  unpaid: number;
}

export default function DashboardFinancials() {
  const [data, setData] = useState<FinancialData>({ revenue: 0, expenses: 0, profit: 0, unpaid: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [invRes, expRes] = await Promise.all([
        supabase.from('invoices').select('amount, paid'),
        supabase.from('expenses').select('amount'),
      ]);
      const invoices = invRes.data || [];
      const expenses = expRes.data || [];
      const revenue = invoices.reduce((s, i) => s + Number(i.amount), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const unpaid = invoices.filter(i => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
      setData({ revenue, expenses: totalExpenses, profit: revenue - totalExpenses, unpaid });
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) return null;

  const items = [
    { label: 'Έσοδα', value: data.revenue, icon: DollarSign, color: 'text-primary' },
    { label: 'Έξοδα', value: data.expenses, icon: Receipt, color: 'text-warning' },
    { label: 'Κέρδος', value: data.profit, icon: data.profit >= 0 ? TrendingUp : TrendingDown, color: data.profit >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Ανεξόφλητα', value: data.unpaid, icon: Receipt, color: data.unpaid > 0 ? 'text-warning' : 'text-muted-foreground' },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Οικονομική Επισκόπηση
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <item.icon className={cn('h-4 w-4 shrink-0', item.color)} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
                <p className="text-sm font-semibold">€{item.value.toLocaleString('el-GR')}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
