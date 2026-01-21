import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertCircle,
  ListTodo
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

type TenderTaskRow = Tables<'tender_tasks'>;

interface TenderTask extends TenderTaskRow {
  assignee?: { full_name: string | null; avatar_url?: string | null } | null;
  deliverable?: { name: string } | null;
}

interface TenderDeliverable {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface TenderTasksTableProps {
  tenderId: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; className: string }> = {
  todo: { label: 'Προς Υλοποίηση', icon: <Circle className="h-4 w-4" />, className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Σε Εξέλιξη', icon: <Clock className="h-4 w-4" />, className: 'bg-primary/10 text-primary' },
  review: { label: 'Αναθεώρηση', icon: <AlertCircle className="h-4 w-4" />, className: 'bg-warning/10 text-warning' },
  completed: { label: 'Ολοκληρώθηκε', icon: <CheckCircle2 className="h-4 w-4" />, className: 'bg-success/10 text-success' },
};

export function TenderTasksTable({ tenderId }: TenderTasksTableProps) {
  const { isAdmin, isManager } = useAuth();
  const [tasks, setTasks] = useState<TenderTask[]>([]);
  const [deliverables, setDeliverables] = useState<TenderDeliverable[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<TenderTask | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    due_date: '',
    assigned_to: '',
    tender_deliverable_id: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchTasks();
    fetchDeliverables();
    fetchProfiles();
  }, [tenderId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tender_tasks')
        .select('*, deliverable:tender_deliverables(name)')
        .eq('tender_id', tenderId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch assignee profiles separately
      const assigneeIds = [...new Set((data || []).filter(t => t.assigned_to).map(t => t.assigned_to as string))];
      let profilesMap = new Map<string, { full_name: string | null; avatar_url?: string | null }>();
      
      if (assigneeIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', assigneeIds);
        
        profilesMap = new Map((profilesData || []).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
      }
      
      const tasksWithAssignees = (data || []).map(task => ({
        ...task,
        assignee: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null
      }));
      
      setTasks(tasksWithAssignees as TenderTask[]);
    } catch (error) {
      console.error('Error fetching tender tasks:', error);
      toast.error('Σφάλμα κατά τη φόρτωση tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliverables = async () => {
    const { data } = await supabase
      .from('tender_deliverables')
      .select('id, name')
      .eq('tender_id', tenderId)
      .order('created_at');
    setDeliverables(data || []);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('status', 'active')
      .order('full_name');
    setProfiles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const taskData = {
        tender_id: tenderId,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        tender_deliverable_id: formData.tender_deliverable_id || null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tender_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Το task ενημερώθηκε!');
      } else {
        const { error } = await supabase
          .from('tender_tasks')
          .insert(taskData);

        if (error) throw error;
        toast.success('Το task δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving tender task:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task: TenderTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status as TaskStatus,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
      tender_deliverable_id: task.tender_deliverable_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tender_tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success('Το task διαγράφηκε!');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting tender task:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tender_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
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
      tender_deliverable_id: '',
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

      {/* Table */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Δεν υπάρχουν tasks</p>
          <p className="text-xs mt-1">Προσθέστε εργασίες για την προετοιμασία του διαγωνισμού</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Τίτλος</TableHead>
                <TableHead className="w-[150px]">Υπεύθυνος</TableHead>
                <TableHead className="hidden md:table-cell">Παραδοτέο</TableHead>
                <TableHead className="w-[120px]">Προθεσμία</TableHead>
                <TableHead className="w-[160px]">Κατάσταση</TableHead>
                <TableHead className="w-[80px]">Ενέργειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => {
                const statusConfig = STATUS_CONFIG[task.status as TaskStatus] || STATUS_CONFIG.todo;
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <span className={cn(
                        "font-medium",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(task.assignee.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[100px]">
                            {task.assignee.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {task.deliverable?.name ? (
                        <Badge variant="outline" className="text-xs">
                          {task.deliverable.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <span className="text-sm">
                          {format(new Date(task.due_date), 'd MMM', { locale: el })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                        disabled={!canManage}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                {config.icon}
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <EditDeleteActions
                          onEdit={() => handleEdit(task)}
                          onDelete={() => handleDelete(task.id)}
                          itemName={task.title}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Επεξεργασία Task' : 'Νέο Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Ενημερώστε τα στοιχεία του task' : 'Δημιουργήστε ένα νέο task για τον διαγωνισμό'}
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
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
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
              <Label htmlFor="tender_deliverable_id">Παραδοτέο</Label>
              <Select
                value={formData.tender_deliverable_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tender_deliverable_id: value === 'none' ? '' : value }))}
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
