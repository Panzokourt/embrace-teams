import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface MonthData {
  month: string;
  revenue: number;
}

export default function RevenueChart() {
  const [data, setData] = useState<MonthData[]>([]);

  useEffect(() => {
    const monthNames = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαϊ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
    const year = new Date().getFullYear();
    const startOfYear = `${year}-01-01`;

    supabase
      .from('invoices')
      .select('amount, issued_date')
      .gte('issued_date', startOfYear)
      .then(({ data: invoices }) => {
        if (!invoices) return;

        const monthly = Array.from({ length: 12 }, (_, i) => ({
          month: monthNames[i],
          revenue: 0,
        }));

        invoices.forEach(inv => {
          const m = new Date(inv.issued_date).getMonth();
          monthly[m].revenue += Number(inv.amount) || 0;
        });

        setData(monthly);
      });
  }, []);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-primary" />
        </span>
        Γράφημα Εσόδων {new Date().getFullYear()}
      </h3>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => [`€${value.toLocaleString()}`, 'Έσοδα']}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
