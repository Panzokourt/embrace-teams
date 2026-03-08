import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { GroupedTableSection } from '@/components/shared/GroupedTableSection';
import { ProjectBulkActions } from '@/components/projects/ProjectBulkActions';
import { useTableViews, GroupByField } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkflowStageBadge } from '@/components/projects/WorkflowStageBadge';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ProjectStatus = 'lead' | 'proposal' | 'negotiation' | 'won' | 'active' | 'completed' | 'cancelled' | 'lost' | 'tender';

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
  client?: { name: string } | null;
  taskStats?: { total: number; completed: number };
}

interface Client {
  id: string;
  name: string;
}

interface ProjectsTableViewProps {
  projects: Project[];
  clients: Client[];
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

const DEFAULT_COLUMNS = [
  { id: 'select', label: '', visible: true, locked: true },
  { id: 'name', label: 'Όνομα', visible: true, locked: true },
  { id: 'client', label: 'Πελάτης', visible: true },
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
];

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'name' | 'status' | 'budget' | 'start_date' | 'progress';

export function ProjectsTableView({
  projects,
  clients,
  onEdit,
  onDelete,
  onInlineUpdate,
  canManage,
}: ProjectsTableViewProps) {
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
  } = useTableViews({ storageKey: 'projects_table', defaultColumns: DEFAULT_COLUMNS });

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIndex = useRef<number | null>(null);

  // Sort projects
  const sortedProjects = useMemo(() => {
    if (!sortField || !sortDirection) return projects;
    
    return [...projects].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'status':
          const statusOrder: Record<string, number> = { tender: 0, active: 1, completed: 2, cancelled: 3 };
          aVal = statusOrder[a.status] ?? 99;
          bVal = statusOrder[b.status] ?? 99;
          break;
        case 'budget':
          aVal = a.budget ?? 0;
          bVal = b.budget ?? 0;
          break;
        case 'start_date':
          aVal = a.start_date ? new Date(a.start_date).getTime() : Infinity;
          bVal = b.start_date ? new Date(b.start_date).getTime() : Infinity;
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
  }, [projects, sortField, sortDirection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        lastSelectedIndex.current = null;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && canManage) {
        e.preventDefault();
        setSelectedIds(new Set(sortedProjects.map(p => p.id)));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sortedProjects, canManage]);

  // Group projects
  const groupedProjects = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Όλα τα Έργα', projects: sortedProjects }];
    }

    const groups: Map<string, { label: string; projects: Project[]; badge?: React.ReactNode }> = new Map();

    sortedProjects.forEach(project => {
      let groupKey: string;
      let groupLabel: string;
      let badge: React.ReactNode = null;

      if (groupBy === 'status') {
        groupKey = project.status;
        const statusOption = STATUS_OPTIONS.find(s => s.value === project.status);
        groupLabel = statusOption?.label || project.status;
        badge = (
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ borderColor: statusOption?.color, color: statusOption?.color }}
          >
            {statusOption?.label}
          </Badge>
        );
      } else {
        groupKey = 'all';
        groupLabel = 'Όλα';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: groupLabel, projects: [], badge });
      }
      groups.get(groupKey)!.projects.push(project);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      projects: value.projects,
      badge: value.badge,
    }));
  }, [sortedProjects, groupBy]);

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

  const isColumnVisible = (columnId: string) => 
    columns.find(c => c.id === columnId)?.visible ?? true;

  const getColumnWidth = (columnId: string) => columnWidths[columnId];

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: c.name
  }));

  const visibleColumnCount = columns.filter(c => c.visible).length;

  const handleRowSelect = (projectId: string, index: number, e: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      
      if (e.shiftKey && lastSelectedIndex.current !== null) {
        // Range select
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        for (let i = start; i <= end; i++) {
          next.add(sortedProjects[i].id);
        }
      } else if (e.metaKey || e.ctrlKey) {
        // Toggle individual
        if (next.has(projectId)) next.delete(projectId);
        else next.add(projectId);
      } else {
        // Single select
        if (next.has(projectId) && next.size === 1) {
          next.delete(projectId);
        } else {
          next.clear();
          next.add(projectId);
        }
      }
      
      lastSelectedIndex.current = index;
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === sortedProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProjects.map(p => p.id)));
    }
  };

  // Export functions
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

  const renderProjectRow = (project: Project, flatIndex: number) => (
    <TableRow 
      key={project.id} 
      className={cn(
        "group hover:bg-muted/50 cursor-pointer",
        selectedIds.has(project.id) && "bg-primary/5"
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, [role="checkbox"], [data-inline-edit]')) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          handleRowSelect(project.id, flatIndex, e);
          return;
        }
        navigate(`/projects/${project.id}`);
      }}
    >
      {/* Checkbox */}
      {canManage && (
        <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
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
      )}

      {/* Name */}
      <TableCell className="font-medium" style={{ width: getColumnWidth('name') }}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
            onClick={() => navigate(`/projects/${project.id}`)}
            title="Άνοιγμα έργου"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
            <EnhancedInlineEditCell
              value={project.name}
              onSave={(val) => onInlineUpdate(project.id, 'name', val)}
              type="text"
              disabled={!canManage}
            />
          </div>
        </div>
      </TableCell>

      {/* Client */}
      {isColumnVisible('client') && (
        <TableCell style={{ width: getColumnWidth('client') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.client_id}
            onSave={(val) => onInlineUpdate(project.id, 'client_id', val)}
            type="select"
            options={clientOptions}
            displayValue={project.client?.name}
            placeholder="Κανένας"
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* Status */}
      {isColumnVisible('status') && (
        <TableCell style={{ width: getColumnWidth('status') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.status}
            onSave={(val) => onInlineUpdate(project.id, 'status', val)}
            type="select"
            options={STATUS_OPTIONS}
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* Progress */}
      {isColumnVisible('progress') && (
        <TableCell style={{ width: getColumnWidth('progress') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.progress ?? 0}
            onSave={(val) => onInlineUpdate(project.id, 'progress', val)}
            type="progress"
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* Budget */}
      {isColumnVisible('budget') && (
        <TableCell style={{ width: getColumnWidth('budget') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.budget}
            onSave={(val) => onInlineUpdate(project.id, 'budget', val)}
            type="number"
            displayValue={`€${project.budget?.toLocaleString('el-GR') || 0}`}
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* Agency Fee */}
      {isColumnVisible('agency_fee') && (
        <TableCell style={{ width: getColumnWidth('agency_fee') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.agency_fee_percentage}
            onSave={(val) => onInlineUpdate(project.id, 'agency_fee_percentage', val)}
            type="number"
            displayValue={`${project.agency_fee_percentage}%`}
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* Start Date */}
      {isColumnVisible('start_date') && (
        <TableCell style={{ width: getColumnWidth('start_date') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.start_date}
            onSave={(val) => onInlineUpdate(project.id, 'start_date', val)}
            type="date"
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* End Date */}
      {isColumnVisible('end_date') && (
        <TableCell style={{ width: getColumnWidth('end_date') }} onClick={(e) => e.stopPropagation()}>
          <EnhancedInlineEditCell
            value={project.end_date}
            onSave={(val) => onInlineUpdate(project.id, 'end_date', val)}
            type="date"
            disabled={!canManage}
          />
        </TableCell>
      )}

      {/* Tasks */}
      {isColumnVisible('tasks') && (
        <TableCell style={{ width: getColumnWidth('tasks') }}>
          {project.taskStats && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>{project.taskStats.completed}/{project.taskStats.total}</span>
            </div>
          )}
        </TableCell>
      )}

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {canManage && (
          <EditDeleteActions
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project.id)}
            itemName={project.name}
          />
        )}
      </TableCell>
    </TableRow>
  );

  // Build flat index for shift-select
  let flatIndex = 0;

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {canManage && (
        <ProjectBulkActions
          selectedIds={selectedIds}
          onClearSelection={() => { setSelectedIds(new Set()); lastSelectedIndex.current = null; }}
          onActionComplete={() => {}}
        />
      )}

      {/* Toolbar */}
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
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupOptions={GROUP_OPTIONS}
      />

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === sortedProjects.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <ResizableTableHeader 
                width={getColumnWidth('name')}
                onWidthChange={(w) => setColumnWidth('name', w)}
                minWidth={150}
                className="cursor-pointer select-none"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Όνομα {getSortIcon('name')}
                </div>
              </ResizableTableHeader>
              
              {isColumnVisible('client') && (
                <ResizableTableHeader 
                  width={getColumnWidth('client')}
                  onWidthChange={(w) => setColumnWidth('client', w)}
                  minWidth={100}
                >
                  Πελάτης
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
              
              {isColumnVisible('budget') && (
                <ResizableTableHeader 
                  width={getColumnWidth('budget')}
                  onWidthChange={(w) => setColumnWidth('budget', w)}
                  minWidth={100}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('budget')}
                >
                  <div className="flex items-center gap-1">
                    Προϋπολογισμός {getSortIcon('budget')}
                  </div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('agency_fee') && (
                <ResizableTableHeader 
                  width={getColumnWidth('agency_fee')}
                  onWidthChange={(w) => setColumnWidth('agency_fee', w)}
                  minWidth={80}
                >
                  Agency Fee
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('start_date') && (
                <ResizableTableHeader 
                  width={getColumnWidth('start_date')}
                  onWidthChange={(w) => setColumnWidth('start_date', w)}
                  minWidth={90}
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('start_date')}
                >
                  <div className="flex items-center gap-1">
                    Έναρξη {getSortIcon('start_date')}
                  </div>
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('end_date') && (
                <ResizableTableHeader 
                  width={getColumnWidth('end_date')}
                  onWidthChange={(w) => setColumnWidth('end_date', w)}
                  minWidth={90}
                >
                  Λήξη
                </ResizableTableHeader>
              )}
              
              {isColumnVisible('tasks') && (
                <ResizableTableHeader 
                  width={getColumnWidth('tasks')}
                  onWidthChange={(w) => setColumnWidth('tasks', w)}
                  minWidth={80}
                >
                  Tasks
                </ResizableTableHeader>
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
                const rows = group.projects.map((project, idx) => {
                  const row = renderProjectRow(project, startIdx + idx);
                  return row;
                });
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
