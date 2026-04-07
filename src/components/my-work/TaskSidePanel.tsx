import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  X, ExternalLink, Play, Square, ChevronRight,
  CalendarDays, Flag, User, FolderKanban, Building2,
  ListChecks, Timer, Pencil, Check,
} from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { el } from 'date-fns/locale';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/components/shared/mondayStyleConfig';

const STATUS_PROGRESS: Record<string, number> = {
  todo: 0,
  in_progress: 20,
  review: 50,
  internal_review: 65,
  client_review: 80,
  completed: 100,
};

interface TaskSidePanelProps {
  taskId: string;
  onClose: () => void;
  activeTimer: any;
  startTimer: (taskId: string, projectId: string) => void;
  stopTimer: () => void;
  onTaskUpdated?: (taskId: string, updates: Record<string, any>) => void;
}

interface FullTask {
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
  description: string | null;
  assigned_to: string | null;
  project: { id: string; name: string; client_id: string | null; client: { id: string; name: string } | null } | null;
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface SubTask {
  id: string;
  title: string;
  status: string;
}

function getStatusLabel(s: string) { return STATUS_COLORS[s]?.label || s; }
function getStatusStyle(s: string): React.CSSProperties {
  const c = STATUS_COLORS[s]; return c ? { backgroundColor: c.bg, color: c.text } : {};
}
function getPriorityStyle(p: string): React.CSSProperties {
  const c = PRIORITY_COLORS[p]; return c ? { backgroundColor: c.bg, color: c.text } : {};
}

export function TaskSidePanel({ taskId, onClose, activeTimer, startTimer, stopTimer, onTaskUpdated }: TaskSidePanelProps) {
  const navigate = useNavigate();
  const [task, setTask] = useState<FullTask | null>(null);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);

  const fetchTask = useCallback(async () => {
    const [taskRes, subRes] = await Promise.all([
      supabase.from('tasks').select(`
        id, title, status, priority, due_date, start_date, estimated_hours, actual_hours, progress, project_id, description, assigned_to,
        project:projects(id, name, client_id, client:clients(id, name))
      `).eq('id', taskId).single(),
      supabase.from('tasks').select('id, title, status').eq('parent_task_id', taskId).order('created_at'),
    ]);

    if (taskRes.data) {
      const t = taskRes.data as any;
      // Fetch assignee separately since there's no FK
      let assignee = null;
      if (t.assigned_to) {
        const { data: profileData } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', t.assigned_to).single();
        assignee = profileData;
      }
      setTask({ ...t, assignee });
      setTitleValue(t.title);
      setDescValue(t.description || '');
    }
    setSubtasks((subRes.data || []) as SubTask[]);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    fetchTask();
  }, [fetchTask]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase.from('tasks').update({ [field]: value } as any).eq('id', taskId);
    if (!error) {
      setTask(prev => prev ? { ...prev, [field]: value } : prev);
      onTaskUpdated?.(taskId, { [field]: value });
      toast.success('Ενημερώθηκε');
    }
  };

  if (loading || !task) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse space-y-3 w-full px-6">
          <div className="h-6 bg-muted/50 rounded w-3/4" />
          <div className="h-4 bg-muted/50 rounded w-1/2" />
          <div className="h-20 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  const isOverdue = task.due_date && isBefore(new Date(task.due_date), startOfDay(new Date()));
  const isRunning = activeTimer?.is_running && activeTimer.task_id === task.id;
  const client = (task.project as any)?.client;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 shrink-0">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <Input
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={() => { setEditingTitle(false); if (titleValue !== task.title) updateField('title', titleValue); }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); if (titleValue !== task.title) updateField('title', titleValue); } }}
              className="h-8 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <h3
              className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary flex items-center gap-1.5 group"
              onClick={() => setEditingTitle(true)}
            >
              {task.title}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </h3>
          )}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Clickable links: Project & Client */}
        <div className="space-y-2">
          {task.project && (
            <Link
              to={`/projects/${task.project.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate group-hover:underline">{(task.project as any).name}</span>
              <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )}
          {client && (
            <Link
              to={`/clients/${client.id}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate group-hover:underline">{client.name}</span>
              <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )}
          {task.assignee && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{(task.assignee as any).full_name || 'Χωρίς όνομα'}</span>
            </div>
          )}
        </div>

        <Separator className="bg-border/30" />

        {/* Status & Priority inline edit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
            <Select value={task.status} onValueChange={v => updateField('status', v)}>
              <SelectTrigger className="h-8 text-xs rounded-lg">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[task.status]?.text }} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_COLORS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: val.text }} />
                      {val.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Priority</p>
            <Select value={task.priority} onValueChange={v => updateField('priority', v)}>
              <SelectTrigger className="h-8 text-xs rounded-lg">
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3 w-3" style={{ color: PRIORITY_COLORS[task.priority]?.text }} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_COLORS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3" style={{ color: val.text }} />
                      {val.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Έναρξη</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 rounded-lg">
                  <CalendarDays className="h-3 w-3 mr-1.5" />
                  {task.start_date ? format(new Date(task.start_date), 'd MMM yyyy', { locale: el }) : 'Ορισμός'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.start_date ? new Date(task.start_date) : undefined}
                  onSelect={d => d && updateField('start_date', format(d, 'yyyy-MM-dd'))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Λήξη</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={`w-full justify-start text-xs h-8 rounded-lg ${isOverdue ? 'text-destructive border-destructive/30' : ''}`}>
                  <CalendarDays className="h-3 w-3 mr-1.5" />
                  {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: el }) : 'Ορισμός'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.due_date ? new Date(task.due_date) : undefined}
                  onSelect={d => d && updateField('due_date', format(d, 'yyyy-MM-dd'))}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Progress (auto-calculated from status) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Πρόοδος</p>
            <span className="text-xs font-medium text-foreground">{STATUS_PROGRESS[task.status as keyof typeof STATUS_PROGRESS] ?? 0}%</span>
          </div>
          <Progress value={STATUS_PROGRESS[task.status as keyof typeof STATUS_PROGRESS] ?? 0} className="w-full" />
        </div>

        <Separator className="bg-border/30" />

        {/* Description */}
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Περιγραφή</p>
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                value={descValue}
                onChange={e => setDescValue(e.target.value)}
                className="min-h-[80px] text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => { updateField('description', descValue); setEditingDesc(false); }}>
                  <Check className="h-3 w-3" /> Αποθήκευση
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setDescValue(task.description || ''); setEditingDesc(false); }}>
                  Ακύρωση
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm text-foreground/80 whitespace-pre-wrap min-h-[40px] rounded-lg bg-muted/20 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => setEditingDesc(true)}
            >
              {task.description || <span className="text-muted-foreground italic">Κλικ για προσθήκη περιγραφής...</span>}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex gap-2">
          {!isRunning ? (
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-9 rounded-lg" onClick={() => startTimer(task.id, task.project_id)}>
              <Play className="h-3.5 w-3.5" /> Εκκίνηση Timer
            </Button>
          ) : (
            <Button variant="destructive" size="sm" className="flex-1 gap-1.5 h-9 rounded-lg" onClick={() => stopTimer()}>
              <Square className="h-3.5 w-3.5" /> Διακοπή Timer
            </Button>
          )}
        </div>

        {/* Subtasks */}
        {subtasks.length > 0 && (
          <div className="space-y-2">
            <Separator className="bg-border/30" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Subtasks ({subtasks.length})
            </p>
            <div className="space-y-1">
              {subtasks.map(st => (
                <Link
                  key={st.id}
                  to={`/tasks/${st.id}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[st.status]?.text || '#888' }} />
                  <span className="text-sm text-foreground truncate flex-1 group-hover:text-primary">{st.title}</span>
                  <span className="text-[10px] rounded-md px-1.5 py-0.5" style={getStatusStyle(st.status)}>
                    {getStatusLabel(st.status)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hours */}
        {(task.estimated_hours || task.actual_hours) && (
          <>
            <Separator className="bg-border/30" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Εκτίμηση</p>
                <p className="text-sm font-medium">{task.estimated_hours ? `${task.estimated_hours}h` : '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Πραγματικές</p>
                <p className="text-sm font-medium">{task.actual_hours ? `${task.actual_hours}h` : '-'}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 shrink-0">
        <Button className="w-full gap-2 h-9 rounded-lg" onClick={() => { onClose(); navigate(`/tasks/${task.id}`); }}>
          <ExternalLink className="h-4 w-4" /> Άνοιγμα σελίδας Task
        </Button>
      </div>
    </div>
  );
}
