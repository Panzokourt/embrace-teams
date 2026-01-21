import { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { ColumnVisibilityToggle, ColumnConfig } from '@/components/shared/ColumnVisibilityToggle';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { 
  ChevronDown, 
  ChevronRight, 
  Link2, 
  Plus,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  assigned_to: string | null;
  project_id: string;
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
  assignee?: { full_name: string | null; avatar_url?: string | null } | null;
  project?: { name: string } | null;
  creator?: { full_name: string | null; avatar_url?: string | null } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface TasksTableViewProps {
  tasks: Task[];
  projects: Project[];
  users: Profile[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onInlineUpdate: (taskId: string, field: string, value: string | number | null) => Promise<void>;
  canManage: boolean;
  showProject?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Προς Υλοποίηση', color: 'hsl(var(--muted-foreground))' },
  { value: 'in_progress', label: 'Σε Εξέλιξη', color: 'hsl(var(--primary))' },
  { value: 'review', label: 'Αναθεώρηση', color: 'hsl(var(--warning))' },
  { value: 'completed', label: 'Ολοκληρώθηκε', color: 'hsl(var(--success))' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Χαμηλή', color: '#22c55e' },
  { value: 'medium', label: 'Μεσαία', color: '#f59e0b' },
  { value: 'high', label: 'Υψηλή', color: '#ef4444' },
];

const TASK_TYPE_OPTIONS = [
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

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'title', label: 'Τίτλος', visible: true, locked: true },
  { id: 'assignee', label: 'Υπεύθυνος', visible: true },
  { id: 'project', label: 'Έργο', visible: true },
  { id: 'start_date', label: 'Έναρξη', visible: false },
  { id: 'due_date', label: 'Προθεσμία', visible: true },
  { id: 'status', label: 'Κατάσταση', visible: true },
  { id: 'priority', label: 'Προτεραιότητα', visible: true },
  { id: 'progress', label: 'Πρόοδος', visible: true },
  { id: 'estimated_hours', label: 'Εκτίμηση', visible: false },
  { id: 'actual_hours', label: 'Πραγματικός', visible: false },
  { id: 'task_type', label: 'Τύπος', visible: false },
  { id: 'category', label: 'Κατηγορία', visible: false },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'title' | 'due_date' | 'status' | 'priority' | 'progress';

export function TasksTableView({
  tasks,
  projects,
  users,
  onEdit,
  onDelete,
  onInlineUpdate,
  canManage,
  showProject = true
}: TasksTableViewProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Build tasks hierarchy
  const { parentTasks, childTasksMap, dependencyCountMap } = useMemo(() => {
    const childMap = new Map<string, Task[]>();
    const depCount = new Map<string, number>();
    
    tasks.forEach(task => {
      if (task.parent_task_id) {
        const children = childMap.get(task.parent_task_id) || [];
        children.push(task);
        childMap.set(task.parent_task_id, children);
      }
      if (task.depends_on) {
        depCount.set(task.depends_on, (depCount.get(task.depends_on) || 0) + 1);
      }
    });
    
    const parents = tasks.filter(t => !t.parent_task_id);
    return { parentTasks: parents, childTasksMap: childMap, dependencyCountMap: depCount };
  }, [tasks]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    if (!sortField || !sortDirection) return parentTasks;
    
    return [...parentTasks].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'due_date':
          aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          break;
        case 'status':
          const statusOrder = { todo: 0, in_progress: 1, review: 2, completed: 3 };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
          break;
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
          break;
        case 'progress':
          aVal = a.progress ?? 0;
          bVal = b.progress ?? 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [parentTasks, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortField(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) newExpanded.delete(taskId);
    else newExpanded.add(taskId);
    setExpandedTasks(newExpanded);
  };

  const isColumnVisible = (columnId: string) => 
    columns.find(c => c.id === columnId)?.visible ?? true;

  const userOptions = users.map(u => ({
    value: u.id,
    label: u.full_name || u.email,
    avatar: u.avatar_url || undefined
  }));

  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name
  }));

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    const isOverdue = isPast(date) && !isToday(date);
    
    let label = format(date, 'd MMM', { locale: el });
    if (isToday(date)) label = 'Σήμερα';
    else if (isTomorrow(date)) label = 'Αύριο';
    
    return { label, isOverdue };
  };

  const renderTaskRow = (task: Task, level = 0) => {
    const children = childTasksMap.get(task.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const depCount = dependencyCountMap.get(task.id) || 0;
    const dueDateInfo = formatDueDate(task.due_date);

    return (
      <>
        <TableRow key={task.id} className="group hover:bg-muted/50">
          {/* Title with expand/collapse */}
          <TableCell className="font-medium">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren ? (
                <button 
                  onClick={() => toggleExpand(task.id)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="w-5" />
              )}
              
              <EnhancedInlineEditCell
                value={task.title}
                onSave={(val) => onInlineUpdate(task.id, 'title', val)}
                type="text"
                className={cn(task.status === 'completed' && "line-through text-muted-foreground")}
                disabled={!canManage}
              />
              
              {depCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Link2 className="h-3 w-3" />
                  {depCount}
                </Badge>
              )}
              
              {task.is_ai_generated && (
                <span title="AI Generated">
                  <Sparkles className="h-3 w-3 text-primary" />
                </span>
              )}
            </div>
          </TableCell>

          {/* Assignee */}
          {isColumnVisible('assignee') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.assigned_to}
                onSave={(val) => onInlineUpdate(task.id, 'assigned_to', val)}
                type="avatar-select"
                options={userOptions}
                placeholder="Κανένας"
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Project */}
          {isColumnVisible('project') && showProject && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.project_id}
                onSave={(val) => onInlineUpdate(task.id, 'project_id', val)}
                type="select"
                options={projectOptions}
                displayValue={task.project?.name}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Start Date */}
          {isColumnVisible('start_date') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.start_date}
                onSave={(val) => onInlineUpdate(task.id, 'start_date', val)}
                type="date"
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Due Date */}
          {isColumnVisible('due_date') && (
            <TableCell>
              <div className={cn(dueDateInfo?.isOverdue && "text-destructive font-medium")}>
                <EnhancedInlineEditCell
                  value={task.due_date}
                  onSave={(val) => onInlineUpdate(task.id, 'due_date', val)}
                  type="date"
                  displayValue={dueDateInfo?.label}
                  disabled={!canManage}
                />
              </div>
            </TableCell>
          )}

          {/* Status */}
          {isColumnVisible('status') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.status}
                onSave={(val) => onInlineUpdate(task.id, 'status', val)}
                type="select"
                options={STATUS_OPTIONS}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Priority */}
          {isColumnVisible('priority') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.priority}
                onSave={(val) => onInlineUpdate(task.id, 'priority', val)}
                type="select"
                options={PRIORITY_OPTIONS}
                placeholder="Καμία"
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Progress */}
          {isColumnVisible('progress') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.progress ?? 0}
                onSave={(val) => onInlineUpdate(task.id, 'progress', val)}
                type="progress"
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Estimated Hours */}
          {isColumnVisible('estimated_hours') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.estimated_hours}
                onSave={(val) => onInlineUpdate(task.id, 'estimated_hours', val)}
                type="number"
                placeholder="-"
                displayValue={task.estimated_hours ? `${task.estimated_hours}h` : undefined}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Actual Hours */}
          {isColumnVisible('actual_hours') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.actual_hours}
                onSave={(val) => onInlineUpdate(task.id, 'actual_hours', val)}
                type="number"
                placeholder="-"
                displayValue={task.actual_hours ? `${task.actual_hours}h` : undefined}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Task Type */}
          {isColumnVisible('task_type') && (
            <TableCell>
              <EnhancedInlineEditCell
                value={task.task_type}
                onSave={(val) => onInlineUpdate(task.id, 'task_type', val)}
                type="select"
                options={TASK_TYPE_OPTIONS}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Category */}
          {isColumnVisible('category') && (
            <TableCell>
              <div className="flex items-center gap-1">
                <EnhancedInlineEditCell
                  value={task.task_category}
                  onSave={(val) => onInlineUpdate(task.id, 'task_category', val)}
                  type="select"
                  options={CATEGORY_OPTIONS}
                  disabled={!canManage}
                />
              </div>
            </TableCell>
          )}

          {/* Actions */}
          <TableCell>
            {canManage && (
              <EditDeleteActions
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                itemName={task.title}
              />
            )}
          </TableCell>
        </TableRow>

        {/* Render children if expanded */}
        {isExpanded && children.map(child => renderTaskRow(child, level + 1))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Column visibility toggle */}
      <div className="flex justify-end">
        <ColumnVisibilityToggle
          columns={columns}
          onColumnsChange={setColumns}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => toggleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Τίτλος {getSortIcon('title')}
                </div>
              </TableHead>
              
              {isColumnVisible('assignee') && <TableHead>Υπεύθυνος</TableHead>}
              {isColumnVisible('project') && showProject && <TableHead>Έργο</TableHead>}
              {isColumnVisible('start_date') && <TableHead>Έναρξη</TableHead>}
              
              {isColumnVisible('due_date') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Προθεσμία {getSortIcon('due_date')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('status') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Κατάσταση {getSortIcon('status')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('priority') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('priority')}
                >
                  <div className="flex items-center gap-1">
                    Προτεραιότητα {getSortIcon('priority')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('progress') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('progress')}
                >
                  <div className="flex items-center gap-1">
                    Πρόοδος {getSortIcon('progress')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('estimated_hours') && <TableHead>Εκτίμηση</TableHead>}
              {isColumnVisible('actual_hours') && <TableHead>Πραγματικός</TableHead>}
              {isColumnVisible('task_type') && <TableHead>Τύπος</TableHead>}
              {isColumnVisible('category') && <TableHead>Κατηγορία</TableHead>}
              <TableHead className="w-[80px]">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.filter(c => c.visible).length} className="text-center py-8 text-muted-foreground">
                  Δεν υπάρχουν tasks
                </TableCell>
              </TableRow>
            ) : (
              sortedTasks.map(task => renderTaskRow(task))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
