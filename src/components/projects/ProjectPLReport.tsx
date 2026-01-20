import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Receipt, Wallet, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string | null;
}

interface Deliverable {
  id: string;
  name: string;
  budget: number | null;
  cost: number | null;
  completed: boolean;
}

interface ProjectPLReportProps {
  projectId: string;
  projectBudget: number;
  agencyFeePercentage: number;
}

export function ProjectPLReport({ projectId, projectBudget, agencyFeePercentage }: ProjectPLReportProps) {
  const { isAdmin, isManager } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [invoicesRes, expensesRes, deliverablesRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('project_id', projectId).order('issued_date', { ascending: false }),
        supabase.from('expenses').select('*').eq('project_id', projectId).order('expense_date', { ascending: false }),
        supabase.from('deliverables').select('*').eq('project_id', projectId),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (deliverablesRes.error) throw deliverablesRes.error;

      setInvoices(invoicesRes.data || []);
      setExpenses(expensesRes.data || []);
      setDeliverables(deliverablesRes.data || []);
    } catch (error) {
      console.error('Error fetching P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate P&L metrics
  const plMetrics = useMemo(() => {
    // Revenue
    const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
    const totalUnpaid = totalInvoiced - totalPaid;

    // Expenses by category
    const expensesByCategory = expenses.reduce((acc, e) => {
      const cat = e.category || 'Χωρίς κατηγορία';
      acc[cat] = (acc[cat] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Deliverables analysis
    const deliverableBudgetTotal = deliverables.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);
    const deliverableCostTotal = deliverables.reduce((sum, d) => sum + (Number(d.cost) || 0), 0);
    const deliverableBudgetVariance = deliverableBudgetTotal - deliverableCostTotal;

    // Agency Fee
    const agencyFee = (projectBudget * agencyFeePercentage) / 100;

    // Profit calculations
    const grossProfit = totalPaid - totalExpenses;
    const netProfit = grossProfit; // Could subtract agency fee if needed
    const profitMargin = totalPaid > 0 ? (grossProfit / totalPaid) * 100 : 0;

    // Budget analysis
    const budgetUsed = totalExpenses;
    const budgetRemaining = projectBudget - budgetUsed;
    const budgetUsedPercentage = projectBudget > 0 ? (budgetUsed / projectBudget) * 100 : 0;

    // Forecasting (simple)
    const estimatedFinalCost = totalExpenses; // Could be more sophisticated
    const projectedProfit = totalInvoiced - estimatedFinalCost;

    return {
      // Revenue
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      // Expenses
      totalExpenses,
      expensesByCategory,
      // Deliverables
      deliverableBudgetTotal,
      deliverableCostTotal,
      deliverableBudgetVariance,
      // Profit
      grossProfit,
      netProfit,
      profitMargin,
      agencyFee,
      // Budget
      budgetUsed,
      budgetRemaining,
      budgetUsedPercentage,
      // Forecast
      estimatedFinalCost,
      projectedProfit,
    };
  }, [invoices, expenses, deliverables, projectBudget, agencyFeePercentage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) => `€${value.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* P&L Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Έσοδα (Εισπραχθέντα)</p>
                <p className="text-xl font-bold text-success">{formatCurrency(plMetrics.totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έξοδα</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(plMetrics.totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-${plMetrics.grossProfit >= 0 ? 'success' : 'destructive'}/20`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${plMetrics.grossProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <Wallet className={`h-5 w-5 ${plMetrics.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Μικτό Κέρδος</p>
                <p className={`text-xl font-bold ${plMetrics.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(plMetrics.grossProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-xl font-bold">{plMetrics.profitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed P&L Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Σύνοψη P&L</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="deliverables">Ανά Παραδοτέο</TabsTrigger>
          <TabsTrigger value="expenses">Κατηγορίες Εξόδων</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Αναλυτικό P&L Statement</CardTitle>
              <CardDescription>Πλήρης ανάλυση εσόδων, εξόδων και κερδοφορίας</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Revenue Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Έσοδα</h4>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <span className="text-muted-foreground">Τιμολογημένα</span>
                    <span className="text-right font-medium">{formatCurrency(plMetrics.totalInvoiced)}</span>
                    <span className="text-muted-foreground">Εισπραχθέντα</span>
                    <span className="text-right font-medium text-success">{formatCurrency(plMetrics.totalPaid)}</span>
                    <span className="text-muted-foreground">Εκκρεμούν</span>
                    <span className="text-right font-medium text-warning">{formatCurrency(plMetrics.totalUnpaid)}</span>
                  </div>
                </div>

                <Separator />

                {/* Expenses Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Έξοδα</h4>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {Object.entries(plMetrics.expensesByCategory).map(([cat, amount]) => (
                      <div key={cat} className="contents">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="text-right font-medium text-destructive">-{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <span className="font-semibold border-t pt-2">Σύνολο Εξόδων</span>
                    <span className="text-right font-bold text-destructive border-t pt-2">-{formatCurrency(plMetrics.totalExpenses)}</span>
                  </div>
                </div>

                <Separator />

                {/* Profit Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Κέρδος/Ζημία</h4>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <span className="text-muted-foreground">Μικτό Κέρδος</span>
                    <span className={`text-right font-medium ${plMetrics.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(plMetrics.grossProfit)}
                    </span>
                    <span className="text-muted-foreground">Agency Fee ({agencyFeePercentage}%)</span>
                    <span className="text-right font-medium">{formatCurrency(plMetrics.agencyFee)}</span>
                    <span className="font-semibold border-t pt-2">Καθαρό Κέρδος</span>
                    <span className={`text-right font-bold border-t pt-2 ${plMetrics.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(plMetrics.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget vs Actual Tab */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget vs Actual</CardTitle>
              <CardDescription>Σύγκριση προϋπολογισμού με πραγματικά ποσά</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Budget Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Χρήση Budget</span>
                  <span className="font-medium">
                    {formatCurrency(plMetrics.budgetUsed)} / {formatCurrency(projectBudget)}
                    ({plMetrics.budgetUsedPercentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress 
                  value={Math.min(plMetrics.budgetUsedPercentage, 100)} 
                  className={`h-3 ${plMetrics.budgetUsedPercentage > 100 ? '[&>div]:bg-destructive' : ''}`}
                />
                <div className="flex justify-between text-sm">
                  <span className={plMetrics.budgetRemaining >= 0 ? 'text-success' : 'text-destructive'}>
                    {plMetrics.budgetRemaining >= 0 ? 'Υπόλοιπο:' : 'Υπέρβαση:'} {formatCurrency(Math.abs(plMetrics.budgetRemaining))}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Budget Breakdown Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Κατηγορία</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Διαφορά</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Συνολικό Budget</TableCell>
                    <TableCell className="text-right">{formatCurrency(projectBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(plMetrics.budgetUsed)}</TableCell>
                    <TableCell className={`text-right ${plMetrics.budgetRemaining >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(plMetrics.budgetRemaining)}
                    </TableCell>
                    <TableCell className="text-center">
                      {plMetrics.budgetRemaining >= 0 ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Over
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Παραδοτέα</TableCell>
                    <TableCell className="text-right">{formatCurrency(plMetrics.deliverableBudgetTotal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(plMetrics.deliverableCostTotal)}</TableCell>
                    <TableCell className={`text-right ${plMetrics.deliverableBudgetVariance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(plMetrics.deliverableBudgetVariance)}
                    </TableCell>
                    <TableCell className="text-center">
                      {plMetrics.deliverableBudgetVariance >= 0 ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">OK</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Over</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Deliverable Tab */}
        <TabsContent value="deliverables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ανάλυση ανά Παραδοτέο</CardTitle>
              <CardDescription>Budget και κόστος για κάθε παραδοτέο</CardDescription>
            </CardHeader>
            <CardContent>
              {deliverables.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν παραδοτέα</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Παραδοτέο</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliverables.map(d => {
                      const budget = Number(d.budget) || 0;
                      const cost = Number(d.cost) || 0;
                      const margin = budget - cost;
                      const marginPct = budget > 0 ? ((margin / budget) * 100).toFixed(1) : 'N/A';
                      
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-center">
                            {d.completed ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Ολοκληρώθηκε</Badge>
                            ) : (
                              <Badge variant="outline">Σε εξέλιξη</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(budget)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                          <TableCell className={`text-right font-medium ${margin >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(margin)} ({marginPct}%)
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Σύνολο</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(plMetrics.deliverableBudgetTotal)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(plMetrics.deliverableCostTotal)}</TableCell>
                      <TableCell className={`text-right font-bold ${plMetrics.deliverableBudgetVariance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(plMetrics.deliverableBudgetVariance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Categories Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Κατανομή Εξόδων</CardTitle>
              <CardDescription>Ανάλυση εξόδων ανά κατηγορία</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(plMetrics.expensesByCategory).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν έξοδα</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(plMetrics.expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => {
                      const percentage = plMetrics.totalExpenses > 0 
                        ? (amount / plMetrics.totalExpenses) * 100 
                        : 0;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{category}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between font-semibold">
                    <span>Σύνολο Εξόδων</span>
                    <span className="text-destructive">{formatCurrency(plMetrics.totalExpenses)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
