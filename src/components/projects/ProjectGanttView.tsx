import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Circle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart2,
  Filter,
  Building2,
  Handshake,
  GanttChartSquare,
} from 'lucide-react';
import { format, addWeeks, addMonths, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval, isBefore, isAfter, parseISO, differenceInCalendarDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ─────────────────────────────────────────────────────────────────

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'internal_review' | 'client_review';

interface GanttTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  deliverable_id: string | null;
  progress: number | null;
  assignee: { full_name: string | null } | null;
}

interface GanttDeliverable {
  id: string;
  name: string;
  due_date: string | null;
  completed: boolean | null;
  tasks: GanttTask[];
}

interface ProjectGanttViewProps {
  projectId: string;
  projectStartDate?: string | null;
  projectEndDate?: string | null;
}

type Granularity = 'weeks' | 'months';

// ─── Status helpers ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; barClass: string; icon: React.ReactNode }> = {
  todo: {
    label: 'Προς Εκτέλεση',
    barClass: 'bg-muted-foreground/40',
    icon: <Circle className="h-3 w-3" />,
  },
  in_progress: {
    label: 'Σε Εξέλιξη',
    barClass: 'bg-primary',
    icon: <Loader2 className="h-3 w-3" />,
  },
  review: {
    label: 'Αναθεώρηση',
    barClass: 'bg-warning',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  internal_review: {
    label: 'Εσωτερική Έγκριση',
    barClass: 'bg-violet-500',
    icon: <Building2 className="h-3 w-3" />,
  },
  client_review: {
    label: 'Έγκριση Πελάτη',
    barClass: 'bg-orange-500',
    icon: <Handshake className="h-3 w-3" />,
  },
  completed: {
    label: 'Ολοκληρώθηκε',
    barClass: 'bg-success',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

const ALL_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'internal_review', 'client_review', 'completed'];

// ─── Bar position calculation ───────────────────────────────────────────────

function getBarPosition(
  itemStart: Date | null,
  itemEnd: Date | null,
  timelineStart: Date,
  timelineEnd: Date,
) {
  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  if (totalMs <= 0) return null;

  const start = itemStart ?? itemEnd;
  const end = itemEnd ?? itemStart;
  if (!start || !end) return null;

  const clampedStart = isBefore(start, timelineStart) ? timelineStart : start;
  const clampedEnd = isAfter(end, timelineEnd) ? timelineEnd : end;

  const leftPct = ((clampedStart.getTime() - timelineStart.getTime()) / totalMs) * 100;
  const widthPct = Math.max(0.3, ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100);

  return { leftPct, widthPct, isMilestone: !itemStart && !!itemEnd };
}

// ─── Today line position ────────────────────────────────────────────────────

function getTodayPosition(timelineStart: Date, timelineEnd: Date) {
  const today = new Date();
  if (isBefore(today, timelineStart) || isAfter(today, timelineEnd)) return null;
  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  return ((today.getTime() - timelineStart.getTime()) / totalMs) * 100;
}

// ─── Main component ────────────────────────────────────────────────────────

export function ProjectGanttView({ projectId, projectStartDate, projectEndDate }: ProjectGanttViewProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [deliverables, setDeliverables] = useState<GanttDeliverable[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<GanttTask[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('weeks');
  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(new Set(ALL_STATUSES));

  // ── Derived timeline range ──────────────────────────────────────────────
  const [timelineStart, setTimelineStart] = useState<Date>(new Date());
  const [timelineEnd, setTimelineEnd] = useState<Date>(new Date());

  // ── Fetch data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [tasksRes, delivRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, priority, start_date, due_date, deliverable_id, progress, assigned_to, profiles:assigned_to(full_name)')
          .eq('project_id', projectId),
        supabase
          .from('deliverables')
          .select('id, name, due_date, completed')
          .eq('project_id', projectId),
      ]);

      const rawTasks: GanttTask[] = (tasksRes.data ?? []).map((t: any) => ({
        ...t,
        assignee: t.profiles ?? null,
      }));

      const rawDeliverables = delivRes.data ?? [];

      // Group tasks by deliverable
      const delivMap = new Map<string, GanttTask[]>();
      const unassigned: GanttTask[] = [];
      for (const task of rawTasks) {
        if (task.deliverable_id) {
          const arr = delivMap.get(task.deliverable_id) ?? [];
          arr.push(task);
          delivMap.set(task.deliverable_id, arr);
        } else {
          unassigned.push(task);
        }
      }

      const grouped: GanttDeliverable[] = rawDeliverables.map((d: any) => ({
        ...d,
        tasks: delivMap.get(d.id) ?? [],
      }));

      setDeliverables(grouped);
      setUnassignedTasks(unassigned);

      // Compute timeline range
      const allDates: Date[] = [];
      if (projectStartDate) allDates.push(parseISO(projectStartDate));
      if (projectEndDate) allDates.push(parseISO(projectEndDate));
      for (const d of rawDeliverables) {
        if (d.due_date) allDates.push(parseISO(d.due_date));
      }
      for (const t of rawTasks) {
        if (t.start_date) allDates.push(parseISO(t.start_date));
        if (t.due_date) allDates.push(parseISO(t.due_date));
      }

      const today = new Date();
      if (allDates.length === 0) {
        setTimelineStart(addMonths(today, -1));
        setTimelineEnd(addMonths(today, 3));
      } else {
        const minDate = allDates.reduce((a, b) => (isBefore(a, b) ? a : b));
        const maxDate = allDates.reduce((a, b) => (isAfter(a, b) ? a : b));
        setTimelineStart(addWeeks(minDate, -1));
        setTimelineEnd(addWeeks(maxDate, 2));
      }

      setLoading(false);
    }

    fetchData();
  }, [projectId, projectStartDate, projectEndDate]);

  // ── Scroll to today ─────────────────────────────────────────────────────
  const scrollToToday = useCallback(() => {
    if (!scrollRef.current) return;
    const todayPct = getTodayPosition(timelineStart, timelineEnd);
    if (todayPct === null) return;
    const scrollWidth = scrollRef.current.scrollWidth;
    const clientWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = (todayPct / 100) * scrollWidth - clientWidth / 2;
  }, [timelineStart, timelineEnd]);

  useEffect(() => {
    if (!loading) {
      setTimeout(scrollToToday, 100);
    }
  }, [loading, scrollToToday]);

  // ── Column ticks ────────────────────────────────────────────────────────
  const ticks = granularity === 'weeks'
    ? eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 1 })
    : eachMonthOfInterval({ start: timelineStart, end: timelineEnd });

  const todayPct = getTodayPosition(timelineStart, timelineEnd);

  const LABEL_WIDTH = 240;

  // ── Status filter toggle ────────────────────────────────────────────────
  function toggleStatus(s: TaskStatus) {
    setActiveStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  // ── Scroll helpers ───────────────────────────────────────────────────────
  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // ── Filter tasks by active statuses ─────────────────────────────────────
  function filterTasks(tasks: GanttTask[]) {
    return tasks.filter(t => activeStatuses.has(t.status));
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-48 shrink-0" />
            <Skeleton className="h-8 flex-1" style={{ marginLeft: `${Math.random() * 20}%`, width: `${20 + Math.random() * 40}%`, flex: 'none' }} />
          </div>
        ))}
      </div>
    );
  }

  const hasItems = deliverables.length > 0 || unassignedTasks.length > 0;
  const allTasks = [...deliverables.flatMap(d => d.tasks), ...unassignedTasks];
  const hasDateInfo = allTasks.some(t => t.start_date || t.due_date) || deliverables.some(d => d.due_date);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!hasItems || !hasDateInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className="p-4 rounded-full bg-muted">
          <GanttChartSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium">Δεν υπάρχουν ημερομηνίες</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Προσθέστε start date ή due date στα tasks και deliverables για να εμφανιστεί το Timeline.
        </p>
      </div>
    );
  }

  // ── Mobile fallback ─────────────────────────────────────────────────────
  if (isMobile) {
    const sorted = allTasks
      .filter(t => t.due_date || t.start_date)
      .sort((a, b) => {
        const da = a.due_date ?? a.start_date ?? '';
        const db = b.due_date ?? b.start_date ?? '';
        return da.localeCompare(db);
      });
    return (
      <div className="space-y-2 p-2">
        <p className="text-xs text-muted-foreground text-center mb-3">Tasks ταξινομημένα κατά ημερομηνία</p>
        {sorted.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/tasks/${task.id}`)}
          >
            <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_CONFIG[task.status]?.barClass ?? 'bg-muted')} />
            <span className="flex-1 text-sm font-medium truncate">{task.title}</span>
            {task.due_date && (
              <span className="text-xs text-muted-foreground">{format(parseISO(task.due_date), 'd MMM', { locale: el })}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Gantt row renderer ──────────────────────────────────────────────────
  function renderTaskRow(task: GanttTask, indent = false) {
    const filtered = activeStatuses.has(task.status);
    if (!filtered) return null;

    const start = task.start_date ? parseISO(task.start_date) : null;
    const end = task.due_date ? parseISO(task.due_date) : null;
    const pos = getBarPosition(start, end, timelineStart, timelineEnd);
    const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
    const isOverdue = end && isBefore(end, new Date()) && task.status !== 'completed';

    return (
      <div key={task.id} className="flex items-center h-10 border-b border-border/40 hover:bg-muted/20 group">
        {/* Label */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 cursor-pointer hover:text-primary"
          style={{ width: LABEL_WIDTH }}
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          {indent && <span className="text-muted-foreground/40 text-xs ml-2">└</span>}
          <span className={cn('shrink-0 text-muted-foreground', isOverdue && 'text-destructive')}>{cfg.icon}</span>
          <span className={cn(
            'text-xs truncate',
            task.status === 'completed' && 'line-through text-muted-foreground',
            isOverdue && 'text-destructive',
          )}>
            {task.title}
          </span>
        </div>

        {/* Bar area */}
        <div className="relative flex-1 h-full">
          {/* Grid lines */}
          {ticks.map((tick, i) => {
            const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border/30"
                style={{ left: `${leftPct}%` }}
              />
            );
          })}

          {/* Today line */}
          {todayPct !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 z-10"
              style={{ left: `${todayPct}%` }}
            />
          )}

          {/* Bar or Milestone */}
          {pos && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {pos.isMilestone ? (
                    // Diamond milestone marker
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-pointer z-20',
                        isOverdue ? 'bg-destructive' : cfg.barClass,
                      )}
                      style={{ left: `calc(${pos.leftPct}% - 6px)` }}
                    />
                  ) : (
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 rounded-sm cursor-pointer transition-opacity hover:opacity-80 z-20',
                        isOverdue ? 'bg-destructive' : cfg.barClass,
                      )}
                      style={{
                        left: `${pos.leftPct}%`,
                        width: `${pos.widthPct}%`,
                        height: '16px',
                        minWidth: '4px',
                      }}
                    />
                  )}
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', isOverdue ? 'bg-destructive' : cfg.barClass)} />
                      <span className="text-xs">{cfg.label}</span>
                      {isOverdue && <Badge variant="destructive" className="text-[10px] px-1 py-0">Εκπρόθεσμο</Badge>}
                    </div>
                    {(task.start_date || task.due_date) && (
                      <p className="text-xs text-muted-foreground">
                        {task.start_date ? format(parseISO(task.start_date), 'd MMM yyyy', { locale: el }) : '?'}
                        {' → '}
                        {task.due_date ? format(parseISO(task.due_date), 'd MMM yyyy', { locale: el }) : '?'}
                        {task.start_date && task.due_date && (
                          <span className="ml-1">({differenceInCalendarDays(parseISO(task.due_date), parseISO(task.start_date))} ημ.)</span>
                        )}
                      </p>
                    )}
                    {task.assignee?.full_name && (
                      <p className="text-xs text-muted-foreground">👤 {task.assignee.full_name}</p>
                    )}
                    {task.progress !== null && task.progress !== undefined && (
                      <p className="text-xs text-muted-foreground">📊 {task.progress}%</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  function renderDeliverableRow(deliv: GanttDeliverable) {
    const end = deliv.due_date ? parseISO(deliv.due_date) : null;
    const pos = end ? getBarPosition(null, end, timelineStart, timelineEnd) : null;
    const isCompleted = deliv.completed;

    // Compute span from first task start to deliverable due_date
    const taskStarts = deliv.tasks.filter(t => t.start_date).map(t => parseISO(t.start_date!));
    const spanStart = taskStarts.length > 0 ? taskStarts.reduce((a, b) => (isBefore(a, b) ? a : b)) : null;
    const spanPos = spanStart && end ? getBarPosition(spanStart, end, timelineStart, timelineEnd) : pos;

    return (
      <div key={deliv.id}>
        {/* Deliverable header row */}
        <div className="flex items-center h-10 border-b border-border/60 bg-muted/30">
          <div className="shrink-0 flex items-center gap-2 px-3" style={{ width: LABEL_WIDTH }}>
            <Package className={cn('h-3.5 w-3.5 shrink-0', isCompleted ? 'text-success' : 'text-primary')} />
            <span className={cn('text-xs font-semibold truncate', isCompleted && 'line-through text-muted-foreground')}>
              {deliv.name}
            </span>
            {isCompleted && <CheckCircle2 className="h-3 w-3 text-success shrink-0" />}
          </div>

          {/* Deliverable bar area */}
          <div className="relative flex-1 h-full">
            {ticks.map((tick, i) => {
              const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
              return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: `${leftPct}%` }} />;
            })}
            {todayPct !== null && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 z-10" style={{ left: `${todayPct}%` }} />
            )}
            {spanPos && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 rounded-sm z-20 cursor-default',
                        isCompleted ? 'bg-success/60' : 'bg-primary/70',
                        spanPos.isMilestone ? 'w-2.5 h-2.5 rotate-45' : '',
                      )}
                      style={spanPos.isMilestone
                        ? { left: `calc(${spanPos.leftPct}% - 5px)` }
                        : { left: `${spanPos.leftPct}%`, width: `${spanPos.widthPct}%`, height: '6px', minWidth: '4px' }
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-semibold text-sm">{deliv.name}</p>
                    {deliv.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Deadline: {format(parseISO(deliv.due_date), 'd MMM yyyy', { locale: el })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {deliv.tasks.length} tasks
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Task rows */}
        {filterTasks(deliv.tasks).map(task => renderTaskRow(task, true))}
      </div>
    );
  }

  const filteredUnassigned = filterTasks(unassignedTasks);

  return (
    <div className="space-y-4">
      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Granularity toggle */}
        <div className="flex items-center rounded-lg border bg-background overflow-hidden">
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              granularity === 'weeks' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
            onClick={() => setGranularity('weeks')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Εβδομάδες
          </button>
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              granularity === 'months' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
            onClick={() => setGranularity('months')}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Μήνες
          </button>
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Status
              {activeStatuses.size < ALL_STATUSES.length && (
                <Badge className="h-4 px-1 text-[10px]">{activeStatuses.size}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {ALL_STATUSES.map(s => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={activeStatuses.has(s)}
                onCheckedChange={() => toggleStatus(s)}
                className="text-xs"
              >
                <span className={cn('w-2 h-2 rounded-full mr-2 inline-block', STATUS_CONFIG[s].barClass)} />
                {STATUS_CONFIG[s].label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollBy(-300)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={scrollToToday}>
            Σήμερα
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollBy(300)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Gantt chart ─────────────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div ref={scrollRef} className="overflow-x-auto">
          {/* Minimum width so bars are meaningful */}
          <div style={{ minWidth: Math.max(800, ticks.length * (granularity === 'weeks' ? 80 : 120)) }}>
            {/* ── Header row ─────────────────────────────────────────── */}
            <div className="flex items-stretch border-b bg-muted/50 sticky top-0 z-30">
              {/* Label column header */}
              <div
                className="shrink-0 flex items-center px-3 py-2 border-r text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                style={{ width: LABEL_WIDTH }}
              >
                Εργασία / Παραδοτέο
              </div>
              {/* Tick headers */}
              <div className="relative flex-1 flex">
                {ticks.map((tick, i) => {
                  const nextTick = ticks[i + 1];
                  const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                  const widthPct = nextTick
                    ? ((nextTick.getTime() - tick.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100
                    : 100 - leftPct;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex items-center px-2 border-r border-border/40 overflow-hidden"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    >
                      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        {granularity === 'weeks'
                          ? format(tick, 'd MMM', { locale: el })
                          : format(tick, 'MMM yyyy', { locale: el })
                        }
                      </span>
                    </div>
                  );
                })}
                {/* Today indicator in header */}
                {todayPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
              </div>
            </div>

            {/* ── Body rows ──────────────────────────────────────────── */}
            {deliverables.map(d => renderDeliverableRow(d))}

            {/* Unassigned tasks */}
            {filteredUnassigned.length > 0 && (
              <>
                <div className="flex items-center h-10 border-b border-border/60 bg-muted/20">
                  <div className="shrink-0 flex items-center gap-2 px-3" style={{ width: LABEL_WIDTH }}>
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Χωρίς Παραδοτέο</span>
                  </div>
                  <div className="relative flex-1 h-full">
                    {ticks.map((tick, i) => {
                      const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                      return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: `${leftPct}%` }} />;
                    })}
                    {todayPct !== null && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/60" style={{ left: `${todayPct}%` }} />
                    )}
                  </div>
                </div>
                {filteredUnassigned.map(task => renderTaskRow(task, false))}
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 border-t bg-muted/30">
          {ALL_STATUSES.map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn('w-3 h-3 rounded-sm', STATUS_CONFIG[s].barClass)} />
              <span className="text-[10px] text-muted-foreground">{STATUS_CONFIG[s].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-4 bg-destructive/60 inline-block" />
            <span className="text-[10px] text-muted-foreground">Σήμερα</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-muted-foreground/50 inline-block" />
            <span className="text-[10px] text-muted-foreground">Milestone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
