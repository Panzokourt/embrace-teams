import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTasksRealtime } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { UnifiedViewToggle, usePersistedViewMode, type UnifiedViewMode } from '@/components/ui/unified-view-toggle';
import { TasksTableView } from '@/components/tasks/TasksTableView';
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
  Trash2,
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

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface Task {
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
  is_ai_generated: boolean | null;
  created_by: string | null;
  project?: { name: string } | null;
  assignee?: { full_name: string | null; avatar_url?: string | null } | null;
}

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; label: string; className: string }> = {
  todo: { icon: <Circle className="h-4 w-4" />, label: 'Προς Υλοποίηση', className: 'bg-muted text-muted-foreground' },
  in_progress: { icon: <Clock className="h-4 w-4" />, label: 'Σε Εξέλιξη', className: 'bg-primary/10 text-primary border-primary/20' },
  review: { icon: <AlertCircle className="h-4 w-4" />, label: 'Προς Έλεγχο', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, label: 'Ολοκληρώθηκε', className: 'bg-success/10 text-success border-success/20' },
};

export default function TasksPage() {
  const { isAdmin, isManager } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode('tasks', 'kanban');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    status: 'todo' as TaskStatus,
    priority: 'medium',
    due_date: '',
    start_date: '',
    assigned_to: '',
    estimated_hours: '',
    task_type: 'task',
    task_category: '',
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

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch assignee names separately
      const tasksWithAssignees = await Promise.all((data || []).map(async (task) => {
        if (task.assigned_to) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', task.assigned_to)
            .single();
          return { ...task, assignee: profile };
        }
        return { ...task, assignee: null };
      }));
      
      setTasks(tasksWithAssignees as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Σφάλμα κατά τη φόρτωση tasks');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Subscribe to realtime updates
  useTasksRealtime(fetchTasks);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [fetchTasks]);

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
        priority: formData.priority || 'medium',
        due_date: formData.due_date || null,
        start_date: formData.start_date || null,
        assigned_to: formData.assigned_to || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        task_type: formData.task_type || 'task',
        task_category: formData.task_category || null,
      };

      if (editingTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
          .select(`*, project:projects(name)`)
          .single();

        if (error) throw error;
        const assignee = formData.assigned_to ? users.find(u => u.id === formData.assigned_to) : null;
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...data, assignee: assignee ? { full_name: assignee.full_name } : null } as Task : t));
        toast.success('Το task ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select(`*, project:projects(name)`)
          .single();

        if (error) throw error;
        const assignee = formData.assigned_to ? users.find(u => u.id === formData.assigned_to) : null;
        setTasks(prev => [{ ...data, assignee: assignee ? { full_name: assignee.full_name } : null } as Task, ...prev]);
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

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      project_id: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      start_date: '',
      assigned_to: '',
      estimated_hours: '',
      task_type: 'task',
      task_category: '',
    });
  };

  const getStatusBadge = (status: TaskStatus) => {
    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  const filteredTasks = useMemo(() => 
    tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee = assigneeFilter === 'all' || 
        (assigneeFilter === 'unassigned' && !task.assigned_to) ||
        task.assigned_to === assigneeFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesAssignee && matchesStatus;
    }), [tasks, searchQuery, assigneeFilter, statusFilter]
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

    const draggedTask = tasks.find(t => t.id === activeId);
    if (!draggedTask) return;

    const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed'];
    let targetStatus: TaskStatus | null = null;

    if (statuses.includes(overId as TaskStatus)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && draggedTask.status !== targetStatus) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: targetStatus })
          .eq('id', activeId);

        if (error) throw error;
        toast.success('Το task μετακινήθηκε!');
      } catch (error) {
        console.error('Error updating task:', error);
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
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
      start_date: task.start_date || '',
      assigned_to: task.assigned_to || '',
      estimated_hours: task.estimated_hours?.toString() || '',
      task_type: task.task_type || 'task',
      task_category: task.task_category || '',
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

  // Bulk update multiple tasks
  const handleBulkUpdate = async (taskIds: string[], field: string, value: string | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ [field]: value })
        .in('id', taskIds);

      if (error) throw error;

      // Update local state
      if (field === 'assigned_to') {
        const assignee = value ? users.find(u => u.id === value) : null;
        setTasks(prev => prev.map(t => 
          taskIds.includes(t.id) ? { ...t, [field]: value, assignee: assignee ? { full_name: assignee.full_name, avatar_url: assignee.avatar_url } : null } : t
        ));
      } else {
        setTasks(prev => prev.map(t => 
          taskIds.includes(t.id) ? { ...t, [field]: value } : t
        ));
      }
      toast.success(`${taskIds.length} tasks ενημερώθηκαν!`);
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  // Create subtask
  const handleCreateSubtask = (parentTaskId: string) => {
    const parentTask = tasks.find(t => t.id === parentTaskId);
    if (!parentTask) return;
    
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      project_id: parentTask.project_id,
      status: 'todo',
      priority: 'medium',
      due_date: '',
      start_date: '',
      assigned_to: '',
      estimated_hours: '',
      task_type: 'task',
      task_category: '',
    });
    // Store parent task id for subtask creation - we'll add this to the dialog
    setDialogOpen(true);
  };

  const handleInlineUpdate = async (taskId: string, field: string, value: string | number | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ [field]: value })
        .eq('id', taskId);

      if (error) throw error;

      // If assignee changed, update the assignee object too
      if (field === 'assigned_to') {
        const assignee = value ? users.find(u => u.id === value) : null;
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, [field]: value as string | null, assignee: assignee ? { full_name: assignee.full_name, avatar_url: assignee.avatar_url } : null } : t
        ));
      } else if (field === 'project_id') {
        const project = value ? projects.find(p => p.id === value) : null;
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, [field]: value as string, project: project ? { name: project.name } : null } : t
        ));
      } else {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, [field]: value } : t
        ));
      }
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const TaskCard = ({ task, isDragOverlay = false }: { task: Task; isDragOverlay?: boolean }) => {
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';

    return (
      <div 
        className={cn(
          "group bg-card rounded-xl border border-border/50 p-4 transition-all duration-200 ease-apple cursor-pointer",
          "hover:shadow-soft hover:border-border hover:-translate-y-0.5",
          isOverdue && "border-destructive/30 bg-destructive/[0.02]",
          isDragOverlay && "shadow-soft-xl rotate-1 scale-105"
        )}
        onClick={() => !isDragOverlay && handleEdit(task)}
      >
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 flex-shrink-0 cursor-grab transition-colors group-hover:text-muted-foreground/50" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span className="transition-transform duration-200 group-hover:scale-110 mt-0.5">
                {statusConfig[task.status].icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm text-foreground/90 group-hover:text-foreground transition-colors",
                  task.status === 'completed' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{task.project.name}</p>
                )}
              </div>
              {canManage && !isDragOverlay && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-secondary" onClick={() => handleEdit(task)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
              {task.assignee && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(task.assignee.full_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground/60"
                )}>
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), 'd MMM', { locale: el })}
                  {isOverdue && <span className="font-medium">(Overdue)</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    { id: 'todo' as TaskStatus, label: 'Προς Υλοποίηση', icon: <Circle className="h-5 w-5 text-muted-foreground" /> },
    { id: 'in_progress' as TaskStatus, label: 'Σε Εξέλιξη', icon: <Clock className="h-5 w-5 text-primary" /> },
    { id: 'review' as TaskStatus, label: 'Προς Έλεγχο', icon: <AlertCircle className="h-5 w-5 text-warning" /> },
    { id: 'completed' as TaskStatus, label: 'Ολοκληρώθηκε', icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
  ];

  const renderCardView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredTasks.map(task => (
        <Card 
          key={task.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleEdit(task)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold mb-1",
                  task.status === 'completed' && "line-through text-muted-foreground"
                )}>{task.title}</h3>
                {task.project && (
                  <p className="text-sm text-muted-foreground">{task.project.name}</p>
                )}
              </div>
              {getStatusBadge(task.status)}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(task.assignee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">{task.assignee.full_name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Χωρίς ανάθεση</span>
              )}
              {task.due_date && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(task.due_date), 'd MMM', { locale: el })}
                </span>
              )}
            </div>
            {canManage && (
              <div className="flex gap-2 mt-4 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" onClick={() => handleEdit(task)}>
                  <Pencil className="h-3 w-3 mr-1" /> Επεξεργασία
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(task.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Διαγραφή
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTableView = () => (
    <TasksTableView
      tasks={filteredTasks}
      projects={projects}
      users={users}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onInlineUpdate={handleInlineUpdate}
      onCreateSubtask={handleCreateSubtask}
      onBulkUpdate={handleBulkUpdate}
      canManage={canManage}
      showProject={true}
    />
  );

  const renderKanbanView = () => (
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
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary" />
            </span>
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm ml-[52px]">
            Διαχείριση εργασιών και παραδοτέων
          </p>
        </div>

        <div className="flex items-center gap-3">
          <UnifiedViewToggle 
            viewMode={viewMode} 
            onViewModeChange={setViewMode}
          />

          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'Επεξεργασία Task' : 'Δημιουργία Νέου Task'}</DialogTitle>
                  <DialogDescription>
                    {editingTask ? 'Ενημερώστε τα στοιχεία του task' : 'Προσθέστε ένα νέο task σε ένα έργο'}
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

                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Ανάθεση σε</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Χωρίς ανάθεση" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Χωρίς ανάθεση</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">{getInitials(u.full_name)}</AvatarFallback>
                              </Avatar>
                              {u.full_name || u.email}
                            </div>
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
                      <Label htmlFor="priority">Προτεραιότητα</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Χαμηλή</SelectItem>
                          <SelectItem value="medium">Μεσαία</SelectItem>
                          <SelectItem value="high">Υψηλή</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Έναρξη</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      />
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task_type">Τύπος</Label>
                      <Select
                        value={formData.task_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, task_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task_category">Κατηγορία</Label>
                      <Select
                        value={formData.task_category || 'none'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, task_category: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε" />
                        </SelectTrigger>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimated_hours">Εκτίμηση (ώρες)</Label>
                      <Input
                        id="estimated_hours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.estimated_hours}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                        placeholder="π.χ. 4"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                      Ακύρωση
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {editingTask ? 'Αποθήκευση' : 'Δημιουργία'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Φίλτρο ανάθεσης" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα τα tasks</SelectItem>
            <SelectItem value="unassigned">Χωρίς ανάθεση</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {viewMode !== 'kanban' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Κατάσταση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
              <SelectItem value="todo">Προς υλοποίηση</SelectItem>
              <SelectItem value="in_progress">Σε εξέλιξη</SelectItem>
              <SelectItem value="review">Προς έλεγχο</SelectItem>
              <SelectItem value="completed">Ολοκληρώθηκε</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν βρέθηκαν tasks</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || assigneeFilter !== 'all' || statusFilter !== 'all'
                ? 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης'
                : 'Δημιουργήστε το πρώτο task για να ξεκινήσετε'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'card' && renderCardView()}
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'kanban' && renderKanbanView()}
        </>
      )}
    </div>
  );
}
