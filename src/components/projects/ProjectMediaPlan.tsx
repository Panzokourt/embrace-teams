import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Plus, 
  Loader2,
  Sparkles,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Download,
  FileSpreadsheet,
  Link2,
  Unlink
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MediaPlanItem {
  id: string;
  project_id: string;
  deliverable_id: string | null;
  task_id: string | null;
  invoice_id: string | null;
  medium: string;
  placement: string | null;
  campaign_name: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  actual_cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  target_audience: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Deliverable {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
}

interface ProjectMediaPlanProps {
  projectId: string;
  projectName: string;
  projectBudget: number;
  deliverables: Deliverable[];
}

const MEDIA_TYPES = [
  'Facebook',
  'Instagram',
  'Google Ads',
  'LinkedIn',
  'Twitter/X',
  'TikTok',
  'YouTube',
  'TV',
  'Radio',
  'Print',
  'OOH (Out of Home)',
  'Programmatic',
  'Email Marketing',
  'Influencer',
  'Άλλο'
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Προγραμματισμένο', color: 'bg-muted text-muted-foreground' },
  { value: 'active', label: 'Ενεργό', color: 'bg-success/10 text-success border-success/20' },
  { value: 'completed', label: 'Ολοκληρώθηκε', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'cancelled', label: 'Ακυρώθηκε', color: 'bg-destructive/10 text-destructive border-destructive/20' },
];

type ViewMode = 'table' | 'timeline' | 'grid';

export function ProjectMediaPlan({ projectId, projectName, projectBudget, deliverables }: ProjectMediaPlanProps) {
  const { isAdmin, isManager } = useAuth();
  const [items, setItems] = useState<MediaPlanItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Dialog & form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaPlanItem | null>(null);
  
  // Filters & view
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterMedium, setFilterMedium] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Link dialogs
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState<'task' | 'invoice' | null>(null);
  const [linkingItem, setLinkingItem] = useState<MediaPlanItem | null>(null);

  const [form, setForm] = useState({
    medium: '',
    placement: '',
    campaign_name: '',
    start_date: '',
    end_date: '',
    budget: '',
    actual_cost: '',
    impressions: '',
    clicks: '',
    target_audience: '',
    notes: '',
    status: 'planned',
    deliverable_id: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [itemsRes, tasksRes, invoicesRes] = await Promise.all([
        supabase.from('media_plan_items').select('*').eq('project_id', projectId).order('start_date', { ascending: true }),
        supabase.from('tasks').select('id, title').eq('project_id', projectId),
        supabase.from('invoices').select('id, invoice_number, amount').eq('project_id', projectId),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      setItems(itemsRes.data || []);
      setTasks(tasksRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error fetching media plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterMedium !== 'all' && item.medium !== filterMedium) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.medium.toLowerCase().includes(query) ||
          item.campaign_name?.toLowerCase().includes(query) ||
          item.placement?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [items, filterMedium, filterStatus, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredItems.reduce((acc, item) => ({
      budget: acc.budget + Number(item.budget),
      actualCost: acc.actualCost + Number(item.actual_cost),
      impressions: acc.impressions + (item.impressions || 0),
      clicks: acc.clicks + (item.clicks || 0),
    }), { budget: 0, actualCost: 0, impressions: 0, clicks: 0 });
  }, [filteredItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const itemData = {
        project_id: projectId,
        medium: form.medium,
        placement: form.placement || null,
        campaign_name: form.campaign_name || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: parseFloat(form.budget) || 0,
        actual_cost: parseFloat(form.actual_cost) || 0,
        impressions: parseInt(form.impressions) || 0,
        clicks: parseInt(form.clicks) || 0,
        target_audience: form.target_audience || null,
        notes: form.notes || null,
        status: form.status,
        deliverable_id: form.deliverable_id || null,
      };

      if (editingItem) {
        const { data, error } = await supabase
          .from('media_plan_items')
          .update(itemData)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
        toast.success('Το στοιχείο ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('media_plan_items')
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;
        setItems(prev => [...prev, data]);
        toast.success('Το στοιχείο δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving media plan item:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('media_plan_items').delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Το στοιχείο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleEdit = (item: MediaPlanItem) => {
    setEditingItem(item);
    setForm({
      medium: item.medium,
      placement: item.placement || '',
      campaign_name: item.campaign_name || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      budget: item.budget.toString(),
      actual_cost: item.actual_cost.toString(),
      impressions: item.impressions.toString(),
      clicks: item.clicks.toString(),
      target_audience: item.target_audience || '',
      notes: item.notes || '',
      status: item.status,
      deliverable_id: item.deliverable_id || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      medium: '',
      placement: '',
      campaign_name: '',
      start_date: '',
      end_date: '',
      budget: '',
      actual_cost: '',
      impressions: '',
      clicks: '',
      target_audience: '',
      notes: '',
      status: 'planned',
      deliverable_id: '',
    });
  };

  // AI Generation
  const handleAIGenerate = async () => {
    if (deliverables.length === 0) {
      toast.error('Πρέπει πρώτα να υπάρχουν παραδοτέα');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-media-plan', {
        body: {
          projectId,
          projectName,
          projectBudget,
          deliverables: deliverables.map(d => ({ id: d.id, name: d.name })),
        },
      });

      if (error) throw error;

      if (data?.mediaPlanItems && Array.isArray(data.mediaPlanItems)) {
        // Insert AI-generated items
        const newItems = data.mediaPlanItems.map((item: any) => ({
          project_id: projectId,
          medium: item.medium || 'Άλλο',
          placement: item.placement || null,
          campaign_name: item.campaign_name || null,
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          budget: item.budget || 0,
          target_audience: item.target_audience || null,
          notes: item.notes || null,
          status: 'planned',
          deliverable_id: item.deliverable_id || null,
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('media_plan_items')
          .insert(newItems)
          .select();

        if (insertError) throw insertError;

        setItems(prev => [...prev, ...(insertedData || [])]);
        toast.success(`${insertedData?.length || 0} στοιχεία δημιουργήθηκαν με AI!`);
      }
    } catch (error) {
      console.error('Error generating media plan:', error);
      toast.error('Σφάλμα κατά τη δημιουργία με AI');
    } finally {
      setGenerating(false);
    }
  };

  // Link to task/invoice
  const handleLink = async (type: 'task' | 'invoice', id: string) => {
    if (!linkingItem) return;

    try {
      const updateData = type === 'task' 
        ? { task_id: id } 
        : { invoice_id: id };

      const { data, error } = await supabase
        .from('media_plan_items')
        .update(updateData)
        .eq('id', linkingItem.id)
        .select()
        .single();

      if (error) throw error;

      setItems(prev => prev.map(i => i.id === linkingItem.id ? data : i));
      toast.success(`Συνδέθηκε με ${type === 'task' ? 'task' : 'τιμολόγιο'}!`);
      setLinkDialogOpen(false);
      setLinkingItem(null);
    } catch (error) {
      console.error('Error linking:', error);
      toast.error('Σφάλμα κατά τη σύνδεση');
    }
  };

  const handleUnlink = async (item: MediaPlanItem, type: 'task' | 'invoice') => {
    try {
      const updateData = type === 'task' 
        ? { task_id: null } 
        : { invoice_id: null };

      const { data, error } = await supabase
        .from('media_plan_items')
        .update(updateData)
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;

      setItems(prev => prev.map(i => i.id === item.id ? data : i));
      toast.success('Αποσυνδέθηκε!');
    } catch (error) {
      console.error('Error unlinking:', error);
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['Μέσο', 'Καμπάνια', 'Placement', 'Έναρξη', 'Λήξη', 'Budget', 'Κόστος', 'Impressions', 'Clicks', 'CTR', 'CPM', 'Status'];
    const rows = filteredItems.map(item => [
      item.medium,
      item.campaign_name || '',
      item.placement || '',
      item.start_date || '',
      item.end_date || '',
      item.budget,
      item.actual_cost,
      item.impressions,
      item.clicks,
      item.ctr?.toFixed(2) || '0',
      item.cpm?.toFixed(2) || '0',
      item.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `media_plan_${projectName.replace(/\s+/g, '_')}.csv`;
    link.click();
    toast.success('Το αρχείο εξήχθη!');
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge variant="outline" className={opt?.color}>{opt?.label || status}</Badge>;
  };

  const formatCurrency = (value: number) => `€${value.toLocaleString('el-GR')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <Input
            placeholder="Αναζήτηση..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-48"
          />
          
          {/* Filter by medium */}
          <Select value={filterMedium} onValueChange={setFilterMedium}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Μέσο" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλα τα μέσα</SelectItem>
              {MEDIA_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter by status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλα τα status</SelectItem>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Export */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          {/* AI Generate */}
          {canManage && (
            <Button variant="outline" onClick={handleAIGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI Δημιουργία
            </Button>
          )}

          {/* Add new */}
          {canManage && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Προσθήκη
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="text-xl font-bold">{formatCurrency(totals.budget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Πραγματικό Κόστος</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totals.actualCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Impressions</p>
            <p className="text-xl font-bold">{totals.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Clicks</p>
            <p className="text-xl font-bold">{totals.clicks.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Content based on view mode */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Δεν υπάρχουν στοιχεία στο Media Plan</p>
            {canManage && (
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" onClick={handleAIGenerate} disabled={generating}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Δημιουργία με AI
                </Button>
                <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Προσθήκη χειροκίνητα
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Μέσο</TableHead>
                    <TableHead>Καμπάνια / Placement</TableHead>
                    <TableHead>Περίοδος</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Κόστος</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Links</TableHead>
                    {canManage && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medium}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.campaign_name || '-'}</p>
                          {item.placement && (
                            <p className="text-sm text-muted-foreground">{item.placement}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.start_date && item.end_date ? (
                          <span className="text-sm">
                            {format(parseISO(item.start_date), 'd/M', { locale: el })} - {format(parseISO(item.end_date), 'd/M', { locale: el })}
                          </span>
                        ) : item.start_date ? (
                          format(parseISO(item.start_date), 'd MMM', { locale: el })
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.budget)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(item.actual_cost)}</TableCell>
                      <TableCell className="text-right">{item.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.ctr?.toFixed(2)}%</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          {item.task_id ? (
                            <Badge variant="secondary" className="cursor-pointer" onClick={() => handleUnlink(item, 'task')}>
                              <Unlink className="h-3 w-3 mr-1" />Task
                            </Badge>
                          ) : canManage && (
                            <Button variant="ghost" size="sm" onClick={() => { setLinkingItem(item); setLinkType('task'); setLinkDialogOpen(true); }}>
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                          {item.invoice_id ? (
                            <Badge variant="secondary" className="cursor-pointer" onClick={() => handleUnlink(item, 'invoice')}>
                              <Unlink className="h-3 w-3 mr-1" />Inv
                            </Badge>
                          ) : canManage && (
                            <Button variant="ghost" size="sm" onClick={() => { setLinkingItem(item); setLinkType('invoice'); setLinkDialogOpen(true); }}>
                              <Link2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <EditDeleteActions
                            onEdit={() => handleEdit(item)}
                            onDelete={() => handleDelete(item.id)}
                            itemName={item.medium}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{item.medium}</CardTitle>
                    <CardDescription>{item.campaign_name || item.placement || 'Χωρίς περιγραφή'}</CardDescription>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-medium">{formatCurrency(item.budget)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Κόστος</p>
                    <p className="font-medium text-destructive">{formatCurrency(item.actual_cost)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Impressions</p>
                    <p className="font-medium">{item.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clicks</p>
                    <p className="font-medium">{item.clicks.toLocaleString()}</p>
                  </div>
                </div>
                {item.start_date && (
                  <div className="text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {format(parseISO(item.start_date), 'd MMM', { locale: el })}
                    {item.end_date && ` - ${format(parseISO(item.end_date), 'd MMM', { locale: el })}`}
                  </div>
                )}
                {canManage && (
                  <div className="flex justify-end pt-2">
                    <EditDeleteActions
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                      itemName={item.medium}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Επεξεργασία' : 'Νέο Στοιχείο Media Plan'}</DialogTitle>
            <DialogDescription>
              Συμπληρώστε τα στοιχεία για το media placement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medium">Μέσο *</Label>
                <Select value={form.medium} onValueChange={v => setForm(p => ({ ...p, medium: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε μέσο" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign_name">Καμπάνια</Label>
                <Input
                  id="campaign_name"
                  value={form.campaign_name}
                  onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))}
                  placeholder="π.χ. Summer Campaign 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placement">Placement</Label>
                <Input
                  id="placement"
                  value={form.placement}
                  onChange={e => setForm(p => ({ ...p, placement: e.target.value }))}
                  placeholder="π.χ. Feed, Stories, Banner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Ημ/νία Έναρξης</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Ημ/νία Λήξης</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (€)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={form.budget}
                  onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual_cost">Πραγματικό Κόστος (€)</Label>
                <Input
                  id="actual_cost"
                  type="number"
                  step="0.01"
                  value={form.actual_cost}
                  onChange={e => setForm(p => ({ ...p, actual_cost: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="impressions">Impressions</Label>
                <Input
                  id="impressions"
                  type="number"
                  value={form.impressions}
                  onChange={e => setForm(p => ({ ...p, impressions: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicks">Clicks</Label>
                <Input
                  id="clicks"
                  type="number"
                  value={form.clicks}
                  onChange={e => setForm(p => ({ ...p, clicks: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={form.target_audience}
                onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
                placeholder="π.χ. Γυναίκες 25-45, ενδιαφέρον για μόδα"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable_id">Συσχέτιση με Παραδοτέο</Label>
              <Select value={form.deliverable_id || 'none'} onValueChange={v => setForm(p => ({ ...p, deliverable_id: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε παραδοτέο (προαιρετικά)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένα</SelectItem>
                  {deliverables.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Σημειώσεις</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Επιπλέον πληροφορίες..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={saving || !form.medium}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Ενημέρωση' : 'Δημιουργία'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Σύνδεση με {linkType === 'task' ? 'Task' : 'Τιμολόγιο'}</DialogTitle>
            <DialogDescription>
              Επιλέξτε {linkType === 'task' ? 'ένα task' : 'ένα τιμολόγιο'} για σύνδεση
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {linkType === 'task' ? (
              tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Δεν υπάρχουν tasks</p>
              ) : (
                tasks.map(task => (
                  <Button
                    key={task.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleLink('task', task.id)}
                  >
                    {task.title}
                  </Button>
                ))
              )
            ) : (
              invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Δεν υπάρχουν τιμολόγια</p>
              ) : (
                invoices.map(inv => (
                  <Button
                    key={inv.id}
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => handleLink('invoice', inv.id)}
                  >
                    <span>{inv.invoice_number}</span>
                    <span className="text-muted-foreground">€{inv.amount.toLocaleString()}</span>
                  </Button>
                ))
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
