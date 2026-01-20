import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Loader2, 
  Download, 
  TrendingUp, 
  Users, 
  FolderKanban,
  DollarSign,
  Calendar
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { el } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  budget: number;
  agency_fee_percentage: number;
  status: string;
  client_id: string | null;
  client?: { name: string } | null;
}

interface Invoice {
  id: string;
  amount: number;
  paid: boolean;
  issued_date: string;
  project_id: string;
  client_id: string | null;
}

interface Expense {
  id: string;
  amount: number;
  expense_date: string;
  category: string | null;
  project_id: string;
}

interface Task {
  id: string;
  status: string;
  assigned_to: string | null;
  project_id: string;
}

interface Client {
  id: string;
  name: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function ReportsPage() {
  const { isAdmin, isManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [period, setPeriod] = useState('6');

  const canView = isAdmin || isManager;

  useEffect(() => {
    if (canView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [canView]);

  const fetchData = async () => {
    try {
      const [projectsRes, invoicesRes, expensesRes, tasksRes, clientsRes] = await Promise.all([
        supabase.from('projects').select('*, client:clients(name)'),
        supabase.from('invoices').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('tasks').select('id, status, assigned_to, project_id'),
        supabase.from('clients').select('id, name'),
      ]);

      setProjects(projectsRes.data || []);
      setInvoices(invoicesRes.data || []);
      setExpenses(expensesRes.data || []);
      setTasks(tasksRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalRevenue = invoices.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Revenue by client
  const revenueByClient = clients.map(client => {
    const clientInvoices = invoices.filter(i => i.client_id === client.id && i.paid);
    const revenue = clientInvoices.reduce((sum, i) => sum + i.amount, 0);
    return { name: client.name, value: revenue };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  // Expenses by category
  const expensesByCategory = expenses.reduce((acc, e) => {
    const category = e.category || 'Άλλο';
    acc[category] = (acc[category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const expensePieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  // Monthly revenue trend
  const months = parseInt(period);
  const monthsInterval = eachMonthOfInterval({
    start: subMonths(new Date(), months - 1),
    end: new Date(),
  });

  const monthlyTrend = monthsInterval.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthlyRevenue = invoices
      .filter(i => {
        const date = new Date(i.issued_date);
        return i.paid && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    const monthlyExpenses = expenses
      .filter(e => {
        const date = new Date(e.expense_date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      name: format(month, 'MMM yy', { locale: el }),
      revenue: monthlyRevenue,
      expenses: monthlyExpenses,
      profit: monthlyRevenue - monthlyExpenses,
    };
  });

  // Project status breakdown
  const projectStatusData = [
    { name: 'Ενεργά', value: projects.filter(p => p.status === 'active').length, color: 'hsl(var(--chart-1))' },
    { name: 'Ολοκληρωμένα', value: projects.filter(p => p.status === 'completed').length, color: 'hsl(var(--chart-2))' },
    { name: 'Διαγωνισμός', value: projects.filter(p => p.status === 'tender').length, color: 'hsl(var(--chart-3))' },
    { name: 'Ακυρωμένα', value: projects.filter(p => p.status === 'cancelled').length, color: 'hsl(var(--chart-4))' },
  ].filter(s => s.value > 0);

  // Task status breakdown
  const taskStatusData = [
    { name: 'Todo', value: tasks.filter(t => t.status === 'todo').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length },
    { name: 'Review', value: tasks.filter(t => t.status === 'review').length },
    { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length },
  ];

  // Project P&L
  const projectPL = projects.slice(0, 10).map(project => {
    const projectInvoices = invoices.filter(i => i.project_id === project.id && i.paid);
    const projectExpenses = expenses.filter(e => e.project_id === project.id);
    const revenue = projectInvoices.reduce((sum, i) => sum + i.amount, 0);
    const cost = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const fee = project.budget * (project.agency_fee_percentage / 100);

    return {
      name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
      revenue,
      expenses: cost,
      profit: revenue - cost,
      fee,
    };
  });

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Μήνας', 'Έσοδα', 'Έξοδα', 'Κέρδος'];
    const rows = monthlyTrend.map(m => [m.name, m.revenue, m.expenses, m.profit]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Η αναφορά εξήχθη σε CSV!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Δεν έχετε πρόσβαση σε αυτή τη σελίδα</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Αναφορές & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Επισκόπηση απόδοσης και στατιστικά
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 μήνες</SelectItem>
              <SelectItem value="6">6 μήνες</SelectItem>
              <SelectItem value="12">12 μήνες</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έσοδα</p>
                <p className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Συνολικά Έξοδα</p>
                <p className="text-2xl font-bold">€{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Καθαρό Κέρδος</p>
                <p className="text-2xl font-bold">€{netProfit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold">{profitMargin}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList>
          <TabsTrigger value="financial">Οικονομικά</TabsTrigger>
          <TabsTrigger value="projects">Έργα</TabsTrigger>
          <TabsTrigger value="clients">Πελάτες</TabsTrigger>
        </TabsList>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Μηνιαία Πορεία</CardTitle>
                <CardDescription>Έσοδα vs Έξοδα ανά μήνα</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => `€${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Έσοδα"
                        stroke="hsl(var(--chart-1))" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        name="Έξοδα"
                        stroke="hsl(var(--chart-2))" 
                        fillOpacity={1} 
                        fill="url(#colorExpenses)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Έξοδα ανά Κατηγορία</CardTitle>
                <CardDescription>Κατανομή εξόδων</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `€${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Κερδοφορία ανά Μήνα</CardTitle>
              <CardDescription>Καθαρό κέρδος (Έσοδα - Έξοδα)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => `€${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="profit" 
                      name="Κέρδος"
                      fill="hsl(var(--chart-1))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Project Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Κατάσταση Έργων</CardTitle>
                <CardDescription>Σύνολο: {projects.length} έργα</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Κατάσταση Tasks</CardTitle>
                <CardDescription>Σύνολο: {tasks.length} tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                      <Tooltip />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(var(--chart-1))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project P&L */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">P&L ανά Έργο</CardTitle>
              <CardDescription>Τα 10 πρώτα έργα</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectPL} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={150} />
                    <Tooltip 
                      formatter={(value: number) => `€${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Έσοδα" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="expenses" name="Έξοδα" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="profit" name="Κέρδος" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Έσοδα ανά Πελάτη</CardTitle>
              <CardDescription>Top πελάτες βάσει εσόδων</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByClient.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={150} />
                    <Tooltip 
                      formatter={(value: number) => `€${value.toLocaleString()}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Έσοδα"
                      fill="hsl(var(--chart-1))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Client Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Λίστα Πελατών</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {revenueByClient.map((client, index) => (
                  <div 
                    key={client.name}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{client.name}</span>
                    </div>
                    <Badge variant="secondary">€{client.value.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
