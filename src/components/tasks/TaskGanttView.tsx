import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Circle, Loader2, CheckCircle2, AlertCircle, Building2, Handshake,
  ChevronLeft, ChevronRight, CalendarDays, GanttChartSquare, Filter,
} from 'lucide-react';
import {
  format, addWeeks, addMonths, startOfWeek, eachWeekOfInterval, eachMonthOfInterval,
  isBefore, isAfter, parseISO, differenceInDays,
} from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/components/shared/mondayStyleConfig';
import { useGanttDrag } from '@/hooks/useGanttDrag';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'internal_review' | 'client_review' | 'completed';

interface GanttTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  project_id: string;
  progress: number | null;
  assignee?: { full_name: string | null; avatar_url?: string | null } | null;
  project?: { name: string } | null;
}

interface TaskGanttViewProps {
  tasks: GanttTask[];
  onTaskUpdated?: () => void;
}

type Granularity = 'weeks' | 'months';

const STATUS_CONFIG: Record<string, { label: string; barColor: string; icon: React.ReactNode }> = {
  todo: { label: 'Προς Εκτέλεση', barColor: STATUS_COLORS.todo?.bg || '#c4c4c4', icon: <Circle className="h-3 w-3" /> },
  in_progress: { label: 'Σε Εξέλιξη', barColor: STATUS_COLORS.in_progress?.bg || '#fdab3d', icon: <Loader2 className="h-3 w-3" /> },
  review: { label: 'Αναθεώρηση', barColor: STATUS_COLORS.review?.bg || '#e2445c', icon: <AlertCircle className="h-3 w-3" /> },
  internal_review: { label: 'Εσωτερική Έγκριση', barColor: STATUS_COLORS.internal_review?.bg || '#a25ddc', icon: <Building2 className="h-3 w-3" /> },
  client_review: { label: 'Έγκριση Πελάτη', barColor: STATUS_COLORS.client_review?.bg || '#ff642e', icon: <Handshake className="h-3 w-3" /> },
  completed: { label: 'Ολοκληρώθηκε', barColor: STATUS_COLORS.completed?.bg || '#00c875', icon: <CheckCircle2 className="h-3 w-3" /> },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Χαμηλή' },
  { value: 'medium', label: 'Μεσαία' },
  { value: 'high', label: 'Υψηλή' },
];

function getBarPosition(start: Date | null, end: Date | null, tlStart: Date, tlEnd: Date) {
  const totalMs = tlEnd.getTime() - tlStart.getTime();
  if (totalMs <= 0) return null;
  const s = start ?? end;
  const e = end ?? start;
  if (!s || !e) return null;
  const cs = isBefore(s, tlStart) ? tlStart : s;
  const ce = isAfter(e, tlEnd) ? tlEnd : e;
  const leftPct = ((cs.getTime() - tlStart.getTime()) / totalMs) * 100;
  const widthPct = Math.max(0.5, ((ce.getTime() - cs.getTime()) / totalMs) * 100);
  return { leftPct, widthPct, isMilestone: !start && !!end };
}

export function TaskGanttView({ tasks, onTaskUpdated }: TaskGanttViewProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [granularity, setGranularity] = useState<Granularity>('weeks');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editStatus, setEditStatus] = useState<string>('');

  // Get unique projects for filter
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => { if (t.project?.name) map.set(t.project_id, t.project.name); });
    return Array.from(map.entries()).map(([v, l]) => ({ value: v, label: l }));
  }, [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, projectFilter]);

  const tasksWithDates = useMemo(() =>
    filteredTasks.filter(t => t.start_date || t.due_date),
    [filteredTasks]
  );

  // Group by project
  const groupedByProject = useMemo(() => {
    const map = new Map<string, { name: string; tasks: GanttTask[] }>();
    for (const t of tasksWithDates) {
      const key = t.project_id;
      if (!map.has(key)) {
        map.set(key, { name: t.project?.name || 'Χωρίς Έργο', tasks: [] });
      }
      map.get(key)!.tasks.push(t);
    }
    return Array.from(map.values());
  }, [tasksWithDates]);

  // Timeline range
  const { timelineStart, timelineEnd } = useMemo(() => {
    const allDates: Date[] = [];
    for (const t of tasksWithDates) {
      if (t.start_date) allDates.push(parseISO(t.start_date));
      if (t.due_date) allDates.push(parseISO(t.due_date));
    }
    const today = new Date();
    if (allDates.length === 0) {
      return { timelineStart: addMonths(today, -1), timelineEnd: addMonths(today, 3) };
    }
    const min = allDates.reduce((a, b) => (isBefore(a, b) ? a : b));
    const max = allDates.reduce((a, b) => (isAfter(a, b) ? a : b));
    return { timelineStart: addWeeks(min, -1), timelineEnd: addWeeks(max, 2) };
  }, [tasksWithDates]);

  const ticks = granularity === 'weeks'
    ? eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 1 })
    : eachMonthOfInterval({ start: timelineStart, end: timelineEnd });

  const todayPct = (() => {
    const today = new Date();
    if (isBefore(today, timelineStart) || isAfter(today, timelineEnd)) return null;
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    return ((today.getTime() - timelineStart.getTime()) / totalMs) * 100;
  })();

  const scrollToToday = useCallback(() => {
    if (!scrollRef.current || todayPct === null) return;
    const sw = scrollRef.current.scrollWidth;
    const cw = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = (todayPct / 100) * sw - cw / 2;
  }, [todayPct]);

  useEffect(() => { setTimeout(scrollToToday, 100); }, [scrollToToday]);

  const handleBarClick = (task: GanttTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setEditStartDate(task.start_date ? parseISO(task.start_date) : undefined);
    setEditDueDate(task.due_date ? parseISO(task.due_date) : undefined);
    setEditStatus(task.status);
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    const updates: Record<string, any> = {};
    if (editStartDate) updates.start_date = format(editStartDate, 'yyyy-MM-dd');
    if (editDueDate) updates.due_date = format(editDueDate, 'yyyy-MM-dd');
    if (editStatus && editStatus !== editingTask.status) updates.status = editStatus;

    if (Object.keys(updates).length === 0) { setEditingTask(null); return; }

    const { error } = await supabase.from('tasks').update(updates).eq('id', editingTask.id);
    if (error) { toast.error('Σφάλμα ενημέρωσης'); return; }
    toast.success('Task ενημερώθηκε');
    setEditingTask(null);
    onTaskUpdated?.();
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all';

  const LABEL_WIDTH = 260;

  if (tasksWithDates.length === 0 && filteredTasks.length === 0 && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="p-4 rounded-full bg-muted">
          <GanttChartSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium">Δεν υπάρχουν ημερομηνίες</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Προσθέστε start date ή due date στα tasks για να εμφανιστεί το Gantt.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={scrollToToday}>
            <CalendarDays className="h-3.5 w-3.5 mr-1" />Σήμερα
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className={cn("h-3.5 w-3.5", hasActiveFilters ? "text-primary" : "text-muted-foreground")} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="Κατάσταση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες</SelectItem>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Προτεραιότητα" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες</SelectItem>
              {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {projectOptions.length > 1 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="Έργο" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλα</SelectItem>
                {projectOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setProjectFilter('all'); }}>
              Καθαρισμός
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
          <Button variant={granularity === 'weeks' ? 'default' : 'ghost'} size="sm" className="h-6 px-2.5 text-xs" onClick={() => setGranularity('weeks')}>
            Εβδομάδες
          </Button>
          <Button variant={granularity === 'months' ? 'default' : 'ghost'} size="sm" className="h-6 px-2.5 text-xs" onClick={() => setGranularity('months')}>
            Μήνες
          </Button>
        </div>
      </div>

      {tasksWithDates.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {hasActiveFilters ? 'Κανένα task δεν ταιριάζει στα φίλτρα ή δεν έχει ημερομηνίες.' : 'Κανένα task με ημερομηνίες.'}
        </div>
      ) : (
        /* Timeline */
        <div className="flex overflow-hidden">
          {/* Left labels */}
          <div className="shrink-0 border-r bg-card" style={{ width: LABEL_WIDTH }}>
            <div className="h-10 flex items-center px-3 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
              Task
            </div>
            {groupedByProject.map(group => (
              <div key={group.name}>
                <div className="h-8 flex items-center px-3 border-b bg-muted/20">
                  <span className="text-xs font-semibold text-foreground truncate">{group.name}</span>
                  <Badge variant="secondary" className="ml-2 text-[10px] h-4">{group.tasks.length}</Badge>
                </div>
                {group.tasks.map(task => {
                  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), new Date()) && task.status !== 'completed';
                  return (
                    <div
                      key={task.id}
                      className="h-9 flex items-center gap-2 px-3 border-b border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <span className={cn('shrink-0', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>{cfg.icon}</span>
                      <span className={cn(
                        'text-xs truncate flex-1',
                        task.status === 'completed' && 'line-through text-muted-foreground',
                        isOverdue && 'text-destructive',
                      )}>{task.title}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right timeline */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ minWidth: Math.max(ticks.length * (granularity === 'weeks' ? 80 : 120), 600) }}>
              {/* Column headers */}
              <div className="h-10 flex items-end border-b bg-muted/40 relative">
                {ticks.map((tick, i) => {
                  const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                  return (
                    <div key={i} className="absolute top-0 bottom-0 flex items-center border-l border-border/30" style={{ left: `${leftPct}%` }}>
                      <span className="text-[10px] text-muted-foreground px-1.5 whitespace-nowrap">
                        {granularity === 'weeks'
                          ? format(tick, 'd MMM', { locale: el })
                          : format(tick, 'MMM yyyy', { locale: el })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              {groupedByProject.map(group => (
                <div key={group.name}>
                  <div className="h-8 relative border-b bg-muted/10">
                    {ticks.map((tick, i) => {
                      const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                      return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{ left: `${leftPct}%` }} />;
                    })}
                  </div>
                  {group.tasks.map(task => {
                    const start = task.start_date ? parseISO(task.start_date) : null;
                    const end = task.due_date ? parseISO(task.due_date) : null;
                    const pos = getBarPosition(start, end, timelineStart, timelineEnd);
                    const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                    const isOverdue = end && isBefore(end, new Date()) && task.status !== 'completed';

                    return (
                      <div key={task.id} className="h-9 relative border-b border-border/20">
                        {ticks.map((tick, i) => {
                          const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                          return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{ left: `${leftPct}%` }} />;
                        })}
                        {todayPct !== null && (
                          <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/50 z-10" style={{ left: `${todayPct}%` }} />
                        )}
                        {pos && (
                          <Popover open={editingTask?.id === task.id} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <PopoverTrigger asChild>
                                  <TooltipTrigger asChild>
                                    {pos.isMilestone ? (
                                      <div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-pointer z-20"
                                        style={{ left: `calc(${pos.leftPct}% - 6px)`, backgroundColor: isOverdue ? 'hsl(var(--destructive))' : cfg.barColor }}
                                        onClick={(e) => handleBarClick(task, e)}
                                      />
                                    ) : (
                                      <div
                                        className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer hover:opacity-80 z-20 transition-opacity"
                                        style={{
                                          left: `${pos.leftPct}%`,
                                          width: `${pos.widthPct}%`,
                                          height: '18px',
                                          minWidth: '6px',
                                          backgroundColor: isOverdue ? 'hsl(var(--destructive))' : cfg.barColor,
                                        }}
                                        onClick={(e) => handleBarClick(task, e)}
                                      >
                                        {(task.progress ?? 0) > 0 && (
                                          <div
                                            className="absolute inset-y-0 left-0 rounded-full opacity-30 bg-background"
                                            style={{ width: `${100 - (task.progress ?? 0)}%`, right: 0, left: 'auto' }}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </TooltipTrigger>
                                </PopoverTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-semibold text-sm">{task.title}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.barColor }} />
                                    <span className="text-xs">{cfg.label}</span>
                                    {isOverdue && <Badge variant="destructive" className="text-[10px] px-1 py-0">Εκπρόθεσμο</Badge>}
                                  </div>
                                  {task.assignee?.full_name && (
                                    <p className="text-xs text-muted-foreground mt-1">{task.assignee.full_name}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground mt-1">Κλικ για επεξεργασία</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <PopoverContent className="w-72 p-3 space-y-3" side="bottom" align="start">
                              <p className="text-sm font-semibold truncate">{task.title}</p>
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Κατάσταση</label>
                                  <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Έναρξη</label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-1 justify-start">
                                          {editStartDate ? format(editStartDate, 'd MMM yy', { locale: el }) : '—'}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={editStartDate} onSelect={setEditStartDate} initialFocus />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">Λήξη</label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-1 justify-start">
                                          {editDueDate ? format(editDueDate, 'd MMM yy', { locale: el }) : '—'}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} initialFocus />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSaveEdit}>Αποθήκευση</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingTask(null)}>Ακύρωση</Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
