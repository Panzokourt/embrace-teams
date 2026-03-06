import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useProposals, Proposal } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Plus, Search, Loader2, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ProposalFormDialog from './ProposalFormDialog';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Όλες' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-accent text-accent-foreground',
  negotiation: 'bg-secondary text-secondary-foreground',
  won: 'bg-primary/15 text-primary border-primary/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
};

function MarginBadge({ pct }: { pct: number }) {
  if (pct >= 30) return <Badge className="bg-primary/15 text-primary border-primary/30"><TrendingUp className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</Badge>;
  if (pct >= 0) return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</Badge>;
  return <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />{pct.toFixed(1)}%</Badge>;
}

export default function ProposalsList() {
  const { isAdmin, isManager } = useAuth();
  const { proposals, loading, refetch } = useProposals();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);

  const canManage = isAdmin || isManager;

  const filtered = useMemo(() => {
    return proposals.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    });
  }, [proposals, search, statusFilter]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('proposals' as any).delete().eq('id', id);
    if (error) { toast.error('Σφάλμα διαγραφής'); return; }
    toast.success('Η προσφορά διαγράφηκε');
    refetch();
  };

  // Summary stats
  const stats = useMemo(() => {
    const won = proposals.filter(p => p.status === 'won');
    const total = proposals.length;
    const winRate = total > 0 ? (won.length / total) * 100 : 0;
    const totalValue = proposals.reduce((s, p) => s + (p.total_revenue || 0), 0);
    const wonValue = won.reduce((s, p) => s + (p.total_revenue || 0), 0);
    return { total, won: won.length, winRate, totalValue, wonValue };
  }, [proposals]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Σύνολο</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Won</p>
          <p className="text-xl font-bold text-primary">{stats.won}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <p className="text-xl font-bold">{stats.winRate.toFixed(0)}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Αξία Won</p>
          <p className="text-xl font-bold">€{stats.wonValue.toLocaleString('el-GR', { maximumFractionDigits: 0 })}</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση προσφοράς..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        {canManage && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Νέα Προσφορά
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-1">Δεν υπάρχουν προσφορές</h3>
            <p className="text-sm">Δημιουργήστε μια νέα προσφορά για πελάτη</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Προσφορά</TableHead>
                <TableHead>Πελάτης</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">v.</TableHead>
                <TableHead className="text-right">Αξία</TableHead>
                <TableHead className="text-right">Κόστος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Ημ/νία</TableHead>
                {canManage && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    {p.creator_name && <p className="text-xs text-muted-foreground">{p.creator_name}</p>}
                  </TableCell>
                  <TableCell>{p.client_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status] || ''} variant="outline">
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">v{p.version}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">€{(p.total_revenue || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right text-muted-foreground">€{(p.total_cost || 0).toLocaleString('el-GR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right"><MarginBadge pct={p.margin_pct || 0} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(p.created_at), 'dd MMM yy', { locale: el })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <EditDeleteActions
                        onEdit={() => { setEditing(p); setFormOpen(true); }}
                        onDelete={() => handleDelete(p.id)}
                        itemName="προσφορά"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ProposalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        proposal={editing}
        onSaved={refetch}
      />
    </div>
  );
}
