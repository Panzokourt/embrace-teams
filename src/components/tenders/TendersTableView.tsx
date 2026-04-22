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
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { GroupedTableSection } from '@/components/shared/GroupedTableSection';
import { useTableViews, GroupByField } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const GROUP_OPTIONS = [
  { value: 'none' as GroupByField, label: 'Χωρίς ομαδοποίηση' },
  { value: 'status' as GroupByField, label: 'Στάδιο' },
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
  const layout = useTableViews({ storageKey: 'tenders_table', defaultColumns: DEFAULT_COLUMNS });
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
    orderedColumns,
    sensors,
    handleDragEnd,
    DndContext,
    SortableContext,
    horizontalListSortingStrategy,
    closestCenter,
  } = layout;

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

  // Group tenders
  const groupedTenders = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'Όλοι οι Διαγωνισμοί', tenders: sortedTenders }];
    }

    const groups: Map<string, { label: string; tenders: Tender[]; badge?: React.ReactNode }> = new Map();

    sortedTenders.forEach(tender => {
      let groupKey: string;
      let groupLabel: string;
      let badge: React.ReactNode = null;

      // For 'status' groupBy, we use the 'stage' field
      if (groupBy === 'status') {
        groupKey = tender.stage;
        const stageOption = STAGE_OPTIONS.find(s => s.value === tender.stage);
        groupLabel = stageOption?.label || tender.stage;
        badge = (
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ borderColor: stageOption?.color, color: stageOption?.color }}
          >
            {stageOption?.label}
          </Badge>
        );
      } else {
        groupKey = 'all';
        groupLabel = 'Όλοι';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: groupLabel, tenders: [], badge });
      }
      groups.get(groupKey)!.tenders.push(tender);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      tenders: value.tenders,
      badge: value.badge,
    }));
  }, [sortedTenders, groupBy]);

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

  const isColumnVisible = (columnId: string) => 
    columns.find(c => c.id === columnId)?.visible ?? true;

  const getColumnWidth = (columnId: string) => columnWidths[columnId];

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: c.name
  }));

  const visibleColumnCount = columns.filter(c => c.visible).length;

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

  // Header registry: each entry produces the right ResizableTableHeader content
  const HEADER_MIN_WIDTHS: Record<string, number> = {
    name: 150, client: 100, stage: 100, deadline: 100,
    days_left: 80, budget: 100, probability: 80, progress: 80, actions: 80,
  };
  const TENDER_DEFAULT_WIDTHS: Record<string, number> = {
    name: 280, client: 180, stage: 140, deadline: 140,
    days_left: 110, budget: 140, probability: 120, progress: 120, actions: 80,
  };
  const HEADER_SORT: Record<string, SortField | undefined> = {
    name: 'name', stage: 'stage', deadline: 'deadline',
    budget: 'budget', probability: 'probability',
  };
  const HEADER_LABELS: Record<string, string> = {
    name: 'Όνομα', client: 'Πελάτης', stage: 'Στάδιο',
    deadline: 'Προθεσμία', days_left: 'Ημέρες', budget: 'Προϋπολογισμός',
    probability: 'Πιθανότητα', progress: 'Πρόοδος', actions: 'Ενέργειες',
  };

  const renderHeaderCell = (colId: string) => {
    if (colId === 'actions') {
      return (
        <ResizableTableHeader
          key={colId}
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
    const sf = HEADER_SORT[colId];
    return (
      <ResizableTableHeader
        key={colId}
        columnId={colId}
        layout={layout}
        width={getColumnWidth(colId)}
        onWidthChange={(w) => setColumnWidth(colId, w)}
        minWidth={HEADER_MIN_WIDTHS[colId] ?? 80}
        className={cn(sf && 'cursor-pointer select-none')}
        onClick={sf ? () => toggleSort(sf) : undefined}
        sortField={sf}
        currentSortField={sortField}
        currentSortDirection={sortDirection}
        onSort={onMenuSort}
        onClearSort={onClearSort}
      >
        <div className="flex items-center gap-1">
          {HEADER_LABELS[colId]} {sf && getSortIcon(sf)}
        </div>
      </ResizableTableHeader>
    );
  };

  const renderCellForColumn = (colId: string, tender: Tender, deadlineInfo: ReturnType<typeof getDeadlineInfo>) => {
    switch (colId) {
      case 'name':
        return (
          <TableCell key="name" className="font-medium" style={{ width: getColumnWidth('name') }}>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(`/tenders/${tender.id}`)}
                title="Άνοιγμα διαγωνισμού"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <div onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
                <EnhancedInlineEditCell
                  value={tender.name}
                  onSave={(val) => onInlineUpdate(tender.id, 'name', val)}
                  type="text"
                  disabled={!canManage}
                />
              </div>
            </div>
          </TableCell>
        );
      case 'client':
        return (
          <TableCell key="client" style={{ width: getColumnWidth('client') }} onClick={(e) => e.stopPropagation()}>
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
        );
      case 'stage':
        return (
          <TableCell key="stage" style={{ width: getColumnWidth('stage') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell
              value={tender.stage}
              onSave={(val) => onInlineUpdate(tender.id, 'stage', val)}
              type="select"
              options={STAGE_OPTIONS}
              disabled={!canManage}
            />
          </TableCell>
        );
      case 'deadline':
        return (
          <TableCell key="deadline" style={{ width: getColumnWidth('deadline') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell
              value={tender.submission_deadline}
              onSave={(val) => onInlineUpdate(tender.id, 'submission_deadline', val)}
              type="date"
              disabled={!canManage}
            />
          </TableCell>
        );
      case 'days_left':
        return (
          <TableCell key="days_left" style={{ width: getColumnWidth('days_left') }}>
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
        );
      case 'budget':
        return (
          <TableCell key="budget" style={{ width: getColumnWidth('budget') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell
              value={tender.budget}
              onSave={(val) => onInlineUpdate(tender.id, 'budget', val)}
              type="number"
              displayValue={`€${tender.budget?.toLocaleString('el-GR') || 0}`}
              disabled={!canManage}
            />
          </TableCell>
        );
      case 'probability':
        return (
          <TableCell key="probability" style={{ width: getColumnWidth('probability') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell
              value={tender.probability ?? 50}
              onSave={(val) => onInlineUpdate(tender.id, 'probability', val)}
              type="progress"
              disabled={!canManage}
            />
          </TableCell>
        );
      case 'progress':
        return (
          <TableCell key="progress" style={{ width: getColumnWidth('progress') }} onClick={(e) => e.stopPropagation()}>
            <EnhancedInlineEditCell
              value={tender.progress ?? 0}
              onSave={(val) => onInlineUpdate(tender.id, 'progress', val)}
              type="progress"
              disabled={!canManage}
            />
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell key="actions" onClick={(e) => e.stopPropagation()}>
            {canManage && (
              <EditDeleteActions
                onEdit={() => onEdit(tender)}
                onDelete={() => onDelete(tender.id)}
                itemName={tender.name}
              />
            )}
          </TableCell>
        );
      default:
        return null;
    }
  };

  const visibleOrderedColumns = orderedColumns.filter(c => c.visible);

  const renderTenderRow = (tender: Tender) => {
    const deadlineInfo = getDeadlineInfo(tender.submission_deadline);
    return (
      <TableRow key={tender.id} className="group hover:bg-muted/50">
        {visibleOrderedColumns.map(c => renderCellForColumn(c.id, tender, deadlineInfo))}
      </TableRow>
    );
  };

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
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupOptions={GROUP_OPTIONS}
      />

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <SortableContext
                items={visibleOrderedColumns.map(c => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <TableRow>
                  {visibleOrderedColumns.map(c => renderHeaderCell(c.id))}
                </TableRow>
              </SortableContext>
            </TableHeader>
            <TableBody>
              {sortedTenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleOrderedColumns.length} className="text-center py-8 text-muted-foreground">
                    Δεν υπάρχουν διαγωνισμοί
                  </TableCell>
                </TableRow>
              ) : groupBy === 'none' ? (
                sortedTenders.map(tender => renderTenderRow(tender))
              ) : (
                groupedTenders.map(group => (
                  <GroupedTableSection
                    key={group.key}
                    groupKey={group.key}
                    groupLabel={group.label}
                    itemCount={group.tenders.length}
                    colSpan={visibleOrderedColumns.length}
                    badge={group.badge}
                  >
                    {group.tenders.map(tender => renderTenderRow(tender))}
                  </GroupedTableSection>
                ))
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}
