import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { BulkActionsDialog } from '@/components/shared/BulkActionsDialog';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { GroupedTableSection } from '@/components/shared/GroupedTableSection';
import { useTableViews, GroupByField } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { 
  ChevronDown, 
  ChevronRight, 
  Link2, 
  Plus,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  User,
  Flag,
  X as XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskTimer } from '@/components/time-tracking/TaskTimer';
import { MondayStatusCell } from '@/components/shared/MondayStatusCell';
import { STATUS_COLORS, PRIORITY_COLORS, GROUP_COLORS } from '@/components/shared/mondayStyleConfig';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'internal_review' | 'client_review' | 'completed';

interface TaskAssignee {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Deliverable {
  id: string;
  name: string;
}

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
  department_id: string | null;
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
  assignees?: TaskAssignee[];
  project?: { name: string } | null;
  deliverable?: { name: string } | null;
  department?: { name: string } | null;
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
  deliverables?: Deliverable[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onInlineUpdate: (taskId: string, field: string, value: string | number | null) => Promise<void>;
  onCreateSubtask?: (parentTaskId: string) => void;
  onInlineCreateSubtask?: (parentTaskId: string, title: string) => Promise<void>;
  onBulkUpdate?: (taskIds: string[], field: string, value: string | null) => Promise<void>;
  onAssigneeAdd?: (taskId: string, userId: string) => Promise<void>;
  onAssigneeRemove?: (taskId: string, userId: string) => Promise<void>;
  canManage: boolean;
  showProject?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Προς Υλοποίηση', color: 'hsl(var(--muted-foreground))' },
  { value: 'in_progress', label: 'Σε Εξέλιξη', color: 'hsl(var(--primary))' },
  { value: 'review', label: 'Αναθεώρηση', color: 'hsl(var(--warning))' },
  { value: 'internal_review', label: 'Εσωτ. Έγκριση', color: '#7c3aed' },
  { value: 'client_review', label: 'Έγκριση Πελάτη', color: '#ea580c' },
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

const DEFAULT_COLUMNS = [
  { id: 'select', label: 'Επιλογή', visible: true, locked: true },
  { id: 'title', label: 'Τίτλος', visible: true, locked: true },
  { id: 'assignee', label: 'Υπεύθυνοι', visible: true },
  { id: 'project', label: 'Έργο', visible: true },
  { id: 'deliverable', label: 'Παραδοτέο', visible: true },
  { id: 'team', label: 'Ομάδα', visible: true },
  { id: 'start_date', label: 'Έναρξη', visible: false },
  { id: 'due_date', label: 'Προθεσμία', visible: true },
  { id: 'status', label: 'Κατάσταση', visible: true },
  { id: 'priority', label: 'Προτεραιότητα', visible: true },
  { id: 'progress', label: 'Πρόοδος', visible: true },
  { id: 'estimated_hours', label: 'Εκτίμηση', visible: false },
  { id: 'actual_hours', label: 'Πραγματικός', visible: false },
  { id: 'task_type', label: 'Τύπος', visible: false },
  { id: 'category', label: 'Κατηγορία', visible: false },
  { id: 'timer', label: 'Timer', visible: true },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'title' | 'due_date' | 'status' | 'priority' | 'progress';

const BULK_ACTIONS = [
  { id: 'status', label: 'Αλλαγή Κατάστασης', icon: <CheckSquare className="h-4 w-4" /> },
  { id: 'assignee', label: 'Αλλαγή Υπευθύνου', icon: <User className="h-4 w-4" /> },
  { id: 'priority', label: 'Αλλαγή Προτεραιότητας', icon: <Flag className="h-4 w-4" /> },
];

const GROUP_OPTIONS = [
  { value: 'none' as GroupByField, label: 'Χωρίς ομαδοποίηση' },
  { value: 'status' as GroupByField, label: 'Κατάσταση' },
  { value: 'assignee' as GroupByField, label: 'Υπεύθυνος' },
  { value: 'project' as GroupByField, label: 'Έργο' },
  { value: 'priority' as GroupByField, label: 'Προτεραιότητα' },
  { value: 'deliverable' as GroupByField, label: 'Παραδοτέο' },
];

export function TasksTableView({
  tasks,
  projects,
  users,
  onEdit,
  onDelete,
  onInlineUpdate,
  onCreateSubtask,
  onInlineCreateSubtask,
  onBulkUpdate,
  onAssigneeAdd,
  onAssigneeRemove,
  canManage,
  showProject = true
}: TasksTableViewProps) {
  const navigate = useNavigate();
  const {
    columns,
    setColumns,
    columnWidths,
    setColumnWidth,
    groupBy,
    setGroupBy,
    savedViews,
    currentViewId,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
  } = useTableViews({ storageKey: 'tasks_table', defaultColumns: DEFAULT_COLUMNS });

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<'status' | 'assignee' | 'priority' | null>(null);
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

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

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Όλα τα Tasks', tasks: sortedTasks }];
    }

    const groups: Map<string, { label: string; tasks: Task[]; badge?: React.ReactNode }> = new Map();

    sortedTasks.forEach(task => {
      let groupKey: string;
      let groupLabel: string;
      let badge: React.ReactNode = null;

      switch (groupBy) {
        case 'status':
          groupKey = task.status;
          const statusOption = STATUS_OPTIONS.find(s => s.value === task.status);
          groupLabel = statusOption?.label || task.status;
          badge = (
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: statusOption?.color, color: statusOption?.color }}
            >
              {statusOption?.label}
            </Badge>
          );
          break;
        case 'assignee':
          groupKey = task.assigned_to || 'unassigned';
          groupLabel = task.assignee?.full_name || 'Μη ανατεθειμένο';
          if (task.assignee?.avatar_url) {
            badge = (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar_url} />
                <AvatarFallback>{task.assignee.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            );
          }
          break;
        case 'project':
          groupKey = task.project_id;
          groupLabel = task.project?.name || 'Χωρίς Έργο';
          break;
        case 'priority':
          groupKey = task.priority || 'none';
          const priorityOption = PRIORITY_OPTIONS.find(p => p.value === task.priority);
          groupLabel = priorityOption?.label || 'Χωρίς Προτεραιότητα';
          if (priorityOption) {
            badge = (
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: priorityOption.color }}
              />
            );
          }
          break;
        default:
          groupKey = 'all';
          groupLabel = 'Όλα';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: groupLabel, tasks: [], badge });
      }
      groups.get(groupKey)!.tasks.push(task);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      tasks: value.tasks,
      badge: value.badge,
    }));
  }, [sortedTasks, groupBy]);

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

  const toggleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) newSelected.delete(taskId);
    else newSelected.add(taskId);
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const isColumnVisible = (columnId: string) => 
    columns.find(c => c.id === columnId)?.visible ?? true;

  const getColumnWidth = (columnId: string) => columnWidths[columnId];

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

  // Export functions
  const handleExportCSV = useCallback(() => {
    const exportColumns = [
      { key: 'title', label: 'Τίτλος' },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'priority', label: 'Προτεραιότητα', format: (v: string) => PRIORITY_OPTIONS.find(o => o.value === v)?.label || v || '-' },
      { key: 'project', label: 'Έργο', format: (_: any, row: Task) => row.project?.name || '-' },
      { key: 'assignee', label: 'Υπεύθυνος', format: (_: any, row: Task) => row.assignee?.full_name || '-' },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
      { key: 'progress', label: 'Πρόοδος', format: formatters.percentage },
      { key: 'estimated_hours', label: 'Εκτίμηση (ώρες)', format: (v: number | null) => v != null ? String(v) : '-' },
    ];
    exportToCSV(tasks, exportColumns, `tasks_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  }, [tasks]);

  const handleExportExcel = useCallback(() => {
    const exportColumns = [
      { key: 'title', label: 'Τίτλος' },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'priority', label: 'Προτεραιότητα', format: (v: string) => PRIORITY_OPTIONS.find(o => o.value === v)?.label || v || '-' },
      { key: 'project', label: 'Έργο', format: (_: any, row: Task) => row.project?.name || '-' },
      { key: 'assignee', label: 'Υπεύθυνος', format: (_: any, row: Task) => row.assignee?.full_name || '-' },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
      { key: 'progress', label: 'Πρόοδος', format: formatters.percentage },
      { key: 'estimated_hours', label: 'Εκτίμηση (ώρες)', format: (v: number | null) => v != null ? String(v) : '-' },
    ];
    exportToExcel(tasks, exportColumns, `tasks_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  }, [tasks]);

  const handleBulkAction = (action: string) => {
    if (action === 'status' || action === 'assignee' || action === 'priority') {
      setBulkActionType(action);
    }
  };

  const handleBulkConfirm = async (value: string) => {
    if (!onBulkUpdate || !bulkActionType) return;
    const field = bulkActionType === 'assignee' ? 'assigned_to' : bulkActionType;
    const finalValue = value === 'none' ? null : value;
    await onBulkUpdate(Array.from(selectedTasks), field, finalValue);
    setSelectedTasks(new Set());
    setBulkActionType(null);
  };

  const handleAddSubtask = async (parentId: string) => {
    if (!newSubtaskTitle.trim()) return;
    if (onInlineCreateSubtask) {
      await onInlineCreateSubtask(parentId, newSubtaskTitle.trim());
    } else if (onCreateSubtask) {
      onCreateSubtask(parentId);
    }
    setAddingSubtaskTo(null);
    setNewSubtaskTitle('');
  };

  const visibleColumnCount = columns.filter(c => c.visible).length;

  const renderTaskRow = (task: Task, level = 0, rowIndex = 0) => {
    const children = childTasksMap.get(task.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const depCount = dependencyCountMap.get(task.id) || 0;
    const dueDateInfo = formatDueDate(task.due_date);
    const isSelected = selectedTasks.has(task.id);
    const isStriped = rowIndex % 2 === 1;

    return (
      <>
        <TableRow 
          key={task.id} 
          className={cn(
            "group cursor-pointer border-b border-border/60 hover:bg-muted/50",
            isSelected && "bg-primary/5",
            isStriped && !isSelected && "bg-muted/20"
          )}
          onClick={(e) => {
            // Don't navigate if clicking on interactive elements
            const target = e.target as HTMLElement;
            if (target.closest('button, input, select, [role="checkbox"], [data-inline-edit]')) return;
            navigate(`/tasks/${task.id}`);
          }}
        >
          {/* Checkbox */}
          {isColumnVisible('select') && (
            <TableCell className="w-[40px]" style={{ width: getColumnWidth('select') }}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelectTask(task.id)}
              />
            </TableCell>
          )}

          {/* Title with expand/collapse */}
          <TableCell className="font-medium" style={{ width: getColumnWidth('title') }}>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              
              {hasChildren || level === 0 ? (
                <button 
                  onClick={() => hasChildren ? toggleExpand(task.id) : canManage && (onInlineCreateSubtask || onCreateSubtask) && setAddingSubtaskTo(task.id)}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    hasChildren ? "hover:bg-muted" : "opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground"
                  )}
                  title={hasChildren ? undefined : "Προσθήκη subtask"}
                >
                  {hasChildren ? (
                    isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
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

          {/* Assignees */}
          {isColumnVisible('assignee') && (
            <TableCell style={{ width: getColumnWidth('assignee') }}>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-0 hover:bg-muted rounded-md p-1 transition-colors -mx-1 w-full min-h-[28px]">
                    {(task.assignees && task.assignees.length > 0) ? (
                      <div className="flex items-center -space-x-1.5">
                        {task.assignees.map(a => (
                          <div key={a.user_id} className="relative group/avatar">
                            <Avatar className="h-6 w-6 border-2 border-background" title={a.full_name || ''}>
                              {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {(a.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {canManage && onAssigneeRemove && (
                              <button
                                className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground items-center justify-center text-[8px] hidden group-hover/avatar:flex z-10"
                                onClick={async (e) => { e.stopPropagation(); await onAssigneeRemove(task.id, a.user_id); }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
                        <User className="h-3 w-3 text-muted-foreground/60" />
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-2">
                    {(task.assignees && task.assignees.length > 0) && (
                      <div className="space-y-1">
                        {task.assignees.map(a => (
                          <div key={a.user_id} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-md">
                            <Avatar className="h-6 w-6">
                              {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {(a.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate flex-1">{a.full_name || 'Χωρίς όνομα'}</span>
                            {canManage && onAssigneeRemove && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={async () => { await onAssigneeRemove(task.id, a.user_id); }}>
                                <XIcon className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {canManage && onAssigneeAdd && (
                      <>
                        <Input
                          placeholder="Αναζήτηση..."
                          className="h-7 text-xs"
                          onChange={(e) => {
                            const searchEl = e.target.closest('.space-y-2')?.querySelector('[data-user-list]');
                            if (searchEl) {
                              const items = searchEl.querySelectorAll('[data-user-item]');
                              items.forEach((item: Element) => {
                                const name = item.getAttribute('data-user-name')?.toLowerCase() || '';
                                (item as HTMLElement).style.display = name.includes(e.target.value.toLowerCase()) ? '' : 'none';
                              });
                            }
                          }}
                        />
                        <div className="max-h-40 overflow-y-auto space-y-0.5" data-user-list>
                          {users.filter(u => !(task.assignees || []).some(a => a.user_id === u.id)).map(u => (
                            <button
                              key={u.id}
                              data-user-item
                              data-user-name={u.full_name || u.email}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
                              onClick={async () => { await onAssigneeAdd(task.id, u.id); }}
                            >
                              <Avatar className="h-5 w-5">
                                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {(u.full_name || u.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{u.full_name || u.email}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </TableCell>
          )}

          {/* Project */}
          {isColumnVisible('project') && showProject && (
            <TableCell style={{ width: getColumnWidth('project') }}>
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
            <TableCell style={{ width: getColumnWidth('start_date') }}>
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
            <TableCell style={{ width: getColumnWidth('due_date') }}>
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

          {/* Status - Monday.com colored cell */}
          {isColumnVisible('status') && (
            <TableCell style={{ width: getColumnWidth('status') }} className="p-1">
              <MondayStatusCell
                value={task.status}
                options={Object.entries(STATUS_COLORS).map(([value, c]) => ({
                  value,
                  label: c.label,
                  bg: c.bg,
                  text: c.text,
                }))}
                onSave={(val) => onInlineUpdate(task.id, 'status', val)}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Priority - Monday.com colored cell */}
          {isColumnVisible('priority') && (
            <TableCell style={{ width: getColumnWidth('priority') }} className="p-1">
              <MondayStatusCell
                value={task.priority}
                options={Object.entries(PRIORITY_COLORS).map(([value, c]) => ({
                  value,
                  label: c.label,
                  bg: c.bg,
                  text: c.text,
                }))}
                onSave={(val) => onInlineUpdate(task.id, 'priority', val)}
                disabled={!canManage}
                placeholder="Καμία"
              />
            </TableCell>
          )}

          {/* Progress */}
          {isColumnVisible('progress') && (
            <TableCell style={{ width: getColumnWidth('progress') }}>
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
            <TableCell style={{ width: getColumnWidth('estimated_hours') }}>
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
            <TableCell style={{ width: getColumnWidth('actual_hours') }}>
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
            <TableCell style={{ width: getColumnWidth('task_type') }}>
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
            <TableCell style={{ width: getColumnWidth('category') }}>
              <EnhancedInlineEditCell
                value={task.task_category}
                onSave={(val) => onInlineUpdate(task.id, 'task_category', val)}
                type="select"
                options={CATEGORY_OPTIONS}
                disabled={!canManage}
              />
            </TableCell>
          )}

          {/* Timer */}
          {isColumnVisible('timer') && (
            <TableCell style={{ width: getColumnWidth('timer') }}>
              <TaskTimer taskId={task.id} projectId={task.project_id} compact />
            </TableCell>
          )}

          {/* Flag toggle */}
          <TableCell className="w-[40px]">
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 ${task.priority === 'urgent' ? 'text-destructive hover:text-destructive' : task.priority === 'high' ? 'text-orange-500 hover:text-orange-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`}
              title={task.priority === 'urgent' ? 'Αφαίρεση σήμανσης Επείγον' : 'Σήμανση ως Επείγον'}
              onClick={async (e) => {
                e.stopPropagation();
                const newPriority = task.priority === 'urgent' ? 'medium' : 'urgent';
                await onInlineUpdate(task.id, 'priority', newPriority);
                toast.success(newPriority === 'urgent' ? '🚩 Σημάνθηκε ως Επείγον!' : 'Αφαιρέθηκε η σήμανση Επείγον');
              }}
            >
              <Flag className={`h-3.5 w-3.5 ${task.priority === 'urgent' ? 'fill-destructive' : ''}`} />
            </Button>
          </TableCell>

          {/* Actions */}
          <TableCell style={{ width: getColumnWidth('actions') }}>
            {canManage && (
              <EditDeleteActions
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                itemName={task.title}
              />
            )}
          </TableCell>
        </TableRow>

        {/* Inline subtask creation */}
        {addingSubtaskTo === task.id && (
          <TableRow>
            <TableCell colSpan={visibleColumnCount}>
              <div className="flex items-center gap-2 pl-8">
                <Input
                  placeholder="Τίτλος νέου subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubtask(task.id);
                    if (e.key === 'Escape') { setAddingSubtaskTo(null); setNewSubtaskTitle(''); }
                  }}
                  className="max-w-md"
                  autoFocus
                />
                <Button size="sm" onClick={() => handleAddSubtask(task.id)}>Προσθήκη</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingSubtaskTo(null); setNewSubtaskTitle(''); }}>Ακύρωση</Button>
              </div>
            </TableCell>
          </TableRow>
        )}

        {/* Render children if expanded */}
        {isExpanded && children.map(child => renderTaskRow(child, level + 1))}
      </>
    );
  };

  const allSelected = tasks.length > 0 && selectedTasks.size === tasks.length;
  const someSelected = selectedTasks.size > 0 && selectedTasks.size < tasks.length;

  return (
    <div className="space-y-4">
      {/* Toolbar with saved views, columns, export, bulk actions, grouping */}
      <TableToolbar
        columns={columns}
        onColumnsChange={setColumns}
        savedViews={savedViews}
        currentViewId={currentViewId}
        onSaveView={(name) => saveView(name, sortField, sortDirection)}
        onLoadView={(id) => {
          const view = loadView(id);
          if (view) {
            setSortField(view.sortField as SortField | null);
            setSortDirection(view.sortDirection);
          }
        }}
        onDeleteView={deleteView}
        onResetToDefault={resetToDefault}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        selectedCount={selectedTasks.size}
        onBulkAction={canManage ? handleBulkAction : undefined}
        bulkActions={BULK_ACTIONS}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupOptions={GROUP_OPTIONS}
      />

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {isColumnVisible('select') && (
                <TableHead className="w-[44px] min-w-[44px] max-w-[44px] px-3">
                  <Checkbox
                    checked={allSelected}
                    // @ts-ignore - indeterminate is valid but not in types
                    indeterminate={someSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              
              <ResizableTableHeader 
                width={getColumnWidth('title')}
                onWidthChange={(w) => setColumnWidth('title', w)}
                minWidth={150}
                className="cursor-pointer select-none"
                onClick={() => toggleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Τίτλος {getSortIcon('title')}
                </div>
              </ResizableTableHeader>
              
              {isColumnVisible('assignee') && (
                <ResizableTableHeader 
                  width={getColumnWidth('assignee')}
                  onWidthChange={(w) => setColumnWidth('assignee', w)}
                  minWidth={100}
                >
                  Υπεύθυνος
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('project') && showProject && (
                <ResizableTableHeader 
                  width={getColumnWidth('project')}
                  onWidthChange={(w) => setColumnWidth('project', w)}
                  minWidth={100}
                >
                  Έργο
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('start_date') && (
                <ResizableTableHeader 
                  width={getColumnWidth('start_date')}
                  onWidthChange={(w) => setColumnWidth('start_date', w)}
                  minWidth={90}
                >
                  Έναρξη
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('due_date') && (
                <ResizableTableHeader 
                  width={getColumnWidth('due_date')}
                  onWidthChange={(w) => setColumnWidth('due_date', w)}
                  minWidth={90}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('due_date')}
                >
                  <div className="flex items-center gap-1">
                    Προθεσμία {getSortIcon('due_date')}
                  </div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('status') && (
                <ResizableTableHeader 
                  width={getColumnWidth('status')}
                  onWidthChange={(w) => setColumnWidth('status', w)}
                  minWidth={100}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Κατάσταση {getSortIcon('status')}
                  </div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('priority') && (
                <ResizableTableHeader 
                  width={getColumnWidth('priority')}
                  onWidthChange={(w) => setColumnWidth('priority', w)}
                  minWidth={100}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('priority')}
                >
                  <div className="flex items-center gap-1">
                    Προτεραιότητα {getSortIcon('priority')}
                  </div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('progress') && (
                <ResizableTableHeader 
                  width={getColumnWidth('progress')}
                  onWidthChange={(w) => setColumnWidth('progress', w)}
                  minWidth={80}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('progress')}
                >
                  <div className="flex items-center gap-1">
                    Πρόοδος {getSortIcon('progress')}
                  </div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('estimated_hours') && (
                <ResizableTableHeader 
                  width={getColumnWidth('estimated_hours')}
                  onWidthChange={(w) => setColumnWidth('estimated_hours', w)}
                  minWidth={80}
                >
                  Εκτίμηση
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('actual_hours') && (
                <ResizableTableHeader 
                  width={getColumnWidth('actual_hours')}
                  onWidthChange={(w) => setColumnWidth('actual_hours', w)}
                  minWidth={80}
                >
                  Πραγματικός
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('task_type') && (
                <ResizableTableHeader 
                  width={getColumnWidth('task_type')}
                  onWidthChange={(w) => setColumnWidth('task_type', w)}
                  minWidth={80}
                >
                  Τύπος
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('category') && (
                <ResizableTableHeader 
                  width={getColumnWidth('category')}
                  onWidthChange={(w) => setColumnWidth('category', w)}
                  minWidth={100}
                >
                  Κατηγορία
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('timer') && (
                <ResizableTableHeader 
                  width={getColumnWidth('timer')}
                  onWidthChange={(w) => setColumnWidth('timer', w)}
                  minWidth={80}
                >
                  Timer
                </ResizableTableHeader>
              )}
              
              <TableHead className="w-[40px]"><Flag className="h-3.5 w-3.5 text-muted-foreground" /></TableHead>
              <TableHead className="w-[80px]">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                  Δεν υπάρχουν tasks
                </TableCell>
              </TableRow>
            ) : groupBy === 'none' ? (
              sortedTasks.map((task, i) => renderTaskRow(task, 0, i))
            ) : (
              groupedTasks.map(group => (
                <GroupedTableSection
                  key={group.key}
                  groupKey={group.key}
                  groupLabel={group.label}
                  itemCount={group.tasks.length}
                  colSpan={visibleColumnCount}
                  badge={group.badge}
                  color={GROUP_COLORS[group.key] || GROUP_COLORS.none}
                  summaryRow={
                    <TableRow className="bg-muted/20 border-t" style={{ borderLeft: `4px solid ${GROUP_COLORS[group.key] || GROUP_COLORS.none}` }}>
                      <TableCell colSpan={visibleColumnCount} className="py-1.5">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pl-10">
                          <span className="font-medium">{group.tasks.length} tasks</span>
                          {isColumnVisible('progress') && (
                            <span>Πρόοδος: {Math.round(group.tasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / Math.max(group.tasks.length, 1))}%</span>
                          )}
                          {isColumnVisible('estimated_hours') && (
                            <span>Εκτίμηση: {group.tasks.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0)}h</span>
                          )}
                          {isColumnVisible('status') && groupBy !== 'status' && (
                            <div className="flex items-center gap-0.5">
                              {Object.entries(STATUS_COLORS).map(([key, c]) => {
                                const count = group.tasks.filter(t => t.status === key).length;
                                if (count === 0) return null;
                                return (
                                  <div
                                    key={key}
                                    className="h-3 rounded-sm"
                                    style={{
                                      backgroundColor: c.bg,
                                      width: `${Math.max((count / group.tasks.length) * 60, 4)}px`,
                                    }}
                                    title={`${c.label}: ${count}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  }
                >
                  {group.tasks.map((task, i) => renderTaskRow(task, 0, i))}
                </GroupedTableSection>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        open={bulkActionType !== null}
        onOpenChange={(open) => !open && setBulkActionType(null)}
        actionType={bulkActionType}
        selectedCount={selectedTasks.size}
        users={users}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}
