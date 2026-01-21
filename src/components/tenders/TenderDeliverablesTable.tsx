import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { useTableViews } from '@/hooks/useTableViews';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  DollarSign,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type TenderDeliverable = Tables<'tender_deliverables'>;

interface TenderDeliverablesTableProps {
  tenderId: string;
  tenderName: string;
}

const DEFAULT_COLUMNS = [
  { id: 'select', label: 'Επιλογή', visible: true, locked: true },
  { id: 'name', label: 'Όνομα', visible: true, locked: true },
  { id: 'description', label: 'Περιγραφή', visible: true },
  { id: 'budget', label: 'Budget', visible: true },
  { id: 'due_date', label: 'Προθεσμία', visible: true },
  { id: 'completed', label: 'Ολοκληρώθηκε', visible: true },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

type SortField = 'name' | 'budget' | 'due_date' | 'completed';
type SortDirection = 'asc' | 'desc' | null;

export function TenderDeliverablesTable({ tenderId, tenderName }: TenderDeliverablesTableProps) {
  const { isAdmin, isManager } = useAuth();
  const [deliverables, setDeliverables] = useState<TenderDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<TenderDeliverable | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const {
    columns,
    setColumns,
    columnWidths,
    setColumnWidth,
    savedViews,
    currentViewId,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
  } = useTableViews({ storageKey: 'tender_deliverables_table', defaultColumns: DEFAULT_COLUMNS });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    due_date: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchDeliverables();
  }, [tenderId]);

  const fetchDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('tender_deliverables')
        .select('*')
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDeliverables(data || []);
    } catch (error) {
      console.error('Error fetching tender deliverables:', error);
      toast.error('Σφάλμα κατά τη φόρτωση παραδοτέων');
    } finally {
      setLoading(false);
    }
  };

  // Sorting
  const sortedDeliverables = useMemo(() => {
    if (!sortField || !sortDirection) return deliverables;
    
    return [...deliverables].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'budget':
          aVal = Number(a.budget) || 0;
          bVal = Number(b.budget) || 0;
          break;
        case 'due_date':
          aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          break;
        case 'completed':
          aVal = a.completed ? 1 : 0;
          bVal = b.completed ? 1 : 0;
          break;
        default:
          return 0;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const deliverableData = {
        name: formData.name,
        description: formData.description || null,
        tender_id: tenderId,
        budget: parseFloat(formData.budget) || 0,
        due_date: formData.due_date || null,
      };

      if (editingDeliverable) {
        const { data, error } = await supabase
          .from('tender_deliverables')
          .update(deliverableData)
          .eq('id', editingDeliverable.id)
          .select()
          .single();

        if (error) throw error;
        setDeliverables(prev => prev.map(d => d.id === editingDeliverable.id ? data : d));
        toast.success('Το παραδοτέο ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('tender_deliverables')
          .insert(deliverableData)
          .select()
          .single();

        if (error) throw error;
        setDeliverables(prev => [...prev, data]);
        toast.success('Το παραδοτέο δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving deliverable:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (deliverable: TenderDeliverable) => {
    setEditingDeliverable(deliverable);
    setFormData({
      name: deliverable.name,
      description: deliverable.description || '',
      budget: deliverable.budget?.toString() || '',
      due_date: deliverable.due_date || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (deliverableId: string) => {
    try {
      const { error } = await supabase
        .from('tender_deliverables')
        .delete()
        .eq('id', deliverableId);

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
      
      const { error } = await supabase
        .from('tender_deliverables')
        .update(updateData)
        .eq('id', deliverableId);

      if (error) throw error;
      
      setDeliverables(prev => prev.map(d => 
        d.id === deliverableId ? { ...d, ...updateData } : d
      ));
      toast.success('Ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const toggleCompleted = async (deliverable: TenderDeliverable) => {
    if (!canManage) return;
    try {
      const newValue = !deliverable.completed;
      const { error } = await supabase
        .from('tender_deliverables')
        .update({ completed: newValue })
        .eq('id', deliverable.id);

      if (error) throw error;
      
      setDeliverables(prev => prev.map(d => 
        d.id === deliverable.id ? { ...d, completed: newValue } : d
      ));
      toast.success(newValue ? 'Σημειώθηκε ως ολοκληρωμένο' : 'Σημειώθηκε ως εκκρεμές');
    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const resetForm = () => {
    setEditingDeliverable(null);
    setFormData({
      name: '',
      description: '',
      budget: '',
      due_date: '',
    });
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === deliverables.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(deliverables.map(d => d.id)));
    }
  };

  const isColumnVisible = (columnId: string) => 
    columns.find(c => c.id === columnId)?.visible ?? true;

  const getColumnWidth = (columnId: string) => columnWidths[columnId];

  // Export functions
  const handleExportCSV = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'description', label: 'Περιγραφή' },
      { key: 'budget', label: 'Budget', format: formatters.currency },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
      { key: 'completed', label: 'Ολοκληρώθηκε', format: (v: boolean) => v ? 'Ναι' : 'Όχι' },
    ];
    exportToCSV(deliverables, exportColumns, `tender_deliverables_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  }, [deliverables]);

  const handleExportExcel = useCallback(() => {
    const exportColumns = [
      { key: 'name', label: 'Όνομα' },
      { key: 'description', label: 'Περιγραφή' },
      { key: 'budget', label: 'Budget', format: formatters.currency },
      { key: 'due_date', label: 'Προθεσμία', format: formatters.date },
      { key: 'completed', label: 'Ολοκληρώθηκε', format: (v: boolean) => v ? 'Ναι' : 'Όχι' },
    ];
    exportToExcel(deliverables, exportColumns, `tender_deliverables_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  }, [deliverables]);

  const completedCount = deliverables.filter(d => d.completed).length;
  const progressPercentage = deliverables.length > 0 
    ? Math.round((completedCount / deliverables.length) * 100) 
    : 0;

  const totalBudget = deliverables.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
      <div className="flex items-center justify-between gap-4">
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
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Σύνολο Budget:</span>
            <span className="font-medium">€{totalBudget.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Table */}
      {deliverables.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Δεν υπάρχουν παραδοτέα</p>
          <p className="text-xs mt-1">Προσθέστε τα παραδοτέα που απαιτεί ο διαγωνισμός</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('select') && (
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedItems.size === deliverables.length && deliverables.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {isColumnVisible('name') && (
                  <ResizableTableHeader
                    width={getColumnWidth('name')}
                    onWidthChange={(w) => setColumnWidth('name', w)}
                  >
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Όνομα {getSortIcon('name')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('description') && (
                  <ResizableTableHeader
                    width={getColumnWidth('description')}
                    onWidthChange={(w) => setColumnWidth('description', w)}
                  >
                    Περιγραφή
                  </ResizableTableHeader>
                )}
                {isColumnVisible('budget') && (
                  <ResizableTableHeader
                    width={getColumnWidth('budget') || 120}
                    onWidthChange={(w) => setColumnWidth('budget', w)}
                  >
                    <button
                      onClick={() => toggleSort('budget')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Budget {getSortIcon('budget')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('due_date') && (
                  <ResizableTableHeader
                    width={getColumnWidth('due_date') || 120}
                    onWidthChange={(w) => setColumnWidth('due_date', w)}
                  >
                    <button
                      onClick={() => toggleSort('due_date')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Προθεσμία {getSortIcon('due_date')}
                    </button>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('completed') && (
                  <ResizableTableHeader
                    width={getColumnWidth('completed') || 100}
                    onWidthChange={(w) => setColumnWidth('completed', w)}
                  >
                    <button
                      onClick={() => toggleSort('completed')}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
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
              {sortedDeliverables.map(deliverable => (
                <TableRow 
                  key={deliverable.id} 
                  className={cn(
                    "group hover:bg-muted/50",
                    deliverable.completed && "opacity-60",
                    selectedItems.has(deliverable.id) && "bg-primary/5"
                  )}
                >
                  {isColumnVisible('select') && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(deliverable.id)}
                        onCheckedChange={() => toggleSelectItem(deliverable.id)}
                      />
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
                  {isColumnVisible('description') && (
                    <TableCell style={{ width: getColumnWidth('description') }}>
                      <EnhancedInlineEditCell
                        value={deliverable.description || ''}
                        onSave={(val) => handleInlineUpdate(deliverable.id, 'description', val as string || null)}
                        disabled={!canManage}
                        placeholder="-"
                        className="text-muted-foreground"
                      />
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
              ))}
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
              {editingDeliverable ? 'Ενημερώστε τα στοιχεία' : `Προσθήκη παραδοτέου στον διαγωνισμό "${tenderName}"`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Όνομα *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="π.χ. Σχεδιασμός UI"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Deadline</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Ακύρωση
              </Button>
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
