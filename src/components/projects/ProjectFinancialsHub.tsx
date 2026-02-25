import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProjectFinancialsManager } from '@/components/projects/ProjectFinancialsManager';
import { ProjectPLReport } from '@/components/projects/ProjectPLReport';
import { DollarSign, Receipt, BarChart3, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';

interface ProjectFinancialsHubProps {
  projectId: string;
  clientId?: string | null;
  projectBudget: number;
  agencyFeePercentage: number;
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

function BudgetOverview({
  projectId,
  projectBudget,
  agencyFeePercentage,
}: {
  projectId: string;
  projectBudget: number;
  agencyFeePercentage: number;
}) {
  const [kpi, setKpi] = useState<KPIData>({
    totalInvoiced: 0,
    totalPaid: 0,
    pendingInvoices: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

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

  const agencyFee = (projectBudget * agencyFeePercentage) / 100;
  const netBudget = projectBudget - agencyFee;
  const budgetUsedPct = projectBudget > 0 ? Math.min(100, Math.round((kpi.totalInvoiced / projectBudget) * 100)) : 0;
  const paidPct = kpi.totalInvoiced > 0 ? Math.min(100, Math.round((kpi.totalPaid / kpi.totalInvoiced) * 100)) : 0;
  const profitMargin = kpi.totalPaid > 0 ? ((kpi.totalPaid - kpi.totalExpenses) / kpi.totalPaid) * 100 : 0;

  const fmt = (n: number) => `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) return null;

  return (
    <div className="space-y-6 py-2">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatKPI
          label="Συνολικό Budget"
          value={fmt(projectBudget)}
          sub={agencyFeePercentage > 0 ? `Fee: ${agencyFeePercentage}%` : undefined}
          icon={DollarSign}
          iconClass="bg-muted text-foreground"
        />
        <StatKPI
          label="Agency Fee"
          value={fmt(agencyFee)}
          sub={agencyFeePercentage > 0 ? `${agencyFeePercentage}% επί budget` : '–'}
          icon={Target}
          iconClass="bg-muted text-muted-foreground"
        />
        <StatKPI
          label="Net Budget"
          value={fmt(netBudget)}
          sub="Χωρίς fee"
          icon={Wallet}
          iconClass="bg-success/10 text-success"
        />
        <StatKPI
          label="Εκκρεμή Τιμολόγια"
          value={fmt(kpi.pendingInvoices)}
          sub={`${fmt(kpi.totalInvoiced)} συνολικά`}
          icon={Receipt}
          iconClass="bg-warning/10 text-warning"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatKPI
          label="Εισπράχθηκε"
          value={fmt(kpi.totalPaid)}
          sub={`${paidPct}% εισπράχθηκε`}
          icon={TrendingUp}
          iconClass="bg-success/10 text-success"
        />
        <StatKPI
          label="Συνολικά Έξοδα"
          value={fmt(kpi.totalExpenses)}
          icon={TrendingDown}
          iconClass="bg-destructive/10 text-destructive"
        />
        <StatKPI
          label="Καθαρό Κέρδος"
          value={fmt(kpi.totalPaid - kpi.totalExpenses)}
          sub={`Περιθώριο: ${profitMargin.toFixed(1)}%`}
          icon={BarChart3}
          iconClass="bg-muted text-foreground"
        />
        <StatKPI
          label="Budget Αξιοποίηση"
          value={`${budgetUsedPct}%`}
          sub={`${fmt(kpi.totalInvoiced)} / ${fmt(projectBudget)}`}
          icon={DollarSign}
          iconClass="bg-muted text-muted-foreground"
        />
      </div>

      {/* Progress bars */}
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
    </div>
  );
}

export function ProjectFinancialsHub({
  projectId,
  clientId,
  projectBudget,
  agencyFeePercentage,
}: ProjectFinancialsHubProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Budget Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Τιμολόγια & Έξοδα
          </TabsTrigger>
          <TabsTrigger value="pl" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            P&L Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BudgetOverview
            projectId={projectId}
            projectBudget={projectBudget}
            agencyFeePercentage={agencyFeePercentage}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <ProjectFinancialsManager projectId={projectId} clientId={clientId} />
        </TabsContent>

        <TabsContent value="pl">
          <ProjectPLReport
            projectId={projectId}
            projectBudget={projectBudget}
            agencyFeePercentage={agencyFeePercentage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
