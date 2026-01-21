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
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { useTableViews } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';

type TenderStage = 'identification' | 'preparation' | 'submitted' | 'evaluation' | 'won' | 'lost';

interface Tender {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  stage: TenderStage;
  budget: number;
  submission_deadline: string | null;
  probability?: number | null;
  progress?: number | null;
  created_at: string;
  client?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

interface TendersTableViewProps {
  tenders: Tender[];
  clients: Client[];
  onEdit: (tender: Tender) => void;
  onDelete: (tenderId: string) => void;
  onInlineUpdate: (tenderId: string, field: string, value: string | number | null) => Promise<void>;
  canManage: boolean;
}

const STAGE_OPTIONS = [
  { value: 'identification', label: 'Εντοπισμός', color: 'hsl(var(--muted-foreground))' },
  { value: 'preparation', label: 'Προετοιμασία', color: 'hsl(var(--primary))' },
  { value: 'submitted', label: 'Υποβλήθηκε', color: 'hsl(var(--accent))' },
  { value: 'evaluation', label: 'Αξιολόγηση', color: 'hsl(var(--warning))' },
  { value: 'won', label: 'Κερδήθηκε', color: 'hsl(var(--success))' },
  { value: 'lost', label: 'Απορρίφθηκε', color: 'hsl(var(--destructive))' },
];

const DEFAULT_COLUMNS = [
  { id: 'name', label: 'Όνομα', visible: true, locked: true },
  { id: 'client', label: 'Πελάτης', visible: true },
  { id: 'stage', label: 'Στάδιο', visible: true },
  { id: 'deadline', label: 'Προθεσμία', visible: true },
  { id: 'days_left', label: 'Ημέρες', visible: true },
  { id: 'budget', label: 'Προϋπολογισμός', visible: true },
  { id: 'probability', label: 'Πιθανότητα', visible: false },
  { id: 'progress', label: 'Πρόοδος', visible: false },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'name' | 'stage' | 'deadline' | 'budget' | 'probability';

export function TendersTableView({
  tenders,
  clients,
  onEdit,
  onDelete,
  onInlineUpdate,
  canManage,
}: TendersTableViewProps) {
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
  } = useTableViews({ storageKey: 'tenders_table', defaultColumns: DEFAULT_COLUMNS });

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Sort tenders
  const sortedTenders = useMemo(() => {
    if (!sortField || !sortDirection) return tenders;
    
    return [...tenders].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'stage':
          const stageOrder = { identification: 0, preparation: 1, submitted: 2, evaluation: 3, won: 4, lost: 5 };
          aVal = stageOrder[a.stage];
          bVal = stageOrder[b.stage];
          break;
        case 'deadline':
          aVal = a.submission_deadline ? new Date(a.submission_deadline).getTime() : Infinity;
          bVal = b.submission_deadline ? new Date(b.submission_deadline).getTime() : Infinity;
          break;
        case 'budget':
          aVal = a.budget ?? 0;
          bVal = b.budget ?? 0;
          break;
        case 'probability':
          aVal = a.probability ?? 0;
          bVal = b.probability ?? 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tenders, sortField, sortDirection]);

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

  const getDeadlineInfo = (deadline: string | null) => {
    if (!deadline) return null;
    const date = parseISO(deadline);
    const daysLeft = differenceInDays(date, new Date());
    const isOverdue = isPast(date);
    
    return {
      formatted: format(date, 'd MMM yyyy', { locale: el }),
      daysLeft,
      isOverdue,
      isUrgent: daysLeft <= 7 && daysLeft >= 0,
    };
  };

  // Export functions
  const handleExportCSV = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'client', label: 'Πελάτης', format: (_: any, row: Tender) => row.client?.name || '-' },
      { key: 'stage', label: 'Στάδιο', format: (v: string) => STAGE_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'submission_deadline', label: 'Προθεσμία', format: formatters.date },
      { key: 'budget', label: 'Προϋπολογισμός', format: formatters.currency },
      { key: 'probability', label: 'Πιθανότητα', format: formatters.percentage },
    ];
    exportToCSV(tenders, exportColumns, `tenders_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  }, [tenders]);

  const handleExportExcel = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'client', label: 'Πελάτης', format: (_: any, row: Tender) => row.client?.name || '-' },
      { key: 'stage', label: 'Στάδιο', format: (v: string) => STAGE_OPTIONS.find(o => o.value === v)?.label || v },
      { key: 'submission_deadline', label: 'Προθεσμία', format: formatters.date },
      { key: 'budget', label: 'Προϋπολογισμός', format: formatters.currency },
      { key: 'probability', label: 'Πιθανότητα', format: formatters.percentage },
    ];
    exportToExcel(tenders, exportColumns, `tenders_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  }, [tenders]);

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
              
              {isColumnVisible('stage') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('stage')}
                >
                  <div className="flex items-center gap-1">
                    Στάδιο {getSortIcon('stage')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('deadline') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('deadline')}
                >
                  <div className="flex items-center gap-1">
                    Προθεσμία {getSortIcon('deadline')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('days_left') && <TableHead>Ημέρες</TableHead>}
              
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
              
              {isColumnVisible('probability') && (
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('probability')}
                >
                  <div className="flex items-center gap-1">
                    Πιθανότητα {getSortIcon('probability')}
                  </div>
                </TableHead>
              )}
              
              {isColumnVisible('progress') && <TableHead>Πρόοδος</TableHead>}
              <TableHead className="w-[80px]">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTenders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.filter(c => c.visible).length} className="text-center py-8 text-muted-foreground">
                  Δεν υπάρχουν διαγωνισμοί
                </TableCell>
              </TableRow>
            ) : (
              sortedTenders.map(tender => {
                const deadlineInfo = getDeadlineInfo(tender.submission_deadline);
                
                return (
                  <TableRow 
                    key={tender.id} 
                    className="group hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/tenders/${tender.id}`)}
                  >
                    {/* Name */}
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                      <EnhancedInlineEditCell
                        value={tender.name}
                        onSave={(val) => onInlineUpdate(tender.id, 'name', val)}
                        type="text"
                        disabled={!canManage}
                      />
                    </TableCell>

                    {/* Client */}
                    {isColumnVisible('client') && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EnhancedInlineEditCell
                          value={tender.client_id}
                          onSave={(val) => onInlineUpdate(tender.id, 'client_id', val)}
                          type="select"
                          options={clientOptions}
                          displayValue={tender.client?.name}
                          placeholder="Κανένας"
                          disabled={!canManage}
                        />
                      </TableCell>
                    )}

                    {/* Stage */}
                    {isColumnVisible('stage') && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EnhancedInlineEditCell
                          value={tender.stage}
                          onSave={(val) => onInlineUpdate(tender.id, 'stage', val)}
                          type="select"
                          options={STAGE_OPTIONS}
                          disabled={!canManage}
                        />
                      </TableCell>
                    )}

                    {/* Deadline */}
                    {isColumnVisible('deadline') && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EnhancedInlineEditCell
                          value={tender.submission_deadline}
                          onSave={(val) => onInlineUpdate(tender.id, 'submission_deadline', val)}
                          type="date"
                          disabled={!canManage}
                        />
                      </TableCell>
                    )}

                    {/* Days Left */}
                    {isColumnVisible('days_left') && (
                      <TableCell>
                        {deadlineInfo && (
                          <div className={cn(
                            "flex items-center gap-1 text-sm",
                            deadlineInfo.isOverdue && "text-destructive",
                            deadlineInfo.isUrgent && !deadlineInfo.isOverdue && "text-warning"
                          )}>
                            {deadlineInfo.isOverdue ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {deadlineInfo.isOverdue 
                              ? `${Math.abs(deadlineInfo.daysLeft)} μέρες πριν`
                              : `${deadlineInfo.daysLeft} μέρες`
                            }
                          </div>
                        )}
                      </TableCell>
                    )}

                    {/* Budget */}
                    {isColumnVisible('budget') && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EnhancedInlineEditCell
                          value={tender.budget}
                          onSave={(val) => onInlineUpdate(tender.id, 'budget', val)}
                          type="number"
                          displayValue={`€${tender.budget?.toLocaleString('el-GR') || 0}`}
                          disabled={!canManage}
                        />
                      </TableCell>
                    )}

                    {/* Probability */}
                    {isColumnVisible('probability') && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EnhancedInlineEditCell
                          value={tender.probability ?? 50}
                          onSave={(val) => onInlineUpdate(tender.id, 'probability', val)}
                          type="progress"
                          disabled={!canManage}
                        />
                      </TableCell>
                    )}

                    {/* Progress */}
                    {isColumnVisible('progress') && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <EnhancedInlineEditCell
                          value={tender.progress ?? 0}
                          onSave={(val) => onInlineUpdate(tender.id, 'progress', val)}
                          type="progress"
                          disabled={!canManage}
                        />
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <EditDeleteActions
                          onEdit={() => onEdit(tender)}
                          onDelete={() => onDelete(tender.id)}
                          itemName={tender.name}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
