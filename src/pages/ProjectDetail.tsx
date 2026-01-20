import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectDeliverables } from '@/components/projects/ProjectDeliverables';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  FolderKanban,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Loader2,
  Package,
  CheckSquare,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ProjectStatus = 'tender' | 'active' | 'completed' | 'cancelled';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: ProjectStatus;
  budget: number;
  agency_fee_percentage: number;
  start_date: string | null;
  end_date: string | null;
  client?: { name: string } | null;
}

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  assignee?: { full_name: string | null } | null;
}

interface Deliverable {
  id: string;
  name: string;
  completed: boolean;
  budget: number | null;
  cost: number | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  paid: boolean;
  issued_date: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager, isClient } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewFinancials = isAdmin || isManager;

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;
    
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, client:clients(name)')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, assigned_to')
        .eq('project_id', id)
        .order('due_date', { ascending: true, nullsFirst: false });
      setTasks(tasksData || []);

      // Fetch deliverables
      const { data: deliverablesData } = await supabase
        .from('deliverables')
        .select('id, name, completed, budget, cost')
        .eq('project_id', id);
      setDeliverables(deliverablesData || []);

      // Fetch invoices (if can view financials)
      if (canViewFinancials || isClient) {
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('id, invoice_number, amount, paid, issued_date')
          .eq('project_id', id)
          .order('issued_date', { ascending: false });
        setInvoices(invoicesData || []);
      }

      // Fetch expenses (only for admin/manager)
      if (canViewFinancials) {
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('id, description, amount, category, expense_date')
          .eq('project_id', id)
          .order('expense_date', { ascending: false });
        setExpenses(expensesData || []);
      }

    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Σφάλμα κατά τη φόρτωση του έργου');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Το έργο δεν βρέθηκε</p>
        <Button variant="link" onClick={() => navigate('/projects')}>
          Επιστροφή στα έργα
        </Button>
      </div>
    );
  }

  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const completedDeliverables = deliverables.filter(d => d.completed).length;
  const deliverableProgress = deliverables.length > 0 ? Math.round((completedDeliverables / deliverables.length) * 100) : 0;
  
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const agencyFee = (project.budget * project.agency_fee_percentage) / 100;
  const netProfit = totalPaid - totalExpenses;

  const getStatusBadge = (status: ProjectStatus) => {
    const styles = {
      tender: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Διαγωνισμός' },
      active: { className: 'bg-success/10 text-success border-success/20', label: 'Ενεργό' },
      completed: { className: 'bg-primary/10 text-primary border-primary/20', label: 'Ολοκληρώθηκε' },
      cancelled: { className: 'bg-muted text-muted-foreground', label: 'Ακυρώθηκε' },
    };
    const style = styles[status];
    return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
  };

  const getTaskStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-primary" />;
      case 'review': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          {project.client && (
            <p className="text-muted-foreground mt-1">{project.client.name}</p>
          )}
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="text-xl font-bold">€{project.budget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Παραδοτέα</p>
                <p className="text-xl font-bold">{completedDeliverables}/{deliverables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <CheckSquare className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-xl font-bold">{completedTasks}/{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Λήξη</p>
                <p className="text-xl font-bold">
                  {project.end_date 
                    ? format(new Date(project.end_date), 'd MMM', { locale: el })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliverables">Παραδοτέα</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {(canViewFinancials || isClient) && (
            <TabsTrigger value="financials">Οικονομικά</TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Πρόοδος Έργου</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Παραδοτέα</span>
                    <span className="font-medium">{deliverableProgress}%</span>
                  </div>
                  <Progress value={deliverableProgress} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="font-medium">{taskProgress}%</span>
                  </div>
                  <Progress value={taskProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Χρονοδιάγραμμα</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Έναρξη</p>
                    <p className="font-medium">
                      {project.start_date 
                        ? format(new Date(project.start_date), 'd MMMM yyyy', { locale: el })
                        : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Λήξη</p>
                    <p className="font-medium">
                      {project.end_date 
                        ? format(new Date(project.end_date), 'd MMMM yyyy', { locale: el })
                        : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agency Fee</p>
                  <p className="font-medium">{project.agency_fee_percentage}% (€{agencyFee.toLocaleString()})</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Πρόσφατα Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Δεν υπάρχουν tasks</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      {getTaskStatusIcon(task.status)}
                      <span className={cn(
                        "flex-1",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(task.due_date), 'd MMM', { locale: el })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables">
          <Card>
            <CardHeader>
              <CardTitle>Παραδοτέα</CardTitle>
              <CardDescription>Διαχείριση παραδοτέων του έργου</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectDeliverables projectId={project.id} projectName={project.name} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>{tasks.length} tasks συνολικά</CardDescription>
              </div>
              <Button onClick={() => navigate('/tasks')}>
                Διαχείριση Tasks
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν tasks</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      {getTaskStatusIcon(task.status)}
                      <span className={cn(
                        "flex-1 font-medium",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <Badge variant="outline">
                          {format(new Date(task.due_date), 'd MMM yyyy', { locale: el })}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        {(canViewFinancials || isClient) && (
          <TabsContent value="financials" className="space-y-6">
            {/* Financial Summary (only for admin/manager) */}
            {canViewFinancials && (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Τιμολογημένα</p>
                    <p className="text-2xl font-bold">€{totalInvoiced.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Εισπραχθέντα</p>
                    <p className="text-2xl font-bold text-success">€{totalPaid.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Έξοδα</p>
                    <p className="text-2xl font-bold text-destructive">€{totalExpenses.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Καθαρό Κέρδος</p>
                    <div className="flex items-center gap-2">
                      <p className={cn("text-2xl font-bold", netProfit >= 0 ? "text-success" : "text-destructive")}>
                        €{netProfit.toLocaleString()}
                      </p>
                      {netProfit >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Τιμολόγια</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Δεν υπάρχουν τιμολόγια</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(invoice.issued_date), 'd MMM yyyy', { locale: el })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">€{invoice.amount.toLocaleString()}</p>
                          <Badge variant={invoice.paid ? "default" : "outline"} className={invoice.paid ? "bg-success" : ""}>
                            {invoice.paid ? 'Πληρωμένο' : 'Εκκρεμεί'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses (only for admin/manager) */}
            {canViewFinancials && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Έξοδα</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Δεν υπάρχουν έξοδα</p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex gap-2 text-sm text-muted-foreground">
                              <span>{expense.category || 'Χωρίς κατηγορία'}</span>
                              <span>•</span>
                              <span>{format(new Date(expense.expense_date), 'd MMM yyyy', { locale: el })}</span>
                            </div>
                          </div>
                          <p className="font-bold text-destructive">-€{expense.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
