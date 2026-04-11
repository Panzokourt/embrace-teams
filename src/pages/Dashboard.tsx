import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';
import { useDashboardConfig, getFilterDateRange } from '@/hooks/useDashboardConfig';
import { getTemplate, ZONE_ORDER, type DashboardTemplateId, type ZoneId } from '@/components/dashboard/dashboardTemplates';
import DashboardZone from '@/components/dashboard/DashboardZone';
import StatCard from '@/components/dashboard/StatCard';
import TaskList from '@/components/dashboard/TaskList';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer';
import DashboardExport from '@/components/dashboard/DashboardExport';
import RecentActivity from '@/components/dashboard/widgets/RecentActivity';
import RevenueChart from '@/components/dashboard/widgets/RevenueChart';
import ProjectProgress from '@/components/dashboard/widgets/ProjectProgress';
import CostBreakdownChart from '@/components/dashboard/widgets/CostBreakdownChart';
import HoursLoggedChart from '@/components/dashboard/widgets/HoursLoggedChart';
import PipelineStagesChart from '@/components/dashboard/widgets/PipelineStagesChart';
import WinRateTrendChart from '@/components/dashboard/widgets/WinRateTrendChart';
import TopClientsRevenue from '@/components/dashboard/widgets/TopClientsRevenue';
import TasksByStatus from '@/components/dashboard/widgets/TasksByStatus';
import AlertWidget from '@/components/dashboard/widgets/AlertWidget';
import PlaceholderWidget from '@/components/dashboard/widgets/PlaceholderWidget';
import { PageHeader } from '@/components/shared/PageHeader';
import DashboardFinancials from '@/components/dashboard/DashboardFinancials';
import {
  DollarSign, Percent, TrendingUp, FileWarning,
  Trophy, FolderKanban, AlertTriangle, Activity,
  Loader2, Timer, Settings2, Repeat, CreditCard,
  Users, Layers, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  todayHours: number;
  pipelineValue: number;
  closedWon: number;
}

interface Task {
  id: string;
  title: string;
  project: string;
  dueDate: Date;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
}

export default function Dashboard() {
  const { templateId: routeTemplateId } = useParams<{ templateId?: string }>();
  const { profile, isAdmin, isManager, isClient } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Determine active template
  const activeTemplateId: DashboardTemplateId = (
    ['executive', 'finance', 'operations', 'sales'].includes(routeTemplateId || '')
      ? routeTemplateId as DashboardTemplateId
      : 'executive'
  );
  const template = getTemplate(activeTemplateId);

  const {
    config, toggleWidget, setWidgetSize,
    setFilters, savedLayouts, saveLayout, loadLayout, deleteLayout,
  } = useDashboardConfig();

  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0, agencyFee: 0, netProfit: 0, pendingInvoices: 0,
    activeTenders: 0, activeProjects: 0, winRate: 0, overdueCount: 0,
    utilization: 0, todayHours: 0, pipelineValue: 0, closedWon: 0,
  });

  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const periodStart = getFilterDateRange(config.filters.period).toISOString();
      const { clientId, projectId } = config.filters;

      let invoicesQ = supabase.from('invoices').select('amount, paid, issued_date, client_id');
      invoicesQ = invoicesQ.gte('issued_date', periodStart);
      if (clientId) invoicesQ = invoicesQ.eq('client_id', clientId);
      if (projectId) invoicesQ = invoicesQ.eq('project_id', projectId);

      let expensesQ = supabase.from('expenses').select('amount, expense_date');
      expensesQ = expensesQ.gte('expense_date', periodStart);
      if (projectId) expensesQ = expensesQ.eq('project_id', projectId);

      let projectsQ = supabase.from('projects').select('budget, agency_fee_percentage, status, client_id');
      if (clientId) projectsQ = projectsQ.eq('client_id', clientId);

      const tendersQ = supabase.from('tenders').select('id, name, budget, stage');
      let tasksQ = supabase.from('tasks').select('id, title, due_date, status, project:projects(name)');
      if (projectId) tasksQ = tasksQ.eq('project_id', projectId);

      const timeEntriesQ = supabase.from('time_entries').select('duration_minutes, start_time, is_running')
        .gte('start_time', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .eq('is_running', false);

      const [invoicesRes, expensesRes, projectsRes, tendersRes, tasksRes, timeEntriesRes] =
        await Promise.all([invoicesQ, expensesQ, projectsQ, tendersQ, tasksQ, timeEntriesQ]);

      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const projects = projectsRes.data || [];
      const tenders = tendersRes.data || [];
      const tasks = tasksRes.data || [];

      const totalRevenue = invoices.reduce((s, i) => s + Number(i.amount), 0);
      const totalPaid = invoices.filter(i => i.paid).reduce((s, i) => s + Number(i.amount), 0);
      const pendingInvoices = totalRevenue - totalPaid;
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const netProfit = totalRevenue - totalExpenses;

      const activeProjects = projects.filter(p => p.status === 'active');
      const agencyFee = activeProjects.reduce((s, p) =>
        s + (Number(p.budget || 0) * Number(p.agency_fee_percentage || 0) / 100), 0);

      const activeTenders = tenders.filter(t => !['won', 'lost'].includes(t.stage)).length;
      const wonTenders = tenders.filter(t => t.stage === 'won').length;
      const lostTenders = tenders.filter(t => t.stage === 'lost').length;
      const completedTenders = wonTenders + lostTenders;
      const winRate = completedTenders > 0 ? Math.round((wonTenders / completedTenders) * 100) : 0;

      const now = new Date();
      const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'completed');

      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const totalActiveTasks = tasks.filter(t => t.status !== 'completed').length;
      const utilization = totalActiveTasks > 0 ? Math.round((inProgressTasks / totalActiveTasks) * 100) : 0;

      const todayMinutes = (timeEntriesRes.data || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);

      const pipelineValue = tenders
        .filter(t => !['won', 'lost'].includes(t.stage))
        .reduce((s, t) => s + (Number(t.budget) || 0), 0);

      setStats({
        totalRevenue, agencyFee, netProfit, pendingInvoices,
        activeTenders, activeProjects: activeProjects.length, winRate,
        overdueCount: overdueTasks.length,
        utilization: Math.min(utilization, 100),
        todayHours: Math.round((todayMinutes / 60) * 10) / 10,
        pipelineValue,
        closedWon: wonTenders,
      });

      const upcoming = tasks
        .filter(t => t.due_date && t.status !== 'completed')
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
        .slice(0, 5)
        .map(t => ({
          id: t.id, title: t.title,
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
  }, [config.filters]);

  useDashboardRealtime(fetchDashboardData);
  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const statsSnapshot = useMemo<Record<string, string | number>>(() => ({
    total_revenue: `€${stats.totalRevenue.toLocaleString()}`,
    agency_fee: `€${stats.agencyFee.toLocaleString()}`,
    net_profit: `€${stats.netProfit.toLocaleString()}`,
    pending_invoices: `€${stats.pendingInvoices.toLocaleString()}`,
    active_tenders: stats.activeTenders,
    active_projects: stats.activeProjects,
    win_rate: `${stats.winRate}%`,
    overdue: stats.overdueCount,
    today_hours: `${stats.todayHours}h`,
    utilization: `${stats.utilization}%`,
  }), [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-foreground/60" />
          <p className="text-sm text-muted-foreground">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Client Dashboard (simple)
  if (isClient && !isAdmin && !isManager) {
    return (
      <div className="page-shell">
        <PageHeader
          icon={template.icon}
          title={`Καλωσήρθατε, ${profile?.full_name?.split(' ')[0] || 'Client'}`}
          subtitle="Παρακολουθήστε την πρόοδο των έργων σας"
          breadcrumbs={[{ label: 'Dashboard' }]}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Ενεργά Έργα" value={stats.activeProjects} icon={FolderKanban} variant="primary" />
          <StatCard title="Παραδοτέα σε Εξέλιξη" value={upcomingTasks.length} icon={Activity} variant="success" />
          <StatCard title="Εκκρεμή Τιμολόγια" value={`€${stats.pendingInvoices.toLocaleString()}`} icon={FileWarning} variant="warning" />
        </div>
        <TaskList tasks={upcomingTasks} title="Επερχόμενα Παραδοτέα" />
      </div>
    );
  }

  // ── Widget renderer ──
  const renderWidget = (widgetId: string): React.ReactNode => {
    switch (widgetId) {
      // KPIs
      case 'total_revenue': return <StatCard title="Συνολικά Έσοδα" value={`€${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} variant="primary" />;
      case 'net_profit': return <StatCard title="Καθαρό Κέρδος" value={`€${stats.netProfit.toLocaleString()}`} icon={TrendingUp} variant={stats.netProfit >= 0 ? 'success' : 'destructive'} />;
      case 'active_projects': return <StatCard title="Ενεργά Έργα" value={stats.activeProjects} icon={FolderKanban} />;
      case 'alerts_count': return <StatCard title="Alerts" value={stats.overdueCount} icon={AlertTriangle} variant={stats.overdueCount > 0 ? 'destructive' : 'default'} />;
      case 'agency_fee': return <StatCard title="Προμήθεια Agency" value={`€${stats.agencyFee.toLocaleString()}`} subtitle="από ενεργά έργα" icon={Percent} />;
      case 'pending_invoices': return <StatCard title="Εκκρεμή Τιμολόγια" value={`€${stats.pendingInvoices.toLocaleString()}`} icon={FileWarning} variant={stats.pendingInvoices > 0 ? 'warning' : 'default'} />;
      case 'active_tenders': return <StatCard title="Διαγωνισμοί" value={stats.activeTenders} icon={FileWarning} />;
      case 'win_rate': return <StatCard title="Win Rate" value={`${stats.winRate}%`} icon={Trophy} variant={stats.winRate >= 50 ? 'success' : 'default'} />;
      case 'overdue': return <StatCard title="Overdue Tasks" value={stats.overdueCount} icon={AlertTriangle} variant={stats.overdueCount > 0 ? 'destructive' : 'default'} />;
      case 'today_hours': return <StatCard title="Ώρες Σήμερα" value={`${stats.todayHours}h`} icon={Timer} variant="primary" />;
      case 'utilization': return <StatCard title="Utilization" value={`${stats.utilization}%`} icon={Activity} />;
      case 'recurring_revenue': return <StatCard title="Recurring Revenue" value="—" icon={Repeat} subtitle="Σύντομα" />;
      case 'outstanding_invoices': return <StatCard title="Ανεξόφλητα" value={`€${stats.pendingInvoices.toLocaleString()}`} icon={CreditCard} variant="warning" />;
      case 'capacity_pct': return <StatCard title="Capacity" value={`${100 - stats.utilization}%`} icon={Users} />;
      case 'pipeline_value': return <StatCard title="Pipeline Value" value={`€${stats.pipelineValue.toLocaleString()}`} icon={Layers} variant="primary" />;
      case 'active_proposals': return <StatCard title="Active Proposals" value={stats.activeTenders} icon={FileWarning} />;
      case 'closed_won': return <StatCard title="Closed Won" value={stats.closedWon} icon={Trophy} variant="success" />;
      case 'overdue_invoices': return (
        <AlertWidget
          title="Overdue Invoices"
          icon={FileWarning}
          items={[{ label: 'Εκκρεμή τιμολόγια', count: stats.pendingInvoices > 0 ? 1 : 0, variant: 'warning' }]}
          emptyMessage="Κανένα εκκρεμές τιμολόγιο"
        />
      );

      // Charts
      case 'revenue_chart': return <RevenueChart />;
      case 'project_progress': return <ProjectProgress />;
      case 'cost_breakdown_chart': return <CostBreakdownChart />;
      case 'hours_trend_chart': return <HoursLoggedChart />;
      case 'pipeline_stages_chart': return <PipelineStagesChart />;
      case 'win_rate_trend': return <WinRateTrendChart />;

      // Lists
      case 'top_clients_revenue': return <TopClientsRevenue />;
      case 'tasks_by_status': return <TasksByStatus />;
      case 'deadlines': return <TaskList tasks={upcomingTasks} title="Deadlines" />;
      case 'recent_activity': return <RecentActivity />;
      case 'active_projects_breakdown': return <PlaceholderWidget title="Κατανομή Έργων" icon={FolderKanban} />;
      case 'resource_allocation': return <PlaceholderWidget title="Resource Allocation" icon={Users} />;
      case 'margin_by_client': return <PlaceholderWidget title="Margin by Client" icon={DollarSign} />;
      case 'revenue_by_service': return <PlaceholderWidget title="Revenue by Service" />;
      case 'monthly_comparison': return <PlaceholderWidget title="Monthly Comparison" />;
      case 'proposals_by_stage': return <PlaceholderWidget title="Proposals by Stage" icon={Layers} />;
      case 'top_opportunities': return <PlaceholderWidget title="Top Opportunities" icon={Target} />;
      case 'client_acquisition_trend': return <PlaceholderWidget title="Client Acquisition" />;

      // Alerts
      case 'sla_breaches': return <AlertWidget title="SLA Breaches" items={[]} emptyMessage="Κανένα SLA breach" />;
      case 'high_workload_warning': return <AlertWidget title="High Workload" items={[]} emptyMessage="Κανονικό workload" />;
      case 'cost_variance_alert': return <AlertWidget title="Cost Variance" items={[]} emptyMessage="Κανένα variance" />;
      case 'stalled_deals': return <AlertWidget title="Stalled Deals" items={[]} emptyMessage="Κανένα stalled deal" />;
      case 'followup_required': return <AlertWidget title="Follow-up Required" items={[]} emptyMessage="Δεν απαιτείται follow-up" />;

      default: return <PlaceholderWidget title={widgetId} />;
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        icon={template.icon}
        title={template.label + ' Dashboard'}
        subtitle={template.description}
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: template.label }]}
        actions={
          <div className="flex items-center gap-2">
            <DashboardFilters filters={config.filters} onFiltersChange={setFilters} />
            <DashboardExport widgets={config.widgets} statsSnapshot={statsSnapshot} />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setCustomizerOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Financial Overview */}
      <DashboardFinancials />

      {/* Zone-based layout */}
      <div className="space-y-8">
        {ZONE_ORDER.map(zoneId => {
          const zoneWidgets = template.zones[zoneId].widgets;
          if (zoneWidgets.length === 0) return null;
          return (
            <DashboardZone key={zoneId} zoneId={zoneId}>
              {zoneWidgets.map(wId => (
                <div key={wId}>{renderWidget(wId)}</div>
              ))}
            </DashboardZone>
          );
        })}
      </div>

      <DashboardCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        widgets={config.widgets}
        onToggle={toggleWidget}
        onResize={setWidgetSize}
        templateId={activeTemplateId}
      />
    </div>
  );
}
