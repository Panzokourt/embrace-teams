import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { useTableViews } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Plus, Loader2, CheckCircle2, Clock, Circle, AlertCircle, ListTodo,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MondayStatusCell } from '@/components/shared/MondayStatusCell';
import { STATUS_COLORS } from '@/components/shared/mondayStyleConfig';
import type { Tables } from '@/integrations/supabase/types';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
type TaskRow = Tables<'tasks'>;

interface ProjectTask extends TaskRow {
  assignee?: { full_name: string | null; avatar_url?: string | null } | null;
  deliverable?: { name: string } | null;
}

interface ProjectDeliverable {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface ProjectTasksTableProps {
  projectId: string;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Προς Υλοποίηση', icon: <Circle className="h-4 w-4" />, color: 'hsl(var(--muted-foreground))' },
  { value: 'in_progress', label: 'Σε Εξέλιξη', icon: <Clock className="h-4 w-4" />, color: 'hsl(var(--primary))' },
  { value: 'review', label: 'Αναθεώρηση', icon: <AlertCircle className="h-4 w-4" />, color: 'hsl(var(--warning))' },
  { value: 'completed', label: 'Ολοκληρώθηκε', icon: <CheckCircle2 className="h-4 w-4" />, color: 'hsl(var(--success))' },
];

const DEFAULT_COLUMNS = [
  { id: 'select', label: 'Επιλογή', visible: true, locked: true },
  { id: 'title', label: 'Τίτλος', visible: true, locked: true },
  { id: 'assignee', label: 'Υπεύθυνος', visible: true },
  { id: 'deliverable', label: 'Παραδοτέο', visible: true },
  { id: 'due_date', label: 'Προθεσμία', visible: true },
  { id: 'status', label: 'Κατάσταση', visible: true },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

type SortField = 'title' | 'due_date' | 'status' | 'assignee';
type SortDirection = 'asc' | 'desc' | null;

export function ProjectTasksTable({ projectId }: ProjectTasksTableProps) {
  const navigate = useNavigate();
  const { isAdmin, isManager, hasPermission } = useAuth();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const {
    columns, setColumns, columnWidths, setColumnWidth,
    savedViews, currentViewId, saveView, loadView, deleteView, resetToDefault,
  } = useTableViews({ storageKey: 'project_tasks_table', defaultColumns: DEFAULT_COLUMNS });

  const [formData, setFormData] = useState({
    title: '', description: '', status: 'todo' as TaskStatus, due_date: '', assigned_to: '', deliverable_id: '',
  });

  const canManage = isAdmin || isManager || hasPermission('projects.edit');

  useEffect(() => { fetchTasks(); fetchDeliverables(); fetchProfiles(); }, [projectId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, deliverable:deliverables(name)')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const assigneeIds = [...new Set((data || []).filter(t => t.assigned_to).map(t => t.assigned_to as string))];
      let profilesMap = new Map<string, { full_name: string | null; avatar_url?: string | null }>();
      if (assigneeIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', assigneeIds);
        profilesMap = new Map((profilesData || []).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
      }
      const tasksWithAssignees = (data || []).map(task => ({
        ...task,
        assignee: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null
      }));
      setTasks(tasksWithAssignees as ProjectTask[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Σφάλμα κατά τη φόρτωση tasks');
    } finally { setLoading(false); }
  };

  const fetchDeliverables = async () => {
    const { data } = await supabase.from('deliverables').select('id, name').eq('project_id', projectId).order('created_at');
    setDeliverables(data || []);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('status', ['active', 'pending']).order('full_name');
    setProfiles(data || []);
  };

  const sortedTasks = useMemo(() => {
    if (!sortField || !sortDirection) return tasks;
    return [...tasks].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
        case 'due_date':
          aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity; break;
        case 'status':
          const statusOrder = { todo: 0, in_progress: 1, review: 2, completed: 3 };
          aVal = statusOrder[a.status as TaskStatus] ?? 0;
          bVal = statusOrder[b.status as TaskStatus] ?? 0; break;
        case 'assignee':
          aVal = a.assignee?.full_name?.toLowerCase() || 'zzz';
          bVal = b.assignee?.full_name?.toLowerCase() || 'zzz'; break;
        default: return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const taskData = {
        project_id: projectId,
        title: formData.title,
        description: formData.description || null,
        status: formData.status as TaskStatus,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        deliverable_id: formData.deliverable_id || null,
      };
      if (editingTask) {
        const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTask.id);
        if (error) throw error;
        toast.success('Το task ενημερώθηκε!');
      } else {
        const { error } = await supabase.from('tasks').insert(taskData);
        if (error) throw error;
        toast.success('Το task δημιουργήθηκε!');
      }
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally { setSaving(false); }
  };

  const handleEdit = (task: ProjectTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status as TaskStatus,
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

  const handleInlineUpdate = async (taskId: string, field: string, value: string | number | null) => {
    try {
      const updateData: Record<string, any> = { [field]: value };
      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;
      if (field === 'assigned_to' || field === 'deliverable_id') {
        await fetchTasks();
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updateData } : t));
      }
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', status: 'todo', due_date: '', assigned_to: '', deliverable_id: '' });
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === tasks.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(tasks.map(t => t.id)));
  };

  const isColumnVisible = (columnId: string) => columns.find(c => c.id === columnId)?.visible ?? true;
  const getColumnWidth = (columnId: string) => columnWidths[columnId];

  const userOptions = profiles.map(p => ({ value: p.id, label: p.full_name || p.email, avatar: p.avatar_url || undefined }));
  const deliverableOptions = deliverables.map(d => ({ value: d.id, label: d.name }));

  const handleExportCSV = useCallback(() => {
    const exportColumns = [
      { key: 'title', label: 'Τίτλος' },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'assignee', label: 'Υπεύθυνος', format: (_: any, row: ProjectTask) => row.assignee?.full_name || '-' },
      { key: 'deliverable', label: 'Παραδοτέο', format: (_: any, row: ProjectTask) => row.deliverable?.name || '-' },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
    ];
    exportToCSV(tasks, exportColumns, `project_tasks_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  }, [tasks]);

  const handleExportExcel = useCallback(() => {
    const exportColumns = [
      { key: 'title', label: 'Τίτλος' },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'assignee', label: 'Υπεύθυνος', format: (_: any, row: ProjectTask) => row.assignee?.full_name || '-' },
      { key: 'deliverable', label: 'Παραδοτέο', format: (_: any, row: ProjectTask) => row.deliverable?.name || '-' },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
    ];
    exportToExcel(tasks, exportColumns, `project_tasks_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  }, [tasks]);

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
            <Plus className="h-4 w-4 mr-2" />
            Νέο Task
          </Button>
        )}
      </div>

      {/* Table */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Δεν υπάρχουν tasks</p>
          <p className="text-xs mt-1">Προσθέστε εργασίες για το έργο</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('select') && (
                  <TableHead className="w-[40px]">
                    <Checkbox checked={selectedItems.size === tasks.length && tasks.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                )}
                {isColumnVisible('title') && (
                  <ResizableTableHeader width={getColumnWidth('title')} onWidthChange={(w) => setColumnWidth('title', w)}>
                    <button onClick={() => toggleSort('title')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Τίτλος {getSortIcon('title')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('assignee') && (
                  <ResizableTableHeader width={getColumnWidth('assignee') || 150} onWidthChange={(w) => setColumnWidth('assignee', w)}>
                    <button onClick={() => toggleSort('assignee')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Υπεύθυνος {getSortIcon('assignee')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('deliverable') && (
                  <ResizableTableHeader width={getColumnWidth('deliverable') || 150} onWidthChange={(w) => setColumnWidth('deliverable', w)}>
                    Παραδοτέο
                  </ResizableTableHeader>
                )}
                {isColumnVisible('due_date') && (
                  <ResizableTableHeader width={getColumnWidth('due_date') || 120} onWidthChange={(w) => setColumnWidth('due_date', w)}>
                    <button onClick={() => toggleSort('due_date')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Προθεσμία {getSortIcon('due_date')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('status') && (
                  <ResizableTableHeader width={getColumnWidth('status') || 160} onWidthChange={(w) => setColumnWidth('status', w)}>
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Κατάσταση {getSortIcon('status')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('actions') && (
                  <TableHead className="w-[80px]">Ενέργειες</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map(task => (
                <TableRow
                  key={task.id}
                  className={cn("group hover:bg-muted/50 cursor-pointer", selectedItems.has(task.id) && "bg-primary/5")}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button, input, select, [role="checkbox"], [data-inline-edit]')) return;
                    navigate(`/tasks/${task.id}`);
                  }}
                >
                  {isColumnVisible('select') && (
                    <TableCell>
                      <Checkbox checked={selectedItems.has(task.id)} onCheckedChange={() => toggleSelectItem(task.id)} />
                    </TableCell>
                  )}
                  {isColumnVisible('title') && (
                    <TableCell style={{ width: getColumnWidth('title') }}>
                      <EnhancedInlineEditCell
                        value={task.title}
                        onSave={(val) => handleInlineUpdate(task.id, 'title', val as string)}
                        disabled={!canManage}
                        className={cn(task.status === 'completed' && "line-through text-muted-foreground")}
                      />
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible('assignee') && (
                    <TableCell style={{ width: getColumnWidth('assignee') }}>
                      <EnhancedInlineEditCell
                        value={task.assigned_to || 'none'}
                        onSave={(val) => handleInlineUpdate(task.id, 'assigned_to', val === 'none' ? null : val as string)}
                        type="avatar-select"
                        options={[{ value: 'none', label: 'Κανένας' }, ...userOptions]}
                        disabled={!canManage}
                        displayValue={task.assignee?.full_name || '-'}
                      />
                    </TableCell>
                  )}
                  {isColumnVisible('deliverable') && (
                    <TableCell style={{ width: getColumnWidth('deliverable') }}>
                      <EnhancedInlineEditCell
                        value={task.deliverable_id || 'none'}
                        onSave={(val) => handleInlineUpdate(task.id, 'deliverable_id', val === 'none' ? null : val as string)}
                        type="select"
                        options={[{ value: 'none', label: 'Κανένα' }, ...deliverableOptions]}
                        disabled={!canManage}
                        displayValue={task.deliverable?.name || '-'}
                      />
                    </TableCell>
                  )}
                  {isColumnVisible('due_date') && (
                    <TableCell style={{ width: getColumnWidth('due_date') }}>
                      <EnhancedInlineEditCell
                        value={task.due_date || ''}
                        onSave={(val) => handleInlineUpdate(task.id, 'due_date', val as string || null)}
                        type="date"
                        disabled={!canManage}
                        displayValue={task.due_date ? format(parseISO(task.due_date), 'd MMM', { locale: el }) : '-'}
                      />
                    </TableCell>
                  )}
                  {isColumnVisible('status') && (
                    <TableCell style={{ width: getColumnWidth('status') }}>
                      <EnhancedInlineEditCell
                        value={task.status}
                        onSave={(val) => handleInlineUpdate(task.id, 'status', val as string)}
                        type="select"
                        options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label, icon: s.icon, color: s.color }))}
                        disabled={!canManage}
                        displayValue={STATUS_OPTIONS.find(s => s.value === task.status)?.label || task.status}
                      />
                    </TableCell>
                  )}
                  {isColumnVisible('actions') && (
                    <TableCell>
                      {canManage && (
                        <EditDeleteActions
                          onEdit={() => handleEdit(task)}
                          onDelete={() => handleDelete(task.id)}
                          itemName={task.title}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
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
              {editingTask ? 'Ενημερώστε τα στοιχεία του task' : 'Δημιουργήστε ένα νέο task για το έργο'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Τίτλος *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Εισάγετε τίτλο" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Προαιρετική περιγραφή" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Κατάσταση</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TaskStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((config) => (
                      <SelectItem key={config.value} value={config.value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Προθεσμία</Label>
                <Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Υπεύθυνος</Label>
              <Select value={formData.assigned_to || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value === 'none' ? '' : value }))}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε υπεύθυνο" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένας</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliverable_id">Παραδοτέο</Label>
              <Select value={formData.deliverable_id || 'none'} onValueChange={(value) => setFormData(prev => ({ ...prev, deliverable_id: value === 'none' ? '' : value }))}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε παραδοτέο" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένα</SelectItem>
                  {deliverables.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ακύρωση</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingTask ? 'Αποθήκευση' : 'Δημιουργία'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
