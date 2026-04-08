import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface ProjectPLReportProps {
  projectId: string;
  projectBudget: number;
  agencyFeePercentage: number;
}

export function ProjectPLReport({ projectId, projectBudget, agencyFeePercentage }: ProjectPLReportProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [inv, exp] = await Promise.all([
        supabase.from('invoices').select('amount, paid').eq('project_id', projectId),
        supabase.from('expenses').select('amount, category').eq('project_id', projectId),
      ]);
      setInvoices(inv.data || []);
      setExpenses(exp.data || []);
      setLoading(false);
    }
    load();
  }, [projectId]);

  const pl = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid = invoices.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0);
    const totalUnpaid = totalInvoiced - totalPaid;
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
      const cat = e.category || 'Χωρίς κατηγορία';
      acc[cat] = (acc[cat] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
    const grossProfit = totalPaid - totalExpenses;
    const agencyFee = (projectBudget * agencyFeePercentage) / 100;
    const profitMargin = totalPaid > 0 ? (grossProfit / totalPaid) * 100 : 0;
    return { totalInvoiced, totalPaid, totalUnpaid, totalExpenses, expensesByCategory, grossProfit, agencyFee, profitMargin };
  }, [invoices, expenses, projectBudget, agencyFeePercentage]);

  const fmt = (v: number) => `€${v.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">P&L Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue */}
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Έσοδα</h4>
          <div className="grid grid-cols-2 gap-1.5 pl-3 text-sm">
            <span className="text-muted-foreground">Τιμολογημένα</span>
            <span className="text-right font-medium">{fmt(pl.totalInvoiced)}</span>
            <span className="text-muted-foreground">Εισπραχθέντα</span>
            <span className="text-right font-medium text-success">{fmt(pl.totalPaid)}</span>
            <span className="text-muted-foreground">Εκκρεμούν</span>
            <span className="text-right font-medium text-warning">{fmt(pl.totalUnpaid)}</span>
          </div>
        </div>

        <Separator />

        {/* Expenses by category */}
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Έξοδα</h4>
          <div className="grid grid-cols-2 gap-1.5 pl-3 text-sm">
          {Object.entries(pl.expensesByCategory).map(([cat, amount]) => (
              <div key={cat} className="contents">
                <span className="text-muted-foreground">{cat}</span>
                <span className="text-right font-medium text-destructive">-{fmt(amount as number)}</span>
              </div>
            ))}
            <span className="font-semibold border-t border-border pt-2">Σύνολο Εξόδων</span>
            <span className="text-right font-bold text-destructive border-t border-border pt-2">-{fmt(pl.totalExpenses)}</span>
          </div>
        </div>

        {/* Expense category breakdown bars */}
        {Object.keys(pl.expensesByCategory).length > 0 && (
          <div className="space-y-3 pt-2">
            {Object.entries(pl.expensesByCategory)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([category, amount]) => {
                const amt = amount as number;
                const pct = pl.totalExpenses > 0 ? (amt / pl.totalExpenses) * 100 : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{category}</span>
                      <span className="text-muted-foreground">{fmt(amt)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
          </div>
        )}

        <Separator />

        {/* Profit */}
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Κέρδος/Ζημία</h4>
          <div className="grid grid-cols-2 gap-1.5 pl-3 text-sm">
            <span className="text-muted-foreground">Μικτό Κέρδος</span>
            <span className={`text-right font-medium ${pl.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(pl.grossProfit)}</span>
            {agencyFeePercentage > 0 && (
              <>
                <span className="text-muted-foreground">Agency Fee ({agencyFeePercentage}%)</span>
                <span className="text-right font-medium">{fmt(pl.agencyFee)}</span>
              </>
            )}
            <span className="font-semibold border-t border-border pt-2">Profit Margin</span>
            <span className="text-right font-bold border-t border-border pt-2">{pl.profitMargin.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
