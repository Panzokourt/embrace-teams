import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Circle, Loader2, CheckCircle2, AlertCircle, Building2, Handshake,
  ChevronLeft, ChevronRight, CalendarDays, GanttChartSquare,
} from 'lucide-react';
import {
  format, addWeeks, addMonths, startOfWeek, eachWeekOfInterval, eachMonthOfInterval,
  isBefore, isAfter, parseISO,
} from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/components/shared/mondayStyleConfig';

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

export function TaskGanttView({ tasks }: TaskGanttViewProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [granularity, setGranularity] = useState<Granularity>('weeks');

  const tasksWithDates = useMemo(() =>
    tasks.filter(t => t.start_date || t.due_date),
    [tasks]
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

  // Scroll to today on mount
  const scrollToToday = useCallback(() => {
    if (!scrollRef.current || todayPct === null) return;
    const sw = scrollRef.current.scrollWidth;
    const cw = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = (todayPct / 100) * sw - cw / 2;
  }, [todayPct]);

  useEffect(() => { setTimeout(scrollToToday, 100); }, [scrollToToday]);

  const LABEL_WIDTH = 260;

  if (tasksWithDates.length === 0) {
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
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
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
          <Button
            variant={granularity === 'weeks' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2.5 text-xs"
            onClick={() => setGranularity('weeks')}
          >Εβδομάδες</Button>
          <Button
            variant={granularity === 'months' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 px-2.5 text-xs"
            onClick={() => setGranularity('months')}
          >Μήνες</Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex overflow-hidden">
        {/* Left labels */}
        <div className="shrink-0 border-r bg-card" style={{ width: LABEL_WIDTH }}>
          {/* Header */}
          <div className="h-10 flex items-center px-3 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
            Task
          </div>
          {groupedByProject.map(group => (
            <div key={group.name}>
              {/* Project header */}
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
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center border-l border-border/30"
                    style={{ left: `${leftPct}%` }}
                  >
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
                {/* Group spacer */}
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
                      {/* Grid lines */}
                      {ticks.map((tick, i) => {
                        const leftPct = ((tick.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
                        return <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{ left: `${leftPct}%` }} />;
                      })}
                      {/* Today */}
                      {todayPct !== null && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/50 z-10" style={{ left: `${todayPct}%` }} />
                      )}
                      {/* Bar */}
                      {pos && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {pos.isMilestone ? (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 cursor-pointer z-20"
                                  style={{ left: `calc(${pos.leftPct}% - 6px)`, backgroundColor: isOverdue ? 'hsl(var(--destructive))' : cfg.barColor }}
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
                                >
                                  {/* Progress fill */}
                                  {(task.progress ?? 0) > 0 && (
                                    <div
                                      className="absolute inset-y-0 left-0 rounded-full opacity-30 bg-background"
                                      style={{ width: `${100 - (task.progress ?? 0)}%`, right: 0, left: 'auto' }}
                                    />
                                  )}
                                </div>
                              )}
                            </TooltipTrigger>
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
                              {(task.start_date || task.due_date) && (
                                <p className="text-xs text-muted-foreground">
                                  {task.start_date ? format(parseISO(task.start_date), 'd MMM yyyy', { locale: el }) : '?'}
                                  {' → '}
                                  {task.due_date ? format(parseISO(task.due_date), 'd MMM yyyy', { locale: el }) : '?'}
                                </p>
                              )}
                              {(task.progress ?? 0) > 0 && (
                                <p className="text-xs text-muted-foreground">Πρόοδος: {task.progress}%</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}