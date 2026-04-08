import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CheckSquare, Play, Square, ChevronDown, ChevronRight, GripVertical,
  CheckCircle2, Plus, ArrowUpDown, Calendar as CalendarIcon, ListChecks,
} from 'lucide-react';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/components/shared/mondayStyleConfig';

import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──
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

interface MyProject {
  id: string;
  name: string;
  status: string;
  progress: number | null;
  parent_project_id: string | null;
  client?: { name: string } | null;
}

type SortMode = 'manual' | 'date' | 'priority' | 'project' | 'status';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Χειροκίνητα' },
  { value: 'date', label: 'Ημερομηνία' },
  { value: 'priority', label: 'Προτεραιότητα' },
  { value: 'project', label: 'Project' },
  { value: 'status', label: 'Status' },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function getStatusLabel(s: string) { return STATUS_COLORS[s]?.label || s; }
function getStatusStyle(s: string): React.CSSProperties {
  const c = STATUS_COLORS[s]; return c ? { backgroundColor: c.bg, color: c.text } : {};
}

// ── Props ──
interface TodayTasksCardProps {
  todayTasks: TaskItem[];
  onTaskComplete: (task: TaskItem) => void;
  onTaskClick: (task: TaskItem) => void;
  activeTimer: any;
  startTimer: (taskId: string, projectId: string) => void;
  stopTimer: () => void;
  userId: string;
  myProjects: MyProject[];
  onTaskCreated: () => void;
  onTaskUpdated: (taskId: string, updates: Partial<TaskItem>) => void;
}

export function TodayTasksCard({
  todayTasks, onTaskComplete, onTaskClick, activeTimer, startTimer, stopTimer,
  userId, myProjects, onTaskCreated, onTaskUpdated,
}: TodayTasksCardProps) {
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [subtasksData, setSubtasksData] = useState<Record<string, TaskItem[]>>({});
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, number>>({});
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddProject, setQuickAddProject] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Fetch subtask counts on mount
  useMemo(() => {
    const ids = todayTasks.map(t => t.id);
    if (ids.length === 0) return;
    supabase
      .from('tasks')
      .select('parent_task_id')
      .in('parent_task_id', ids)
      .neq('status', 'completed' as any)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          counts[row.parent_task_id] = (counts[row.parent_task_id] || 0) + 1;
        });
        setSubtaskCounts(counts);
      });
  }, [todayTasks]);

  const sortedTasks = useMemo(() => {
    const tasks = [...todayTasks];
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortMode) {
      case 'date':
        return tasks.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return dir * (new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        });
      case 'priority':
        return tasks.sort((a, b) => dir * ((PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)));
      case 'project':
        return tasks.sort((a, b) => dir * ((a.project as any)?.name || '').localeCompare((b.project as any)?.name || ''));
      case 'status':
        return tasks.sort((a, b) => dir * a.status.localeCompare(b.status));
      case 'manual':
        if (manualOrder.length === 0) return tasks;
        return tasks.sort((a, b) => {
          const ai = manualOrder.indexOf(a.id);
          const bi = manualOrder.indexOf(b.id);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
      default:
        return tasks;
    }
  }, [todayTasks, sortMode, sortDir, manualOrder]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedTasks.findIndex(t => t.id === active.id);
    const newIndex = sortedTasks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(sortedTasks, oldIndex, newIndex);
    setManualOrder(reordered.map(t => t.id));
    setSortMode('manual');
  }

  async function toggleSubtasks(taskId: string) {
    const next = new Set(expandedSubtasks);
    if (next.has(taskId)) {
      next.delete(taskId);
      setExpandedSubtasks(next);
      return;
    }
    next.add(taskId);
    setExpandedSubtasks(next);
    if (!subtasksData[taskId]) {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, start_date, estimated_hours, actual_hours, progress, project_id, deliverable_id, assigned_to')
        .eq('parent_task_id', taskId)
        .neq('status', 'completed' as any)
        .order('created_at');
      setSubtasksData(prev => ({ ...prev, [taskId]: (data || []) as TaskItem[] }));
    }
  }

  async function handleQuickAdd() {
    if (!quickAddTitle.trim() || !quickAddProject) return;
    setQuickAddLoading(true);
    const { error } = await supabase.from('tasks').insert({
      title: quickAddTitle.trim(),
      project_id: quickAddProject,
      assigned_to: userId,
      due_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'todo' as any,
      priority: 'medium' as any,
    } as any);
    if (!error) {
      toast.success('Task δημιουργήθηκε!');
      setQuickAddTitle('');
      setQuickAddOpen(false);
      onTaskCreated();
    } else {
      toast.error('Σφάλμα δημιουργίας');
    }
    setQuickAddLoading(false);
  }

  async function updateTaskField(taskId: string, field: string, value: any) {
    const { error } = await supabase.from('tasks').update({ [field]: value } as any).eq('id', taskId);
    if (!error) {
      toast.success('Ενημερώθηκε');
      onTaskUpdated(taskId, { [field]: value });
    }
  }

  return (
    <Card className="border-border/30 shadow-sm">
      <CardHeader className="pb-3 px-5">
        <CardTitle className="text-[13px] font-semibold tracking-tight flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
          </span>
          Tasks Σήμερα
          <Badge variant="secondary" className="text-[10px] ml-1">{todayTasks.length}</Badge>
          <div className="ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-muted-foreground px-2">
                  <ArrowUpDown className="h-3 w-3" />
                  {SORT_OPTIONS.find(o => o.value === sortMode)?.label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="end">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={cn(
                      "w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-colors flex items-center justify-between",
                      sortMode === opt.value && "bg-accent font-medium"
                    )}
                    onClick={() => {
                      if (sortMode === opt.value && opt.value !== 'manual') {
                        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortMode(opt.value);
                        setSortDir('asc');
                      }
                    }}
                  >
                    {opt.label}
                    {sortMode === opt.value && opt.value !== 'manual' && (
                      <span className="text-[10px] text-muted-foreground">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedTasks.length === 0 && !quickAddOpen ? (
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Κανένα task για σήμερα 🎉</p>
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary" onClick={() => setQuickAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Νέο Task
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="overflow-y-auto max-h-[60vh]">
                {sortedTasks.map((task, index) => (
                  <div key={task.id}>
                    <SortableTaskRow
                      task={task}
                      index={index}
                      onComplete={() => onTaskComplete(task)}
                      onClick={() => onTaskClick(task)}
                      activeTimer={activeTimer}
                      startTimer={startTimer}
                      stopTimer={stopTimer}
                      hasSubtasks={(subtaskCounts[task.id] || 0) > 0}
                      subtaskCount={subtaskCounts[task.id] || 0}
                      subtasksExpanded={expandedSubtasks.has(task.id)}
                      onToggleSubtasks={() => toggleSubtasks(task.id)}
                      onUpdateDate={(d) => updateTaskField(task.id, 'due_date', d)}
                      onUpdateStatus={(s) => updateTaskField(task.id, 'status', s)}
                      isDragEnabled={sortMode === 'manual'}
                    />
                    {/* Subtasks */}
                    {expandedSubtasks.has(task.id) && subtasksData[task.id]?.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 pl-14 pr-4 py-1.5 hover:bg-accent/10 transition-colors">
                        <span className="text-[10px] text-muted-foreground w-4" />
                        <ListChecks className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[12px] text-foreground flex-1 truncate">{sub.title}</span>
                        <span className="text-[10px] font-medium rounded-[6px] px-1.5 py-0.5" style={getStatusStyle(sub.status)}>
                          {getStatusLabel(sub.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Quick add */}
                {quickAddOpen ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/20">
                    <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                    <Input
                      value={quickAddTitle}
                      onChange={e => setQuickAddTitle(e.target.value)}
                      placeholder="Τίτλος task..."
                      className="h-7 text-sm flex-1 border-0 bg-transparent focus-visible:ring-0 px-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') setQuickAddOpen(false); }}
                    />
                    <Select value={quickAddProject} onValueChange={setQuickAddProject}>
                      <SelectTrigger className="h-7 w-32 text-[11px] border-0 bg-muted/30">
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {myProjects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-[12px]">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-7 text-[11px] px-3" onClick={handleQuickAdd} disabled={quickAddLoading || !quickAddTitle.trim() || !quickAddProject}>
                      Προσθήκη
                    </Button>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-accent/20 transition-colors border-t border-border/20"
                    onClick={() => setQuickAddOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Νέο Task
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sortable Task Row ──
function SortableTaskRow({
  task, index, onComplete, onClick, activeTimer, startTimer, stopTimer,
  hasSubtasks, subtaskCount, subtasksExpanded, onToggleSubtasks,
  onUpdateDate, onUpdateStatus, isDragEnabled,
}: {
  task: TaskItem;
  index: number;
  onComplete: () => void;
  onClick: () => void;
  activeTimer: any;
  startTimer: (taskId: string, projectId: string) => void;
  stopTimer: () => void;
  hasSubtasks: boolean;
  subtaskCount: number;
  subtasksExpanded: boolean;
  onToggleSubtasks: () => void;
  onUpdateDate: (date: string) => void;
  onUpdateStatus: (status: string) => void;
  isDragEnabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const isOverdue = task.due_date && isBefore(startOfDay(new Date(task.due_date)), startOfDay(new Date()));
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 px-3 py-2 hover:bg-accent/20 transition-colors border-b border-border/10",
        isDragging && "opacity-50 z-50 bg-card shadow-lg",
      )}
    >
      {/* Drag handle */}
      {isDragEnabled ? (
        <button {...attributes} {...listeners} className="opacity-0 group-hover:opacity-60 transition-opacity cursor-grab shrink-0 touch-none">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : (
        <span className="w-[14px] shrink-0" />
      )}

      {/* Row number */}
      <span className="text-[10px] text-muted-foreground w-5 text-right tabular-nums shrink-0">{index + 1}.</span>

      {/* Hover-only completion icon */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-success"
        onClick={e => { e.stopPropagation(); onComplete(); }}
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>

      {/* Subtask toggle */}
      {hasSubtasks ? (
        <button className="shrink-0 text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); onToggleSubtasks(); }}>
          {subtasksExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
      ) : (
        <span className="w-3 shrink-0" />
      )}

      {/* Title + project */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <span className="text-sm text-foreground hover:text-primary truncate block leading-tight">{task.title}</span>
        {(task.project as any)?.name && (
          <span className="text-[10px] text-muted-foreground truncate block leading-tight">{(task.project as any).name}</span>
        )}
      </div>

      {/* Subtask count badge */}
      {hasSubtasks && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">{subtaskCount}</Badge>
      )}

      {/* Inline date */}
      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "text-[10px] shrink-0 px-1.5 py-0.5 rounded hover:bg-muted transition-colors",
              isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
            )}
            onClick={e => e.stopPropagation()}
          >
            {task.due_date ? format(new Date(task.due_date), 'd/MM') : '-'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={task.due_date ? new Date(task.due_date) : undefined}
            onSelect={(date) => {
              if (date) {
                onUpdateDate(format(date, 'yyyy-MM-dd'));
                setDatePopoverOpen(false);
              }
            }}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Inline status */}
      <Select
        value={task.status}
        onValueChange={(val) => { onUpdateStatus(val); }}
      >
        <SelectTrigger
          className="h-5 border-0 bg-transparent gap-0.5 px-1.5 py-0 focus:ring-0 focus:ring-offset-0 w-auto shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-[10px] font-medium rounded-[6px] px-1.5 py-0.5" style={getStatusStyle(task.status)}>
            {getStatusLabel(task.status)}
          </span>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: val.bg }} />
                <span>{val.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Timer */}
      {!isRunning ? (
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-[10px] text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => { e.stopPropagation(); startTimer(task.id, task.project_id); }}>
          <Play className="h-3 w-3" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-[10px] text-primary shrink-0" onClick={e => { e.stopPropagation(); stopTimer(); }}>
          <Square className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
