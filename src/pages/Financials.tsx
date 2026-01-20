import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Receipt,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Project {
  id: string;
  name: string;
  budget: number;
  agency_fee_percentage: number;
  client?: { name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  paid: boolean;
  project?: { name: string } | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string | null;
  project?: { name: string } | null;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function FinancialsPage() {
  const { isAdmin, isManager } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, invoicesRes, expensesRes] = await Promise.all([
        supabase.from('projects').select('*, client:clients(name)').eq('status', 'active'),
        supabase.from('invoices').select('*, project:projects(name)').order('issued_date', { ascending: false }),
        supabase.from('expenses').select('*, project:projects(name)').order('expense_date', { ascending: false }),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setProjects(projectsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget), 0);
  const totalAgencyFee = projects.reduce((sum, p) => sum + (Number(p.budget) * Number(p.agency_fee_percentage) / 100), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPending = totalInvoiced - totalPaid;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalInvoiced - totalExpenses;

  // Chart data
  const projectPLData = projects.map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    budget: Number(p.budget),
    fee: Number(p.budget) * Number(p.agency_fee_percentage) / 100,
  }));

  const expensesByCategory = expenses.reduce((acc, e) => {
    const category = e.category || 'Άλλο';
    acc[category] = (acc[category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <DollarSign className="h-8 w-8" />
          Οικονομικά & P&L
        </h1>
        <p className="text-muted-foreground mt-1">
          Επισκόπηση εσόδων, εξόδων και κερδοφορίας
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έσοδα</p>
                <p className="text-2xl font-bold">€{totalInvoiced.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έξοδα</p>
                <p className="text-2xl font-bold">€{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={netProfit >= 0 ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Καθαρό Κέρδος</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  €{netProfit.toLocaleString()}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {netProfit >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalPending > 0 ? 'border-warning/20 bg-warning/5' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Εκκρεμή Τιμολόγια</p>
                <p className="text-2xl font-bold">€{totalPending.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget ανά Έργο</CardTitle>
            <CardDescription>Προϋπολογισμός και agency fee</CardDescription>
          </CardHeader>
          <CardContent>
            {projectPLData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={projectPLData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="budget" fill="hsl(var(--chart-1))" name="Budget" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fee" fill="hsl(var(--chart-2))" name="Agency Fee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Δεν υπάρχουν δεδομένα
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Έξοδα ανά Κατηγορία</CardTitle>
            <CardDescription>Κατανομή εξόδων</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString()}`, 'Ποσό']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Δεν υπάρχουν έξοδα
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices & Expenses */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Τιμολόγια ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Έξοδα ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            P&L Έργων
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Αριθμός</TableHead>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Ποσό</TableHead>
                  <TableHead>Ημ/νία</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Δεν υπάρχουν τιμολόγια
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.project?.name || '-'}</TableCell>
                      <TableCell>€{Number(invoice.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.issued_date), 'd MMM yyyy', { locale: el })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.paid ? 'outline' : 'secondary'} 
                          className={invoice.paid ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                          {invoice.paid ? 'Πληρώθηκε' : 'Εκκρεμεί'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Περιγραφή</TableHead>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Κατηγορία</TableHead>
                  <TableHead>Ποσό</TableHead>
                  <TableHead>Ημ/νία</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Δεν υπάρχουν έξοδα
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map(expense => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.project?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category || 'Άλλο'}</Badge>
                      </TableCell>
                      <TableCell className="text-destructive">-€{Number(expense.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(expense.expense_date), 'd MMM yyyy', { locale: el })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Έργο</TableHead>
                  <TableHead>Πελάτης</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Agency Fee %</TableHead>
                  <TableHead>Agency Fee €</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Δεν υπάρχουν ενεργά έργα
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map(project => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.client?.name || '-'}</TableCell>
                      <TableCell>€{Number(project.budget).toLocaleString()}</TableCell>
                      <TableCell>{Number(project.agency_fee_percentage)}%</TableCell>
                      <TableCell className="text-success font-medium">
                        €{(Number(project.budget) * Number(project.agency_fee_percentage) / 100).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
