import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useServices, ServiceWithCosts } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Plus, Search, Copy, Archive, Loader2, TrendingUp, TrendingDown, Minus, FileUp } from 'lucide-react';
import ServiceForm from './ServiceForm';
import ServiceImportWizard from './ServiceImportWizard';

const CATEGORIES = [
  { value: 'all', label: 'Όλες' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'project', label: 'Project' },
  { value: 'addon', label: 'Add-on' },
  { value: 'media_fee', label: 'Media Fee' },
];

const PRICING_MODELS = [
  { value: 'all', label: 'Όλα' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'value_based', label: 'Value Based' },
];

const MARGIN_FILTERS = [
  { value: 'all', label: 'Όλα' },
  { value: 'healthy', label: '≥ Target' },
  { value: 'at_risk', label: '< Target' },
  { value: 'negative', label: 'Αρνητικό' },
];

function getMarginHealth(service: ServiceWithCosts): 'healthy' | 'at_risk' | 'negative' {
  if ((service.margin_pct || 0) < 0) return 'negative';
  if ((service.margin_pct || 0) >= (service.target_margin || 0)) return 'healthy';
  return 'at_risk';
}

function MarginBadge({ service }: { service: ServiceWithCosts }) {
  const health = getMarginHealth(service);
  const pct = (service.margin_pct || 0).toFixed(1);
  
  if (health === 'healthy') return <Badge className="bg-primary/15 text-primary border-primary/30"><TrendingUp className="h-3 w-3 mr-1" />{pct}%</Badge>;
  if (health === 'at_risk') return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />{pct}%</Badge>;
  return <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />{pct}%</Badge>;
}

export default function ServicesList() {
  const { isAdmin, isManager, company } = useAuth();
  const { services, loading, refetch } = useServices();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pricingFilter, setPricingFilter] = useState('all');
  const [marginFilter, setMarginFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithCosts | null>(null);
  
  const canManage = isAdmin || isManager;

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (!showArchived && s.archived_at) return false;
      if (showArchived && !s.archived_at) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (pricingFilter !== 'all' && (s as any).pricing_model !== pricingFilter) return false;
      if (marginFilter !== 'all') {
        const health = getMarginHealth(s);
        if (marginFilter !== health) return false;
      }
      return true;
    });
  }, [services, search, categoryFilter, pricingFilter, marginFilter, showArchived]);

  const handleDuplicate = async (service: ServiceWithCosts) => {
    if (!company?.id) return;
    const { id, role_costs, labor_cost, total_cost, margin_eur, margin_pct, created_at, updated_at, ...rest } = service;
    const { error } = await supabase.from('services').insert({
      ...rest,
      name: `${service.name} (αντίγραφο)`,
      company_id: company.id,
    } as any);
    if (error) { toast.error('Σφάλμα αντιγραφής'); return; }
    toast.success('Η υπηρεσία αντιγράφηκε');
    refetch();
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase.from('services').update({ is_active: false, archived_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error('Σφάλμα αρχειοθέτησης'); return; }
    toast.success('Η υπηρεσία αρχειοθετήθηκε');
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { toast.error('Σφάλμα διαγραφής'); return; }
    toast.success('Η υπηρεσία διαγράφηκε');
    refetch();
  };

  const handleEdit = (s: ServiceWithCosts) => {
    setEditingService(s);
    setFormOpen(true);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση υπηρεσίας..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Κατηγορία" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={pricingFilter} onValueChange={setPricingFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pricing" /></SelectTrigger>
          <SelectContent>{PRICING_MODELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={marginFilter} onValueChange={setMarginFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Margin" /></SelectTrigger>
          <SelectContent>{MARGIN_FILTERS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
          <Archive className="h-4 w-4 mr-1" />{showArchived ? 'Ενεργές' : 'Αρχείο'}
        </Button>
        {canManage && (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4 mr-2" />Import
            </Button>
            <Button onClick={() => { setEditingService(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Νέα Υπηρεσία
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {showArchived ? 'Δεν υπάρχουν αρχειοθετημένες υπηρεσίες.' : 'Δεν υπάρχουν υπηρεσίες. Δημιουργήστε την πρώτη!'}
        </CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Υπηρεσία</TableHead>
                <TableHead>Κατηγορία</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Τιμή</TableHead>
                <TableHead className="text-right">Κόστος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                {canManage && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pricing/services/${s.id}`)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground truncate max-w-[250px]">{s.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{s.category}</Badge>
                    {s.subcategory && <span className="text-xs text-muted-foreground ml-1">/ {s.subcategory}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{(s as any).pricing_model || 'fixed'}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">€{s.list_price.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-muted-foreground">€{(s.total_cost || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right"><MarginBadge service={s} /></TableCell>
                  {canManage && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(s)} title="Αντιγραφή">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <EditDeleteActions onEdit={() => handleEdit(s)} onDelete={() => handleDelete(s.id)} itemName="υπηρεσία" />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ServiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editingService}
        onSaved={refetch}
      />

      <ServiceImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refetch}
      />
    </div>
  );
}
