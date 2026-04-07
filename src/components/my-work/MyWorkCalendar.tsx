import { useState, useEffect, useMemo } from 'react';
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
  CalendarDays, Play, Square, Plus, GripVertical, X, Inbox, AlertTriangle, Clock,
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
}

interface Milestone {
  id: string;
  label: string;
  date: string;
  type: 'project_start' | 'project_end' | 'contract_start' | 'contract_end' | 'deliverable';
  color: string;
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

function getTaskDate(task: TaskItem): string | null {
  return task.due_date || task.start_date || null;
}

// Parse date string handling date-only strings (YYYY-MM-DD) as local dates
function parseTaskDate(dateStr: string): Date {
  // If it's a date-only string (no T), parse as local date to avoid timezone shift
  if (dateStr.length === 10 || !dateStr.includes('T')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

function isAllDay(dateStr: string | null): boolean {
  if (!dateStr) return true;
  // Date-only strings are always all-day
  if (dateStr.length === 10 || !dateStr.includes('T')) return true;
  const d = new Date(dateStr);
  return d.getHours() === 0 && d.getMinutes() === 0;
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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<{ date: Date; hour?: number } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [backlogOpen, setBacklogOpen] = useState(false);

  useEffect(() => { fetchMilestones(); }, [user]);

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
                return (
                  <div key={key} className={cn('border-l border-border/20 px-1.5 py-2 text-center', isToday(day) && 'bg-primary/5')}>
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
                return (
                  <div key={`allday-${key}`} className="border-l border-border/20 px-1 py-1 min-h-[36px] hover:bg-accent/10 transition-colors cursor-pointer"
                    onDragOver={handleDragOver} onDrop={e => handleDrop(e, day)} onClick={() => handleSlotClick(day)}>
                    {dayAllDay.map(task => (
                      <CalendarTaskPill key={task.id} task={task} onDragStart={e => handleDragStart(e, task.id)}
                        onClick={e => { e.stopPropagation(); onTaskClick(task); }} activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer} />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Hourly grid */}
            {HOURS.map(hour => (
              <div key={hour} className={cn('grid border-b border-border/10', calendarMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]', 'min-h-[52px]')}>
                <div className="px-2 py-1 text-[10px] text-muted-foreground text-right pr-3 -mt-1.5 tabular-nums">{String(hour).padStart(2, '0')}:00</div>
                {days.map(day => {
                  const key = format(day, 'yyyy-MM-dd');
                  const hourTasks = timedTasks.filter(t => { const d = getTaskDate(t); if (!d) return false; const dt = new Date(d); return isSameDay(dt, day) && dt.getHours() === hour; });
                  return (
                    <div key={`${key}-${hour}`} className={cn('border-l border-border/20 px-0.5 py-0.5 cursor-pointer hover:bg-accent/10 transition-colors', draggedTaskId && 'hover:bg-primary/10')}
                      onDragOver={handleDragOver} onDrop={e => handleDrop(e, day, hour)} onClick={() => handleSlotClick(day, hour)}>
                      {hourTasks.map(task => (
                        <CalendarTaskPill key={task.id} task={task} onDragStart={e => handleDragStart(e, task.id)}
                          onClick={e => { e.stopPropagation(); onTaskClick(task); }} activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer} showTime />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
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
        {isOverdue && task.due_date && <div className="text-[9px] text-destructive mt-0.5">{format(new Date(task.due_date), 'd MMM', { locale: el })}</div>}
      </div>
    </div>
  );
}

// ── Calendar Task Pill ──
function CalendarTaskPill({ task, onDragStart, onClick, activeTimer, startTimer, stopTimer, showTime }: {
  task: TaskItem; onDragStart: (e: React.DragEvent) => void; onClick: (e: React.MouseEvent) => void;
  activeTimer: any; startTimer: any; stopTimer: any; showTime?: boolean;
}) {
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;
  const dateStr = getTaskDate(task);
  const isOverdue = dateStr && isBefore(startOfDay(new Date(dateStr)), startOfDay(new Date())) && task.status !== 'completed';

  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className={cn('group flex items-center gap-1 rounded-[6px] border px-1.5 py-1 mb-0.5 cursor-grab active:cursor-grabbing transition-colors text-[11px]',
        isOverdue ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border/30 bg-card hover:bg-accent/20')}>
      <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="flex-1 min-w-0 truncate font-medium">{task.title}</span>
      {showTime && dateStr && <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{format(new Date(dateStr), 'HH:mm')}</span>}
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