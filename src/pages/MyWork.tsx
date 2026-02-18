import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useLeaveManagement } from '@/hooks/useLeaveManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  CheckSquare, Clock, AlertTriangle, Play, Square, ArrowRight,
  Plus, CalendarDays, Timer, FileText, FolderKanban,
  ChevronRight, Palmtree, Check, X,
} from 'lucide-react';
import { format, isBefore, startOfDay, endOfWeek, startOfTomorrow, isAfter } from 'date-fns';
import { el } from 'date-fns/locale';

interface TaskWithProject {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  progress: number | null;
  task_type: string | null;
  task_category: string | null;
  project_id: string;
  project?: { name: string } | null;
}

interface MyProject {
  id: string;
  name: string;
  status: string;
  progress: number | null;
  client?: { name: string } | null;
}

const TASK_SELECT = 'id, title, status, priority, due_date, start_date, estimated_hours, actual_hours, progress, task_type, task_category, project_id, project:projects(name)';

function getStatusLabel(status: string) {
  switch (status) {
    case 'todo': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'in_review': return 'In Review';
    case 'completed': return 'Done';
    default: return status;
  }
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'in_progress': return 'default';
    case 'in_review': return 'secondary';
    case 'completed': return 'outline';
    default: return 'outline';
  }
}

export default function MyWork() {
  const { user, profile, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { activeTimer, elapsed, formatElapsed, startTimer, stopTimer } = useTimeTracking();
  const { balances, pendingApprovals, approveRequest, rejectRequest } = useLeaveManagement();

  const [todayTasks, setTodayTasks] = useState<TaskWithProject[]>([]);
  const [weekTasks, setWeekTasks] = useState<TaskWithProject[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskWithProject[]>([]);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Καλημέρα';
    if (hour < 17) return 'Καλό απόγευμα';
    return 'Καλησπέρα';
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const today = startOfDay(new Date());
  const todayStr = format(new Date(), 'EEEE d MMMM yyyy', { locale: el });

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  async function fetchAll() {
    if (!user) return;
    setLoading(true);

    const todayISO = format(today, 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const tomorrowISO = format(startOfTomorrow(), 'yyyy-MM-dd');

    // Fetch ALL non-completed tasks assigned to this user
    const [allMyTasks, projects, timeEntries] = await Promise.all([
      supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('assigned_to', user.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true }),

      supabase
        .from('project_user_access')
        .select('project:projects(id, name, status, progress, client:clients(name))')
        .eq('user_id', user.id),

      supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('start_time', new Date(today).toISOString())
        .eq('is_running', false),
    ]);

    const allTasks = (allMyTasks.data || []) as TaskWithProject[];

    // Client-side filtering for Today:
    // - due_date <= today (overdue + due today)
    // - start_date = today
    // - due_date = today
    const todayFiltered = allTasks.filter(t => {
      const dueDate = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      const startDate = t.start_date ? startOfDay(new Date(t.start_date)) : null;

      // Overdue: due_date < today
      if (dueDate && isBefore(dueDate, today)) return true;
      // Due today
      if (dueDate && dueDate.getTime() === today.getTime()) return true;
      // Starts today
      if (startDate && startDate.getTime() === today.getTime()) return true;

      return false;
    });

    // Week: due after today, within this week, not already in today
    const todayIds = new Set(todayFiltered.map(t => t.id));
    const weekFiltered = allTasks.filter(t => {
      if (todayIds.has(t.id)) return false;
      const dueDate = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      if (!dueDate) return false;
      const tomorrow = startOfDay(new Date(tomorrowISO));
      const weekEndDate = startOfDay(new Date(weekEnd));
      return (dueDate >= tomorrow && dueDate <= weekEndDate);
    });

    // Upcoming: due after this week
    const weekIds = new Set(weekFiltered.map(t => t.id));
    const upcomingFiltered = allTasks.filter(t => {
      if (todayIds.has(t.id) || weekIds.has(t.id)) return false;
      const dueDate = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      if (!dueDate) return false;
      const weekEndDate = startOfDay(new Date(weekEnd));
      return isAfter(dueDate, weekEndDate);
    });

    setTodayTasks(todayFiltered);
    setWeekTasks(weekFiltered);
    setUpcomingTasks(upcomingFiltered.slice(0, 20));

    const activeProjects = (projects.data || [])
      .map((p: any) => p.project)
      .filter((p: any) => p && p.status === 'active') as MyProject[];
    setMyProjects(activeProjects);

    const totalMin = (timeEntries.data || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    setTodayHours(Math.round((totalMin / 60) * 10) / 10);

    setLoading(false);
  }

  const overdueCount = todayTasks.filter(t => t.due_date && isBefore(new Date(t.due_date), today)).length;

  async function toggleTaskComplete(task: TaskWithProject) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', task.id);
    if (!error) {
      toast.success('Task ολοκληρώθηκε!');
      fetchAll();
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'high': case 'urgent': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  }

  // Reusable task row component
  function TaskRow({ task, showDate = false }: { task: TaskWithProject; showDate?: boolean }) {
    const isOverdue = task.due_date && isBefore(new Date(task.due_date), today);
    return (
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-muted/30 transition-colors">
        <Checkbox
          className="h-5 w-5 shrink-0"
          onCheckedChange={() => toggleTaskComplete(task)}
        />
        <div className="flex-1 min-w-0">
          <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
            {task.title}
          </Link>
          <p className="text-xs text-muted-foreground truncate">
            {(task.project as any)?.name}
          </p>
        </div>
        <Badge variant={getStatusVariant(task.status)} className="text-[10px] shrink-0">
          {getStatusLabel(task.status)}
        </Badge>
        {(showDate || isOverdue) && task.due_date && (
          <span className={`text-xs shrink-0 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {format(new Date(task.due_date), 'd MMM', { locale: el })}
          </span>
        )}
        <Badge variant={getPriorityColor(task.priority)} className="text-[10px] shrink-0">
          {task.priority}
        </Badge>
        {task.estimated_hours ? (
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline font-mono">
            {task.estimated_hours}h
          </span>
        ) : null}
        {isOverdue && (
          <Badge variant="destructive" className="text-[10px] shrink-0">overdue</Badge>
        )}
        {!activeTimer?.is_running || activeTimer.task_id !== task.id ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => startTimer(task.id, task.project_id)}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-primary"
            onClick={() => stopTimer()}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // Group week tasks by day
  const weekTasksByDay = useMemo(() => {
    const groups: Record<string, TaskWithProject[]> = {};
    weekTasks.forEach(t => {
      if (!t.due_date) return;
      const dayLabel = format(new Date(t.due_date), 'EEEE d/MM', { locale: el });
      if (!groups[dayLabel]) groups[dayLabel] = [];
      groups[dayLabel].push(t);
    });
    return groups;
  }, [weekTasks]);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="h-16 bg-muted/50 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-muted/50 rounded-xl" />
          <div className="h-24 bg-muted/50 rounded-xl" />
          <div className="h-24 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground capitalize">{todayStr}</p>
        </div>
        {activeTimer && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
            <Timer className="h-4 w-4 text-primary animate-pulse" />
            <div className="text-sm">
              <span className="font-mono font-semibold text-primary">{formatElapsed(elapsed)}</span>
              <span className="text-muted-foreground ml-2 hidden sm:inline">
                {activeTimer.task?.title || 'Timer'}
              </span>
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => stopTimer()}>
              <Square className="h-3.5 w-3.5 mr-1" /> Stop
            </Button>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayTasks.length}</p>
              <p className="text-xs text-muted-foreground">Tasks σήμερα</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
              <Clock className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayHours}h</p>
              <p className="text-xs text-muted-foreground">Ώρες σήμερα</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${overdueCount > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
              <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today Tasks */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Tasks Σήμερα</CardTitle>
          <Link to="/work?tab=tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
            Δες όλα <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-4">Κανένα task για σήμερα 🎉</p>
          ) : (
            <div className="divide-y divide-border/50">
              {todayTasks.map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week Tasks */}
      {Object.keys(weekTasksByDay).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Αυτή την εβδομάδα</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {Object.entries(weekTasksByDay).map(([day, tasks]) => (
              <div key={day}>
                <div className="px-4 md:px-6 py-2 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground capitalize">{day}</p>
                </div>
                <div className="divide-y divide-border/50">
                  {tasks.map(task => (
                    <TaskRow key={task.id} task={task} showDate />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Επερχόμενα</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {upcomingTasks.map(task => (
                <TaskRow key={task.id} task={task} showDate />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My Projects */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Τα Έργα μου</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Κανένα ενεργό έργο</p>
            ) : (
              myProjects.slice(0, 5).map(project => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                      {project.name}
                    </p>
                    {project.client && (
                      <p className="text-xs text-muted-foreground truncate">{(project.client as any)?.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Progress value={project.progress || 0} className="w-16 h-1.5" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{project.progress || 0}%</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Links + Leave */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/work?tab=tasks&new=true')}>
                <Plus className="h-3.5 w-3.5" /> Νέο Task
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/hr?tab=timesheets')}>
                <Timer className="h-3.5 w-3.5" /> Χρόνος
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/hr?tab=leaves')}>
                <Palmtree className="h-3.5 w-3.5" /> Άδεια
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/work?tab=calendar')}>
                <CalendarDays className="h-3.5 w-3.5" /> Ημερολόγιο
              </Button>
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Άδειες</CardTitle>
              <Link to="/hr?tab=leaves" className="text-xs text-primary hover:underline">Δες όλα</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {balances.length === 0 ? (
                <p className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα αδειών</p>
              ) : (
                balances.slice(0, 3).map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{b.leave_type?.name || 'Άδεια'}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {b.used_days}/{b.entitled_days + b.carried_over} ημέρες
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Approvals (manager/admin only) */}
      {(isAdmin || isManager) && pendingApprovals.length > 0 && (
        <Card className="border-border/50 border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Εκκρεμείς εγκρίσεις αδειών ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {pendingApprovals.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center gap-3 px-4 md:px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{req.user?.full_name || 'Χρήστης'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.start_date), 'd/MM')} - {format(new Date(req.end_date), 'd/MM')} · {req.days_count} ημ.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => approveRequest(req.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => rejectRequest(req.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
