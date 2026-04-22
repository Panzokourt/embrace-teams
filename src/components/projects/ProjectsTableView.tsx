import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { GroupedTableSection } from '@/components/shared/GroupedTableSection';
import { ProjectFinancialBadge } from './ProjectFinancialBadge';
import { ProjectBulkActions } from '@/components/projects/ProjectBulkActions';
import { useTableViews, GroupByField } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, User, X as XIcon,
  ChevronDown, ChevronRight, Package, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStageBadge } from '@/components/projects/WorkflowStageBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { sectorToCategory } from '@/hooks/useProjectCategories';

type ProjectStatus = 'lead' | 'proposal' | 'negotiation' | 'won' | 'active' | 'completed' | 'cancelled' | 'lost' | 'tender';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: ProjectStatus;
  budget: number;
  agency_fee_percentage: number;
  start_date: string | null;
  end_date: string | null;
  progress?: number | null;
  created_at: string;
  client?: { name: string; sector?: string | null } | null;
  taskStats?: { total: number; completed: number };
  project_lead_id?: string | null;
  account_manager_id?: string | null;
}

interface Client {
  id: string;
  name: string;
  sector?: string | null;
}

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  completed: boolean | null;
  budget: number | null;
  cost: number | null;
  project_id: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  deliverable_id: string | null;
}

interface ProjectsTableViewProps {
  projects: Project[];
  clients: Client[];
  users: Profile[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onInlineUpdate: (projectId: string, field: string, value: string | number | null) => Promise<void>;
  canManage: boolean;
}

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', color: 'hsl(210 80% 55%)' },
  { value: 'proposal', label: 'Πρόταση', color: 'hsl(var(--warning))' },
  { value: 'negotiation', label: 'Διαπραγμάτευση', color: 'hsl(30 80% 55%)' },
  { value: 'active', label: 'Ενεργό', color: 'hsl(var(--primary))' },
  { value: 'completed', label: 'Ολοκληρωμένο', color: 'hsl(var(--success))' },
  { value: 'cancelled', label: 'Ακυρωμένο', color: 'hsl(var(--destructive))' },
  { value: 'lost', label: 'Χάθηκε', color: 'hsl(var(--destructive))' },
];

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  review: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

const DEFAULT_COLUMNS = [
  { id: 'select', label: '', visible: true, locked: true },
  { id: 'name', label: 'Όνομα', visible: true, locked: true },
  { id: 'client', label: 'Πελάτης', visible: true },
  { id: 'assignees', label: 'Υπεύθυνοι', visible: true },
  { id: 'status', label: 'Κατάσταση', visible: true },
  { id: 'progress', label: 'Πρόοδος', visible: true },
  { id: 'budget', label: 'Προϋπολογισμός', visible: true },
  { id: 'agency_fee', label: 'Agency Fee', visible: false },
  { id: 'start_date', label: 'Έναρξη', visible: true },
  { id: 'end_date', label: 'Λήξη', visible: true },
  { id: 'tasks', label: 'Tasks', visible: true },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

const GROUP_OPTIONS = [
  { value: 'none' as GroupByField, label: 'Χωρίς ομαδοποίηση' },
  { value: 'status' as GroupByField, label: 'Κατάσταση' },
  { value: 'assignee' as GroupByField, label: 'Πελάτης' },
  { value: 'project' as GroupByField, label: 'Κατηγορία' },
];

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'name' | 'status' | 'budget' | 'start_date' | 'progress';

export function ProjectsTableView({
  projects,
  clients,
  users,
  onEdit,
  onDelete,
  onInlineUpdate,
  canManage,
}: ProjectsTableViewProps) {
  const navigate = useNavigate();
  const layout = useTableViews({ storageKey: 'projects_table', defaultColumns: DEFAULT_COLUMNS });
  const {
    columns, setColumns, columnWidths, setColumnWidth,
    groupBy, setGroupBy, savedViews, currentViewId,
    saveView, loadView, deleteView, resetToDefault,
    orderedColumns, sensors, handleDragEnd,
    DndContext, SortableContext, horizontalListSortingStrategy, closestCenter,
  } = layout;

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);

  // Expand state
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());
  const [projectDeliverables, setProjectDeliverables] = useState<Record<string, Deliverable[]>>({});
  const [deliverableTasks, setDeliverableTasks] = useState<Record<string, Task[]>>({});
  const [loadingDeliverables, setLoadingDeliverables] = useState<Set<string>>(new Set());
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());

  const toggleProjectExpand = useCallback(async (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
        // Fetch deliverables if not loaded
        if (!projectDeliverables[projectId]) {
          fetchDeliverables(projectId);
        }
      }
      return next;
    });
  }, [projectDeliverables]);

  const fetchDeliverables = async (projectId: string) => {
    setLoadingDeliverables(prev => new Set(prev).add(projectId));
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .select('id, name, description, due_date, completed, budget, cost, project_id')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw error;
      setProjectDeliverables(prev => ({ ...prev, [projectId]: data || [] }));
    } catch (err) {
      console.error('Error fetching deliverables:', err);
    } finally {
      setLoadingDeliverables(prev => { const n = new Set(prev); n.delete(projectId); return n; });
    }
  };

  const toggleDeliverableExpand = useCallback(async (deliverableId: string) => {
    setExpandedDeliverables(prev => {
      const next = new Set(prev);
      if (next.has(deliverableId)) {
        next.delete(deliverableId);
      } else {
        next.add(deliverableId);
        if (!deliverableTasks[deliverableId]) {
          fetchTasksForDeliverable(deliverableId);
        }
      }
      return next;
    });
  }, [deliverableTasks]);

  const fetchTasksForDeliverable = async (deliverableId: string) => {
    setLoadingTasks(prev => new Set(prev).add(deliverableId));
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, deliverable_id')
        .eq('deliverable_id', deliverableId)
        .order('created_at');
      if (error) throw error;
      setDeliverableTasks(prev => ({ ...prev, [deliverableId]: data || [] }));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(prev => { const n = new Set(prev); n.delete(deliverableId); return n; });
    }
  };

  const sortedProjects = useMemo(() => {
    if (!sortField || !sortDirection) return projects;
    return [...projects].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'status':
          const statusOrder: Record<string, number> = { tender: 0, active: 1, completed: 2, cancelled: 3 };
          aVal = statusOrder[a.status] ?? 99; bVal = statusOrder[b.status] ?? 99; break;
        case 'budget': aVal = a.budget ?? 0; bVal = b.budget ?? 0; break;
        case 'start_date': aVal = a.start_date ? new Date(a.start_date).getTime() : Infinity; bVal = b.start_date ? new Date(b.start_date).getTime() : Infinity; break;
        case 'progress': aVal = a.progress ?? 0; bVal = b.progress ?? 0; break;
        default: return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortField, sortDirection]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedIds(new Set()); lastSelectedIndex.current = null; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && canManage) { e.preventDefault(); setSelectedIds(new Set(sortedProjects.map(p => p.id))); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sortedProjects, canManage]);

  const groupedProjects = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'Όλα τα Έργα', projects: sortedProjects }];
    const groups = new Map<string, { label: string; projects: Project[]; badge?: React.ReactNode }>();

    sortedProjects.forEach(project => {
      let groupKey: string;
      let groupLabel: string;
      let badge: React.ReactNode = null;

      if (groupBy === 'status') {
        groupKey = project.status;
        const statusOption = STATUS_OPTIONS.find(s => s.value === project.status);
        groupLabel = statusOption?.label || project.status;
        badge = (
          <Badge variant="outline" className="text-xs" style={{ borderColor: statusOption?.color, color: statusOption?.color }}>
            {statusOption?.label}
          </Badge>
        );
      } else if (groupBy === 'assignee') {
        groupKey = project.client_id || '_none';
        groupLabel = project.client?.name || 'Χωρίς Πελάτη';
      } else if (groupBy === 'project') {
        const sector = project.client?.sector || null;
        const cat = sectorToCategory(sector);
        groupKey = cat || '_none';
        groupLabel = cat || 'Χωρίς Κατηγορία';
      } else {
        groupKey = 'all';
        groupLabel = 'Όλα';
      }

      if (!groups.has(groupKey)) groups.set(groupKey, { label: groupLabel, projects: [], badge });
      groups.get(groupKey)!.projects.push(project);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      key, label: value.label, projects: value.projects, badge: value.badge,
    }));
  }, [sortedProjects, groupBy]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortField(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else { setSortField(field); setSortDirection('asc'); }
  };

  const onMenuSort = (field: string, dir: 'asc' | 'desc') => {
    setSortField(field as SortField);
    setSortDirection(dir);
  };
  const onClearSort = () => { setSortField(null); setSortDirection(null); };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  const isColumnVisible = (columnId: string) => columns.find(c => c.id === columnId)?.visible ?? true;
  const getColumnWidth = (columnId: string) => columnWidths[columnId];

  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));
  const visibleColumnCount = columns.filter(c => c.visible).length;

  const handleRowSelect = (projectId: string, index: number, e: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedIndex.current !== null) {
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        for (let i = start; i <= end; i++) next.add(sortedProjects[i].id);
      } else if (e.metaKey || e.ctrlKey) {
        if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      } else {
        if (next.has(projectId) && next.size === 1) next.delete(projectId);
        else { next.clear(); next.add(projectId); }
      }
      lastSelectedIndex.current = index;
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedProjects.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedProjects.map(p => p.id)));
  };

  const handleExportCSV = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'client', label: 'Πελάτης', format: (_: any, row: Project) => row.client?.name || '-' },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'budget', label: 'Προϋπολογισμός', format: formatters.currency },
      { key: 'agency_fee_percentage', label: 'Agency Fee %', format: formatters.percentage },
      { key: 'start_date', label: 'Έναρξη', format: formatters.date },
      { key: 'end_date', label: 'Λήξη', format: formatters.date },
      { key: 'progress', label: 'Πρόοδος', format: formatters.percentage },
    ];
    exportToCSV(projects, exportColumns, `projects_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  }, [projects]);

  const handleExportExcel = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'client', label: 'Πελάτης', format: (_: any, row: Project) => row.client?.name || '-' },
      { key: 'status', label: 'Κατάσταση', format: (v: string) => STATUS_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'budget', label: 'Προϋπολογισμός', format: formatters.currency },
      { key: 'agency_fee_percentage', label: 'Agency Fee %', format: formatters.percentage },
      { key: 'start_date', label: 'Έναρξη', format: formatters.date },
      { key: 'end_date', label: 'Λήξη', format: formatters.date },
      { key: 'progress', label: 'Πρόοδος', format: formatters.percentage },
    ];
    exportToExcel(projects, exportColumns, `projects_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  }, [projects]);

  const getProjectAssignees = (project: Project) => {
    const assignees: Profile[] = [];
    if (project.project_lead_id) {
      const lead = users.find(u => u.id === project.project_lead_id);
      if (lead) assignees.push(lead);
    }
    if (project.account_manager_id && project.account_manager_id !== project.project_lead_id) {
      const mgr = users.find(u => u.id === project.account_manager_id);
      if (mgr) assignees.push(mgr);
    }
    return assignees;
  };

  const renderTaskRow = (task: Task, colSpan: number) => {
    const statusLabel: Record<string, string> = {
      pending: 'Εκκρεμεί', in_progress: 'Σε εξέλιξη', review: 'Αναθεώρηση',
      completed: 'Ολοκληρωμένο', cancelled: 'Ακυρωμένο',
    };
    return (
      <TableRow
        key={task.id}
        className="hover:bg-muted/30 cursor-pointer bg-muted/5"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <TableCell colSpan={colSpan} className="py-1.5">
          <div className="flex items-center gap-2 pl-16">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm">{task.title}</span>
            <Badge variant="outline" className={cn('text-[10px] ml-auto', TASK_STATUS_COLORS[task.status] || '')}>
              {statusLabel[task.status] || task.status}
            </Badge>
            {task.due_date && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(task.due_date), 'dd/MM/yy')}
              </span>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderDeliverableRow = (deliverable: Deliverable, colSpan: number) => {
    const isExpanded = expandedDeliverables.has(deliverable.id);
    const tasks = deliverableTasks[deliverable.id] || [];
    const isLoading = loadingTasks.has(deliverable.id);

    return (
      <React.Fragment key={deliverable.id}>
        <TableRow
          className="hover:bg-muted/30 cursor-pointer bg-muted/10"
          onClick={(e) => {
            e.stopPropagation();
            toggleDeliverableExpand(deliverable.id);
          }}
        >
          <TableCell colSpan={colSpan} className="py-1.5">
            <div className="flex items-center gap-2 pl-8">
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); toggleDeliverableExpand(deliverable.id); }}>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{deliverable.name}</span>
              {deliverable.completed && (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              )}
              {deliverable.due_date && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {format(new Date(deliverable.due_date), 'dd/MM/yy')}
                </span>
              )}
              {deliverable.budget != null && (
                <span className="text-[10px] text-muted-foreground">
                  €{deliverable.budget.toLocaleString('el-GR')}
                </span>
              )}
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && (
          isLoading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-2">
                <div className="pl-16 text-xs text-muted-foreground">Φόρτωση tasks...</div>
              </TableCell>
            </TableRow>
          ) : tasks.length > 0 ? (
            tasks.map(task => renderTaskRow(task, colSpan))
          ) : (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-2">
                <div className="pl-16 text-xs text-muted-foreground">Δεν υπάρχουν tasks</div>
              </TableCell>
            </TableRow>
          )
        )}
      </React.Fragment>
    );
  };

  // Header registry
  const PROJ_HEADER_MIN: Record<string, number> = {
    select: 40, name: 150, client: 100, assignees: 80, status: 100,
    progress: 80, budget: 100, agency_fee: 80, start_date: 90,
    end_date: 90, tasks: 80, actions: 80,
  };
  const PROJ_HEADER_SORT: Record<string, SortField | undefined> = {
    name: 'name', status: 'status', progress: 'progress',
    budget: 'budget', start_date: 'start_date',
  };
  const PROJ_HEADER_LABELS: Record<string, string> = {
    name: 'Όνομα', client: 'Πελάτης', assignees: 'Υπεύθυνοι',
    status: 'Κατάσταση', progress: 'Πρόοδος', budget: 'Προϋπολογισμός',
    agency_fee: 'Agency Fee', start_date: 'Έναρξη', end_date: 'Λήξη',
    tasks: 'Tasks', actions: 'Ενέργειες',
  };

  const renderProjectHeader = (colId: string) => {
    if (colId === 'select') {
      return (
        <TableHead key="select" className="w-[40px]">
          <Checkbox checked={selectedIds.size > 0 && selectedIds.size === sortedProjects.length} onCheckedChange={handleSelectAll} />
        </TableHead>
      );
    }
    if (colId === 'actions') {
      return (
        <ResizableTableHeader
          key="actions"
          columnId="actions"
          layout={layout}
          width={getColumnWidth('actions') ?? 80}
          minWidth={80}
          className="w-[80px]"
        >
          Ενέργειες
        </ResizableTableHeader>
      );
    }
    const sf = PROJ_HEADER_SORT[colId];
    return (
      <ResizableTableHeader
        key={colId}
        columnId={colId}
        layout={layout}
        width={getColumnWidth(colId)}
        onWidthChange={(w) => setColumnWidth(colId, w)}
        minWidth={PROJ_HEADER_MIN[colId] ?? 80}
        className={cn(sf && 'cursor-pointer select-none')}
        onClick={sf ? () => toggleSort(sf) : undefined}
        sortField={sf}
        currentSortField={sortField}
        currentSortDirection={sortDirection}
        onSort={onMenuSort}
        onClearSort={onClearSort}
      >
        <div className="flex items-center gap-1">{PROJ_HEADER_LABELS[colId]} {sf && getSortIcon(sf)}</div>
      </ResizableTableHeader>
    );
  };

  const renderProjectCell = (
    colId: string,
    project: Project,
    flatIndex: number,
    isExpanded: boolean,
    assignees: Profile[],
  ) => {
    switch (colId) {
      case 'select':
        return canManage ? (
          <TableCell key="select" className="w-[40px]" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedIds.has(project.id)}
              onCheckedChange={() => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  next.has(project.id) ? next.delete(project.id) : next.add(project.id);
                  return next;
                });
              }}
            />
          </TableCell>
        ) : null;
      case 'name':
        return (
          <TableCell key="name" className="font-medium" style={{ width: getColumnWidth('name') }}>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => { e.stopPropagation(); toggleProjectExpand(project.id); }}
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
              <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
                <EnhancedInlineEditCell value={project.name} onSave={(val) => onInlineUpdate(project.id, 'name', val)} type="text" disabled={!canManage} />
              </div>
              <WorkflowStageBadge projectId={project.id} />
            </div>
          </TableCell>
        );
      case 'client':
        return (
          <TableCell key="client" style={{ width: getColumnWidth('client') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell value={project.client_id} onSave={(val) => onInlineUpdate(project.id, 'client_id', val)} type="select" options={clientOptions} displayValue={project.client?.name} placeholder="Κανένας" disabled={!canManage} />
          </TableCell>
        );
      case 'assignees':
        return (
          <TableCell key="assignees" style={{ width: getColumnWidth('assignees') }}>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-0 hover:bg-muted rounded-md p-1 transition-colors -mx-1 w-full min-h-[28px]">
                  {assignees.length > 0 ? (
                    <div className="flex items-center -space-x-1.5">
                      {assignees.map(a => (
                        <div key={a.id} className="relative group/avatar">
                          <Avatar className="h-6 w-6 border-2 border-background" title={a.full_name || ''}>
                            {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {(a.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {canManage && (
                            <button
                              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground items-center justify-center text-[8px] hidden group-hover/avatar:flex z-10"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const field = a.id === project.project_lead_id ? 'project_lead_id' : 'account_manager_id';
                                await onInlineUpdate(project.id, field, null);
                              }}
                            >✕</button>
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
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                  {assignees.length > 0 && (
                    <div className="space-y-1">
                      {assignees.map(a => {
                        const role = a.id === project.project_lead_id ? 'Project Lead' : 'Account Manager';
                        return (
                          <div key={a.id} className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-md">
                            <Avatar className="h-6 w-6">
                              {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {(a.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm truncate block">{a.full_name || 'Χωρίς όνομα'}</span>
                              <span className="text-[10px] text-muted-foreground">{role}</span>
                            </div>
                            {canManage && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={async () => {
                                const field = a.id === project.project_lead_id ? 'project_lead_id' : 'account_manager_id';
                                await onInlineUpdate(project.id, field, null);
                              }}>
                                <XIcon className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {canManage && (
                    <>
                      {!project.project_lead_id && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-medium px-1">Project Lead</span>
                          <AssigneeSelector
                            users={users}
                            excludeIds={assignees.map(a => a.id)}
                            onSelect={async (userId) => { await onInlineUpdate(project.id, 'project_lead_id', userId); }}
                          />
                        </div>
                      )}
                      {!project.account_manager_id && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-medium px-1">Account Manager</span>
                          <AssigneeSelector
                            users={users}
                            excludeIds={assignees.map(a => a.id)}
                            onSelect={async (userId) => { await onInlineUpdate(project.id, 'account_manager_id', userId); }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </TableCell>
        );
      case 'status':
        return (
          <TableCell key="status" style={{ width: getColumnWidth('status') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell value={project.status} onSave={(val) => onInlineUpdate(project.id, 'status', val)} type="select" options={STATUS_OPTIONS} disabled={!canManage} />
          </TableCell>
        );
      case 'progress':
        return (
          <TableCell key="progress" style={{ width: getColumnWidth('progress') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell value={project.progress ?? 0} onSave={(val) => onInlineUpdate(project.id, 'progress', val)} type="progress" disabled={!canManage} />
          </TableCell>
        );
      case 'budget':
        return (
          <TableCell key="budget" style={{ width: getColumnWidth('budget') }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              <EnhancedInlineEditCell value={project.budget} onSave={(val) => onInlineUpdate(project.id, 'budget', val)} type="number" displayValue={`€${project.budget?.toLocaleString('el-GR') || 0}`} disabled={!canManage} />
              <ProjectFinancialBadge projectId={project.id} budget={project.budget} />
            </div>
          </TableCell>
        );
      case 'agency_fee':
        return (
          <TableCell key="agency_fee" style={{ width: getColumnWidth('agency_fee') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell value={project.agency_fee_percentage} onSave={(val) => onInlineUpdate(project.id, 'agency_fee_percentage', val)} type="number" displayValue={`${project.agency_fee_percentage}%`} disabled={!canManage} />
          </TableCell>
        );
      case 'start_date':
        return (
          <TableCell key="start_date" style={{ width: getColumnWidth('start_date') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell value={project.start_date} onSave={(val) => onInlineUpdate(project.id, 'start_date', val)} type="date" disabled={!canManage} />
          </TableCell>
        );
      case 'end_date':
        return (
          <TableCell key="end_date" style={{ width: getColumnWidth('end_date') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell value={project.end_date} onSave={(val) => onInlineUpdate(project.id, 'end_date', val)} type="date" disabled={!canManage} />
          </TableCell>
        );
      case 'tasks':
        return (
          <TableCell key="tasks" style={{ width: getColumnWidth('tasks') }}>
            {project.taskStats && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-3 w-3 text-success" />
                <span>{project.taskStats.completed}/{project.taskStats.total}</span>
              </div>
            )}
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key="actions" onClick={(e) => e.stopPropagation()}>
            {canManage && (
              <EditDeleteActions onEdit={() => onEdit(project)} onDelete={() => onDelete(project.id)} itemName={project.name} />
            )}
          </TableCell>
        );
      default:
        return null;
    }
  };

  // Computed visible columns (respect canManage for the "select" column)
  const visibleOrderedColumns = orderedColumns.filter(c => c.visible && (c.id !== 'select' || canManage));

  const renderProjectRow = (project: Project, flatIndex: number) => {
    const assignees = getProjectAssignees(project);
    const isExpanded = expandedProjects.has(project.id);
    const deliverables = projectDeliverables[project.id] || [];
    const isLoadingDel = loadingDeliverables.has(project.id);
    const totalColSpan = visibleOrderedColumns.length;

    return (
      <React.Fragment key={project.id}>
        <TableRow
          className={cn(
            "group hover:bg-muted/50 cursor-pointer",
            selectedIds.has(project.id) && "bg-primary/5"
          )}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, input, select, [role="checkbox"], [data-inline-edit]')) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey) { handleRowSelect(project.id, flatIndex, e); return; }
            navigate(`/projects/${project.id}`);
          }}
        >
          {visibleOrderedColumns.map(c => renderProjectCell(c.id, project, flatIndex, isExpanded, assignees))}
        </TableRow>

        {/* Expanded deliverables */}
        {isExpanded && (
          isLoadingDel ? (
            <TableRow>
              <TableCell colSpan={totalColSpan} className="py-2">
                <div className="pl-10 text-xs text-muted-foreground">Φόρτωση παραδοτέων...</div>
              </TableCell>
            </TableRow>
          ) : deliverables.length > 0 ? (
            deliverables.map(del => renderDeliverableRow(del, totalColSpan))
          ) : (
            <TableRow>
              <TableCell colSpan={totalColSpan} className="py-2">
                <div className="pl-10 text-xs text-muted-foreground">Δεν υπάρχουν παραδοτέα</div>
              </TableCell>
            </TableRow>
          )
        )}
      </React.Fragment>
    );
  };

  let flatIndex = 0;

  return (
    <div className="space-y-4">
      {canManage && (
        <ProjectBulkActions
          selectedIds={selectedIds}
          onClearSelection={() => { setSelectedIds(new Set()); lastSelectedIndex.current = null; }}
          onActionComplete={() => {}}
        />
      )}

      <TableToolbar
        columns={columns}
        onColumnsChange={setColumns}
        savedViews={savedViews}
        currentViewId={currentViewId}
        onSaveView={(name) => saveView(name, sortField, sortDirection)}
        onLoadView={(id) => {
          const view = loadView(id);
          if (view) { setSortField(view.sortField as SortField | null); setSortDirection(view.sortDirection); }
        }}
        onDeleteView={deleteView}
        onResetToDefault={resetToDefault}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupOptions={GROUP_OPTIONS}
      />

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && (
                <TableHead className="w-[40px]">
                  <Checkbox checked={selectedIds.size > 0 && selectedIds.size === sortedProjects.length} onCheckedChange={handleSelectAll} />
                </TableHead>
              )}
              <ResizableTableHeader width={getColumnWidth('name')} onWidthChange={(w) => setColumnWidth('name', w)} minWidth={150} className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">Όνομα {getSortIcon('name')}</div>
              </ResizableTableHeader>
              
              {isColumnVisible('client') && (
                <ResizableTableHeader width={getColumnWidth('client')} onWidthChange={(w) => setColumnWidth('client', w)} minWidth={100}>Πελάτης</ResizableTableHeader>
              )}

              {isColumnVisible('assignees') && (
                <ResizableTableHeader width={getColumnWidth('assignees')} onWidthChange={(w) => setColumnWidth('assignees', w)} minWidth={80}>Υπεύθυνοι</ResizableTableHeader>
              )}
              
              {isColumnVisible('status') && (
                <ResizableTableHeader width={getColumnWidth('status')} onWidthChange={(w) => setColumnWidth('status', w)} minWidth={100} className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-1">Κατάσταση {getSortIcon('status')}</div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('progress') && (
                <ResizableTableHeader width={getColumnWidth('progress')} onWidthChange={(w) => setColumnWidth('progress', w)} minWidth={80} className="cursor-pointer select-none" onClick={() => toggleSort('progress')}>
                  <div className="flex items-center gap-1">Πρόοδος {getSortIcon('progress')}</div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('budget') && (
                <ResizableTableHeader width={getColumnWidth('budget')} onWidthChange={(w) => setColumnWidth('budget', w)} minWidth={100} className="cursor-pointer select-none" onClick={() => toggleSort('budget')}>
                  <div className="flex items-center gap-1">Προϋπολογισμός {getSortIcon('budget')}</div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('agency_fee') && (
                <ResizableTableHeader width={getColumnWidth('agency_fee')} onWidthChange={(w) => setColumnWidth('agency_fee', w)} minWidth={80}>Agency Fee</ResizableTableHeader>
              )}
              
              {isColumnVisible('start_date') && (
                <ResizableTableHeader width={getColumnWidth('start_date')} onWidthChange={(w) => setColumnWidth('start_date', w)} minWidth={90} className="cursor-pointer select-none" onClick={() => toggleSort('start_date')}>
                  <div className="flex items-center gap-1">Έναρξη {getSortIcon('start_date')}</div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('end_date') && (
                <ResizableTableHeader width={getColumnWidth('end_date')} onWidthChange={(w) => setColumnWidth('end_date', w)} minWidth={90}>Λήξη</ResizableTableHeader>
              )}
              
              {isColumnVisible('tasks') && (
                <ResizableTableHeader width={getColumnWidth('tasks')} onWidthChange={(w) => setColumnWidth('tasks', w)} minWidth={80}>Tasks</ResizableTableHeader>
              )}
              
              <TableHead className="w-[80px]">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount + (canManage ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  Δεν υπάρχουν έργα
                </TableCell>
              </TableRow>
            ) : groupBy === 'none' ? (
              sortedProjects.map((project, idx) => renderProjectRow(project, idx))
            ) : (
              groupedProjects.map(group => {
                const startIdx = flatIndex;
                const rows = group.projects.map((project, idx) => renderProjectRow(project, startIdx + idx));
                flatIndex += group.projects.length;
                return (
                  <GroupedTableSection
                    key={group.key}
                    groupKey={group.key}
                    groupLabel={group.label}
                    itemCount={group.projects.length}
                    colSpan={visibleColumnCount + (canManage ? 1 : 0)}
                    badge={group.badge}
                  >
                    {rows}
                  </GroupedTableSection>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Small helper component for the popover user selector
function AssigneeSelector({ users, excludeIds, onSelect }: { users: Profile[]; excludeIds: string[]; onSelect: (userId: string) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => !excludeIds.includes(u.id) && (u.full_name || u.email).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1">
      <Input placeholder="Αναζήτηση..." className="h-7 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {filtered.map(u => (
          <button key={u.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors" onClick={async () => { await onSelect(u.id); }}>
            <Avatar className="h-5 w-5">
              {u.avatar_url && <AvatarImage src={u.avatar_url} />}
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {(u.full_name || u.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{u.full_name || u.email}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Κανένα αποτέλεσμα</p>}
      </div>
    </div>
  );
}
