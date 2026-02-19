import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { briefDefinitions } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';
import { getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckSquare, Clock, AlertTriangle, Play, Square, ArrowRight,
  Plus, CalendarDays, Timer, FileText, FolderKanban,
  ChevronRight, Palmtree, Check, X, GripVertical, ExternalLink,
  Palette, Monitor, Globe, Calendar, MessageSquare, BarChart3,
  FileArchive, Bot, Send, Loader2, Minimize2, Maximize2,
} from 'lucide-react';
import { format, isBefore, startOfDay, endOfWeek, startOfTomorrow, isAfter } from 'date-fns';
import { el } from 'date-fns/locale';

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

type ChatMsg = { role: 'user' | 'assistant'; content: string };

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
      </tr>
    </thead>
  );
}

// ── Sortable Task Row ──────────────────────────────
function SortableTaskRow({
  task, today, onComplete, onOpenSheet, activeTimer, startTimer, stopTimer, showDate = false, draggable = false,
}: {
  task: TaskWithProject; today: Date; onComplete: (t: TaskWithProject) => void;
  onOpenSheet: (t: TaskWithProject) => void; activeTimer: any; startTimer: any; stopTimer: any;
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
    </tr>
  );
}

// ── AI Chat Widget ─────────────────────────────────
function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/my-work-ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || 'AI error');
        setLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;

      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsertAssistant(c);
          } catch { buf = line + '\n' + buf; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Σφάλμα σύνδεσης');
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col" style={{ height: 480 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">AI Βοηθός</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)}>
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">Ρώτησέ με οτιδήποτε για τα tasks και τα projects σου!</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 flex gap-2">
        <input
          className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Γράψε μήνυμα..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────
export default function MyWork() {
  const { user, profile, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const { activeTimer, elapsed, formatElapsed, startTimer, stopTimer } = useTimeTracking();
  const { balances, pendingApprovals, approveRequest, rejectRequest } = useLeaveManagement();

  const [todayTasks, setTodayTasks] = useState<TaskWithProject[]>([]);
  const [weekTasks, setWeekTasks] = useState<TaskWithProject[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskWithProject[]>([]);
  const [approvalTasks, setApprovalTasks] = useState<TaskWithProject[]>([]); // client_review (approver)
  const [internalReviewTasks, setInternalReviewTasks] = useState<TaskWithProject[]>([]); // internal_review
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);

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

    setTodayTasks(todayFiltered);
    setWeekTasks(weekFiltered);
    setUpcomingTasks(upcomingFiltered.slice(0, 20));

    const activeProjects = (projects.data || []).map((p: any) => p.project).filter((p: any) => p && p.status === 'active') as MyProject[];
    setMyProjects(activeProjects);

    const totalMin = (timeEntries.data || []).reduce((s: number, e: any) => s + (e.duration_minutes || 0), 0);
    setTodayHours(Math.round((totalMin / 60) * 10) / 10);
    setLoading(false);
  }

  const overdueCount = todayTasks.filter(t => t.due_date && isBefore(new Date(t.due_date), today)).length;

  async function toggleTaskComplete(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
    if (!error) { toast.success('Task ολοκληρώθηκε!'); fetchAll(); }
  }

  async function approveTask(task: TaskWithProject) {
    // Internal review: approve → client_review (if approver) or completed
    const { error } = await supabase.from('tasks').update({ status: 'completed' as any }).eq('id', task.id);
    if (!error) { toast.success('Task εγκρίθηκε!'); fetchAll(); }
  }

  async function approveInternalReview(task: TaskWithProject) {
    // If task has an approver, go to client_review; otherwise completed
    const newStatus = task.approver ? 'client_review' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: newStatus as any }).eq('id', task.id);
    if (!error) { toast.success(newStatus === 'client_review' ? 'Προχωρά σε Έγκριση Πελάτη!' : 'Task εγκρίθηκε!'); fetchAll(); }
  }

  async function rejectInternalReview(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' as any, internal_reviewer: null as any }).eq('id', task.id);
    if (!error) { toast.success('Task απορρίφθηκε, επιστροφή σε Σε Εξέλιξη'); fetchAll(); }
  }

  async function rejectTask(task: TaskWithProject) {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' as any }).eq('id', task.id);
    if (!error) { toast.success('Task απορρίφθηκε, επιστροφή σε Σε Εξέλιξη'); fetchAll(); }
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedIds(prev => {
      const oldIdx = prev.indexOf(active.id);
      const newIdx = prev.indexOf(over.id);
      const newOrder = arrayMove(prev, oldIdx, newIdx);
      if (user) localStorage.setItem(getOrderKey(user.id), JSON.stringify(newOrder));
      return newOrder;
    });
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

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div><p className="text-2xl font-bold text-foreground">{overdueCount}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Προς Έγκριση (Internal + Client Review) */}
      {(internalReviewTasks.length > 0 || approvalTasks.length > 0) && (
        <Card className="border-border/50 border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Προς Έγκριση ({internalReviewTasks.length + approvalTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Εσωτερική Έγκριση */}
            {internalReviewTasks.length > 0 && (
              <>
                <div className="px-4 md:px-6 py-2 bg-violet-500/5 border-b border-border/50 flex items-center gap-2">
                  <span className="text-xs font-semibold text-violet-600">🏢 Εσωτερική Έγκριση ({internalReviewTasks.length})</span>
                </div>
                <div className="divide-y divide-border/50">
                  {internalReviewTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-4 md:px-6 py-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <p className="text-sm font-medium text-foreground hover:text-primary">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">{(task.project as any)?.name}</p>
                          {(task as any).assignee?.full_name && (
                            <span className="text-xs text-muted-foreground">· {(task as any).assignee.full_name}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-600">Εσωτ. Έγκριση</Badge>
                      <div className="flex gap-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => approveInternalReview(task)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => rejectInternalReview(task)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Έγκριση Πελάτη */}
            {approvalTasks.length > 0 && (
              <>
                <div className="px-4 md:px-6 py-2 bg-orange-500/5 border-b border-border/50 flex items-center gap-2">
                  <span className="text-xs font-semibold text-orange-600">🤝 Έγκριση Πελάτη ({approvalTasks.length})</span>
                </div>
                <div className="divide-y divide-border/50">
                  {approvalTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-4 md:px-6 py-3">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <p className="text-sm font-medium text-foreground hover:text-primary">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{(task.project as any)?.name}</p>
                      </div>
                      <Badge variant={getPriorityColor(task.priority)} className="text-[10px]">{task.priority}</Badge>
                      <div className="flex gap-1.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success" onClick={() => approveTask(task)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => rejectTask(task)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today Tasks - Drag & Drop */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Tasks Σήμερα</CardTitle>
          <Link to="/work?tab=tasks" className="text-xs text-primary hover:underline flex items-center gap-1">Δες όλα <ArrowRight className="h-3 w-3" /></Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {orderedTodayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-4">Κανένα task για σήμερα 🎉</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                <table className="w-full text-sm">
                  <TaskTableHeader draggable />
                  <tbody>
                    {orderedTodayTasks.map(task => (
                      <SortableTaskRow
                        key={task.id} task={task} today={today} draggable
                        onComplete={toggleTaskComplete} onOpenSheet={setSelectedTask}
                        activeTimer={activeTimer} startTimer={startTimer} stopTimer={stopTimer}
                      />
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

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

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
