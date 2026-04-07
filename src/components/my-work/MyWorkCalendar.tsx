import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  format, startOfWeek, addDays, isToday, isSameDay, isBefore, startOfDay,
} from 'date-fns';
import { el } from 'date-fns/locale';
import {
  CalendarDays, Play, Square, Plus, GripVertical, X, Inbox, AlertTriangle, Clock, Sparkles, Loader2,
} from 'lucide-react';
import { STATUS_COLORS } from '@/components/shared/mondayStyleConfig';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  project_id: string;
  project?: { name: string } | null;
  estimated_hours?: number | null;
}

interface Milestone {
  id: string;
  label: string;
  date: string;
  type: 'project_start' | 'project_end' | 'contract_start' | 'contract_end' | 'deliverable';
  color: string;
}

interface WorkSchedule {
  day_of_week: number; // 0=Sun, 1=Mon, ...
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

interface Props {
  tasks: TaskItem[];
  calendarDate: Date;
  calendarMode: 'week' | 'day';
  onCalendarDateChange: (d: Date) => void;
  onCalendarModeChange: (m: 'week' | 'day') => void;
  onTaskClick: (task: TaskItem) => void;
  onTaskUpdated: () => void;
  activeTimer: any;
  startTimer: any;
  stopTimer: any;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const ROW_HEIGHT = 52;

function getTaskDate(task: TaskItem): string | null {
  return task.due_date || task.start_date || null;
}

function isDateOnlyString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function isUtcMidnight(date: Date): boolean {
  return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
}

function parseTaskDate(dateStr: string): Date {
  if (isDateOnlyString(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

function isAllDay(dateStr: string | null): boolean {
  if (!dateStr) return true;
  if (isDateOnlyString(dateStr)) return true;
  const d = new Date(dateStr);
  return (d.getHours() === 0 && d.getMinutes() === 0) || isUtcMidnight(d);
}

const MILESTONE_COLORS: Record<string, string> = {
  project_start: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  project_end: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  contract_start: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  contract_end: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  deliverable: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
};

export function MyWorkCalendar({
  tasks, calendarDate, calendarMode, onCalendarDateChange, onCalendarModeChange,
  onTaskClick, onTaskUpdated, activeTimer, startTimer, stopTimer,
}: Props) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<{ date: Date; hour?: number } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [rescheduling, setRescheduling] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { fetchMilestones(); fetchWorkSchedules(); }, [user]);

  async function fetchMilestones() {
    if (!user) return;
    const ms: Milestone[] = [];
    const [projRes, contRes, delRes] = await Promise.all([
      supabase.from('projects').select('id, name, start_date, end_date').or(`status.neq.completed,status.neq.cancelled`),
      supabase.from('contracts').select('id, start_date, end_date, project:projects(name)'),
      supabase.from('deliverables').select('id, name, due_date').not('due_date', 'is', null),
    ]);
    (projRes.data || []).forEach((p: any) => {
      if (p.start_date) ms.push({ id: `ps-${p.id}`, label: `🚀 ${p.name}`, date: p.start_date, type: 'project_start', color: 'emerald' });
      if (p.end_date) ms.push({ id: `pe-${p.id}`, label: `🏁 ${p.name}`, date: p.end_date, type: 'project_end', color: 'red' });
    });
    (contRes.data || []).forEach((c: any) => {
      const name = (c.project as any)?.name || 'Συμβόλαιο';
      if (c.start_date) ms.push({ id: `cs-${c.id}`, label: `📝 ${name}`, date: c.start_date, type: 'contract_start', color: 'blue' });
      if (c.end_date) ms.push({ id: `ce-${c.id}`, label: `📝 ${name} (λήξη)`, date: c.end_date, type: 'contract_end', color: 'orange' });
    });
    (delRes.data || []).forEach((d: any) => {
      if (d.due_date) ms.push({ id: `dl-${d.id}`, label: `📦 ${d.name}`, date: d.due_date, type: 'deliverable', color: 'violet' });
    });
    setMilestones(ms);
  }

  async function fetchWorkSchedules() {
    if (!user) return;
    const { data } = await supabase.from('work_schedules').select('day_of_week, start_time, end_time, is_working_day').eq('user_id', user.id);
    if (data) setWorkSchedules(data);
  }

  // Work schedule helpers
  const workScheduleMap = useMemo(() => {
    const map: Record<number, WorkSchedule> = {};
    workSchedules.forEach(ws => { map[ws.day_of_week] = ws; });
    return map;
  }, [workSchedules]);

  function isWorkingHour(day: Date, hour: number): boolean {
    const dow = day.getDay(); // 0=Sun
    const ws = workScheduleMap[dow];
    if (!ws || !ws.is_working_day) return false;
    const startH = parseInt(ws.start_time?.split(':')[0] || '9', 10);
    const endH = parseInt(ws.end_time?.split(':')[0] || '17', 10);
    return hour >= startH && hour < endH;
  }

  function isWorkingDay(day: Date): boolean {
    const ws = workScheduleMap[day.getDay()];
    return ws?.is_working_day ?? (day.getDay() !== 0 && day.getDay() !== 6);
  }

  function isPastHour(day: Date, hour: number): boolean {
    if (isBefore(startOfDay(day), startOfDay(now)) && !isSameDay(day, now)) return true;
    if (isSameDay(day, now) && hour < now.getHours()) return true;
    return false;
  }

  function isPastDay(day: Date): boolean {
    return isBefore(startOfDay(day), startOfDay(now)) && !isSameDay(day, now);
  }

  const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const days = calendarMode === 'week' ? weekDays : [calendarDate];

  const scheduledTasks = useMemo(() => tasks.filter(t => getTaskDate(t) !== null), [tasks]);
  const allDayTasks = useMemo(() => scheduledTasks.filter(t => isAllDay(getTaskDate(t))), [scheduledTasks]);
  const timedTasks = useMemo(() => scheduledTasks.filter(t => !isAllDay(getTaskDate(t))), [scheduledTasks]);

  const unscheduledTasks = useMemo(() =>
    tasks.filter(t => !t.due_date && !t.start_date && t.status !== 'completed'), [tasks]);
  const overdueTasks = useMemo(() =>
    tasks.filter(t => {
      const d = getTaskDate(t);
      if (!d) return false;
      return isBefore(startOfDay(parseTaskDate(d)), startOfDay(new Date())) && t.status !== 'completed';
    }), [tasks]);
  const backlogCount = unscheduledTasks.length + overdueTasks.length;

  const milestonesByDay = useMemo(() => {
    const map: Record<string, Milestone[]> = {};
    milestones.forEach(m => {
      const key = format(new Date(m.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [milestones]);

  // Group timed tasks by day for absolute positioning
  const timedTasksByDay = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    timedTasks.forEach(t => {
      const d = getTaskDate(t);
      if (!d) return;
      const key = format(parseTaskDate(d), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [timedTasks]);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e: React.DragEvent, day: Date, hour?: number) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;
    setDraggedTaskId(null);
    const newDate = new Date(day);
    if (hour !== undefined) newDate.setHours(hour, 0, 0, 0);
    else newDate.setHours(0, 0, 0, 0);

    const { error } = await supabase.from('tasks').update({ due_date: newDate.toISOString() } as any).eq('id', taskId);
    if (!error) { toast.success('Ημερομηνία ενημερώθηκε'); onTaskUpdated(); }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !createDialog || !user) return;
    setCreating(true);
    const dueDate = new Date(createDialog.date);
    if (createDialog.hour !== undefined) dueDate.setHours(createDialog.hour, 0, 0, 0);

    const { data: access } = await supabase.from('project_user_access').select('project_id').eq('user_id', user.id).limit(1);
    const projectId = access?.[0]?.project_id;
    if (!projectId) { toast.error('Δεν βρέθηκε project'); setCreating(false); return; }

    const { error } = await supabase.from('tasks').insert({
      title: newTaskTitle.trim(), due_date: dueDate.toISOString(), project_id: projectId,
      assigned_to: user.id, status: 'todo', priority: 'medium',
    } as any);
    if (!error) { toast.success('Task δημιουργήθηκε'); setCreateDialog(null); setNewTaskTitle(''); onTaskUpdated(); }
    setCreating(false);
  }

  function handleSlotClick(day: Date, hour?: number) {
    setCreateDialog({ date: day, hour });
    setNewTaskTitle('');
  }

  function handleDayHeaderClick(day: Date) {
    if (calendarMode === 'week') {
      onCalendarDateChange(day);
      onCalendarModeChange('day');
    }
  }

  // AI Smart Rescheduling
  async function handleSmartReschedule() {
    if (rescheduling) return;
    setRescheduling(true);
    try {
      const tasksToSchedule = [...unscheduledTasks, ...overdueTasks].map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        estimated_hours: (t as any).estimated_hours || 1,
        due_date: t.due_date,
        status: t.status,
      }));

      if (tasksToSchedule.length === 0) {
        toast.info('Δεν υπάρχουν tasks για αναδιάταξη');
        setRescheduling(false);
        return;
      }

      const existingSlots = timedTasks.map(t => {
        const d = getTaskDate(t);
        return { id: t.id, due_date: d, estimated_hours: (t as any).estimated_hours || 1 };
      });

      const { data, error } = await supabase.functions.invoke('smart-reschedule', {
        body: { tasks: tasksToSchedule, workSchedule: workSchedules, existingSlots },
      });

      if (error) throw error;

      const assignments = data?.assignments || [];
      if (assignments.length === 0) {
        toast.info('Δεν βρέθηκαν διαθέσιμα slots');
        setRescheduling(false);
        return;
      }

      // Batch update
      await Promise.all(
        assignments.map((a: { task_id: string; due_date: string }) =>
          supabase.from('tasks').update({ due_date: a.due_date } as any).eq('id', a.task_id)
        )
      );

      toast.success(`${assignments.length} tasks τοποθετήθηκαν!`);
      onTaskUpdated();
    } catch (err: any) {
      console.error('Smart reschedule error:', err);
      toast.error('Σφάλμα κατά την αναδιάταξη');
    } finally {
      setRescheduling(false);
    }
  }

  // Current time indicator position
  const currentTimeTop = useMemo(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < HOURS[0] || h > HOURS[HOURS.length - 1]) return null;
    return (h - HOURS[0]) * ROW_HEIGHT + (m / 60) * ROW_HEIGHT;
  }, [now]);

  return (
    <>
      <Card className="border-border/30 shadow-sm relative overflow-hidden">
        <CardHeader className="pb-3 px-5 flex flex-row items-center justify-between">
          <CardTitle className="text-[13px] font-semibold tracking-tight flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
            </span>
            {calendarMode === 'week'
              ? `${format(weekDays[0], 'd MMM', { locale: el })} – ${format(weekDays[6], 'd MMM yyyy', { locale: el })}`
              : format(calendarDate, 'EEEE d MMMM yyyy', { locale: el })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={handleSmartReschedule}
              disabled={rescheduling || backlogCount === 0}
            >
              {rescheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Έξυπνη Αναδιάταξη
            </Button>
            <Button
              variant={backlogOpen ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={() => setBacklogOpen(!backlogOpen)}
            >
              <Inbox className="h-3.5 w-3.5" />
              Backlog
              {backlogCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{backlogCount}</Badge>
              )}
            </Button>
            <div className="border-l border-border/30 pl-2 ml-1" />
            <Button variant="ghost" size="sm" onClick={() => onCalendarDateChange(addDays(calendarDate, calendarMode === 'week' ? -7 : -1))}>←</Button>
            <Button variant="ghost" size="sm" onClick={() => onCalendarDateChange(new Date())}>Σήμερα</Button>
            <Button variant="ghost" size="sm" onClick={() => onCalendarDateChange(addDays(calendarDate, calendarMode === 'week' ? 7 : 1))}>→</Button>
            <div className="border-l border-border/30 pl-2 ml-1 inline-flex gap-1 p-0.5 rounded-[8px] bg-muted/50">
              <Button variant={calendarMode === 'week' ? 'default' : 'ghost'} size="sm" className="h-7 rounded-[6px] text-[12px]" onClick={() => onCalendarModeChange('week')}>Εβδ</Button>
              <Button variant={calendarMode === 'day' ? 'default' : 'ghost'} size="sm" className="h-7 rounded-[6px] text-[12px]" onClick={() => onCalendarModeChange('day')}>Ημέρα</Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex relative">
          {/* Calendar grid */}
          <div className={cn("overflow-auto max-h-[70vh] flex-1 min-w-0 transition-all", backlogOpen && "pr-[280px]")}>
            {/* Day headers */}
            <div className={cn(
              'grid border-b border-border/30 sticky top-0 bg-background z-10',
              calendarMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'
            )}>
              <div className="px-2 py-2" />
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayMilestones = milestonesByDay[key] || [];
                const past = isPastDay(day);
                return (
                  <div
                    key={key}
                    className={cn(
                      'border-l border-border/20 px-1.5 py-2 text-center cursor-pointer hover:bg-accent/20 transition-colors',
                      isToday(day) && 'bg-primary/5',
                      past && 'opacity-50'
                    )}
                    onClick={() => handleDayHeaderClick(day)}
                  >
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{format(day, 'EEE', { locale: el })}</div>
                    <div className={cn('text-lg font-semibold mt-0.5', isToday(day) && 'text-primary')}>{format(day, 'd')}</div>
                    {dayMilestones.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayMilestones.slice(0, 3).map(m => (
                          <div key={m.id} className={cn('text-[9px] leading-tight px-1.5 py-0.5 rounded-full border truncate', MILESTONE_COLORS[m.type])} title={m.label}>{m.label}</div>
                        ))}
                        {dayMilestones.length > 3 && <div className="text-[9px] text-muted-foreground">+{dayMilestones.length - 3}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* All-day row */}
            <div className={cn('grid border-b border-border/30', calendarMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]')}>
              <div className="px-2 py-1.5 text-[10px] text-muted-foreground text-right pr-3">Ολοήμ.</div>
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayAllDay = allDayTasks.filter(t => { const d = getTaskDate(t); return d && isSameDay(parseTaskDate(d), day); });
                const past = isPastDay(day);
                return (
                  <div key={`allday-${key}`}
                    className={cn('border-l border-border/20 px-1 py-1 min-h-[36px] hover:bg-accent/10 transition-colors cursor-pointer', past && 'opacity-50 bg-muted/20')}
                    onDragOver={handleDragOver} onDrop={e => handleDrop(e, day)} onClick={() => handleSlotClick(day)}>
                    {dayAllDay.map(task => (
                      <CalendarTaskPill key={task.id} task={task} onDragStart={e => handleDragStart(e, task.id)}
                        onClick={e => { e.stopPropagation(); onTaskClick(task); }} activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer} />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Hourly grid with relative positioning for multi-hour blocks */}
            <div className="relative">
              {HOURS.map(hour => (
                <div key={hour} className={cn('grid border-b border-border/10', calendarMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]')}>
                  <div className="px-2 py-1 text-[10px] text-muted-foreground text-right pr-3 -mt-1.5 tabular-nums" style={{ height: ROW_HEIGHT }}>
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {days.map(day => {
                    const key = format(day, 'yyyy-MM-dd');
                    const working = isWorkingHour(day, hour);
                    const past = isPastHour(day, hour);
                    const dayTasks = timedTasksByDay[key] || [];
                    // Only render tasks that START at this hour
                    const hourTasks = dayTasks.filter(t => {
                      const d = getTaskDate(t);
                      if (!d) return false;
                      return parseTaskDate(d).getHours() === hour;
                    });

                    return (
                      <div
                        key={`${key}-${hour}`}
                        className={cn(
                          'border-l border-border/20 cursor-pointer transition-colors relative',
                          working && !past && 'bg-primary/[0.03]',
                          past && 'bg-muted/30 opacity-60',
                          !past && !working && 'bg-transparent',
                          draggedTaskId && 'hover:bg-primary/10',
                          !draggedTaskId && !past && 'hover:bg-accent/10',
                        )}
                        style={{ height: ROW_HEIGHT }}
                        onDragOver={handleDragOver}
                        onDrop={e => handleDrop(e, day, hour)}
                        onClick={() => handleSlotClick(day, hour)}
                      >
                        {hourTasks.map((task, idx) => {
                          const estH = (task as any).estimated_hours || 1;
                          const taskH = Math.max(estH, 0.5) * ROW_HEIGHT;
                          const dateStr = getTaskDate(task)!;
                          const dt = parseTaskDate(dateStr);
                          const minuteOffset = (dt.getMinutes() / 60) * ROW_HEIGHT;
                          return (
                            <div
                              key={task.id}
                              className="absolute left-0.5 right-0.5 z-10"
                              style={{ top: minuteOffset, height: taskH - 2 }}
                            >
                              <MultiHourTaskBlock
                                task={task}
                                height={taskH - 2}
                                onDragStart={e => handleDragStart(e, task.id)}
                                onClick={e => { e.stopPropagation(); onTaskClick(task); }}
                                activeTimer={activeTimer}
                                startTimer={startTimer}
                                stopTimer={stopTimer}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Current time indicator */}
              {currentTimeTop !== null && days.some(d => isToday(d)) && (
                <div
                  className="absolute pointer-events-none z-20"
                  style={{
                    top: currentTimeTop,
                    left: 60,
                    right: 0,
                  }}
                >
                  {calendarMode === 'week' ? (
                    // Position only over today's column
                    (() => {
                      const todayIdx = days.findIndex(d => isToday(d));
                      if (todayIdx < 0) return null;
                      const colWidth = `calc((100%) / 7)`;
                      return (
                        <div
                          className="absolute"
                          style={{
                            left: `calc(${todayIdx} * (100% / 7))`,
                            width: colWidth,
                          }}
                        >
                          <div className="flex items-center">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0" />
                            <div className="flex-1 border-t-2 border-red-500" />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0" />
                      <div className="flex-1 border-t-2 border-red-500" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Backlog Side Panel */}
          {backlogOpen && (
            <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-card border-l border-border/30 z-20 flex flex-col animate-in slide-in-from-right-5">
              <div className="p-3 border-b border-border/20 flex items-center justify-between">
                <h3 className="text-xs font-semibold">Backlog</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBacklogOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-3">
                  {overdueTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-1 mb-1.5">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span className="text-[10px] font-semibold text-destructive uppercase tracking-wide">Εκπρόθεσμα ({overdueTasks.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {overdueTasks.map(task => (
                          <BacklogTaskItem key={task.id} task={task} onDragStart={e => handleDragStart(e, task.id)} onClick={() => onTaskClick(task)} isOverdue />
                        ))}
                      </div>
                    </div>
                  )}
                  {unscheduledTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-1 mb-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Χωρίς ημερομηνία ({unscheduledTasks.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {unscheduledTasks.map(task => (
                          <BacklogTaskItem key={task.id} task={task} onDragStart={e => handleDragStart(e, task.id)} onClick={() => onTaskClick(task)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {backlogCount === 0 && (
                    <div className="text-center text-[11px] text-muted-foreground py-8">Κανένα task στο backlog 🎉</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={!!createDialog} onOpenChange={(open) => !open && setCreateDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Νέο Task</DialogTitle>
            {createDialog && (
              <p className="text-sm text-muted-foreground">
                {format(createDialog.date, 'EEEE d MMMM', { locale: el })}
                {createDialog.hour !== undefined && ` στις ${String(createDialog.hour).padStart(2, '0')}:00`}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleCreateTask(); }} className="space-y-4">
            <Input placeholder="Τίτλος task..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setCreateDialog(null)}>Ακύρωση</Button>
              <Button type="submit" disabled={!newTaskTitle.trim() || creating} className="gap-1.5"><Plus className="h-4 w-4" /> Δημιουργία</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Multi-Hour Task Block ──
function MultiHourTaskBlock({ task, height, onDragStart, onClick, activeTimer, startTimer, stopTimer }: {
  task: TaskItem; height: number; onDragStart: (e: React.DragEvent) => void; onClick: (e: React.MouseEvent) => void;
  activeTimer: any; startTimer: any; stopTimer: any;
}) {
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;
  const dateStr = getTaskDate(task);
  const isOverdue = dateStr && isBefore(startOfDay(parseTaskDate(dateStr)), startOfDay(new Date())) && task.status !== 'completed';
  const estH = (task as any).estimated_hours || 1;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'group flex flex-col rounded-[6px] border px-1.5 py-1 cursor-grab active:cursor-grabbing transition-colors text-[11px] overflow-hidden',
        isOverdue
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground'
      )}
      style={{ height: '100%' }}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="flex-1 min-w-0 truncate font-medium">{task.title}</span>
        {dateStr && <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{format(parseTaskDate(dateStr), 'HH:mm')}</span>}
        {!isRunning ? (
          <button className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); startTimer(task.id, task.project_id); }}><Play className="h-2.5 w-2.5" /></button>
        ) : (
          <button className="h-4 w-4 flex items-center justify-center text-primary shrink-0"
            onClick={e => { e.stopPropagation(); stopTimer(); }}><Square className="h-2.5 w-2.5" /></button>
        )}
      </div>
      {estH > 1 && (
        <div className="text-[9px] text-muted-foreground mt-0.5">{estH}h</div>
      )}
      {task.project?.name && height > 40 && (
        <div className="text-[9px] text-muted-foreground truncate mt-auto">{task.project.name}</div>
      )}
    </div>
  );
}

// ── Backlog Task Item ──
function BacklogTaskItem({ task, onDragStart, onClick, isOverdue }: {
  task: TaskItem; onDragStart: (e: React.DragEvent) => void; onClick: () => void; isOverdue?: boolean;
}) {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className={cn('group flex items-start gap-1.5 rounded-md border px-2 py-1.5 cursor-grab active:cursor-grabbing transition-colors text-[11px]',
        isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border/30 bg-card hover:bg-accent/20')}>
      <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{task.title}</div>
        {task.project?.name && <div className="text-[10px] text-muted-foreground truncate">{task.project.name}</div>}
        {isOverdue && task.due_date && <div className="text-[9px] text-destructive mt-0.5">{format(parseTaskDate(task.due_date), 'd MMM', { locale: el })}</div>}
      </div>
    </div>
  );
}

// ── Calendar Task Pill (for all-day row) ──
function CalendarTaskPill({ task, onDragStart, onClick, activeTimer, startTimer, stopTimer, showTime }: {
  task: TaskItem; onDragStart: (e: React.DragEvent) => void; onClick: (e: React.MouseEvent) => void;
  activeTimer: any; startTimer: any; stopTimer: any; showTime?: boolean;
}) {
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;
  const dateStr = getTaskDate(task);
  const isOverdue = dateStr && isBefore(startOfDay(parseTaskDate(dateStr)), startOfDay(new Date())) && task.status !== 'completed';

  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className={cn('group flex items-center gap-1 rounded-[6px] border px-1.5 py-1 mb-0.5 cursor-grab active:cursor-grabbing transition-colors text-[11px]',
        isOverdue ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border/30 bg-card hover:bg-accent/20')}>
      <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="flex-1 min-w-0 truncate font-medium">{task.title}</span>
      {showTime && dateStr && <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{format(parseTaskDate(dateStr), 'HH:mm')}</span>}
      {!isRunning ? (
        <button className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); startTimer(task.id, task.project_id); }}><Play className="h-2.5 w-2.5" /></button>
      ) : (
        <button className="h-4 w-4 flex items-center justify-center text-primary shrink-0"
          onClick={e => { e.stopPropagation(); stopTimer(); }}><Square className="h-2.5 w-2.5" /></button>
      )}
    </div>
  );
}
