import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProjectFinancialsManager } from '@/components/projects/ProjectFinancialsManager';
import { ProjectPLReport } from '@/components/projects/ProjectPLReport';
import { ProjectFinancialStepper } from '@/components/projects/ProjectFinancialStepper';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Loader2, ChevronDown } from 'lucide-react';

interface ProjectFinancialsHubProps {
  projectId: string;
  clientId?: string | null;
  projectBudget: number;
  agencyFeePercentage: number;
  isInternal?: boolean;
}

interface KPIData {
  totalInvoiced: number;
  totalPaid: number;
  pendingInvoices: number;
  totalExpenses: number;
}

function StatKPI({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectFinancialsHub({
  projectId,
  clientId,
  projectBudget,
  agencyFeePercentage,
  isInternal,
}: ProjectFinancialsHubProps) {
  const [kpi, setKpi] = useState<KPIData>({
    totalInvoiced: 0,
    totalPaid: 0,
    pendingInvoices: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [plOpen, setPlOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [invoicesRes, expensesRes] = await Promise.all([
        supabase.from('invoices').select('amount, paid').eq('project_id', projectId),
        supabase.from('expenses').select('amount').eq('project_id', projectId),
      ]);

      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];

      setKpi({
        totalInvoiced: invoices.reduce((s, i) => s + i.amount, 0),
        totalPaid: invoices.filter(i => i.paid).reduce((s, i) => s + i.amount, 0),
        pendingInvoices: invoices.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0),
        totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      });
      setLoading(false);
    }
    load();
  }, [projectId]);

  const fmt = (n: number) => `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const profit = kpi.totalPaid - kpi.totalExpenses;
  const profitMargin = kpi.totalPaid > 0 ? ((profit / kpi.totalPaid) * 100) : 0;
  const budgetUsedPct = projectBudget > 0 ? Math.min(100, Math.round((kpi.totalInvoiced / projectBudget) * 100)) : 0;
  const paidPct = kpi.totalInvoiced > 0 ? Math.min(100, Math.round((kpi.totalPaid / kpi.totalInvoiced) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Financial Lifecycle Stepper */}
      <ProjectFinancialStepper projectId={projectId} isInternal={isInternal} />

      {/* 2. KPI Cards */}
      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatKPI
              label="Budget"
              value={fmt(projectBudget)}
              sub={agencyFeePercentage > 0 ? `Fee: ${agencyFeePercentage}%` : undefined}
              icon={DollarSign}
              iconClass="bg-muted text-foreground"
            />
            <StatKPI
              label="Έσοδα (Εισπραχθέντα)"
              value={fmt(kpi.totalPaid)}
              sub={kpi.pendingInvoices > 0 ? `Εκκρεμούν: ${fmt(kpi.pendingInvoices)}` : undefined}
              icon={TrendingUp}
              iconClass="bg-success/10 text-success"
            />
            <StatKPI
              label="Έξοδα"
              value={fmt(kpi.totalExpenses)}
              icon={TrendingDown}
              iconClass="bg-destructive/10 text-destructive"
            />
            <StatKPI
              label="Κέρδος"
              value={fmt(profit)}
              sub={`Margin: ${profitMargin.toFixed(1)}%`}
              icon={Wallet}
              iconClass={profit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
            />
          </div>

          {/* 3. Progress Bars */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget αξιοποίηση</span>
                <span className="font-medium">{budgetUsedPct}%</span>
              </div>
              <Progress value={budgetUsedPct} className="h-2.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Τιμολογήθηκε: {fmt(kpi.totalInvoiced)}</span>
                <span>Διαθέσιμο: {fmt(Math.max(0, projectBudget - kpi.totalInvoiced))}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Είσπραξη τιμολογίων</span>
                <span className="font-medium">{paidPct}%</span>
              </div>
              <Progress value={paidPct} className="h-2.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Εισπράχθηκε: {fmt(kpi.totalPaid)}</span>
                <span>Εκκρεμεί: {fmt(kpi.pendingInvoices)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <Separator />

      {/* 4. Invoices & Expenses CRUD */}
      <ProjectFinancialsManager projectId={projectId} clientId={clientId} />

      <Separator />

      {/* 5. P&L Statement (Collapsible) */}
      <Collapsible open={plOpen} onOpenChange={setPlOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${plOpen ? '' : '-rotate-90'}`} />
          <span className="font-semibold text-sm">Αναλυτικό P&L Statement</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-3">
            <ProjectPLReport
              projectId={projectId}
              projectBudget={projectBudget}
              agencyFeePercentage={agencyFeePercentage}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
