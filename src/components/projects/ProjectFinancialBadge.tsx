import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectFinancialBadgeProps {
  projectId: string;
  budget: number | null;
}

export function ProjectFinancialBadge({ projectId, budget }: ProjectFinancialBadgeProps) {
  const [invoiced, setInvoiced] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      supabase.from('invoices').select('amount').eq('project_id', projectId),
      supabase.from('expenses').select('amount').eq('project_id', projectId),
    ]).then(([inv, exp]) => {
      setInvoiced((inv.data || []).reduce((s, i) => s + Number(i.amount), 0));
      setExpenses((exp.data || []).reduce((s, e) => s + Number(e.amount), 0));
      setLoaded(true);
    });
  }, [projectId]);

  if (!loaded || !budget) return null;

  const profit = invoiced - expenses;
  const margin = invoiced > 0 ? Math.round((profit / invoiced) * 100) : 0;
  const isPositive = profit >= 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {margin}%
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-0.5">
          <div>Τιμολογημένα: €{invoiced.toLocaleString('el-GR')}</div>
          <div>Έξοδα: €{expenses.toLocaleString('el-GR')}</div>
          <div className="font-semibold">Κέρδος: €{profit.toLocaleString('el-GR')} ({margin}%)</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
