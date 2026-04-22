import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ColumnVisibilityToggle, ColumnConfig } from './ColumnVisibilityToggle';
import { SavedView, GroupByField } from '@/hooks/useTableViews';
import { 
  Download, 
  Save, 
  RotateCcw, 
  ChevronDown,
  Bookmark,
  Trash2,
  FileSpreadsheet,
  FileText,
  Layers,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface GroupOption {
  value: GroupByField;
  label: string;
}

const DEFAULT_GROUP_OPTIONS: GroupOption[] = [
  { value: 'none', label: 'Χωρίς ομαδοποίηση' },
  { value: 'status', label: 'Κατάσταση' },
  { value: 'assignee', label: 'Υπεύθυνος' },
  { value: 'project', label: 'Έργο' },
  { value: 'priority', label: 'Προτεραιότητα' },
];

interface TableToolbarProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  savedViews: SavedView[];
  currentViewId: string | null;
  onSaveView: (name: string) => void;
  onLoadView: (viewId: string) => void;
  onDeleteView: (viewId: string) => void;
  onResetToDefault: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  selectedCount?: number;
  onBulkAction?: (action: string, value?: any) => void;
  bulkActions?: { id: string; label: string; icon?: React.ReactNode }[];
  // Grouping props
  groupBy?: GroupByField;
  onGroupByChange?: (groupBy: GroupByField) => void;
  groupOptions?: GroupOption[];
  /** Optional extra actions rendered at the end of the toolbar (e.g. horizontal scroll buttons). */
  extraActions?: React.ReactNode;
}

export function TableToolbar({
  columns,
  onColumnsChange,
  savedViews,
  currentViewId,
  onSaveView,
  onLoadView,
  onDeleteView,
  onResetToDefault,
  onExportCSV,
  onExportExcel,
  selectedCount = 0,
  onBulkAction,
  bulkActions = [],
  groupBy = 'none',
  onGroupByChange,
  groupOptions = DEFAULT_GROUP_OPTIONS,
  extraActions,
}: TableToolbarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const handleSaveView = () => {
    if (!viewName.trim()) {
      toast.error('Εισάγετε όνομα για την προβολή');
      return;
    }
    onSaveView(viewName.trim());
    setViewName('');
    setSaveDialogOpen(false);
    toast.success('Η προβολή αποθηκεύτηκε!');
  };

  const currentView = savedViews.find(v => v.id === currentViewId);
  const currentGroupOption = groupOptions.find(g => g.value === groupBy);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Saved Views Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            {currentView ? currentView.name : 'Προβολές'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => onResetToDefault()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Προεπιλογή
          </DropdownMenuItem>
          {savedViews.length > 0 && <DropdownMenuSeparator />}
          {savedViews.map(view => (
            <DropdownMenuItem 
              key={view.id} 
              className="flex items-center justify-between"
              onClick={() => onLoadView(view.id)}
            >
              <span className={currentViewId === view.id ? 'font-medium' : ''}>
                {view.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteView(view.id);
                  toast.success('Η προβολή διαγράφηκε');
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Αποθήκευση τρέχουσας
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Grouping Dropdown */}
      {onGroupByChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Layers className="h-4 w-4" />
              {currentGroupOption?.label || 'Ομαδοποίηση'}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Ομαδοποίηση κατά
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByField)}>
              {groupOptions.map(option => (
                <DropdownMenuRadioItem 
                  key={option.value} 
                  value={option.value}
                  className="gap-2"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Column Visibility */}
      <ColumnVisibilityToggle
        columns={columns}
        onColumnsChange={onColumnsChange}
      />

      {/* Export Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Εξαγωγή
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Εξαγωγή CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Εξαγωγή Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Extra actions (e.g. horizontal scroll buttons) */}
      {extraActions}

      {/* Bulk Actions (shown when items selected) */}
      {selectedCount > 0 && onBulkAction && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 ml-4 pl-4 border-l">
          <span className="text-sm text-muted-foreground">
            {selectedCount} επιλεγμένα
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Μαζικές Ενέργειες
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {bulkActions.map(action => (
                <DropdownMenuItem 
                  key={action.id}
                  onClick={() => onBulkAction(action.id)}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Αποθήκευση Προβολής</DialogTitle>
            <DialogDescription>
              Αποθηκεύστε τη τρέχουσα διάταξη στηλών και ομαδοποίηση
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Όνομα προβολής"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleSaveView}>Αποθήκευση</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
