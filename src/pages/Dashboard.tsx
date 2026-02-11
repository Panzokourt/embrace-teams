import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';
import StatCard from '@/components/dashboard/StatCard';
import PipelineCard, { getDefaultPipelineStages } from '@/components/dashboard/PipelineCard';
import TaskList from '@/components/dashboard/TaskList';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  FileWarning,
  Trophy,
  FolderKanban,
  AlertTriangle,
  Activity,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  agencyFee: number;
  netProfit: number;
  pendingInvoices: number;
  activeTenders: number;
  activeProjects: number;
  winRate: number;
  overdueCount: number;
  utilization: number;
}

interface Task {
  id: string;
  title: string;
  project: string;
  dueDate: Date;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
}

export default function Dashboard() {
  const { profile, isAdmin, isManager, isClient } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    agencyFee: 0,
    netProfit: 0,
    pendingInvoices: 0,
    activeTenders: 0,
    activeProjects: 0,
    winRate: 0,
    overdueCount: 0,
    utilization: 0,
  });

  const [pipelineStages, setPipelineStages] = useState(getDefaultPipelineStages());
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [
        invoicesRes,
        expensesRes,
        projectsRes,
        tendersRes,
        tasksRes
      ] = await Promise.all([
        supabase.from('invoices').select('amount, paid'),
        supabase.from('expenses').select('amount'),
        supabase.from('projects').select('budget, agency_fee_percentage, status'),
        supabase.from('tenders').select('id, name, budget, stage, client:clients(name)'),
        supabase.from('tasks').select('id, title, due_date, status, project:projects(name)')
      ]);

      // Calculate financial stats
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const projects = projectsRes.data || [];
      const tenders = tendersRes.data || [];
      const tasks = tasksRes.data || [];

      const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
      const totalPaid = invoices.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
      const pendingInvoices = totalRevenue - totalPaid;
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Calculate agency fee from active projects
      const activeProjects = projects.filter(p => p.status === 'active');
      const agencyFee = activeProjects.reduce((sum, p) => 
        sum + (Number(p.budget || 0) * Number(p.agency_fee_percentage || 0) / 100), 0
      );

      // Calculate tender stats
      const activeTenders = tenders.filter(t => 
        !['won', 'lost'].includes(t.stage)
      ).length;

      const wonTenders = tenders.filter(t => t.stage === 'won').length;
      const lostTenders = tenders.filter(t => t.stage === 'lost').length;
      const completedTenders = wonTenders + lostTenders;
      const winRate = completedTenders > 0 ? Math.round((wonTenders / completedTenders) * 100) : 0;

      // Calculate overdue tasks
      const now = new Date();
      const overdueTasks = tasks.filter(t => 
        t.due_date && 
        new Date(t.due_date) < now && 
        t.status !== 'completed'
      );

      // Calculate utilization (active tasks / total capacity - simplified)
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const totalTasks = tasks.filter(t => t.status !== 'completed').length;
      const utilization = totalTasks > 0 ? Math.round((inProgressTasks / Math.max(totalTasks, 1)) * 100) : 0;

      setStats({
        totalRevenue,
        agencyFee,
        netProfit,
        pendingInvoices,
        activeTenders,
        activeProjects: activeProjects.length,
        winRate,
        overdueCount: overdueTasks.length,
        utilization: Math.min(utilization, 100),
      });

      // Build pipeline stages
      const stages = getDefaultPipelineStages();
      tenders.forEach(tender => {
        const stageIndex = stages.findIndex(s => s.id === tender.stage);
        if (stageIndex !== -1) {
          stages[stageIndex].items.push({
            id: tender.id,
            name: tender.name,
            client: tender.client?.name || 'Άγνωστος',
            budget: Number(tender.budget) || 0,
          });
        }
      });
      setPipelineStages(stages);

      // Build upcoming tasks
      const upcoming = tasks
        .filter(t => t.due_date && t.status !== 'completed')
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          title: t.title,
          project: t.project?.name || 'Άγνωστο έργο',
          dueDate: new Date(t.due_date!),
          status: t.status as Task['status'],
        }));
      setUpcomingTasks(upcoming);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  useDashboardRealtime(fetchDashboardData);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Client Dashboard
  if (isClient && !isAdmin && !isManager) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Καλωσήρθατε, {profile?.full_name?.split(' ')[0] || 'Client'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Παρακολουθήστε την πρόοδο των έργων σας
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Ενεργά Έργα"
            value={stats.activeProjects}
            icon={FolderKanban}
            variant="primary"
          />
          <StatCard
            title="Παραδοτέα σε Εξέλιξη"
            value={upcomingTasks.length}
            icon={Activity}
            variant="success"
          />
          <StatCard
            title="Εκκρεμή Τιμολόγια"
            value={`€${stats.pendingInvoices.toLocaleString()}`}
            icon={FileWarning}
            variant="warning"
          />
        </div>

        <TaskList 
          tasks={upcomingTasks} 
          title="Επερχόμενα Παραδοτέα" 
        />
      </div>
    );
  }

  // Admin/Manager Dashboard
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Συνολική εικόνα εταιρίας
        </p>
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Συνολικά Έσοδα"
          value={`€${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="primary"
        />
        <StatCard
          title="Προμήθεια Agency"
          value={`€${stats.agencyFee.toLocaleString()}`}
          subtitle="από ενεργά έργα"
          icon={Percent}
          variant="default"
        />
        <StatCard
          title="Καθαρό Κέρδος"
          value={`€${stats.netProfit.toLocaleString()}`}
          icon={TrendingUp}
          variant={stats.netProfit >= 0 ? 'success' : 'destructive'}
        />
        <StatCard
          title="Εκκρεμή Τιμολόγια"
          value={`€${stats.pendingInvoices.toLocaleString()}`}
          icon={FileWarning}
          variant={stats.pendingInvoices > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Project Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Διαγωνισμοί"
          value={stats.activeTenders}
          icon={FileWarning}
        />
        <StatCard
          title="Ενεργά Έργα"
          value={stats.activeProjects}
          icon={FolderKanban}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon={Trophy}
          variant={stats.winRate >= 50 ? 'success' : 'default'}
        />
        <StatCard
          title="Overdue"
          value={stats.overdueCount}
          icon={AlertTriangle}
          variant={stats.overdueCount > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Utilization"
          value={`${stats.utilization}%`}
          icon={Activity}
        />
      </div>

      {/* Pipeline */}
      {(isAdmin || isManager) && (
        <PipelineCard stages={pipelineStages} />
      )}

      {/* Alerts and Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-destructive/10 bg-destructive/[0.02] p-6 animate-fade-in shadow-soft">
          <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
            <span className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </span>
            Alerts
          </h3>
          <div className="space-y-2">
            {stats.overdueCount > 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-foreground/80">
                  {stats.overdueCount} task{stats.overdueCount > 1 ? 's' : ''} overdue
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-success/[0.03] border border-success/10">
                <Activity className="h-4 w-4 text-success" />
                <span className="text-sm text-success">
                  Όλα τα tasks είναι εντός προθεσμίας
                </span>
              </div>
            )}
          </div>
        </div>

        <TaskList 
          tasks={upcomingTasks} 
          title="Deadlines" 
        />
      </div>
    </div>
  );
}
