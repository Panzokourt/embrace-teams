import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Calendar,
  GripVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DraggableCard } from '@/components/dnd/DraggableCard';
import { DroppableColumn } from '@/components/dnd/DroppableColumn';

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
  const { isAdmin, isManager } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    status: 'todo' as TaskStatus,
    due_date: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

      if (editingTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select(`*, project:projects(name)`)
          .single();

        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === editingTask.id ? data : t));
        toast.success('Το task ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select(`*, project:projects(name)`)
          .single();

        if (error) throw error;
        setTasks(prev => [data, ...prev]);
        toast.success('Το task δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
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
    setEditingTask(null);
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

  const filteredTasks = useMemo(() => 
    tasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [tasks, searchQuery]
  );

  const tasksByStatus = useMemo(() => ({
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  }), [filteredTasks]);

  const canManage = isAdmin || isManager;

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed'];
    if (statuses.includes(overId as TaskStatus)) {
      if (activeTask.status !== overId) {
        setTasks(prev => prev.map(t =>
          t.id === activeId ? { ...t, status: overId as TaskStatus } : t
        ));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Determine the target status
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed'];
    let targetStatus: TaskStatus | null = null;

    if (statuses.includes(overId as TaskStatus)) {
      targetStatus = overId as TaskStatus;
    } else {
      // Dropped on another task, find its status
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && activeTask.status !== targetStatus) {
      // Already updated optimistically in handleDragOver, now persist
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: targetStatus })
          .eq('id', activeId);

        if (error) throw error;
        toast.success('Το task μετακινήθηκε!');
      } catch (error) {
        console.error('Error updating task:', error);
        // Revert on error
        fetchTasks();
        toast.error('Σφάλμα κατά την ενημέρωση');
      }
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      project_id: task.project_id,
      status: task.status,
      due_date: task.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Το task διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const TaskCard = ({ task, isDragOverlay = false }: { task: Task; isDragOverlay?: boolean }) => {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';

    return (
      <Card className={cn(
        "hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing",
        isOverdue && "border-destructive/50 bg-destructive/5",
        isDragOverlay && "shadow-xl rotate-2"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                {getStatusIcon(task.status)}
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
                </div>
                {canManage && !isDragOverlay && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(task)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-xs ml-7",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), 'd MMM yyyy', { locale: el })}
                  {isOverdue && <span className="ml-1">(Εκπρόθεσμο)</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const columns = [
    { id: 'todo' as TaskStatus, label: 'Προς Υλοποίηση', icon: <Circle className="h-5 w-5 text-muted-foreground" /> },
    { id: 'in_progress' as TaskStatus, label: 'Σε Εξέλιξη', icon: <Clock className="h-5 w-5 text-primary" /> },
    { id: 'review' as TaskStatus, label: 'Προς Έλεγχο', icon: <AlertCircle className="h-5 w-5 text-warning" /> },
    { id: 'completed' as TaskStatus, label: 'Ολοκληρώθηκε', icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
  ];

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Kanban Board with DnD */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {columns.map(column => (
              <div key={column.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  {column.icon}
                  <h3 className="font-semibold">{column.label}</h3>
                  <Badge variant="secondary">{tasksByStatus[column.id].length}</Badge>
                </div>
                <DroppableColumn
                  id={column.id}
                  items={tasksByStatus[column.id].map(t => t.id)}
                >
                  <div className="space-y-3">
                    {tasksByStatus[column.id].map(task => (
                      <DraggableCard key={task.id} id={task.id}>
                        <TaskCard task={task} />
                      </DraggableCard>
                    ))}
                    {tasksByStatus[column.id].length === 0 && (
                      <div className="border border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
                        Σύρετε tasks εδώ
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
