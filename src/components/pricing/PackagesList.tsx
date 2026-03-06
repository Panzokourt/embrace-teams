import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePackages, useServices, ServicePackage } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PackageFormDialog from './PackageFormDialog';

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

  const canManage = isAdmin || isManager;

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
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Νέο Πακέτο
          </Button>
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
        onOpenChange={setFormOpen}
        pkg={editing}
        services={services}
        onSaved={refetch}
      />
    </div>
  );
}
