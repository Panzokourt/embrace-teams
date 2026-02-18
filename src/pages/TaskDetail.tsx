import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { FileExplorer } from '@/components/files/FileExplorer';
import { TaskTimer } from '@/components/time-tracking/TaskTimer';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, CheckCircle2, Clock, Circle, AlertCircle,
  Calendar, User, FolderOpen, MessageSquare, Timer, Save
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
  const { isAdmin, isManager, hasPermission } = useAuth();
  const [task, setTask] = useState<TaskData | null>(null);
  const [subtasks, setSubtasks] = useState<TaskData[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium',
    due_date: '',
    start_date: '',
    assigned_to: '',
    deliverable_id: '',
    estimated_hours: '',
    progress: 0,
    task_type: 'task',
    task_category: '',
  });

  const canEdit = isAdmin || isManager || hasPermission('projects.edit');

  const fetchTask = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(name), deliverable:deliverables(name)')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch assignee
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
      setFormData({
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status,
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || '',
        start_date: taskData.start_date || '',
        assigned_to: taskData.assigned_to || '',
        deliverable_id: taskData.deliverable_id || '',
        estimated_hours: taskData.estimated_hours?.toString() || '',
        progress: taskData.progress || 0,
        task_type: taskData.task_type || 'task',
        task_category: taskData.task_category || '',
      });

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
  }, [fetchTask]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('status', ['active', 'pending'])
      .order('full_name');
    setProfiles(data || []);
  };

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const updateData = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        start_date: formData.start_date || null,
        assigned_to: formData.assigned_to || null,
        deliverable_id: formData.deliverable_id || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        progress: formData.progress,
        task_type: formData.task_type,
        task_category: formData.task_category || null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
      toast.success('Το task ενημερώθηκε!');
      setEditing(false);
      fetchTask();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
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
      setFormData(prev => ({ ...prev, status: newStatus }));
      toast.success('Η κατάσταση ενημερώθηκε!');
    } catch (error) {
      toast.error('Σφάλμα');
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            {editing ? (
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-bold h-auto py-1 max-w-lg"
              />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
            )}
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
        <div className="flex gap-2">
          {canEdit && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Επεξεργασία
            </Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); fetchTask(); }}>
                Ακύρωση
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Αποθήκευση
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Υπεύθυνος</p>
            {editing ? (
              <Select value={formData.assigned_to || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Κανένας" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένας</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="font-semibold mt-1">{task.assignee?.full_name || 'Χωρίς ανάθεση'}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Προθεσμία</p>
            {editing ? (
              <Input type="date" value={formData.due_date} onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))} className="mt-1" />
            ) : (
              <p className="font-semibold mt-1">
                {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: el }) : '-'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Εκτίμηση</p>
            {editing ? (
              <Input type="number" value={formData.estimated_hours} onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))} placeholder="0" className="mt-1" />
            ) : (
              <p className="font-semibold mt-1">{task.estimated_hours ? `${task.estimated_hours}h` : '-'}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Πραγματικός</p>
            <p className="font-semibold mt-1">{task.actual_hours ? `${task.actual_hours}h` : '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Πρόοδος</p>
            {editing ? (
              <Input type="number" min={0} max={100} value={formData.progress} onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) || 0 }))} className="mt-1" />
            ) : (
              <div className="mt-1">
                <p className="font-semibold">{task.progress || 0}%</p>
                <Progress value={task.progress || 0} className="h-1.5 mt-1" />
              </div>
            )}
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
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Description */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Περιγραφή</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={5}
                    placeholder="Προσθέστε περιγραφή..."
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {task.description || 'Δεν υπάρχει περιγραφή'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Λεπτομέρειες</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Τύπος</p>
                    {editing ? (
                      <Select value={formData.task_type} onValueChange={(v) => setFormData(prev => ({ ...prev, task_type: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium mt-1">{task.task_type || 'Task'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Κατηγορία</p>
                    {editing ? (
                      <Select value={formData.task_category || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, task_category: v === 'none' ? '' : v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Καμία" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Καμία</SelectItem>
                          <SelectItem value="research">Έρευνα</SelectItem>
                          <SelectItem value="design">Σχεδιασμός</SelectItem>
                          <SelectItem value="development">Ανάπτυξη</SelectItem>
                          <SelectItem value="content">Περιεχόμενο</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="admin">Διοικητικά</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium mt-1">{task.task_category || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Έναρξη</p>
                    {editing ? (
                      <Input type="date" value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} className="mt-1" />
                    ) : (
                      <p className="font-medium mt-1">
                        {task.start_date ? format(new Date(task.start_date), 'd MMM yyyy', { locale: el }) : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Παραδοτέο</p>
                    {editing ? (
                      <Select value={formData.deliverable_id || 'none'} onValueChange={(v) => setFormData(prev => ({ ...prev, deliverable_id: v === 'none' ? '' : v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Κανένα" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Κανένα</SelectItem>
                          {deliverables.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium mt-1">{task.deliverable?.name || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Προτεραιότητα</p>
                    {editing ? (
                      <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Χαμηλή</SelectItem>
                          <SelectItem value="medium">Μεσαία</SelectItem>
                          <SelectItem value="high">Υψηλή</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium mt-1">{priorityConfig?.label || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Δημιουργήθηκε</p>
                    <p className="font-medium mt-1">
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
      </Tabs>
    </div>
  );
}
