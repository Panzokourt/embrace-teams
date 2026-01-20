import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  CheckSquare, 
  Plus, 
  Search,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  project_id: string;
  assigned_to: string | null;
  project?: { name: string } | null;
  assignee?: { full_name: string | null } | null;
}

export default function TasksPage() {
  const { user, isAdmin, isManager } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    status: 'todo' as TaskStatus,
    due_date: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Σφάλμα κατά τη φόρτωση tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id) {
      toast.error('Επιλέξτε ένα έργο');
      return;
    }
    setSaving(true);

    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        project_id: formData.project_id,
        status: formData.status,
        due_date: formData.due_date || null,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select(`*, project:projects(name)`)
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success('Το task δημιουργήθηκε!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status } : t
      ));

      toast.success('Το task ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_id: '',
      status: 'todo',
      due_date: '',
    });
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-primary" />;
      case 'review':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    const labels = {
      todo: 'Προς υλοποίηση',
      in_progress: 'Σε εξέλιξη',
      review: 'Προς έλεγχο',
      completed: 'Ολοκληρώθηκε',
    };
    return labels[status];
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const reviewTasks = filteredTasks.filter(t => t.status === 'review');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const canManage = isAdmin || isManager;

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';

    return (
      <Card className={cn(
        "hover:shadow-md transition-shadow",
        isOverdue && "border-destructive/50 bg-destructive/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                const nextStatus: Record<TaskStatus, TaskStatus> = {
                  todo: 'in_progress',
                  in_progress: 'review',
                  review: 'completed',
                  completed: 'todo',
                };
                updateTaskStatus(task.id, nextStatus[task.status]);
              }}
              className="mt-0.5"
            >
              {getStatusIcon(task.status)}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium",
                task.status === 'completed' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </p>
              {task.project && (
                <p className="text-sm text-muted-foreground">{task.project.name}</p>
              )}
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), 'd MMM yyyy', { locale: el })}
                  {isOverdue && <span className="ml-1">(Overdue)</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CheckSquare className="h-8 w-8" />
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            Διαχείριση εργασιών και παραδοτέων
          </p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Νέο Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Δημιουργία Νέου Task</DialogTitle>
                <DialogDescription>
                  Προσθέστε ένα νέο task σε ένα έργο
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Τίτλος *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="π.χ. Competitor Analysis"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Περιγραφή</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Έργο *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε έργο" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <SelectItem value="todo">Προς υλοποίηση</SelectItem>
                        <SelectItem value="in_progress">Σε εξέλιξη</SelectItem>
                        <SelectItem value="review">Προς έλεγχο</SelectItem>
                        <SelectItem value="completed">Ολοκληρώθηκε</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Deadline</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Δημιουργία
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Αναζήτηση tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Todo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Προς Υλοποίηση</h3>
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {todoTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Σε Εξέλιξη</h3>
              <Badge variant="secondary">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Review */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <h3 className="font-semibold">Προς Έλεγχο</h3>
              <Badge variant="secondary">{reviewTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {reviewTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Completed */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="font-semibold">Ολοκληρώθηκε</h3>
              <Badge variant="secondary">{completedTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
