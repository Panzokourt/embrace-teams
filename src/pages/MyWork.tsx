import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useXPEngine } from '@/hooks/useXPEngine';
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  CheckSquare, Clock, AlertTriangle, Play, Square, ArrowRight,
  Timer, ChevronRight, ChevronDown, ExternalLink, FolderKanban,
  Package, ListChecks, Check, X, Flag, CalendarDays, Inbox,
  Send, ClipboardCheck, Plus, StopCircle,
} from 'lucide-react';
import {
  format, isBefore, startOfDay, startOfWeek, addDays, isToday, isSameDay,
} from 'date-fns';
import { el } from 'date-fns/locale';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/components/shared/mondayStyleConfig';

// ── Types ──────────────────────────────────────────
interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  progress: number | null;
  project_id: string;
  deliverable_id: string | null;
  description?: string | null;
  assigned_to?: string | null;
  approver?: string | null;
  internal_reviewer?: string | null;
  project?: { name: string } | null;
  assignee?: { full_name: string | null } | null;
}

interface DeliverableItem {
  id: string;
  name: string;
  completed: boolean | null;
  due_date: string | null;
  project_id: string;
}

interface MyProject {
  id: string;
  name: string;
  status: string;
  progress: number | null;
  parent_project_id: string | null;
  client?: { name: string } | null;
}

interface TimeEntryToday {
  id: string;
  duration_minutes: number;
  description: string | null;
  task?: { title: string } | null;
  start_time: string;
}

const TASK_SELECT = 'id, title, status, priority, due_date, start_date, estimated_hours, actual_hours, progress, project_id, deliverable_id, description, assigned_to, internal_reviewer, approver, project:projects(name)';

function getStatusLabel(s: string) { return STATUS_COLORS[s]?.label || s; }
function getStatusStyle(s: string): React.CSSProperties {
  const c = STATUS_COLORS[s]; return c ? { backgroundColor: c.bg, color: c.text } : {};
}
function getPriorityStyle(p: string): React.CSSProperties {
  const c = PRIORITY_COLORS[p]; return c ? { backgroundColor: c.bg, color: c.text } : {};
}

// ── Main Page ──────────────────────────────────────
export default function MyWork() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { activeTimer, elapsed, formatElapsed, startTimer, stopTimer } = useTimeTracking();
  const { awardTaskXP } = useXPEngine();

  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<string, TaskItem[]>>({});
  const [projectDeliverables, setProjectDeliverables] = useState<Record<string, DeliverableItem[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [sentForApproval, setSentForApproval] = useState<TaskItem[]>([]);
  const [needMyApproval, setNeedMyApproval] = useState<TaskItem[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [todayEntries, setTodayEntries] = useState<TimeEntryToday[]>([]);
  const [allMyTasks, setAllMyTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<{ type: 'task' | 'deliverable'; data: any } | null>(null);
  const [activeView, setActiveView] = useState<'projects' | 'calendar'>('projects');
  const [calendarMode, setCalendarMode] = useState<'week' | 'day'>('week');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Καλημέρα' : h < 17 ? 'Καλό απόγευμα' : 'Καλησπέρα';
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const today = startOfDay(new Date());
  const todayStr = format(new Date(), 'EEEE d MMMM', { locale: el });

  // ── KPI calculations ─────────────────────────────
  const overdueCount = useMemo(() =>
    allMyTasks.filter(t => t.due_date && isBefore(startOfDay(new Date(t.due_date)), today) && t.status !== 'completed').length,
    [allMyTasks, today]
  );

  const todayTasks = useMemo(() =>
    allMyTasks.filter(t => {
      if (t.status === 'completed') return false;
      const dd = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      const sd = t.start_date ? startOfDay(new Date(t.start_date)) : null;
      return (dd && dd.getTime() === today.getTime()) || (sd && sd.getTime() === today.getTime()) || (dd && isBefore(dd, today));
    }),
    [allMyTasks, today]
  );

  const todayTaskCount = todayTasks.length;

  const approvalCount = sentForApproval.length + needMyApproval.length;

  // ── Data Fetching ────────────────────────────────
  useEffect(() => { if (user) fetchAll(); }, [user]);

  async function fetchAll() {
    if (!user) return;
    setLoading(true);

    const [tasksRes, sentRes, needRes, accessRes, leadRes, timeRes, entriesRes] = await Promise.all([
      supabase.from('tasks').select(TASK_SELECT).eq('assigned_to', user.id).neq('status', 'completed').order('due_date', { ascending: true }),
      supabase.from('tasks').select(TASK_SELECT).eq('assigned_to', user.id).in('status', ['internal_review', 'client_review', 'review'] as any),
      supabase.from('tasks').select(TASK_SELECT + ', assignee:profiles!assigned_to(full_name)').or(`internal_reviewer.eq.${user.id},approver.eq.${user.id}`).in('status', ['internal_review', 'client_review', 'review'] as any) as any,
      supabase.from('project_user_access').select('project:projects(id, name, status, progress, parent_project_id, client:clients(name))').eq('user_id', user.id),
      supabase.from('projects').select('id, name, status, progress, parent_project_id, client:clients(name)').or(`project_lead_id.eq.${user.id},account_manager_id.eq.${user.id}`),
      supabase.from('time_entries').select('duration_minutes').eq('user_id', user.id).gte('start_time', new Date(today).toISOString()).eq('is_running', false),
      supabase.from('time_entries').select('id, duration_minutes, description, start_time, task:tasks(title)').eq('user_id', user.id).gte('start_time', new Date(today).toISOString()).eq('is_running', false).order('start_time', { ascending: false }),
    ]);

    setAllMyTasks((tasksRes.data || []) as TaskItem[]);
    setSentForApproval((sentRes.data || []) as TaskItem[]);
    setNeedMyApproval((needRes.data || []) as TaskItem[]);

    // Merge projects from access table + lead/manager role, deduplicate, include non-completed statuses
    const accessProjects = (accessRes.data || []).map((p: any) => p.project).filter(Boolean) as MyProject[];
    const leadProjects = (leadRes.data || []) as MyProject[];
    const projectMap = new Map<string, MyProject>();
    [...accessProjects, ...leadProjects].forEach(p => {
      if (p && p.status !== 'completed' && p.status !== 'cancelled') {
        projectMap.set(p.id, p);
      }
    });
    setMyProjects(Array.from(projectMap.values()));

    const totalMin = (timeRes.data || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    setTodayHours(Math.round((totalMin / 60) * 10) / 10);
    setTodayEntries((entriesRes.data || []) as TimeEntryToday[]);

    setLoading(false);
  }

  // ── Expand project → fetch tasks + deliverables ──
  async function toggleProject(projectId: string) {
    const next = new Set(expandedProjects);
    if (next.has(projectId)) {
      next.delete(projectId);
      setExpandedProjects(next);
      return;
    }
    next.add(projectId);
    setExpandedProjects(next);

    if (!projectTasks[projectId]) {
      const [tasksRes, delRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority, due_date, start_date, estimated_hours, actual_hours, progress, project_id, deliverable_id, description, assigned_to').eq('project_id', projectId).eq('assigned_to', user!.id).neq('status', 'completed').order('due_date', { ascending: true }),
        supabase.from('deliverables').select('id, name, completed, due_date, project_id').eq('project_id', projectId).order('name'),
      ]);
      setProjectTasks(prev => ({ ...prev, [projectId]: (tasksRes.data || []) as TaskItem[] }));
      setProjectDeliverables(prev => ({ ...prev, [projectId]: (delRes.data || []) as DeliverableItem[] }));
    }
  }

  async function toggleTaskComplete(task: TaskItem) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    if (!error) {
      toast.success('Task ολοκληρώθηκε!');
      if (user) await awardTaskXP(user.id, task.id, task.due_date);
      // Remove from local state
      setProjectTasks(prev => {
        const copy = { ...prev };
        if (copy[task.project_id]) copy[task.project_id] = copy[task.project_id].filter(t => t.id !== task.id);
        return copy;
      });
      setAllMyTasks(prev => prev.filter(t => t.id !== task.id));
    }
  }

  async function approveReviewTask(task: TaskItem) {
    const newStatus = task.approver && task.status === 'internal_review' ? 'client_review' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: newStatus as any }).eq('id', task.id);
    if (!error) {
      toast.success(newStatus === 'completed' ? 'Εγκρίθηκε!' : 'Προχωρά σε Έγκριση Πελάτη');
      if (newStatus === 'completed' && task.assigned_to) await awardTaskXP(task.assigned_to, task.id, task.due_date);
      fetchAll();
    }
  }

  async function rejectReviewTask(task: TaskItem) {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' as any }).eq('id', task.id);
    if (!error) { toast.success('Απορρίφθηκε, επιστροφή σε Σε Εξέλιξη'); fetchAll(); }
  }

  async function updateTaskDueDate(taskId: string, newDate: string) {
    const { error } = await supabase.from('tasks').update({ due_date: newDate } as any).eq('id', taskId);
    if (!error) {
      toast.success('Ημερομηνία ενημερώθηκε');
      setAllMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, due_date: newDate } : t));
    }
  }

  // ── Sub-projects for a project ───────────────────
  const getSubProjects = useCallback((parentId: string) =>
    myProjects.filter(p => p.parent_project_id === parentId),
    [myProjects]
  );

  const topLevelProjects = useMemo(() =>
    myProjects.filter(p => !p.parent_project_id || !myProjects.some(mp => mp.id === p.parent_project_id)),
    [myProjects]
  );

  // ── Calendar data ────────────────────────────────
  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasksByDay = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    allMyTasks.forEach(t => {
      if (!t.due_date) return;
      const key = format(new Date(t.due_date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [allMyTasks]);

  // ── Loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="h-12 bg-muted/50 rounded-xl w-1/3" />
        <div className="h-64 bg-muted/50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── Header with inline KPI chips ── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{greeting}, {firstName}</h1>
            <p className="text-sm text-muted-foreground capitalize">{todayStr}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1.5 text-xs font-medium px-2.5 py-1">
              <CheckSquare className="h-3 w-3" /> {todayTaskCount} tasks
            </Badge>
            <Badge variant="secondary" className="gap-1.5 text-xs font-medium px-2.5 py-1">
              <Clock className="h-3 w-3" /> {todayHours}h
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="gap-1.5 text-xs font-medium px-2.5 py-1">
                <AlertTriangle className="h-3 w-3" /> {overdueCount} εκπρόθεσμα
              </Badge>
            )}
            {approvalCount > 0 && (
              <Badge variant="outline" className="gap-1.5 text-xs font-medium px-2.5 py-1 border-primary/40 text-primary">
                <ClipboardCheck className="h-3 w-3" /> {approvalCount} εγκρίσεις
              </Badge>
            )}
            <div className="hidden sm:block w-32">
              <LevelProgressBar userId={user?.id} />
            </div>
          </div>
        </div>
      </div>

      {/* ── View Toggle ── */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === 'projects' ? 'default' : 'outline'}
          size="sm" className="gap-1.5"
          onClick={() => setActiveView('projects')}
        >
          <FolderKanban className="h-3.5 w-3.5" /> Έργα
        </Button>
        <Button
          variant={activeView === 'calendar' ? 'default' : 'outline'}
          size="sm" className="gap-1.5"
          onClick={() => setActiveView('calendar')}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Ημερολόγιο
        </Button>
      </div>

      {/* ── Main Content ── */}
      {activeView === 'projects' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Today's Tasks */}
          <Card className="border-border/40 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                Tasks Σήμερα
                <Badge variant="secondary" className="text-xs ml-1">{todayTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {todayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-6">Κανένα task για σήμερα 🎉</p>
              ) : (
                <div className="overflow-y-auto max-h-[60vh] divide-y divide-border/30">
                    {todayTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onComplete={() => toggleTaskComplete(task)}
                        onClick={() => setSelectedItem({ type: 'task', data: task })}
                        activeTimer={activeTimer}
                        startTimer={startTimer}
                        stopTimer={stopTimer}
                        showProject
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card className="border-border/40 lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Τα Ενεργά Έργα μου
                <Badge variant="secondary" className="text-xs ml-1">{topLevelProjects.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topLevelProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-6">Κανένα ενεργό έργο</p>
              ) : (
                <div className="overflow-y-auto max-h-[60vh] divide-y divide-border/30">
                    {topLevelProjects.map(project => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        subProjects={getSubProjects(project.id)}
                        expanded={expandedProjects.has(project.id)}
                        onToggle={() => toggleProject(project.id)}
                        tasks={projectTasks[project.id] || []}
                        deliverables={projectDeliverables[project.id] || []}
                        onTaskComplete={toggleTaskComplete}
                        onItemClick={setSelectedItem}
                        activeTimer={activeTimer}
                        startTimer={startTimer}
                        stopTimer={stopTimer}
                        expandedProjects={expandedProjects}
                        onToggleProject={toggleProject}
                        projectTasks={projectTasks}
                        projectDeliverables={projectDeliverables}
                        myTasks={allMyTasks}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── Calendar View ── */
        <Card className="border-border/40">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {calendarMode === 'week' ? 'Εβδομαδιαία Προβολή' : format(calendarDate, 'EEEE d MMMM', { locale: el })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCalendarDate(d => addDays(d, calendarMode === 'week' ? -7 : -1))}>←</Button>
              <Button variant="ghost" size="sm" onClick={() => setCalendarDate(new Date())}>Σήμερα</Button>
              <Button variant="ghost" size="sm" onClick={() => setCalendarDate(d => addDays(d, calendarMode === 'week' ? 7 : 1))}>→</Button>
              <div className="border-l border-border/40 pl-2 ml-1 flex gap-1">
                <Button variant={calendarMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCalendarMode('week')}>Εβδ</Button>
                <Button variant={calendarMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCalendarMode('day')}>Ημέρα</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {calendarMode === 'week' ? (
              <div className="grid grid-cols-7 border-t border-border/30">
                {weekDays.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasksByDay[key] || [];
                  const isCurrentDay = isToday(day);
                  return (
                    <div key={key} className={`border-r last:border-r-0 border-border/20 min-h-[200px] ${isCurrentDay ? 'bg-primary/5' : ''}`}>
                      <div className={`px-2 py-2 text-center border-b border-border/20 ${isCurrentDay ? 'bg-primary/10' : 'bg-muted/30'}`}>
                        <div className="text-[10px] text-muted-foreground uppercase">{format(day, 'EEE', { locale: el })}</div>
                        <div className={`text-lg font-semibold ${isCurrentDay ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
                      </div>
                      <div className="p-1 space-y-1">
                        {dayTasks.map(task => (
                          <CalendarTaskCard
                            key={task.id}
                            task={task}
                            onComplete={() => toggleTaskComplete(task)}
                            onClick={() => setSelectedItem({ type: 'task', data: task })}
                            activeTimer={activeTimer}
                            startTimer={startTimer}
                            stopTimer={stopTimer}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Day view */
              <div className="p-4 space-y-2">
                {(tasksByDay[format(calendarDate, 'yyyy-MM-dd')] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Κανένα task για αυτή την ημέρα</p>
                ) : (
                  (tasksByDay[format(calendarDate, 'yyyy-MM-dd')] || []).map(task => (
                    <CalendarTaskCard
                      key={task.id}
                      task={task}
                      onComplete={() => toggleTaskComplete(task)}
                      onClick={() => setSelectedItem({ type: 'task', data: task })}
                      activeTimer={activeTimer}
                      startTimer={startTimer}
                      stopTimer={stopTimer}
                      wide
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Bottom Strip: Approvals + Time Tracking ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Approvals */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              Εγκρίσεις
              {approvalCount > 0 && <Badge variant="secondary" className="text-xs">{approvalCount}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {approvalCount === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">Δεν υπάρχουν εκκρεμείς εγκρίσεις 🎉</p>
            ) : (
              <div className="overflow-y-auto max-h-[40vh] divide-y divide-border/30">
                {/* Sent for approval */}
                {sentForApproval.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/20">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Send className="h-3 w-3" /> Έστειλα για Έγκριση ({sentForApproval.length})
                      </span>
                    </div>
                    {sentForApproval.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedItem({ type: 'task', data: task })}>
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{(task.project as any)?.name}</p>
                        </div>
                        <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={getStatusStyle(task.status)}>{getStatusLabel(task.status)}</span>
                      </div>
                    ))}
                  </>
                )}
                {/* Need my approval */}
                {needMyApproval.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/20">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Inbox className="h-3 w-3" /> Πρέπει να Εγκρίνω ({needMyApproval.length})
                      </span>
                    </div>
                    {needMyApproval.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedItem({ type: 'task', data: task })}>
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">{(task.project as any)?.name}</p>
                            {(task as any).assignee?.full_name && <span className="text-xs text-muted-foreground">· {(task as any).assignee.full_name}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:text-emerald-600" onClick={() => approveReviewTask(task)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => rejectReviewTask(task)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Tracking Widget */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              Time Tracking
              <Badge variant="secondary" className="text-xs ml-auto">{todayHours}h σήμερα</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Active Timer */}
            {activeTimer?.is_running ? (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <Timer className="h-4 w-4 text-primary animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{activeTimer.task?.title || 'Timer'}</p>
                  <p className="text-lg font-mono font-bold text-primary">{formatElapsed(elapsed)}</p>
                </div>
                <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" onClick={() => stopTimer()}>
                  <StopCircle className="h-3.5 w-3.5" /> Stop
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 text-center">
                Κανένα ενεργό timer
              </div>
            )}

            {/* Today's entries */}
            {todayEntries.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Σήμερα</p>
                <ScrollArea className="max-h-32">
                  {todayEntries.slice(0, 5).map(entry => (
                    <div key={entry.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="text-xs text-muted-foreground w-10">{format(new Date(entry.start_time), 'HH:mm')}</span>
                      <span className="flex-1 truncate text-foreground">{entry.task?.title || entry.description || 'Timer'}</span>
                      <span className="text-xs font-mono text-muted-foreground">{entry.duration_minutes}λ</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => navigate('/timesheets')}>
              <ArrowRight className="h-3.5 w-3.5" /> Timesheets
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Detail Sidebar Sheet ── */}
      <Sheet open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedItem?.type === 'task' && (
            <TaskDetailSheet
              task={selectedItem.data}
              today={today}
              onClose={() => setSelectedItem(null)}
              navigate={navigate}
              activeTimer={activeTimer}
              startTimer={startTimer}
              stopTimer={stopTimer}
            />
          )}
          {selectedItem?.type === 'deliverable' && (
            <DeliverableDetailSheet
              deliverable={selectedItem.data}
              onClose={() => setSelectedItem(null)}
              navigate={navigate}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Project Row (expandable) ─────────────────────────
function ProjectRow({
  project, subProjects, expanded, onToggle, tasks, deliverables,
  onTaskComplete, onItemClick, activeTimer, startTimer, stopTimer,
  expandedProjects, onToggleProject, projectTasks, projectDeliverables, myTasks,
}: {
  project: MyProject;
  subProjects: MyProject[];
  expanded: boolean;
  onToggle: () => void;
  tasks: TaskItem[];
  deliverables: DeliverableItem[];
  onTaskComplete: (t: TaskItem) => void;
  onItemClick: (item: { type: 'task' | 'deliverable'; data: any }) => void;
  activeTimer: any;
  startTimer: any;
  stopTimer: any;
  expandedProjects: Set<string>;
  onToggleProject: (id: string) => void;
  projectTasks: Record<string, TaskItem[]>;
  projectDeliverables: Record<string, DeliverableItem[]>;
  myTasks: TaskItem[];
}) {
  const projectTaskCount = myTasks.filter(t => t.project_id === project.id && t.status !== 'completed').length;

  return (
    <div>
      {/* Project header row */}
      <div
        className="flex items-center gap-3 px-4 md:px-6 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expanded ? '' : '-rotate-90'}`} />
        <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{project.name}</span>
          {project.client && <span className="text-xs text-muted-foreground ml-2">{(project.client as any)?.name}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="text-[10px]">{projectTaskCount} tasks</Badge>
          <div className="flex items-center gap-1.5">
            <Progress value={project.progress || 0} className="w-16 h-1.5" />
            <span className="text-xs text-muted-foreground w-8 text-right">{project.progress || 0}%</span>
          </div>
          <Link
            to={`/projects/${project.id}`}
            className="text-muted-foreground hover:text-primary"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="pl-6 md:pl-10 border-l-2 border-border/20 ml-6 md:ml-8 pb-2">
          {/* Sub-projects */}
          {subProjects.map(sub => (
            <ProjectRow
              key={sub.id}
              project={sub}
              subProjects={[]}
              expanded={expandedProjects.has(sub.id)}
              onToggle={() => onToggleProject(sub.id)}
              tasks={projectTasks[sub.id] || []}
              deliverables={projectDeliverables[sub.id] || []}
              onTaskComplete={onTaskComplete}
              onItemClick={onItemClick}
              activeTimer={activeTimer}
              startTimer={startTimer}
              stopTimer={stopTimer}
              expandedProjects={expandedProjects}
              onToggleProject={onToggleProject}
              projectTasks={projectTasks}
              projectDeliverables={projectDeliverables}
              myTasks={myTasks}
            />
          ))}

          {/* Deliverables with their tasks */}
          {deliverables.map(del => {
            const delTasks = tasks.filter(t => t.deliverable_id === del.id);
            return (
              <Collapsible key={del.id}>
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 rounded-lg transition-colors">
                  {delTasks.length > 0 && (
                    <CollapsibleTrigger asChild>
                      <button className="shrink-0 [&[data-state=open]>svg]:rotate-90">
                        <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform" />
                      </button>
                    </CollapsibleTrigger>
                  )}
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="text-sm text-foreground flex-1 truncate cursor-pointer hover:text-primary"
                    onClick={() => onItemClick({ type: 'deliverable', data: del })}
                  >{del.name}</span>
                  <Badge variant={del.completed ? 'default' : 'outline'} className="text-[10px]">
                    {del.completed ? 'Ολοκληρωμένο' : 'Σε εξέλιξη'}
                  </Badge>
                  {delTasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{delTasks.length} tasks</span>
                  )}
                </div>
                <CollapsibleContent>
                  {delTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      indent
                      onComplete={() => onTaskComplete(task)}
                      onClick={() => onItemClick({ type: 'task', data: task })}
                      activeTimer={activeTimer}
                      startTimer={startTimer}
                      stopTimer={stopTimer}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Orphan tasks (no deliverable) */}
          {tasks.filter(t => !t.deliverable_id).map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={() => onTaskComplete(task)}
              onClick={() => onItemClick({ type: 'task', data: task })}
              activeTimer={activeTimer}
              startTimer={startTimer}
              stopTimer={stopTimer}
            />
          ))}

          {tasks.length === 0 && deliverables.length === 0 && subProjects.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">Φόρτωση...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Task Row (inline in tree) ────────────────────────
function TaskRow({
  task, indent, onComplete, onClick, activeTimer, startTimer, stopTimer, showProject,
}: {
  task: TaskItem;
  indent?: boolean;
  onComplete: () => void;
  onClick: () => void;
  activeTimer: any;
  startTimer: any;
  stopTimer: any;
  showProject?: boolean;
}) {
  const isOverdue = task.due_date && isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 hover:bg-muted/20 rounded-lg transition-colors ${indent ? 'ml-5' : ''}`}>
      <Checkbox className="h-3.5 w-3.5 shrink-0" onCheckedChange={onComplete} />
      <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <span className="text-sm text-foreground hover:text-primary truncate block">{task.title}</span>
        {showProject && (task.project as any)?.name && (
          <span className="text-[10px] text-muted-foreground truncate block">{(task.project as any).name}</span>
        )}
      </div>
      {task.due_date && (
        <span className={`text-[10px] ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          {format(new Date(task.due_date), 'd/MM')}
        </span>
      )}
      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 hidden sm:inline-flex" style={getStatusStyle(task.status)}>
        {getStatusLabel(task.status)}
      </span>
      {!isRunning ? (
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={e => { e.stopPropagation(); startTimer(task.id, task.project_id); }}>
          <Play className="h-3 w-3" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={e => { e.stopPropagation(); stopTimer(); }}>
          <Square className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ── Calendar Task Card ───────────────────────────────
function CalendarTaskCard({
  task, onComplete, onClick, activeTimer, startTimer, stopTimer, wide,
}: {
  task: TaskItem;
  onComplete: () => void;
  onClick: () => void;
  activeTimer: any;
  startTimer: any;
  stopTimer: any;
  wide?: boolean;
}) {
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;
  const isOverdue = task.due_date && isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border border-border/30 px-2 py-1.5 hover:bg-muted/40 transition-colors cursor-pointer ${wide ? 'px-4 py-3' : ''} ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'bg-background'}`}
      onClick={onClick}
    >
      <Checkbox className="h-3.5 w-3.5 shrink-0" onCheckedChange={e => { e && onComplete(); }} onClick={e => e.stopPropagation()} />
      <span className={`flex-1 min-w-0 truncate ${wide ? 'text-sm' : 'text-[11px]'} text-foreground`}>{task.title}</span>
      {!isRunning ? (
        <Button size="icon" variant="ghost" className="h-5 w-5 text-muted-foreground hover:text-primary shrink-0" onClick={e => { e.stopPropagation(); startTimer(task.id, task.project_id); }}>
          <Play className="h-2.5 w-2.5" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-5 w-5 text-primary shrink-0" onClick={e => { e.stopPropagation(); stopTimer(); }}>
          <Square className="h-2.5 w-2.5" />
        </Button>
      )}
    </div>
  );
}

// ── Task Detail Sheet Content ────────────────────────
function TaskDetailSheet({ task, today, onClose, navigate, activeTimer, startTimer, stopTimer }: {
  task: TaskItem; today: Date; onClose: () => void; navigate: any; activeTimer: any; startTimer: any; stopTimer: any;
}) {
  const isOverdue = task.due_date && isBefore(new Date(task.due_date), today);
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">{task.title}</SheetTitle>
        <SheetDescription>{(task.project as any)?.name || 'Χωρίς project'}</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Status</p>
            <span className="text-xs font-medium rounded-full px-2.5 py-1" style={getStatusStyle(task.status)}>{getStatusLabel(task.status)}</span>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Priority</p>
            <span className="text-xs font-medium rounded-full px-2.5 py-1" style={getPriorityStyle(task.priority)}>{PRIORITY_COLORS[task.priority]?.label || task.priority}</span>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Έναρξη</p>
            <p className="text-sm font-medium">{task.start_date ? format(new Date(task.start_date), 'd MMM yyyy', { locale: el }) : '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Λήξη</p>
            <p className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>{task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: el }) : '-'}</p>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase mb-1">Πρόοδος</p>
          <div className="flex items-center gap-2">
            <Progress value={task.progress || 0} className="flex-1 h-2" />
            <span className="text-sm font-medium">{task.progress || 0}%</span>
          </div>
        </div>

        {task.description && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Περιγραφή</p>
            <p className="text-sm whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Timer control */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => startTimer(task.id, task.project_id)}>
              <Play className="h-3.5 w-3.5" /> Εκκίνηση Timer
            </Button>
          ) : (
            <Button variant="destructive" size="sm" className="flex-1 gap-1.5" onClick={() => stopTimer()}>
              <Square className="h-3.5 w-3.5" /> Διακοπή Timer
            </Button>
          )}
        </div>

        <Button className="w-full gap-2" onClick={() => { onClose(); navigate(`/tasks/${task.id}`); }}>
          <ExternalLink className="h-4 w-4" /> Άνοιγμα σελίδας Task
        </Button>
      </div>
    </>
  );
}

// ── Deliverable Detail Sheet Content ─────────────────
function DeliverableDetailSheet({ deliverable, onClose, navigate }: {
  deliverable: DeliverableItem; onClose: () => void; navigate: any;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">{deliverable.name}</SheetTitle>
        <SheetDescription>Παραδοτέο</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Κατάσταση</p>
            <Badge variant={deliverable.completed ? 'default' : 'outline'}>
              {deliverable.completed ? 'Ολοκληρωμένο' : 'Σε εξέλιξη'}
            </Badge>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Λήξη</p>
            <p className="text-sm font-medium">{deliverable.due_date ? format(new Date(deliverable.due_date), 'd MMM yyyy', { locale: el }) : '-'}</p>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={() => { onClose(); navigate(`/projects/${deliverable.project_id}?tab=deliverables`); }}>
          <ExternalLink className="h-4 w-4" /> Άνοιγμα στο Έργο
        </Button>
      </div>
    </>
  );
}
