import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { FileExplorer } from '@/components/files/FileExplorer';
import { TaskTimer } from '@/components/time-tracking/TaskTimer';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, Clock, Circle, AlertCircle,
  FolderOpen, MessageSquare, Timer, ChevronRight, Flag, Plus,
  Paperclip, Check, Pencil, CalendarIcon, History, User
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'internal_review' | 'client_review' | 'completed';

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  project_id: string;
  assigned_to: string | null;
  deliverable_id: string | null;
  parent_task_id: string | null;
  depends_on: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  progress: number | null;
  task_type: string | null;
  task_category: string | null;
  created_at: string;
  project?: { name: string } | null;
  assignee?: { full_name: string | null } | null;
  deliverable?: { name: string } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface Deliverable {
  id: string;
  name: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
  user_name?: string;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; color: string; dotColor: string }> = {
  todo: { icon: <Circle className="h-3.5 w-3.5" />, label: 'Προς Υλοποίηση', color: 'bg-muted text-muted-foreground', dotColor: 'bg-muted-foreground' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Σε Εξέλιξη', color: 'bg-primary/10 text-primary', dotColor: 'bg-primary' },
  review: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Αναθεώρηση', color: 'bg-warning/10 text-warning', dotColor: 'bg-warning' },
  internal_review: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Εσωτερική', color: 'bg-violet-500/10 text-violet-600', dotColor: 'bg-violet-500' },
  client_review: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Πελάτης', color: 'bg-orange-500/10 text-orange-600', dotColor: 'bg-orange-500' },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Ολοκληρώθηκε', color: 'bg-success/10 text-success', dotColor: 'bg-success' },
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'internal_review', 'client_review', 'completed'];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Χαμηλή', color: 'hsl(var(--success))' },
  { value: 'medium', label: 'Μεσαία', color: 'hsl(var(--warning))' },
  { value: 'high', label: 'Υψηλή', color: 'hsl(var(--destructive))' },
];

const TYPE_OPTIONS = [
  { value: 'task', label: 'Task' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
];

const CATEGORY_OPTIONS = [
  { value: 'research', label: 'Έρευνα' },
  { value: 'design', label: 'Σχεδιασμός' },
  { value: 'development', label: 'Ανάπτυξη' },
  { value: 'content', label: 'Περιεχόμενο' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'admin', label: 'Διοικητικά' },
];

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskData | null>(null);
  const [subtasks, setSubtasks] = useState<TaskData[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(name), deliverable:deliverables(name)')
        .eq('id', id)
        .single();

      if (error) throw error;

      let assignee = null;
      if (data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.assigned_to)
          .single();
        assignee = profile;
      }

      const taskData = { ...data, assignee } as TaskData;
      setTask(taskData);
      setDescriptionDraft(taskData.description || '');

      const { data: subs } = await supabase
        .from('tasks')
        .select('*, project:projects(name)')
        .eq('parent_task_id', id)
        .order('created_at');
      setSubtasks((subs || []) as TaskData[]);

      const { data: dels } = await supabase
        .from('deliverables')
        .select('id, name')
        .eq('project_id', data.project_id)
        .order('created_at');
      setDeliverables(dels || []);
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Το task δεν βρέθηκε');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTask();
    fetchProfiles();
    fetchActivities();
  }, [fetchTask]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('status', ['active', 'pending'])
      .order('full_name');
    setProfiles(data || []);
  };

  const fetchActivities = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity_id', id)
      .eq('entity_type', 'task')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u.full_name]) || []);
      setActivities(data.map(a => ({
        ...a,
        details: a.details as Record<string, unknown> | null,
        user_name: userMap.get(a.user_id) || 'Χρήστης',
      })));
    } else {
      setActivities([]);
    }
  };

  const updateField = async (field: string, value: string | number | null) => {
    if (!task) return;
    const { error } = await supabase
      .from('tasks')
      .update({ [field]: value })
      .eq('id', task.id);
    if (error) throw error;
    fetchTask();
    toast.success('Ενημερώθηκε!');
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      let updateData: Record<string, string | null> = { status: newStatus };

      if (newStatus === 'internal_review' && task.assigned_to) {
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('reports_to, department_id')
          .eq('id', task.assigned_to)
          .single();

        let reviewerId: string | null = null;
        if (assigneeProfile?.reports_to) {
          reviewerId = assigneeProfile.reports_to;
        } else if (assigneeProfile?.department_id) {
          const { data: dept } = await supabase
            .from('departments')
            .select('head_user_id')
            .eq('id', assigneeProfile.department_id)
            .single();
          reviewerId = dept?.head_user_id || null;
        }
        if (reviewerId) updateData.internal_reviewer = reviewerId;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', task.id);
      if (error) throw error;
      setTask(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Η κατάσταση ενημερώθηκε!');
    } catch {
      toast.error('Σφάλμα');
    }
  };

  const saveDescription = async () => {
    if (!task) return;
    try {
      await updateField('description', descriptionDraft || null);
      setEditingDescription(false);
    } catch {
      toast.error('Σφάλμα αποθήκευσης');
    }
  };

  const addSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: newSubtaskTitle.trim(),
        parent_task_id: task.id,
        project_id: task.project_id,
        status: 'todo',
        created_by: user?.id,
      });
      if (error) throw error;
      setNewSubtaskTitle('');
      fetchTask();
      toast.success('Subtask δημιουργήθηκε!');
    } catch {
      toast.error('Σφάλμα δημιουργίας');
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtaskStatus = async (subtask: TaskData) => {
    const newStatus: TaskStatus = subtask.status === 'completed' ? 'todo' : 'completed';
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', subtask.id);
      if (error) throw error;
      fetchTask();
    } catch {
      toast.error('Σφάλμα');
    }
  };

  const getActivityDescription = (activity: ActivityEntry) => {
    const details = activity.details;
    switch (activity.action) {
      case 'created': return 'δημιούργησε αυτό το task';
      case 'updated': return 'ενημέρωσε αυτό το task';
      case 'status_change': return `άλλαξε κατάσταση: ${details?.old_status || '?'} → ${details?.new_status || '?'}`;
      case 'completed': return 'ολοκλήρωσε αυτό το task';
      case 'deleted': return 'διέγραψε αυτό το task';
      default: return activity.action;
    }
  };

  // Subtask progress calculation
  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : null;
  const displayProgress = subtaskProgress !== null ? subtaskProgress : (task?.progress || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Το task δεν βρέθηκε</p>
        <Button variant="link" onClick={() => navigate(-1)}>Επιστροφή</Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status];
  const assigneeOptions = profiles.map(p => ({
    value: p.id,
    label: p.full_name || p.email,
  }));
  const deliverableOptions = deliverables.map(d => ({
    value: d.id,
    label: d.name,
  }));
  const priorityColor = PRIORITY_OPTIONS.find(p => p.value === (task.priority || 'medium'))?.color || 'hsl(var(--warning))';

  return (
    <div className="h-full flex flex-col">
      {/* ===== STICKY ACTION BAR ===== */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2.5 flex items-center gap-3 min-h-[52px]">
        {/* Left: Back + Title + Timer */}
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1
          className="text-base font-semibold truncate cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors max-w-[300px]"
          onClick={() => {
            const newTitle = prompt('Τίτλος Task:', task.title);
            if (newTitle && newTitle !== task.title) updateField('title', newTitle);
          }}
          title="Κλικ για επεξεργασία"
        >
          {task.title}
        </h1>
        <TaskTimer taskId={task.id} projectId={task.project_id} compact />

        <div className="flex-1" />

        {/* Right: Status, Priority, Due, Assignee, Actions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 h-7 text-xs font-medium", statusConfig.color)}>
              {statusConfig.icon}
              {statusConfig.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="end">
            {STATUS_ORDER.map(s => (
              <button
                key={s}
                onClick={() => { handleStatusChange(s); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-muted",
                  task.status === s && "bg-muted font-medium"
                )}
              >
                {STATUS_CONFIG[s].icon}
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Priority dot */}
        <div className="flex items-center gap-1" title={`Προτεραιότητα: ${task.priority || 'medium'}`}>
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityColor }} />
        </div>

        {/* Due date chip */}
        {task.due_date && (
          <Badge variant="outline" className="text-[10px] h-6 gap-1 font-normal">
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(task.due_date), 'd MMM', { locale: el })}
          </Badge>
        )}

        {/* Assignee avatar */}
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {task.assignee?.full_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>

        {/* Quick actions */}
        <div className="flex items-center gap-0.5 border-l pl-2 ml-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Προσθήκη subtask" onClick={() => document.getElementById('subtask-input')?.focus()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", task.status === 'completed' && "text-success")}
            title="Ολοκλήρωση"
            onClick={() => handleStatusChange(task.status === 'completed' ? 'todo' : 'completed')}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ===== TWO-COLUMN LAYOUT ===== */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-5 p-4 lg:p-5 items-start">
          {/* LEFT: Main Work Area */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* A. Overview Card */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {/* Description */}
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      rows={3}
                      placeholder="Περιγραφή..."
                      autoFocus
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDescription();
                      }}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingDescription(false); setDescriptionDraft(task.description || ''); }}>Ακύρωση</Button>
                      <Button size="sm" onClick={saveDescription}>Αποθήκευση</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="group relative text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/30 p-2 rounded-lg transition-colors min-h-[36px]"
                    onClick={() => setEditingDescription(true)}
                  >
                    {task.description || 'Κλικ για να προσθέσετε περιγραφή...'}
                    <Pencil className="h-3 w-3 absolute top-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                )}

                {/* Tags row */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {task.project && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted gap-1 font-normal"
                      onClick={() => navigate(`/projects/${task.project_id}`)}
                    >
                      <FolderOpen className="h-3 w-3" />
                      {task.project.name}
                    </Badge>
                  )}
                  {task.deliverable && (
                    <Badge variant="secondary" className="font-normal">{task.deliverable.name}</Badge>
                  )}
                  {task.task_type && task.task_type !== 'task' && (
                    <Badge variant="secondary" className="font-normal capitalize">{task.task_type}</Badge>
                  )}
                  {task.task_category && (
                    <Badge variant="outline" className="font-normal">
                      {CATEGORY_OPTIONS.find(c => c.value === task.task_category)?.label || task.task_category}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* B. Subtasks */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Subtasks</h3>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">{completedSubtasks}/{subtasks.length}</span>
                  )}
                </div>

                {subtasks.length > 0 && (
                  <Progress value={displayProgress} className="h-1.5 mb-3" />
                )}

                <div className="space-y-0.5">
                  {subtasks.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
                    >
                      <Checkbox
                        checked={sub.status === 'completed'}
                        onCheckedChange={() => toggleSubtaskStatus(sub)}
                        className="h-3.5 w-3.5"
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm cursor-pointer",
                          sub.status === 'completed' && "line-through text-muted-foreground"
                        )}
                        onClick={() => navigate(`/tasks/${sub.id}`)}
                      >
                        {sub.title}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>

                {/* Add subtask inline */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    id="subtask-input"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addSubtask(); }}
                    placeholder="Προσθήκη subtask..."
                    className="h-7 text-sm border-0 bg-transparent shadow-none focus:ring-0 px-0"
                    disabled={addingSubtask}
                  />
                </div>

                {subtasks.length === 0 && !newSubtaskTitle && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Προσθέστε το πρώτο subtask
                  </p>
                )}
              </CardContent>
            </Card>

            {/* C. Activity Tabs */}
            <Tabs defaultValue="comments" className="space-y-3">
              <TabsList className="h-9 gap-1">
                <TabsTrigger value="comments" className="text-xs gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Σχόλια
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Αρχεία
                </TabsTrigger>
                <TabsTrigger value="time" className="text-xs gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  Χρόνος
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Ιστορικό
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments">
                <CommentsSection taskId={task.id} />
              </TabsContent>

              <TabsContent value="files">
                <FileExplorer projectId={task.project_id} />
              </TabsContent>

              <TabsContent value="time">
                <div className="space-y-4">
                  <TaskTimer taskId={task.id} projectId={task.project_id} />
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Εκτιμώμενος</p>
                      <p className="text-lg font-semibold">{task.estimated_hours ? `${task.estimated_hours}h` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Πραγματικός</p>
                      <p className="text-lg font-semibold">{task.actual_hours ? `${task.actual_hours}h` : '—'}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Δεν υπάρχουν ενέργειες.</p>
                ) : (
                  <div className="space-y-0.5">
                    {activities.map(activity => (
                      <div key={activity.id} className="flex items-start gap-2.5 py-2.5 border-b border-border/50 last:border-0">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed">
                            <span className="font-medium">{activity.user_name}</span>{' '}
                            <span className="text-muted-foreground">{getActivityDescription(activity)}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(activity.created_at), 'd MMM, HH:mm', { locale: el })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: Smart Meta Panel */}
          <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0 sticky top-[60px]">
            {/* Assignment Card */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ανάθεση</h4>
                <EnhancedInlineEditCell
                  value={task.assigned_to}
                  onSave={async (v) => { await updateField('assigned_to', v); }}
                  type="select"
                  options={assigneeOptions}
                  placeholder="Χωρίς ανάθεση"
                  displayValue={task.assignee?.full_name || undefined}
                />
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardContent className="p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Χρονοδιάγραμμα</h4>
                <MetaRow label="Έναρξη">
                  <EnhancedInlineEditCell
                    value={task.start_date}
                    onSave={async (v) => { await updateField('start_date', v); }}
                    type="date"
                    placeholder="—"
                  />
                </MetaRow>
                <MetaRow label="Προθεσμία">
                  <EnhancedInlineEditCell
                    value={task.due_date}
                    onSave={async (v) => { await updateField('due_date', v); }}
                    type="date"
                    placeholder="—"
                  />
                </MetaRow>
                <MetaRow label="Δημιουργία">
                  <span className="text-xs px-1">{format(new Date(task.created_at), 'd MMM yyyy', { locale: el })}</span>
                </MetaRow>
                <MetaRow label="Εκτίμηση">
                  <EnhancedInlineEditCell
                    value={task.estimated_hours}
                    onSave={async (v) => { await updateField('estimated_hours', v ? Number(v) : null); }}
                    type="number"
                    placeholder="—"
                    displayValue={task.estimated_hours ? `${task.estimated_hours}h` : undefined}
                  />
                </MetaRow>
                <MetaRow label="Πραγματικός">
                  <span className="text-xs px-1">{task.actual_hours ? `${task.actual_hours}h` : '—'}</span>
                </MetaRow>
              </CardContent>
            </Card>

            {/* Status Flow Card */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ροή Κατάστασης</h4>
                <div className="flex items-center gap-0.5">
                  {STATUS_ORDER.map((s, i) => {
                    const conf = STATUS_CONFIG[s];
                    const isCurrent = task.status === s;
                    const isPast = STATUS_ORDER.indexOf(task.status) > i;
                    return (
                      <div key={s} className="flex items-center gap-0.5 flex-1">
                        <button
                          onClick={() => handleStatusChange(s)}
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center transition-all shrink-0 text-[9px]",
                            isCurrent && cn("ring-2 ring-offset-1 ring-offset-background", conf.dotColor, "ring-current text-background scale-110"),
                            isPast && !isCurrent && "bg-success/20 text-success",
                            !isCurrent && !isPast && "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                          style={isCurrent ? { backgroundColor: 'currentColor' } : undefined}
                          title={conf.label}
                        >
                          {isPast && !isCurrent && <Check className="h-3 w-3" />}
                          {isCurrent && <div className="h-2 w-2 rounded-full bg-background" />}
                        </button>
                        {i < STATUS_ORDER.length - 1 && (
                          <div className={cn("h-px flex-1", isPast ? "bg-success/40" : "bg-border")} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] text-muted-foreground">Todo</span>
                  <span className="text-[9px] text-muted-foreground">Done</span>
                </div>
              </CardContent>
            </Card>

            {/* Priority & Tags Card */}
            <Card>
              <CardContent className="p-4 space-y-2.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ιδιότητες</h4>
                <MetaRow label="Προτεραιότητα">
                  <EnhancedInlineEditCell
                    value={task.priority || 'medium'}
                    onSave={async (v) => { await updateField('priority', v); }}
                    type="select"
                    options={PRIORITY_OPTIONS}
                  />
                </MetaRow>
                <MetaRow label="Τύπος">
                  <EnhancedInlineEditCell
                    value={task.task_type || 'task'}
                    onSave={async (v) => { await updateField('task_type', v); }}
                    type="select"
                    options={TYPE_OPTIONS}
                  />
                </MetaRow>
                <MetaRow label="Κατηγορία">
                  <EnhancedInlineEditCell
                    value={task.task_category}
                    onSave={async (v) => { await updateField('task_category', v); }}
                    type="select"
                    options={CATEGORY_OPTIONS}
                    placeholder="—"
                  />
                </MetaRow>
                <MetaRow label="Παραδοτέο">
                  <EnhancedInlineEditCell
                    value={task.deliverable_id}
                    onSave={async (v) => { await updateField('deliverable_id', v); }}
                    type="select"
                    options={deliverableOptions}
                    placeholder="—"
                    displayValue={task.deliverable?.name || undefined}
                  />
                </MetaRow>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Meta row helper for right panel */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted-foreground w-20 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
