import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useLeaveManagement } from '@/hooks/useLeaveManagement';
import { useXPEngine } from '@/hooks/useXPEngine';
import { useUserXP } from '@/hooks/useUserXP';
import { XPBadge } from '@/components/gamification/XPBadge';
import { LevelProgressBar } from '@/components/gamification/LevelProgressBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { briefDefinitions } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';
import { getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckSquare, Clock, AlertTriangle, Play, Square, ArrowRight,
  Plus, CalendarDays, Timer, FileText, FolderKanban,
  ChevronRight, Palmtree, Check, X, GripVertical, ExternalLink,
  Palette, Monitor, Globe, Calendar, MessageSquare, BarChart3,
  FileArchive, Flag,
  ChevronDown, Crosshair, Inbox, Zap,
} from 'lucide-react';
import { format, isBefore, startOfDay, endOfWeek, startOfTomorrow, isAfter } from 'date-fns';
import { el } from 'date-fns/locale';
import { useFocusMode } from '@/contexts/FocusContext';
import { PendingApprovalsCard } from '@/components/work/PendingApprovalsCard';

// ── Types ──────────────────────────────────────────
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
  client?: { name: string } | null;
}



const TASK_SELECT = 'id, title, status, priority, due_date, start_date, estimated_hours, actual_hours, progress, task_type, task_category, project_id, description, assigned_to, internal_reviewer, project:projects(name)';

// ── Helpers ────────────────────────────────────────
function getStatusLabel(s: string) {
  switch (s) {
    case 'todo': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'in_review': return 'In Review';
    case 'review': return 'Review';
    case 'completed': return 'Done';
    default: return s;
  }
}
function getStatusVariant(s: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'in_progress': return 'default';
    case 'in_review': case 'review': return 'secondary';
    case 'completed': return 'outline';
    default: return 'outline';
  }
}
function getPriorityColor(p: string) {
  switch (p) {
    case 'high': case 'urgent': return 'destructive' as const;
    case 'medium': return 'secondary' as const;
    default: return 'outline' as const;
  }
}
function getOrderKey(userId: string) {
  return `my-work-task-order-${userId}-${format(new Date(), 'yyyy-MM-dd')}`;
}

// ── Task Table Header ──────────────────────────────
function TaskTableHeader({ draggable = false }: { draggable?: boolean }) {
  return (
    <thead>
      <tr className="border-b border-border/50 text-xs text-muted-foreground">
        {draggable && <th className="w-8 py-2 px-2" />}
        <th className="w-8 py-2 px-2" />
        <th className="py-2 px-2 text-left font-medium">Task</th>
        <th className="py-2 px-2 text-left font-medium hidden md:table-cell">Έργο</th>
        <th className="py-2 px-2 text-left font-medium hidden sm:table-cell">Έναρξη</th>
        <th className="py-2 px-2 text-left font-medium hidden sm:table-cell">Λήξη</th>
        <th className="py-2 px-2 text-left font-medium">Status</th>
        <th className="py-2 px-2 text-left font-medium hidden sm:table-cell">Priority</th>
        <th className="w-10 py-2 px-2" />
        <th className="w-8 py-2 px-2" />
      </tr>
    </thead>
  );
}

// ── Flag Button ────────────────────────────────────
function FlagButton({ task, onToggle }: { task: TaskWithProject; onToggle: (task: TaskWithProject) => void }) {
  const isUrgent = task.priority === 'urgent';
  const isHigh = task.priority === 'high';
  return (
    <Button
      size="icon"
      variant="ghost"
      className={`h-7 w-7 ${isUrgent ? 'text-destructive hover:text-destructive' : isHigh ? 'text-orange-500 hover:text-orange-500' : 'text-muted-foreground hover:text-muted-foreground'}`}
      onClick={(e) => { e.stopPropagation(); onToggle(task); }}
      title={isUrgent ? 'Αφαίρεση σήμανσης Επείγον' : 'Σήμανση ως Επείγον'}
    >
      <Flag className={`h-3.5 w-3.5 ${isUrgent ? 'fill-destructive' : ''}`} />
    </Button>
  );
}

// ── Sortable Task Row ──────────────────────────────
function SortableTaskRow({
  task, today, onComplete, onOpenSheet, activeTimer, startTimer, stopTimer, onFlagToggle, showDate = false, draggable = false,
}: {
  task: TaskWithProject; today: Date; onComplete: (t: TaskWithProject) => void;
  onOpenSheet: (t: TaskWithProject) => void; activeTimer: any; startTimer: any; stopTimer: any;
  onFlagToggle: (task: TaskWithProject) => void;
  showDate?: boolean; draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = draggable ? { transform: CSS.Transform.toString(transform), transition } : undefined;
  const isOverdue = task.due_date && isBefore(new Date(task.due_date), today);

  return (
    <tr
      ref={draggable ? setNodeRef : undefined}
      style={style}
      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {draggable && (
        <td className="py-2.5 px-2 w-8">
          <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="py-2.5 px-2 w-8">
        <Checkbox className="h-4 w-4" onCheckedChange={() => onComplete(task)} />
      </td>
      <td className="py-2.5 px-2 cursor-pointer" onClick={() => onOpenSheet(task)}>
        <span className="text-sm font-medium text-foreground hover:text-primary">{task.title}</span>
      </td>
      <td className="py-2.5 px-2 hidden md:table-cell">
        <span className="text-xs text-muted-foreground truncate">{(task.project as any)?.name || '-'}</span>
      </td>
      <td className="py-2.5 px-2 hidden sm:table-cell">
        <span className="text-xs text-muted-foreground">{task.start_date ? format(new Date(task.start_date), 'd/MM') : '-'}</span>
      </td>
      <td className="py-2.5 px-2 hidden sm:table-cell">
        <span className={`text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          {task.due_date ? format(new Date(task.due_date), 'd/MM') : '-'}
        </span>
      </td>
      <td className="py-2.5 px-2">
        <Badge variant={getStatusVariant(task.status)} className="text-[10px]">{getStatusLabel(task.status)}</Badge>
      </td>
      <td className="py-2.5 px-2 hidden sm:table-cell">
        <Badge variant={getPriorityColor(task.priority)} className="text-[10px]">{task.priority}</Badge>
      </td>
      <td className="py-2.5 px-2 w-10">
        {!activeTimer?.is_running || activeTimer.task_id !== task.id ? (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => startTimer(task.id, task.project_id)}>
            <Play className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => stopTimer()}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}
      </td>
      <td className="py-2.5 px-2 w-8">
        <FlagButton task={task} onToggle={onFlagToggle} />
      </td>
    </tr>
  );
}

// ── Backlog Task Row (simpler, draggable) ──────────
function BacklogTaskRow({
  task, today, onComplete, onOpenSheet, activeTimer, startTimer, stopTimer, onFlagToggle,
}: {
  task: TaskWithProject; today: Date; onComplete: (t: TaskWithProject) => void;
  onOpenSheet: (t: TaskWithProject) => void; activeTimer: any; startTimer: any; stopTimer: any;
  onFlagToggle: (task: TaskWithProject) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 transition-colors ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox className="h-4 w-4 shrink-0" onCheckedChange={() => onComplete(task)} />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenSheet(task)}>
        <p className="text-sm font-medium text-foreground hover:text-primary truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground truncate">{(task.project as any)?.name || '-'}</p>
      </div>
      <Badge variant={getPriorityColor(task.priority)} className="text-[10px] shrink-0 hidden sm:flex">{task.priority}</Badge>
      {!activeTimer?.is_running || activeTimer.task_id !== task.id ? (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0" onClick={() => startTimer(task.id, task.project_id)}>
          <Play className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary shrink-0" onClick={() => stopTimer()}>
          <Square className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── Droppable Container ────────────────────────────
function DroppableContainer({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[100px] transition-colors rounded-lg ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''} ${className || ''}`}>
      {children}
    </div>
  );
}

// ── Attention Panel ────────────────────────────────
function AttentionPanel({
  overdueTasks, highPriorityTasks, internalReviewTasks, approvalTasks, attentionCount,
  onOpenTask, onFlagToggle, onApproveInternal, onRejectInternal, onApproveClient, onRejectClient,
  activeTimer, startTimer, stopTimer,
}: {
  overdueTasks: TaskWithProject[];
  highPriorityTasks: TaskWithProject[];
  internalReviewTasks: TaskWithProject[];
  approvalTasks: TaskWithProject[];
  attentionCount: number;
  onOpenTask: (t: TaskWithProject) => void;
  onFlagToggle: (t: TaskWithProject) => void;
  onApproveInternal: (t: TaskWithProject) => void;
  onRejectInternal: (t: TaskWithProject) => void;
  onApproveClient: (t: TaskWithProject) => void;
  onRejectClient: (t: TaskWithProject) => void;
  activeTimer: any;
  startTimer: any;
  stopTimer: any;
}) {
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [highOpen, setHighOpen] = useState(true);

  const SectionHeader = ({ emoji, label, count, open, onToggle }: { emoji: string; label: string; count: number; open: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 md:px-6 py-2 border-b border-border/50 hover:bg-muted/30 transition-colors text-left"
    >
      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
      <span className="text-xs font-semibold">{emoji} {label} ({count})</span>
    </button>
  );

  const TaskMiniRow = ({ task, isOverdue }: { task: TaskWithProject; isOverdue?: boolean }) => (
    <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenTask(task)}>
        <p className="text-sm font-medium text-foreground hover:text-primary truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{(task.project as any)?.name || '-'}</span>
          {task.due_date && (
            <span className={`text-xs font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              · {format(new Date(task.due_date), 'd/MM', { locale: el })}{isOverdue ? ' !!!' : ''}
            </span>
          )}
        </div>
      </div>
      <Badge variant={getStatusVariant(task.status)} className="text-[10px] hidden sm:flex">{getStatusLabel(task.status)}</Badge>
      {!activeTimer?.is_running || activeTimer.task_id !== task.id ? (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0" onClick={() => startTimer(task.id, task.project_id)}>
          <Play className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary shrink-0" onClick={() => stopTimer()}>
          <Square className="h-3.5 w-3.5" />
        </Button>
      )}
      <FlagButton task={task} onToggle={onFlagToggle} />
    </div>
  );

  return (
    <Card className="border-destructive/20 border">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Απαιτούν Προσοχή
          <Badge variant="destructive" className="text-xs ml-1">{attentionCount}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Εκπρόθεσμα */}
        {overdueTasks.length > 0 && (
          <>
            <SectionHeader emoji="🔴" label="Εκπρόθεσμα" count={overdueTasks.length} open={overdueOpen} onToggle={() => setOverdueOpen(v => !v)} />
            {overdueOpen && (
              <div className="divide-y divide-border/50">
                {overdueTasks.map(task => <TaskMiniRow key={task.id} task={task} isOverdue />)}
              </div>
            )}
          </>
        )}

        {/* Υψηλή Προτεραιότητα */}
        {highPriorityTasks.length > 0 && (
          <>
            <SectionHeader emoji="🟠" label="Υψηλή Προτεραιότητα" count={highPriorityTasks.length} open={highOpen} onToggle={() => setHighOpen(v => !v)} />
            {highOpen && (
              <div className="divide-y divide-border/50">
                {highPriorityTasks.map(task => <TaskMiniRow key={task.id} task={task} />)}
              </div>
            )}
          </>
        )}

        {/* Εσωτερική Έγκριση */}
        {internalReviewTasks.length > 0 && (
          <>
            <div className="px-4 md:px-6 py-2 bg-muted/20 border-b border-border/50">
              <span className="text-xs font-semibold">🏢 Εσωτερική Έγκριση ({internalReviewTasks.length})</span>
            </div>
            <div className="divide-y divide-border/50">
              {internalReviewTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 md:px-6 py-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenTask(task)}>
                    <p className="text-sm font-medium text-foreground hover:text-primary">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{(task.project as any)?.name}</p>
                      {(task as any).assignee?.full_name && <span className="text-xs text-muted-foreground">· {(task as any).assignee.full_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => onApproveInternal(task)}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRejectInternal(task)}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Έγκριση Πελάτη */}
        {approvalTasks.length > 0 && (
          <>
            <div className="px-4 md:px-6 py-2 bg-muted/20 border-b border-border/50">
              <span className="text-xs font-semibold">🤝 Έγκριση Πελάτη ({approvalTasks.length})</span>
            </div>
            <div className="divide-y divide-border/50">
              {approvalTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 md:px-6 py-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenTask(task)}>
                    <p className="text-sm font-medium text-foreground hover:text-primary">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{(task.project as any)?.name}</p>
                  </div>
                  <Badge variant={getPriorityColor(task.priority)} className="text-[10px]">{task.priority}</Badge>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => onApproveClient(task)}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRejectClient(task)}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}



// ── Main Page ──────────────────────────────────────
export default function MyWork() {
  const { user, profile, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { enterFocus } = useFocusMode();
  const { activeTimer, elapsed, formatElapsed, startTimer, stopTimer } = useTimeTracking();
  const { balances, pendingApprovals, approveRequest, rejectRequest } = useLeaveManagement();
  const { awardTaskXP } = useXPEngine();

  const [todayTasks, setTodayTasks] = useState<TaskWithProject[]>([]);
  const [weekTasks, setWeekTasks] = useState<TaskWithProject[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskWithProject[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<TaskWithProject[]>([]);
  const [approvalTasks, setApprovalTasks] = useState<TaskWithProject[]>([]);
  const [internalReviewTasks, setInternalReviewTasks] = useState<TaskWithProject[]>([]);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);
  const [backlogOpen, setBacklogOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Καλημέρα' : h < 17 ? 'Καλό απόγευμα' : 'Καλησπέρα';
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const today = startOfDay(new Date());
  const todayStr = format(new Date(), 'EEEE d MMMM yyyy', { locale: el });

  useEffect(() => { if (user) fetchAll(); }, [user]);

  // Load order from localStorage when todayTasks change
  useEffect(() => {
    if (!user || todayTasks.length === 0) { setOrderedIds(todayTasks.map(t => t.id)); return; }
    const saved = localStorage.getItem(getOrderKey(user.id));
    if (saved) {
      try {
        const savedIds: string[] = JSON.parse(saved);
        const currentIds = new Set(todayTasks.map(t => t.id));
        const ordered = savedIds.filter(id => currentIds.has(id));
        const newIds = todayTasks.map(t => t.id).filter(id => !new Set(ordered).has(id));
        setOrderedIds([...ordered, ...newIds]);
      } catch { setOrderedIds(todayTasks.map(t => t.id)); }
    } else {
      setOrderedIds(todayTasks.map(t => t.id));
    }
  }, [todayTasks, user]);

  const orderedTodayTasks = useMemo(() => {
    const map = new Map(todayTasks.map(t => [t.id, t]));
    return orderedIds.map(id => map.get(id)).filter(Boolean) as TaskWithProject[];
  }, [orderedIds, todayTasks]);

  async function fetchAll() {
    if (!user) return;
    setLoading(true);

    const todayISO = format(today, 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const tomorrowISO = format(startOfTomorrow(), 'yyyy-MM-dd');

    const [allMyTasks, approvalRes, internalReviewRes, projects, timeEntries] = await Promise.all([
      supabase.from('tasks').select(TASK_SELECT).eq('assigned_to', user.id).neq('status', 'completed').order('due_date', { ascending: true }),
      supabase.from('tasks').select(TASK_SELECT + ', assignee:profiles!assigned_to(full_name)').eq('approver', user.id as any).in('status', ['review', 'client_review'] as any) as any,
      supabase.from('tasks').select(TASK_SELECT + ', assignee:profiles!assigned_to(full_name)').eq('internal_reviewer', user.id as any).eq('status', 'internal_review' as any) as any,
      supabase.from('project_user_access').select('project:projects(id, name, status, progress, client:clients(name))').eq('user_id', user.id),
      supabase.from('time_entries').select('duration_minutes').eq('user_id', user.id).gte('start_time', new Date(today).toISOString()).eq('is_running', false),
    ]);

    const allTasks = (allMyTasks.data || []) as TaskWithProject[];
    setApprovalTasks((approvalRes.data || []) as TaskWithProject[]);
    setInternalReviewTasks((internalReviewRes.data || []) as TaskWithProject[]);

    const todayFiltered = allTasks.filter(t => {
      const dd = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      const sd = t.start_date ? startOfDay(new Date(t.start_date)) : null;
      if (dd && isBefore(dd, today)) return true;
      if (dd && dd.getTime() === today.getTime()) return true;
      if (sd && sd.getTime() === today.getTime()) return true;
      return false;
    });

    const todayIds = new Set(todayFiltered.map(t => t.id));
    const weekFiltered = allTasks.filter(t => {
      if (todayIds.has(t.id)) return false;
      const dd = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      if (!dd) return false;
      return dd >= startOfDay(new Date(tomorrowISO)) && dd <= startOfDay(new Date(weekEnd));
    });

    const weekIds = new Set(weekFiltered.map(t => t.id));
    const upcomingFiltered = allTasks.filter(t => {
      if (todayIds.has(t.id) || weekIds.has(t.id)) return false;
      const dd = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      if (!dd) return false;
      return isAfter(dd, startOfDay(new Date(weekEnd)));
    });

    // Backlog: tasks with no due_date
    const backlogFiltered = allTasks.filter(t => !t.due_date && !todayIds.has(t.id));

    setTodayTasks(todayFiltered);
    setWeekTasks(weekFiltered);
    setUpcomingTasks(upcomingFiltered.slice(0, 20));
    setBacklogTasks(backlogFiltered);

    const activeProjects = (projects.data || []).map((p: any) => p.project).filter((p: any) => p && p.status === 'active') as MyProject[];
    setMyProjects(activeProjects);

    const totalMin = (timeEntries.data || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    setTodayHours(Math.round((totalMin / 60) * 10) / 10);
    setLoading(false);
  }

  const overdueCount = todayTasks.filter(t => t.due_date && isBefore(new Date(t.due_date), today)).length;
  const overdueTasks = useMemo(() =>
    [...todayTasks, ...weekTasks, ...upcomingTasks]
      .filter(t => t.due_date && isBefore(startOfDay(new Date(t.due_date)), today))
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')),
    [todayTasks, weekTasks, upcomingTasks, today]
  );

  const overdueIds = useMemo(() => new Set(overdueTasks.map(t => t.id)), [overdueTasks]);

  const highPriorityTasks = useMemo(() => {
    const allTasks = [...todayTasks, ...weekTasks, ...upcomingTasks];
    return allTasks
      .filter(t => (t.priority === 'urgent' || t.priority === 'high') && !overdueIds.has(t.id))
      .sort((a, b) => {
        const order: Record<string, number> = { urgent: 0, high: 1 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      });
  }, [todayTasks, weekTasks, upcomingTasks, overdueIds]);

  const attentionCount = overdueTasks.length + highPriorityTasks.length + internalReviewTasks.length + approvalTasks.length;

  async function toggleTaskComplete(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    if (!error) {
      toast.success('Task ολοκληρώθηκε!');
      // Award XP for task completion
      if (user) await awardTaskXP(user.id, task.id, task.due_date);
      fetchAll();
    }
  }

  async function approveTask(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' as any }).eq('id', task.id);
    if (!error) {
      toast.success('Task εγκρίθηκε!');
      // Award XP — task is now completed
      if (task.assigned_to) await awardTaskXP(task.assigned_to, task.id, task.due_date);
      fetchAll();
    }
  }

  async function approveInternalReview(task: TaskWithProject) {
    const newStatus = task.approver ? 'client_review' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: newStatus as any }).eq('id', task.id);
    if (!error) {
      toast.success(newStatus === 'client_review' ? 'Προχωρά σε Έγκριση Πελάτη!' : 'Task εγκρίθηκε!');
      // Award XP if completed
      if (newStatus === 'completed' && task.assigned_to) await awardTaskXP(task.assigned_to, task.id, task.due_date);
      fetchAll();
    }
  }

  async function rejectInternalReview(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' as any, internal_reviewer: null as any }).eq('id', task.id);
    if (!error) { toast.success('Task απορρίφθηκε, επιστροφή σε Σε Εξέλιξη'); fetchAll(); }
  }

  async function rejectTask(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' as any }).eq('id', task.id);
    if (!error) { toast.success('Task απορρίφθηκε, επιστροφή σε Σε Εξέλιξη'); fetchAll(); }
  }

  async function toggleFlagPriority(task: TaskWithProject) {
    const newPriority = task.priority === 'urgent' ? 'medium' : 'urgent';
    const { error } = await supabase.from('tasks').update({ priority: newPriority } as any).eq('id', task.id);
    if (!error) {
      toast.success(newPriority === 'urgent' ? '🚩 Σημάνθηκε ως Επείγον!' : 'Αφαιρέθηκε η σήμανση Επείγον');
      fetchAll();
    }
  }

  // Unified drag handler for Today reorder + cross-container Backlog↔Today
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveInToday = orderedIds.includes(activeId);
    const isActiveInBacklog = backlogTasks.some(t => t.id === activeId);

    // Check if dropping onto a container
    const isOverTodayContainer = overId === 'today-drop';
    const isOverBacklogContainer = overId === 'backlog-drop';
    const isOverInToday = orderedIds.includes(overId) || isOverTodayContainer;
    const isOverInBacklog = backlogTasks.some(t => t.id === overId) || isOverBacklogContainer;

    // Cross-container: Backlog → Today
    if (isActiveInBacklog && isOverInToday) {
      const task = backlogTasks.find(t => t.id === activeId);
      if (!task) return;
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      // Optimistic update
      setBacklogTasks(prev => prev.filter(t => t.id !== activeId));
      setTodayTasks(prev => [...prev, { ...task, due_date: todayISO }]);
      // DB update
      supabase.from('tasks').update({ due_date: todayISO } as any).eq('id', activeId).then(({ error }) => {
        if (error) { toast.error('Σφάλμα ενημέρωσης'); fetchAll(); }
        else toast.success('Task μεταφέρθηκε στο Σήμερα!');
      });
      return;
    }

    // Cross-container: Today → Backlog
    if (isActiveInToday && isOverInBacklog) {
      const task = todayTasks.find(t => t.id === activeId);
      if (!task) return;
      // Optimistic update
      setTodayTasks(prev => prev.filter(t => t.id !== activeId));
      setOrderedIds(prev => prev.filter(id => id !== activeId));
      setBacklogTasks(prev => [...prev, { ...task, due_date: null }]);
      // DB update
      supabase.from('tasks').update({ due_date: null } as any).eq('id', activeId).then(({ error }) => {
        if (error) { toast.error('Σφάλμα ενημέρωσης'); fetchAll(); }
        else toast.success('Task μεταφέρθηκε στο Backlog!');
      });
      return;
    }

    // Same container reorder (Today only)
    if (isActiveInToday && isOverInToday && activeId !== overId && !isOverTodayContainer) {
      setOrderedIds(prev => {
        const oldIdx = prev.indexOf(activeId);
        const newIdx = prev.indexOf(overId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const newOrder = arrayMove(prev, oldIdx, newIdx);
        if (user) localStorage.setItem(getOrderKey(user.id), JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }

  const weekTasksByDay = useMemo(() => {
    const groups: Record<string, TaskWithProject[]> = {};
    weekTasks.forEach(t => {
      if (!t.due_date) return;
      const label = format(new Date(t.due_date), 'EEEE d/MM', { locale: el });
      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    });
    return groups;
  }, [weekTasks]);

  const briefIcons: Record<string, any> = { Palette, Monitor, FileText, Globe, Calendar, MessageSquare };
  const selectedDef = selectedBriefType ? getBriefDefinition(selectedBriefType) : null;

  const backlogIds = useMemo(() => backlogTasks.map(t => t.id), [backlogTasks]);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="h-16 bg-muted/50 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-muted/50 rounded-xl" /><div className="h-24 bg-muted/50 rounded-xl" /><div className="h-24 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{greeting}, {firstName}</h1>
            <p className="text-muted-foreground capitalize">{todayStr}</p>
          </div>
        <div className="flex items-center gap-3">
          {activeTimer && (
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
              <Timer className="h-4 w-4 text-primary animate-pulse" />
              <div className="text-sm">
                <span className="font-mono font-semibold text-primary">{formatElapsed(elapsed)}</span>
                <span className="text-muted-foreground ml-2 hidden sm:inline">{activeTimer.task?.title || 'Timer'}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => stopTimer()}>
                <Square className="h-3.5 w-3.5 mr-1" /> Stop
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Strip + XP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><CheckSquare className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{todayTasks.length}</p><p className="text-xs text-muted-foreground">Tasks σήμερα</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center"><Clock className="h-5 w-5 text-accent-foreground" /></div>
            <div><p className="text-2xl font-bold text-foreground">{todayHours}h</p><p className="text-xs text-muted-foreground">Ώρες σήμερα</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${overdueCount > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
              <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{overdueCount}</p><p className="text-xs text-muted-foreground">Εκπρόθεσμα</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${(internalReviewTasks.length + approvalTasks.length) > 0 ? 'bg-warning/10' : 'bg-muted/50'}`}>
              <Flag className={`h-5 w-5 ${(internalReviewTasks.length + approvalTasks.length) > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{internalReviewTasks.length + approvalTasks.length}</p><p className="text-xs text-muted-foreground">Προς Έγκριση</p></div>
          </CardContent>
        </Card>
        {/* XP Card */}
        <Card className="border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <LevelProgressBar userId={user?.id} />
          </CardContent>
        </Card>
      </div>

      {/* Απαιτούν Προσοχή — Unified Panel */}
      {attentionCount > 0 && (
        <AttentionPanel
          overdueTasks={overdueTasks}
          highPriorityTasks={highPriorityTasks}
          internalReviewTasks={internalReviewTasks}
          approvalTasks={approvalTasks}
          attentionCount={attentionCount}
          onOpenTask={setSelectedTask}
          onFlagToggle={toggleFlagPriority}
          onApproveInternal={approveInternalReview}
          onRejectInternal={rejectInternalReview}
          onApproveClient={approveTask}
          onRejectClient={rejectTask}
          activeTimer={activeTimer}
          startTimer={startTimer}
          stopTimer={stopTimer}
        />
      )}

      {/* Today Tasks + Backlog - Drag & Drop */}
      <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today Tasks */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Tasks Σήμερα</CardTitle>
              <Link to="/work?tab=tasks" className="text-xs text-primary hover:underline flex items-center gap-1">Δες όλα <ArrowRight className="h-3 w-3" /></Link>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <DroppableContainer id="today-drop">
                {orderedTodayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-4">Κανένα task για σήμερα 🎉</p>
                ) : (
                  <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                    <table className="w-full text-sm">
                      <TaskTableHeader draggable />
                      <tbody>
                        {orderedTodayTasks.map(task => (
                          <SortableTaskRow
                            key={task.id} task={task} today={today} draggable
                            onComplete={toggleTaskComplete} onOpenSheet={setSelectedTask}
                            activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer}
                            onFlagToggle={toggleFlagPriority}
                          />
                        ))}
                      </tbody>
                    </table>
                  </SortableContext>
                )}
              </DroppableContainer>
            </CardContent>
          </Card>

          {/* Backlog Panel */}
          <Card className="border-border/50 border-dashed">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                Backlog
                <Badge variant="secondary" className="text-xs ml-1">{backlogTasks.length}</Badge>
              </CardTitle>
              <button onClick={() => setBacklogOpen(v => !v)}>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${backlogOpen ? '' : '-rotate-90'}`} />
              </button>
            </CardHeader>
            {backlogOpen && (
              <CardContent className="p-0">
                <DroppableContainer id="backlog-drop">
                  {backlogTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-4 py-4">Κανένα task χωρίς ημερομηνία</p>
                  ) : (
                    <SortableContext items={backlogIds} strategy={verticalListSortingStrategy}>
                      {backlogTasks.map(task => (
                        <BacklogTaskRow
                          key={task.id} task={task} today={today}
                          onComplete={toggleTaskComplete} onOpenSheet={setSelectedTask}
                          activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer}
                          onFlagToggle={toggleFlagPriority}
                        />
                      ))}
                    </SortableContext>
                  )}
                </DroppableContainer>
              </CardContent>
            )}
          </Card>
        </div>
      </DndContext>

      {/* Week Tasks */}
      {Object.keys(weekTasksByDay).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Αυτή την εβδομάδα</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {Object.entries(weekTasksByDay).map(([day, tasks]) => (
              <div key={day}>
                <div className="px-4 md:px-6 py-2 bg-muted/30"><p className="text-xs font-medium text-muted-foreground capitalize">{day}</p></div>
                <table className="w-full text-sm">
                  <TaskTableHeader />
                  <tbody>
                    {tasks.map(task => (
                      <SortableTaskRow
                        key={task.id} task={task} today={today} showDate
                        onComplete={toggleTaskComplete} onOpenSheet={setSelectedTask}
                        activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer}
                        onFlagToggle={toggleFlagPriority}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Επερχόμενα</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <TaskTableHeader />
              <tbody>
                {upcomingTasks.map(task => (
                  <SortableTaskRow
                    key={task.id} task={task} today={today} showDate
                    onComplete={toggleTaskComplete} onOpenSheet={setSelectedTask}
                    activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer}
                    onFlagToggle={toggleFlagPriority}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My Projects */}
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Τα Έργα μου</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Κανένα ενεργό έργο</p>
            ) : (
              myProjects.slice(0, 5).map(project => (
                <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{project.name}</p>
                    {project.client && <p className="text-xs text-muted-foreground truncate">{(project.client as any)?.name}</p>}
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
            <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Quick Links</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/projects?new=true')}>
                <FolderKanban className="h-3.5 w-3.5" /> Νέο Έργο
              </Button>
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
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/reports')}>
                <BarChart3 className="h-3.5 w-3.5" /> Αναφορές
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2 h-9" onClick={() => navigate('/files')}>
                <FileArchive className="h-3.5 w-3.5" /> Αρχεία
              </Button>
              {briefDefinitions.map(def => {
                const Icon = briefIcons[def.icon] || FileText;
                return (
                  <Button key={def.type} variant="outline" size="sm" className="justify-start gap-2 h-9 text-xs" onClick={() => setSelectedBriefType(def.type)}>
                    <Icon className="h-3.5 w-3.5" /> {def.label}
                  </Button>
                );
              })}
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
                    <span className="text-muted-foreground font-mono text-xs">{b.used_days}/{b.entitled_days + b.carried_over} ημέρες</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Approvals (admin/manager) */}
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
                    <p className="text-xs text-muted-foreground">{format(new Date(req.start_date), 'd/MM')} - {format(new Date(req.end_date), 'd/MM')} · {req.days_count} ημ.</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => approveRequest(req.id)}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => rejectRequest(req.id)}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedTask && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedTask.title}</SheetTitle>
                <SheetDescription>{(selectedTask.project as any)?.name || 'Χωρίς project'}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap w-28">Status</td>
                      <td className="py-2.5"><Badge variant={getStatusVariant(selectedTask.status)}>{getStatusLabel(selectedTask.status)}</Badge></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Priority</td>
                      <td className="py-2.5"><Badge variant={getPriorityColor(selectedTask.priority)}>{selectedTask.priority}</Badge></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Έναρξη</td>
                      <td className="py-2.5">{selectedTask.start_date ? format(new Date(selectedTask.start_date), 'd MMM yyyy', { locale: el }) : '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Λήξη</td>
                      <td className={`py-2.5 ${selectedTask.due_date && isBefore(new Date(selectedTask.due_date), today) ? 'text-destructive font-medium' : ''}`}>{selectedTask.due_date ? format(new Date(selectedTask.due_date), 'd MMM yyyy', { locale: el }) : '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Εκτ. Ώρες</td>
                      <td className="py-2.5">{selectedTask.estimated_hours || '-'}h</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Πρόοδος</td>
                      <td className="py-2.5"><div className="flex items-center gap-2"><Progress value={selectedTask.progress || 0} className="w-24 h-1.5" /><span className="text-xs text-muted-foreground">{selectedTask.progress || 0}%</span></div></td>
                    </tr>
                    {selectedTask.task_type && (
                      <tr>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Τύπος</td>
                        <td className="py-2.5">{selectedTask.task_type}</td>
                      </tr>
                    )}
                    {selectedTask.task_category && (
                      <tr>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">Κατηγορία</td>
                        <td className="py-2.5">{selectedTask.task_category}</td>
                      </tr>
                    )}
                    {selectedTask.description && (
                      <tr>
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap align-top">Περιγραφή</td>
                        <td className="py-2.5 whitespace-pre-wrap">{selectedTask.description}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Button className="w-full gap-2" onClick={() => { setSelectedTask(null); navigate(`/tasks/${selectedTask.id}`); }}>
                  <ExternalLink className="h-4 w-4" /> Άνοιγμα σελίδας Task
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Brief Form Dialog */}
      {selectedDef && (
        <BriefFormDialog open={true} onOpenChange={() => setSelectedBriefType(null)} definition={selectedDef} />
      )}

    </div>
  );
}
