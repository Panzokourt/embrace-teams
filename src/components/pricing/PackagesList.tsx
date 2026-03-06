import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePackages, useServices, ServicePackage, ServiceWithCosts } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Package, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import PackageFormDialog from './PackageFormDialog';

export interface AIPackageSuggestion {
  package_name: string;
  description: string;
  list_price: number;
  discount_percent: number;
  items: { service_id: string; quantity: number; duration_months: number; rationale: string }[];
}

function formatDuration(type: string, value: number): string {
  const labels: Record<string, string> = {
    fixed_days: `${value} ημέρες`,
    monthly: value === 1 ? 'Μηνιαίο' : `${value} μήνες`,
    quarterly: '3μηνο',
    semi_annual: '6μηνο',
    annual: 'Ετήσιο',
    custom_months: `${value} μήνες`,
  };
  return labels[type] || `${value} μήνες`;
}

function MarginBadge({ pct }: { pct: number }) {
  if (pct >= 40) return <Badge className="bg-primary/15 text-primary border-primary/30"><TrendingUp className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</Badge>;
  if (pct >= 0) return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</Badge>;
  return <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</Badge>;
}

export default function PackagesList() {
  const { isAdmin, isManager } = useAuth();
  const { packages, loading, refetch } = usePackages();
  const { services } = useServices();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInitialData, setAiInitialData] = useState<AIPackageSuggestion | null>(null);

  const canManage = isAdmin || isManager;

  const handleAISuggest = async () => {
    const activeServices = services.filter(s => s.is_active && !s.archived_at);
    if (activeServices.length === 0) {
      toast.error('Δεν υπάρχουν ενεργές υπηρεσίες για ανάλυση');
      return;
    }
    setAiLoading(true);
    try {
      const payload = activeServices.map(s => ({
        id: s.id, name: s.name, category: s.category,
        list_price: s.list_price, total_cost: s.total_cost || 0,
        margin_pct: s.margin_pct || 0,
      }));
      const { data, error } = await supabase.functions.invoke('suggest-package', {
        body: { services: payload, prompt: aiPrompt || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const suggestion = data.suggestion as AIPackageSuggestion;
      setAiInitialData(suggestion);
      setAiDialogOpen(false);
      setAiPrompt('');
      setEditing(null);
      setFormOpen(true);
      toast.success('AI πρόταση πακέτου έτοιμη!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Σφάλμα AI πρότασης');
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return packages;
    return packages.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [packages, search]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('service_packages' as any).delete().eq('id', id);
    if (error) { toast.error('Σφάλμα διαγραφής'); return; }
    toast.success('Το πακέτο διαγράφηκε');
    refetch();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση πακέτου..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />AI Πρόταση
            </Button>
            <Button onClick={() => { setEditing(null); setAiInitialData(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Νέο Πακέτο
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-1">Δεν υπάρχουν πακέτα</h3>
            <p className="text-sm">Δημιουργήστε πακέτα υπηρεσιών με bundle pricing</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Πακέτο</TableHead>
                <TableHead className="text-center">Υπηρεσίες</TableHead>
                <TableHead>Διάρκεια</TableHead>
                <TableHead className="text-right">Τιμή</TableHead>
                <TableHead className="text-right">Έκπτωση</TableHead>
                <TableHead className="text-right">Τελική</TableHead>
                <TableHead className="text-right">Κόστος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                {canManage && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(pkg => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pkg.name}</p>
                      {pkg.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{pkg.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{pkg.items?.length || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDuration(pkg.duration_type, pkg.duration_value)}</span>
                  </TableCell>
                  <TableCell className="text-right">€{pkg.list_price.toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{pkg.discount_percent > 0 ? `${pkg.discount_percent}%` : '—'}</TableCell>
                  <TableCell className="text-right font-medium">€{(pkg.final_price || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-muted-foreground">€{(pkg.internal_cost || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right"><MarginBadge pct={pkg.margin_pct || 0} /></TableCell>
                  {canManage && (
                    <TableCell>
                      <EditDeleteActions
                        onEdit={() => { setEditing(pkg); setFormOpen(true); }}
                        onDelete={() => handleDelete(pkg.id)}
                        itemName="πακέτο"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <PackageFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setAiInitialData(null); }}
        pkg={editing}
        services={services}
        onSaved={refetch}
        aiSuggestion={aiInitialData}
      />

      {/* AI Prompt Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Πρόταση Πακέτου
            </DialogTitle>
            <DialogDescription>
              Περιγράψτε τι τύπο πακέτου θέλετε (προαιρετικό)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="π.χ. Digital marketing πακέτο για μικρή επιχείρηση..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleAISuggest} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Δημιουργία με AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
