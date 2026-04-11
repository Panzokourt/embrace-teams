import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ClientPLSummaryProps {
  invoices: Array<{ amount: number; paid: boolean }>;
  totalBudget: number;
}

export function ClientPLSummary({ invoices, totalBudget }: ClientPLSummaryProps) {
  const stats = useMemo(() => {
    const revenue = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const collected = invoices.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0);
    const outstanding = revenue - collected;
    const margin = totalBudget > 0 ? Math.round(((totalBudget - revenue) / totalBudget) * 100) : 0;
    const collectionRate = revenue > 0 ? Math.round((collected / revenue) * 100) : 0;
    return { revenue, collected, outstanding, margin, collectionRate };
  }, [invoices, totalBudget]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          P&L Πελάτη
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Τιμολογημένα</p>
            <p className="text-sm font-semibold">€{stats.revenue.toLocaleString('el-GR')}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Εισπραγμένα</p>
            <p className="text-sm font-semibold text-success">€{stats.collected.toLocaleString('el-GR')}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Ανεξόφλητα</p>
            <p className={cn('text-sm font-semibold', stats.outstanding > 0 ? 'text-warning' : 'text-muted-foreground')}>
              €{stats.outstanding.toLocaleString('el-GR')}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Budget Margin</p>
            <div className="flex items-center gap-1">
              {stats.margin >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <p className={cn('text-sm font-semibold', stats.margin >= 0 ? 'text-success' : 'text-destructive')}>{stats.margin}%</p>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Είσπραξη</span>
            <span>{stats.collectionRate}%</span>
          </div>
          <Progress value={stats.collectionRate} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
