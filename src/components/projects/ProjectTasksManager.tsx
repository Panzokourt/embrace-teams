import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTasksRealtime } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Plus, 
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { computeParentStatus } from '@/utils/subtaskProgress';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'internal_review' | 'client_review' | 'completed';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assigned_to: string | null;
  deliverable_id: string | null;
  assignee?: { full_name: string | null } | null;
  deliverable?: { name: string } | null;
}

interface Deliverable {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface ProjectTasksManagerProps {
  projectId: string;
}

export function ProjectTasksManager({ projectId }: ProjectTasksManagerProps) {
  const { isAdmin, isManager } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    due_date: '',
    assigned_to: '',
    deliverable_id: '',
  });

  const canManage = isAdmin || isManager;

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, deliverable:deliverables(name)')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch assignee profiles separately
      const assigneeIds = [...new Set((data || []).filter(t => t.assigned_to).map(t => t.assigned_to as string))];
      let profilesMap = new Map<string, { full_name: string | null }>();
      
      if (assigneeIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assigneeIds);
        
        profilesMap = new Map((profilesData || []).map(p => [p.id, { full_name: p.full_name }]));
      }
      
      const tasksWithAssignees = (data || []).map(task => ({
        ...task,
        assignee: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null
      }));
      
      setTasks(tasksWithAssignees as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useTasksRealtime(fetchTasks);

  useEffect(() => {
    fetchTasks();
    fetchDeliverables();
    fetchProfiles();
  }, [fetchTasks]);

  const fetchDeliverables = async () => {
    const { data } = await supabase
      .from('deliverables')
      .select('id, name')
      .eq('project_id', projectId)
      .order('created_at');
    setDeliverables(data || []);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('status', ['active', 'pending'])
      .order('full_name');
    setProfiles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const taskData = {
        project_id: projectId,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        deliverable_id: formData.deliverable_id || null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Το task ενημερώθηκε!');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert(taskData);

        if (error) throw error;
        toast.success('Το task δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
      deliverable_id: task.deliverable_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success('Το task διαγράφηκε!');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Check if this task is a subtask - if so, auto-update parent
      const changedTask = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      // If this is a subtask, auto-update the parent task's status
      if (changedTask?.deliverable_id || true) {
        // Check if task has a parent
        const { data: taskData } = await supabase
          .from('tasks')
          .select('parent_task_id')
          .eq('id', taskId)
          .single();
        
        if (taskData?.parent_task_id) {
          // Fetch all sibling subtasks
          const { data: siblings } = await supabase
            .from('tasks')
            .select('id, status')
            .eq('parent_task_id', taskData.parent_task_id);
          
          if (siblings) {
            // Update siblings with the new status for the changed task
            const updatedSiblings = siblings.map(s => 
              s.id === taskId ? { ...s, status: newStatus } : s
            );
            const { computeParentStatus } = await import('@/utils/subtaskProgress');
            const parentStatus = computeParentStatus(updatedSiblings);
            
            await supabase
              .from('tasks')
              .update({ status: parentStatus })
              .eq('id', taskData.parent_task_id);
          }
        }
      }
      
      toast.success('Η κατάσταση ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      due_date: '',
      assigned_to: '',
      deliverable_id: '',
    });
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-primary" />;
      case 'review': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'internal_review': return <AlertCircle className="h-4 w-4 text-violet-600" />;
      case 'client_review': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    const labels: Record<TaskStatus, string> = {
      todo: 'Προς Υλοποίηση',
      in_progress: 'Σε Εξέλιξη',
      review: 'Αναθεώρηση',
      internal_review: 'Εσωτ. Έγκριση',
      client_review: 'Έγκριση Πελάτη',
      completed: 'Ολοκληρώθηκε',
    };
    return labels[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Νέο Task
          </Button>
        </div>
      )}

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Δεν υπάρχουν tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50">
              {getStatusIcon(task.status)}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium",
                  task.status === 'completed' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                  {task.assignee?.full_name && (
                    <span>👤 {task.assignee.full_name}</span>
                  )}
                  {task.deliverable?.name && (
                    <span>📦 {task.deliverable.name}</span>
                  )}
                  {task.due_date && (
                    <span>📅 {format(new Date(task.due_date), 'd MMM', { locale: el })}</span>
                  )}
                </div>
              </div>
              
              <Select
                value={task.status}
                onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Προς Υλοποίηση</SelectItem>
                  <SelectItem value="in_progress">Σε Εξέλιξη</SelectItem>
                  <SelectItem value="review">Αναθεώρηση</SelectItem>
                  <SelectItem value="internal_review">Εσωτ. Έγκριση</SelectItem>
                  <SelectItem value="client_review">Έγκριση Πελάτη</SelectItem>
                  <SelectItem value="completed">Ολοκληρώθηκε</SelectItem>
                </SelectContent>
              </Select>

              {canManage && (
                <EditDeleteActions
                  onEdit={() => handleEdit(task)}
                  onDelete={() => handleDelete(task.id)}
                  itemName={task.title}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Επεξεργασία Task' : 'Νέο Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Ενημερώστε τα στοιχεία του task' : 'Δημιουργήστε ένα νέο task για το έργο'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Τίτλος *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Εισάγετε τίτλο"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Προαιρετική περιγραφή"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Κατάσταση</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TaskStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Προς Υλοποίηση</SelectItem>
                      <SelectItem value="in_progress">Σε Εξέλιξη</SelectItem>
                      <SelectItem value="review">Αναθεώρηση</SelectItem>
                      <SelectItem value="internal_review">Εσωτ. Έγκριση</SelectItem>
                      <SelectItem value="client_review">Έγκριση Πελάτη</SelectItem>
                      <SelectItem value="completed">Ολοκληρώθηκε</SelectItem>
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Προθεσμία</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Υπεύθυνος</Label>
              <Select
                value={formData.assigned_to || 'none'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε υπεύθυνο" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένας</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable_id">Παραδοτέο</Label>
              <Select
                value={formData.deliverable_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, deliverable_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε παραδοτέο" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένα</SelectItem>
                  {deliverables.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingTask ? 'Αποθήκευση' : 'Δημιουργία'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
