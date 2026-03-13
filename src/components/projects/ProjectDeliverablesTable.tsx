import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { useTableViews } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Package, Plus, DollarSign, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { MondayStatusCell } from '@/components/shared/MondayStatusCell';
import { GroupByField } from '@/hooks/useTableViews';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Deliverable = Tables<'deliverables'> & {
  assignee_profile?: { full_name: string | null; avatar_url: string | null } | null;
  department_info?: { name: string } | null;
};

interface LinkedTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  parent_task_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface ProjectDeliverablesTableProps {
  projectId: string;
  projectName: string;
}

const DEFAULT_COLUMNS = [
  { id: 'select', label: 'Επιλογή', visible: true, locked: true },
  { id: 'name', label: 'Όνομα', visible: true, locked: true },
  { id: 'status', label: 'Κατάσταση', visible: true },
  { id: 'assignee', label: 'Υπεύθυνος', visible: true },
  { id: 'team', label: 'Ομάδα', visible: true },
  { id: 'budget', label: 'Budget', visible: true },
  { id: 'cost', label: 'Κόστος', visible: true },
  { id: 'due_date', label: 'Προθεσμία', visible: true },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

const DELIVERABLE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#c4c4c4', text: '#ffffff', label: 'Εκκρεμεί' },
  in_progress: { bg: '#fdab3d', text: '#ffffff', label: 'Σε Εξέλιξη' },
  completed: { bg: '#00c875', text: '#ffffff', label: 'Ολοκληρώθηκε' },
};

const DELIVERABLE_GROUP_OPTIONS = [
  { value: 'none' as GroupByField, label: 'Χωρίς ομαδοποίηση' },
  { value: 'status' as GroupByField, label: 'Κατάσταση' },
  { value: 'assignee' as GroupByField, label: 'Υπεύθυνος' },
];

type SortField = 'name' | 'budget' | 'cost' | 'due_date' | 'completed';
type SortDirection = 'asc' | 'desc' | null;

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case 'in_progress': return <Clock className="h-3.5 w-3.5 text-foreground" />;
    case 'review': case 'internal_review': case 'client_review': return <AlertCircle className="h-3.5 w-3.5 text-warning" />;
    default: return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function TaskStatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    todo: 'To Do', in_progress: 'In Progress', review: 'Review',
    completed: 'Done', internal_review: 'Internal Review', client_review: 'Client Review',
  };
  return <span className="text-xs text-muted-foreground">{labels[status] || status}</span>;
}

function DeliverableTasksPanel({ deliverableId }: { deliverableId: string }) {
  const [tasks, setTasks] = useState<LinkedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assigned_to, parent_task_id')
        .eq('deliverable_id', deliverableId)
        .order('created_at');
      setTasks((data || []) as LinkedTask[]);
      setLoading(false);
    })();
  }, [deliverableId]);

  if (loading) return <div className="py-3 px-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (tasks.length === 0) return <p className="text-xs text-muted-foreground py-3 px-6">Δεν υπάρχουν συνδεδεμένα tasks</p>;

  // Separate parent tasks and subtasks
  const parentTasks = tasks.filter(t => !t.parent_task_id);
  const subtaskMap = new Map<string, LinkedTask[]>();
  tasks.filter(t => t.parent_task_id).forEach(t => {
    const arr = subtaskMap.get(t.parent_task_id!) || [];
    arr.push(t);
    subtaskMap.set(t.parent_task_id!, arr);
  });

  // If there are no parent tasks but there are subtasks, show all as flat
  const displayTasks = parentTasks.length > 0 ? parentTasks : tasks;

  return (
    <div className="py-2 px-4 space-y-1">
      {displayTasks.map(task => (
        <div key={task.id}>
          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30">
            <TaskStatusIcon status={task.status} />
            <span className={cn("text-sm flex-1 truncate", task.status === 'completed' && "line-through text-muted-foreground")}>
              {task.title}
            </span>
            <TaskStatusLabel status={task.status} />
            {task.due_date && (
              <span className="text-xs text-muted-foreground shrink-0">
                {format(parseISO(task.due_date), 'd MMM', { locale: el })}
              </span>
            )}
          </div>
          {/* Subtasks */}
          {subtaskMap.get(task.id)?.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 py-1 px-2 ml-6 rounded-md hover:bg-muted/30">
              <TaskStatusIcon status={sub.status} />
              <span className={cn("text-xs flex-1 truncate", sub.status === 'completed' && "line-through text-muted-foreground")}>
                {sub.title}
              </span>
              <TaskStatusLabel status={sub.status} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProjectDeliverablesTable({ projectId, projectName }: ProjectDeliverablesTableProps) {
  const { isAdmin, isManager, hasPermission } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());

  const {
    columns, setColumns, columnWidths, setColumnWidth,
    groupBy, setGroupBy,
    savedViews, currentViewId, saveView, loadView, deleteView, resetToDefault,
  } = useTableViews({ storageKey: 'project_deliverables_table', defaultColumns: DEFAULT_COLUMNS });

  const [formData, setFormData] = useState({
    name: '', description: '', budget: '', cost: '', due_date: '', assigned_to: '', department_id: '',
  });

  const canManage = isAdmin || isManager || hasPermission('projects.edit');

  useEffect(() => {
    fetchDeliverables();
    fetchProfiles();
    fetchDepartments();
  }, [projectId]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, department_id')
      .in('status', ['active', 'pending'])
      .order('full_name');
    setProfiles(data || []);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    setDepartments(data || []);
  };

  const fetchDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .select('*, assignee_profile:profiles!deliverables_assigned_to_fkey(full_name, avatar_url), department_info:departments!deliverables_department_id_fkey(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setDeliverables((data || []) as Deliverable[]);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      toast.error('Σφάλμα κατά τη φόρτωση παραδοτέων');
    } finally {
      setLoading(false);
    }
  };

  const sortedDeliverables = useMemo(() => {
    if (!sortField || !sortDirection) return deliverables;
    return [...deliverables].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'budget': aVal = Number(a.budget) || 0; bVal = Number(b.budget) || 0; break;
        case 'cost': aVal = Number(a.cost) || 0; bVal = Number(b.cost) || 0; break;
        case 'due_date':
          aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity; break;
        case 'completed': aVal = a.completed ? 1 : 0; bVal = b.completed ? 1 : 0; break;
        default: return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [deliverables, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortField(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else { setSortField(field); setSortDirection('asc'); }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  const toggleExpanded = (id: string) => {
    setExpandedDeliverables(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const deliverableData = {
        name: formData.name,
        description: formData.description || null,
        project_id: projectId,
        budget: parseFloat(formData.budget) || 0,
        cost: parseFloat(formData.cost) || 0,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        department_id: formData.department_id || null,
      };
      if (editingDeliverable) {
        const { error } = await supabase
          .from('deliverables').update(deliverableData).eq('id', editingDeliverable.id);
        if (error) throw error;
        toast.success('Το παραδοτέο ενημερώθηκε!');
      } else {
        const { error } = await supabase
          .from('deliverables').insert(deliverableData);
        if (error) throw error;
        toast.success('Το παραδοτέο δημιουργήθηκε!');
      }
      setDialogOpen(false);
      resetForm();
      fetchDeliverables();
    } catch (error) {
      console.error('Error saving deliverable:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally { setSaving(false); }
  };

  const handleEdit = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable);
    setFormData({
      name: deliverable.name,
      description: deliverable.description || '',
      budget: deliverable.budget?.toString() || '',
      cost: deliverable.cost?.toString() || '',
      due_date: deliverable.due_date || '',
      assigned_to: (deliverable as any).assigned_to || '',
      department_id: (deliverable as any).department_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (deliverableId: string) => {
    try {
      const { error } = await supabase.from('deliverables').delete().eq('id', deliverableId);
      if (error) throw error;
      setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
      toast.success('Το παραδοτέο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleInlineUpdate = async (deliverableId: string, field: string, value: string | number | null) => {
    try {
      const updateData: Record<string, any> = { [field]: value };
      const { error } = await supabase.from('deliverables').update(updateData).eq('id', deliverableId);
      if (error) throw error;
      setDeliverables(prev => prev.map(d => d.id === deliverableId ? { ...d, ...updateData } : d));
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const toggleCompleted = async (deliverable: Deliverable) => {
    if (!canManage) return;
    try {
      const newValue = !deliverable.completed;
      const { error } = await supabase.from('deliverables').update({ completed: newValue }).eq('id', deliverable.id);
      if (error) throw error;
      setDeliverables(prev => prev.map(d => d.id === deliverable.id ? { ...d, completed: newValue } : d));
      toast.success(newValue ? 'Σημειώθηκε ως ολοκληρωμένο' : 'Σημειώθηκε ως εκκρεμές');
    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
    setEditingDeliverable(null);
    setFormData({ name: '', description: '', budget: '', cost: '', due_date: '', assigned_to: '', department_id: '' });
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === deliverables.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(deliverables.map(d => d.id)));
  };

  const isColumnVisible = (columnId: string) => columns.find(c => c.id === columnId)?.visible ?? true;
  const getColumnWidth = (columnId: string) => columnWidths[columnId];

  const handleExportCSV = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'description', label: 'Περιγραφή' },
      { key: 'budget', label: 'Budget', format: formatters.currency },
      { key: 'cost', label: 'Κόστος', format: formatters.currency },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
      { key: 'completed', label: 'Ολοκληρώθηκε', format: (v: boolean) => v ? 'Ναι' : 'Όχι' },
    ];
    exportToCSV(deliverables, exportColumns, `project_deliverables_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  }, [deliverables]);

  const handleExportExcel = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'description', label: 'Περιγραφή' },
      { key: 'budget', label: 'Budget', format: formatters.currency },
      { key: 'cost', label: 'Κόστος', format: formatters.currency },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
      { key: 'completed', label: 'Ολοκληρώθηκε', format: (v: boolean) => v ? 'Ναι' : 'Όχι' },
    ];
    exportToExcel(deliverables, exportColumns, `project_deliverables_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  }, [deliverables]);

  const getDeliverableStatus = (d: Deliverable): string => {
    if (d.completed) return 'completed';
    // Check if any tasks are linked & in progress (heuristic)
    return 'pending';
  };

  const completedCount = deliverables.filter(d => d.completed).length;
  const progressPercentage = deliverables.length > 0 ? Math.round((completedCount / deliverables.length) * 100) : 0;
  const totalBudget = deliverables.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);
  const totalCost = deliverables.reduce((sum, d) => sum + (Number(d.cost) || 0), 0);

  // Grouping logic
  const groupedDeliverables = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Όλα τα Παραδοτέα', items: sortedDeliverables }];
    }
    const groups = new Map<string, { label: string; items: Deliverable[] }>();
    sortedDeliverables.forEach(d => {
      let key: string, label: string;
      switch (groupBy) {
        case 'status':
          key = d.completed ? 'completed' : 'pending';
          label = d.completed ? 'Ολοκληρωμένα' : 'Εκκρεμούν';
          break;
        case 'assignee':
          key = (d as any).assigned_to || 'unassigned';
          label = d.assignee_profile?.full_name || 'Μη ανατεθειμένο';
          break;
        default:
          key = 'all'; label = 'Όλα'; break;
      }
      if (!groups.has(key)) groups.set(key, { label, items: [] });
      groups.get(key)!.items.push(d);
    });
    return Array.from(groups.entries()).map(([key, v]) => ({ key, label: v.label, items: v.items }));
  }, [sortedDeliverables, groupBy]);

  const visibleColumnCount = columns.filter(c => c.visible).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar + Add Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TableToolbar
          columns={columns}
          onColumnsChange={setColumns}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          savedViews={savedViews}
          currentViewId={currentViewId}
          onSaveView={(name) => saveView(name, sortField, sortDirection)}
          onLoadView={loadView}
          onDeleteView={deleteView}
          onResetToDefault={resetToDefault}
        />
        {canManage && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Νέο Παραδοτέο
          </Button>
        )}
      </div>

      {/* Progress & Budget summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 space-y-2 max-w-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Πρόοδος: {completedCount}/{deliverables.length} παραδοτέα
            </span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        {deliverables.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">€{totalBudget.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Κόστος:</span>
              <span className="font-medium">€{totalCost.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {deliverables.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Δεν υπάρχουν παραδοτέα</p>
          <p className="text-xs mt-1">Προσθέστε τα παραδοτέα του έργου</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Expand column */}
                <TableHead className="w-[32px]" />
                {isColumnVisible('select') && (
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedItems.size === deliverables.length && deliverables.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {isColumnVisible('name') && (
                  <ResizableTableHeader width={getColumnWidth('name')} onWidthChange={(w) => setColumnWidth('name', w)}>
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Όνομα {getSortIcon('name')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('assignee') && (
                  <ResizableTableHeader width={getColumnWidth('assignee') || 120} onWidthChange={(w) => setColumnWidth('assignee', w)}>
                    Υπεύθυνος
                  </ResizableTableHeader>
                )}
                {isColumnVisible('team') && (
                  <ResizableTableHeader width={getColumnWidth('team') || 100} onWidthChange={(w) => setColumnWidth('team', w)}>
                    Ομάδα
                  </ResizableTableHeader>
                )}
                {isColumnVisible('budget') && (
                  <ResizableTableHeader width={getColumnWidth('budget') || 120} onWidthChange={(w) => setColumnWidth('budget', w)}>
                    <button onClick={() => toggleSort('budget')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Budget {getSortIcon('budget')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('cost') && (
                  <ResizableTableHeader width={getColumnWidth('cost') || 120} onWidthChange={(w) => setColumnWidth('cost', w)}>
                    <button onClick={() => toggleSort('cost')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Κόστος {getSortIcon('cost')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('due_date') && (
                  <ResizableTableHeader width={getColumnWidth('due_date') || 120} onWidthChange={(w) => setColumnWidth('due_date', w)}>
                    <button onClick={() => toggleSort('due_date')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Προθεσμία {getSortIcon('due_date')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('completed') && (
                  <ResizableTableHeader width={getColumnWidth('completed') || 100} onWidthChange={(w) => setColumnWidth('completed', w)}>
                    <button onClick={() => toggleSort('completed')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Ολ. {getSortIcon('completed')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('actions') && (
                  <TableHead className="w-[80px]">Ενέργειες</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDeliverables.map(deliverable => {
                const isExpanded = expandedDeliverables.has(deliverable.id);
                return (
                  <Collapsible key={deliverable.id} open={isExpanded} onOpenChange={() => toggleExpanded(deliverable.id)} asChild>
                    <>
                      <TableRow
                        className={cn(
                          "group hover:bg-muted/50 cursor-pointer",
                          deliverable.completed && "opacity-60",
                          selectedItems.has(deliverable.id) && "bg-primary/5",
                          isExpanded && "bg-muted/30"
                        )}
                      >
                        <TableCell className="w-[32px] px-2">
                          <CollapsibleTrigger asChild>
                            <button className="p-0.5 rounded hover:bg-muted" onClick={e => e.stopPropagation()}>
                              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-90")} />
                            </button>
                          </CollapsibleTrigger>
                        </TableCell>
                        {isColumnVisible('select') && (
                          <TableCell>
                            <Checkbox checked={selectedItems.has(deliverable.id)} onCheckedChange={() => toggleSelectItem(deliverable.id)} />
                          </TableCell>
                        )}
                        {isColumnVisible('name') && (
                          <TableCell style={{ width: getColumnWidth('name') }}>
                            <EnhancedInlineEditCell
                              value={deliverable.name}
                              onSave={(val) => handleInlineUpdate(deliverable.id, 'name', val as string)}
                              disabled={!canManage}
                              className={cn(deliverable.completed && "line-through")}
                            />
                          </TableCell>
                        )}
                        {isColumnVisible('assignee') && (
                          <TableCell style={{ width: getColumnWidth('assignee') }}>
                            {deliverable.assignee_profile ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-6 w-6">
                                  {deliverable.assignee_profile.avatar_url && <AvatarImage src={deliverable.assignee_profile.avatar_url} />}
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {(deliverable.assignee_profile.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs truncate">{deliverable.assignee_profile.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible('team') && (
                          <TableCell style={{ width: getColumnWidth('team') }}>
                            <span className="text-xs text-muted-foreground">{deliverable.department_info?.name || '—'}</span>
                          </TableCell>
                        )}
                        {isColumnVisible('budget') && (
                          <TableCell style={{ width: getColumnWidth('budget') }}>
                            <EnhancedInlineEditCell
                              value={Number(deliverable.budget) || 0}
                              onSave={(val) => handleInlineUpdate(deliverable.id, 'budget', Number(val) || 0)}
                              type="number"
                              disabled={!canManage}
                              displayValue={`€${(Number(deliverable.budget) || 0).toLocaleString()}`}
                            />
                          </TableCell>
                        )}
                        {isColumnVisible('cost') && (
                          <TableCell style={{ width: getColumnWidth('cost') }}>
                            <EnhancedInlineEditCell
                              value={Number(deliverable.cost) || 0}
                              onSave={(val) => handleInlineUpdate(deliverable.id, 'cost', Number(val) || 0)}
                              type="number"
                              disabled={!canManage}
                              displayValue={`€${(Number(deliverable.cost) || 0).toLocaleString()}`}
                            />
                          </TableCell>
                        )}
                        {isColumnVisible('due_date') && (
                          <TableCell style={{ width: getColumnWidth('due_date') }}>
                            <EnhancedInlineEditCell
                              value={deliverable.due_date || ''}
                              onSave={(val) => handleInlineUpdate(deliverable.id, 'due_date', val as string || null)}
                              type="date"
                              disabled={!canManage}
                              displayValue={deliverable.due_date ? format(parseISO(deliverable.due_date), 'd MMM yyyy', { locale: el }) : '-'}
                            />
                          </TableCell>
                        )}
                        {isColumnVisible('completed') && (
                          <TableCell style={{ width: getColumnWidth('completed') }}>
                            <Checkbox
                              checked={deliverable.completed || false}
                              onCheckedChange={() => toggleCompleted(deliverable)}
                              disabled={!canManage}
                            />
                          </TableCell>
                        )}
                        {isColumnVisible('actions') && (
                          <TableCell>
                            {canManage && (
                              <EditDeleteActions
                                onEdit={() => handleEdit(deliverable)}
                                onDelete={() => handleDelete(deliverable.id)}
                                itemName={`το παραδοτέο "${deliverable.name}"`}
                              />
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={visibleColumnCount + 1} className="p-0 border-b">
                            <div className="bg-muted/20 border-l-2 border-foreground/10 ml-4">
                              <DeliverableTasksPanel deliverableId={deliverable.id} />
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeliverable ? 'Επεξεργασία Παραδοτέου' : 'Νέο Παραδοτέο'}</DialogTitle>
            <DialogDescription>
              {editingDeliverable ? 'Ενημερώστε τα στοιχεία' : `Προσθήκη παραδοτέου στο έργο "${projectName}"`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Όνομα *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="π.χ. Σχεδιασμός UI" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (€)</Label>
                <Input id="budget" type="number" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Κόστος (€)</Label>
                <Input id="cost" type="number" value={formData.cost} onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Deadline</Label>
                <Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Υπεύθυνος</Label>
                <Select
                  value={formData.assigned_to || 'none'}
                  onValueChange={(value) => {
                    const userId = value === 'none' ? '' : value;
                    const profile = profiles.find(p => p.id === userId);
                    const deptId = profile?.department_id || formData.department_id;
                    setFormData(prev => ({ ...prev, assigned_to: userId, department_id: deptId || '' }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Κανένας" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="none">Κανένας</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ομάδα</Label>
                <Select
                  value={formData.department_id || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Καμία" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="none">Καμία</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ακύρωση</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingDeliverable ? 'Αποθήκευση' : 'Δημιουργία'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
