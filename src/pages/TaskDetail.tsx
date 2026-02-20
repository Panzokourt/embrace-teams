import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { FileExplorer } from '@/components/files/FileExplorer';
import { TaskTimer } from '@/components/time-tracking/TaskTimer';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, Clock, Circle, AlertCircle,
  FolderOpen, MessageSquare, Timer, ChevronRight, Flag
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

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; className: string }> = {
  todo: { icon: <Circle className="h-3.5 w-3.5" />, label: 'Προς Υλοποίηση', className: 'bg-muted text-muted-foreground' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Σε Εξέλιξη', className: 'bg-primary/10 text-primary border-primary/20' },
  review: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Αναθεώρηση', className: 'bg-warning/10 text-warning border-warning/20' },
  internal_review: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Εσωτερική Έγκριση', className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  client_review: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Έγκριση Πελάτη', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Ολοκληρώθηκε', className: 'bg-success/10 text-success border-success/20' },
};

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

      // Auto-assign internal_reviewer when moving to internal_review
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

  const getActivityDescription = (activity: ActivityEntry) => {
    const details = activity.details;
    switch (activity.action) {
      case 'created':
        return 'δημιούργησε αυτό το task';
      case 'updated':
        return 'ενημέρωσε αυτό το task';
      case 'status_change':
        return `άλλαξε κατάσταση: ${details?.old_status || '?'} → ${details?.new_status || '?'}`;
      case 'completed':
        return 'ολοκλήρωσε αυτό το task';
      case 'deleted':
        return 'διέγραψε αυτό το task';
      default:
        return activity.action;
    }
  };

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

  return (
    <div className="p-4 lg:p-6 h-full">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight cursor-pointer hover:bg-muted/50 px-2 py-0.5 rounded -mx-2 transition-colors truncate"
            onClick={() => {
              const newTitle = prompt('Τίτλος Task:', task.title);
              if (newTitle && newTitle !== task.title) {
                updateField('title', newTitle);
              }
            }}
            title="Κλικ για επεξεργασία"
          >
            {task.title}
          </h1>
          {task.project && (
            <Button
              variant="link"
              className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate(`/projects/${task.project_id}`)}
            >
              📁 {task.project.name}
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left column - Main content */}
        <div className="flex-1 min-w-0 space-y-5">

      {/* Status quick-change */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG['todo']][]).map(([status, config]) => (
              <Button
                key={status}
                variant={task.status === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(status)}
                className="gap-1 h-8 text-xs"
              >
                {config.icon} {config.label}
              </Button>
            ))}
            <Button
              variant={task.priority === 'urgent' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => updateField('priority', task.priority === 'urgent' ? 'medium' : 'urgent')}
              className="gap-1.5 h-8 text-xs ml-auto"
            >
              <Flag className="h-3.5 w-3.5" />
              {task.priority === 'urgent' ? 'Επείγον ✓' : 'Σήμανση ως Επείγον'}
            </Button>
          </div>

          {/* Properties Grid */}
          <div className="rounded-lg border bg-card">
            <div className="divide-y">
              {/* Υπεύθυνος */}
              <PropertyRow label="Υπεύθυνος">
                <EnhancedInlineEditCell
                  value={task.assigned_to}
                  onSave={async (v) => { await updateField('assigned_to', v); }}
                  type="select"
                  options={assigneeOptions}
                  placeholder="Χωρίς ανάθεση"
                  displayValue={task.assignee?.full_name || undefined}
                />
              </PropertyRow>

              {/* Ημερομηνίες */}
              <PropertyRow label="Έναρξη">
                <EnhancedInlineEditCell
                  value={task.start_date}
                  onSave={async (v) => { await updateField('start_date', v); }}
                  type="date"
                  placeholder="—"
                />
              </PropertyRow>

              <PropertyRow label="Προθεσμία">
                <EnhancedInlineEditCell
                  value={task.due_date}
                  onSave={async (v) => { await updateField('due_date', v); }}
                  type="date"
                  placeholder="—"
                />
              </PropertyRow>

              {/* Προτεραιότητα */}
              <PropertyRow label="Προτεραιότητα">
                <EnhancedInlineEditCell
                  value={task.priority || 'medium'}
                  onSave={async (v) => { await updateField('priority', v); }}
                  type="select"
                  options={PRIORITY_OPTIONS}
                />
              </PropertyRow>

              {/* Εκτίμηση */}
              <PropertyRow label="Εκτίμηση">
                <EnhancedInlineEditCell
                  value={task.estimated_hours}
                  onSave={async (v) => { await updateField('estimated_hours', v ? Number(v) : null); }}
                  type="number"
                  placeholder="—"
                  displayValue={task.estimated_hours ? `${task.estimated_hours}h` : undefined}
                />
              </PropertyRow>

              {/* Πραγματικός */}
              <PropertyRow label="Πραγματικός">
                <span className="text-sm px-2 py-1">{task.actual_hours ? `${task.actual_hours}h` : '—'}</span>
              </PropertyRow>

              {/* Πρόοδος */}
              <PropertyRow label="Πρόοδος">
                <EnhancedInlineEditCell
                  value={task.progress || 0}
                  onSave={async (v) => { await updateField('progress', v ? Number(v) : 0); }}
                  type="progress"
                />
              </PropertyRow>

              {/* Τύπος */}
              <PropertyRow label="Τύπος">
                <EnhancedInlineEditCell
                  value={task.task_type || 'task'}
                  onSave={async (v) => { await updateField('task_type', v); }}
                  type="select"
                  options={TYPE_OPTIONS}
                />
              </PropertyRow>

              {/* Κατηγορία */}
              <PropertyRow label="Κατηγορία">
                <EnhancedInlineEditCell
                  value={task.task_category}
                  onSave={async (v) => { await updateField('task_category', v); }}
                  type="select"
                  options={CATEGORY_OPTIONS}
                  placeholder="—"
                />
              </PropertyRow>

              {/* Παραδοτέο */}
              <PropertyRow label="Παραδοτέο">
                <EnhancedInlineEditCell
                  value={task.deliverable_id}
                  onSave={async (v) => { await updateField('deliverable_id', v); }}
                  type="select"
                  options={deliverableOptions}
                  placeholder="—"
                  displayValue={task.deliverable?.name || undefined}
                />
              </PropertyRow>

              {/* Δημιουργήθηκε */}
              <PropertyRow label="Δημιουργήθηκε">
                <span className="text-sm px-2 py-1">
                  {format(new Date(task.created_at), 'd MMM yyyy', { locale: el })}
                </span>
              </PropertyRow>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Περιγραφή</h3>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  rows={4}
                  placeholder="Προσθέστε περιγραφή..."
                  autoFocus
                  className="text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingDescription(false); setDescriptionDraft(task.description || ''); }}>
                    Ακύρωση
                  </Button>
                  <Button size="sm" onClick={saveDescription}>Αποθήκευση</Button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-3 rounded-lg border border-transparent hover:border-border transition-colors min-h-[48px]"
                onClick={() => setEditingDescription(true)}
                title="Κλικ για επεξεργασία"
              >
                {task.description || 'Κλικ για να προσθέσετε περιγραφή...'}
              </p>
            )}
          </div>

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  Subtasks ({subtasks.length})
                </h3>
                <div className="space-y-1">
                  {subtasks.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-sm"
                      onClick={() => navigate(`/tasks/${sub.id}`)}
                    >
                      {STATUS_CONFIG[sub.status].icon}
                      <span className={cn("flex-1", sub.status === 'completed' && "line-through text-muted-foreground")}>
                        {sub.title}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Bottom Tabs */}
          <Tabs defaultValue="comments" className="space-y-4">
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
          </Tabs>
        </div>

        {/* Right column - Activity Sidebar */}
        <div className="hidden lg:block w-80 shrink-0 sticky top-6">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="text-sm font-semibold">Ιστορικό</h3>
            </div>
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="p-3">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Δεν υπάρχουν ενέργειες.
                  </p>
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
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Property row helper */
function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-2 gap-4 hover:bg-muted/30 transition-colors">
      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
