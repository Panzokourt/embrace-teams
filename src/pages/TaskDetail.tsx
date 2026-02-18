import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { FileExplorer } from '@/components/files/FileExplorer';
import { TaskTimer } from '@/components/time-tracking/TaskTimer';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, Clock, Circle, AlertCircle,
  FolderOpen, MessageSquare, Timer, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

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
  todo: { icon: <Circle className="h-4 w-4" />, label: 'Προς Υλοποίηση', className: 'bg-muted text-muted-foreground' },
  in_progress: { icon: <Clock className="h-4 w-4" />, label: 'Σε Εξέλιξη', className: 'bg-primary/10 text-primary border-primary/20' },
  review: { icon: <AlertCircle className="h-4 w-4" />, label: 'Αναθεώρηση', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Ολοκληρώθηκε', className: 'bg-success/10 text-success border-success/20' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'Χαμηλή', className: 'bg-success/10 text-success border-success/20' },
  medium: { label: 'Μεσαία', className: 'bg-warning/10 text-warning border-warning/20' },
  high: { label: 'Υψηλή', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

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

      // Fetch subtasks
      const { data: subs } = await supabase
        .from('tasks')
        .select('*, project:projects(name)')
        .eq('parent_task_id', id)
        .order('created_at');
      setSubtasks((subs || []) as TaskData[]);

      // Fetch deliverables for project
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
      // Fetch user names for activities
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
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);
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
  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;

  const assigneeOptions = profiles.map(p => ({
    value: p.id,
    label: p.full_name || p.email,
  }));

  const priorityOptions = [
    { value: 'low', label: 'Χαμηλή', color: 'hsl(var(--success))' },
    { value: 'medium', label: 'Μεσαία', color: 'hsl(var(--warning))' },
    { value: 'high', label: 'Υψηλή', color: 'hsl(var(--destructive))' },
  ];

  const typeOptions = [
    { value: 'task', label: 'Task' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature' },
  ];

  const categoryOptions = [
    { value: 'research', label: 'Έρευνα' },
    { value: 'design', label: 'Σχεδιασμός' },
    { value: 'development', label: 'Ανάπτυξη' },
    { value: 'content', label: 'Περιεχόμενο' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'admin', label: 'Διοικητικά' },
  ];

  const deliverableOptions = deliverables.map(d => ({
    value: d.id,
    label: d.name,
  }));

  const getActivityDescription = (activity: ActivityEntry) => {
    const details = activity.details;
    switch (activity.action) {
      case 'created':
        return 'δημιούργησε αυτό το task';
      case 'updated':
        return 'ενημέρωσε αυτό το task';
      case 'status_change':
        return `άλλαξε κατάσταση από ${details?.old_status || '?'} σε ${details?.new_status || '?'}`;
      case 'completed':
        return 'ολοκλήρωσε αυτό το task';
      case 'deleted':
        return 'διέγραψε αυτό το task';
      default:
        return activity.action;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-3xl font-bold tracking-tight cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 transition-colors"
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
            <Badge variant="outline" className={cn("flex items-center gap-1", statusConfig.className)}>
              {statusConfig.icon} {statusConfig.label}
            </Badge>
            {priorityConfig && (
              <Badge variant="outline" className={priorityConfig.className}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>
          {task.project && (
            <Button
              variant="link"
              className="p-0 h-auto text-muted-foreground hover:text-primary mt-1"
              onClick={() => navigate(`/projects/${task.project_id}`)}
            >
              📁 {task.project.name}
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards - All inline editable */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Υπεύθυνος</p>
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

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Προθεσμία</p>
            <EnhancedInlineEditCell
              value={task.due_date}
              onSave={async (v) => { await updateField('due_date', v); }}
              type="date"
              placeholder="-"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Εκτίμηση</p>
            <EnhancedInlineEditCell
              value={task.estimated_hours}
              onSave={async (v) => { await updateField('estimated_hours', v ? Number(v) : null); }}
              type="number"
              placeholder="-"
              displayValue={task.estimated_hours ? `${task.estimated_hours}h` : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Πραγματικός</p>
            <p className="font-semibold">{task.actual_hours ? `${task.actual_hours}h` : '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Πρόοδος</p>
            <EnhancedInlineEditCell
              value={task.progress || 0}
              onSave={async (v) => { await updateField('progress', v ? Number(v) : 0); }}
              type="progress"
            />
          </CardContent>
        </Card>
      </div>

      {/* Status quick-change */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground mr-2">Κατάσταση:</span>
        {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG['todo']][]).map(([status, config]) => (
          <Button
            key={status}
            variant={task.status === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange(status)}
            className="gap-1"
          >
            {config.icon} {config.label}
          </Button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Σχόλια
          </TabsTrigger>
          <TabsTrigger value="files">
            <FolderOpen className="h-4 w-4 mr-1.5" />
            Αρχεία
          </TabsTrigger>
          <TabsTrigger value="time">
            <Timer className="h-4 w-4 mr-1.5" />
            Χρόνος
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-1.5" />
            Ιστορικό
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Description */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Περιγραφή</CardTitle></CardHeader>
              <CardContent>
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      rows={5}
                      placeholder="Προσθέστε περιγραφή..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingDescription(false); setDescriptionDraft(task.description || ''); }}>
                        Ακύρωση
                      </Button>
                      <Button size="sm" onClick={saveDescription}>
                        Αποθήκευση
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-muted-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors min-h-[60px]"
                    onClick={() => setEditingDescription(true)}
                    title="Κλικ για επεξεργασία"
                  >
                    {task.description || 'Κλικ για να προσθέσετε περιγραφή...'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Details - all inline editable */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Λεπτομέρειες</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Τύπος</p>
                    <EnhancedInlineEditCell
                      value={task.task_type || 'task'}
                      onSave={async (v) => { await updateField('task_type', v); }}
                      type="select"
                      options={typeOptions}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Κατηγορία</p>
                    <EnhancedInlineEditCell
                      value={task.task_category}
                      onSave={async (v) => { await updateField('task_category', v); }}
                      type="select"
                      options={categoryOptions}
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Έναρξη</p>
                    <EnhancedInlineEditCell
                      value={task.start_date}
                      onSave={async (v) => { await updateField('start_date', v); }}
                      type="date"
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Παραδοτέο</p>
                    <EnhancedInlineEditCell
                      value={task.deliverable_id}
                      onSave={async (v) => { await updateField('deliverable_id', v); }}
                      type="select"
                      options={deliverableOptions}
                      placeholder="-"
                      displayValue={task.deliverable?.name || undefined}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Προτεραιότητα</p>
                    <EnhancedInlineEditCell
                      value={task.priority || 'medium'}
                      onSave={async (v) => { await updateField('priority', v); }}
                      type="select"
                      options={priorityOptions}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Δημιουργήθηκε</p>
                    <p className="font-medium px-2 py-1">
                      {format(new Date(task.created_at), 'd MMM yyyy', { locale: el })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Subtasks ({subtasks.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subtasks.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/tasks/${sub.id}`)}
                    >
                      {STATUS_CONFIG[sub.status].icon}
                      <span className={cn("flex-1", sub.status === 'completed' && "line-through text-muted-foreground")}>
                        {sub.title}
                      </span>
                      <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[sub.status].className)}>
                        {STATUS_CONFIG[sub.status].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card>
            <CardHeader><CardTitle className="text-lg">Σχόλια</CardTitle></CardHeader>
            <CardContent>
              <CommentsSection taskId={task.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardHeader><CardTitle className="text-lg">Αρχεία</CardTitle></CardHeader>
            <CardContent>
              <FileExplorer projectId={task.project_id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Tracking */}
        <TabsContent value="time">
          <Card>
            <CardHeader><CardTitle className="text-lg">Καταγραφή Χρόνου</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <TaskTimer taskId={task.id} projectId={task.project_id} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Εκτιμώμενος χρόνος</p>
                  <p className="text-2xl font-bold">{task.estimated_hours ? `${task.estimated_hours}h` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Πραγματικός χρόνος</p>
                  <p className="text-2xl font-bold">{task.actual_hours ? `${task.actual_hours}h` : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="text-lg">Ιστορικό Ενεργειών</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">Δεν υπάρχουν καταγεγραμμένες ενέργειες.</p>
              ) : (
                <div className="space-y-1">
                  {activities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user_name}</span>{' '}
                          <span className="text-muted-foreground">{getActivityDescription(activity)}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(activity.created_at), 'd MMM, HH:mm', { locale: el })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
