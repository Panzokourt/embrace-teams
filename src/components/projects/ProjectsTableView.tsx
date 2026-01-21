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
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { useTableViews } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';

type ProjectStatus = 'tender' | 'active' | 'completed' | 'cancelled';

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
  { value: 'tender', label: 'Διαγωνισμός', color: 'hsl(var(--muted-foreground))' },
  { value: 'active', label: 'Ενεργό', color: 'hsl(var(--primary))' },
  { value: 'completed', label: 'Ολοκληρωμένο', color: 'hsl(var(--success))' },
  { value: 'cancelled', label: 'Ακυρωμένο', color: 'hsl(var(--destructive))' },
];

const DEFAULT_COLUMNS = [
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
    savedViews,
    currentViewId,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
  } = useTableViews({ storageKey: 'projects_table', defaultColumns: DEFAULT_COLUMNS });

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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
          const statusOrder = { tender: 0, active: 1, completed: 2, cancelled: 3 };
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
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

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: c.name
  }));

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

  return (
    <div className="space-y-4">
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
      />

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Όνομα {getSortIcon('name')}
                </div>
              </TableHead>
              
              {isColumnVisible('client') && <TableHead>Πελάτης</TableHead>}
              
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
              
              {isColumnVisible('budget') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('budget')}
                >
                  <div className="flex items-center gap-1">
                    Προϋπολογισμός {getSortIcon('budget')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('agency_fee') && <TableHead>Agency Fee</TableHead>}
              
              {isColumnVisible('start_date') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('start_date')}
                >
                  <div className="flex items-center gap-1">
                    Έναρξη {getSortIcon('start_date')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('end_date') && <TableHead>Λήξη</TableHead>}
              {isColumnVisible('tasks') && <TableHead>Tasks</TableHead>}
              <TableHead className="w-[80px]">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.filter(c => c.visible).length} className="text-center py-8 text-muted-foreground">
                  Δεν υπάρχουν έργα
                </TableCell>
              </TableRow>
            ) : (
              sortedProjects.map(project => (
                <TableRow 
                  key={project.id} 
                  className="group hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Name */}
                  <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                    <EnhancedInlineEditCell
                      value={project.name}
                      onSave={(val) => onInlineUpdate(project.id, 'name', val)}
                      type="text"
                      disabled={!canManage}
                    />
                  </TableCell>

                  {/* Client */}
                  {isColumnVisible('client') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
