import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

interface Contract {
  id: string;
  contract_number: string | null;
  contract_type: string | null;
  billing_frequency: string | null;
  payment_terms: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  file_path: string | null;
  project_id: string;
  project?: { name: string; client_id: string | null; client?: { name: string } | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/10 text-emerald-500',
  ended: 'bg-destructive/10 text-destructive',
  renewed: 'bg-foreground/10 text-foreground',
};

const PAGE_SIZE = 25;

export default function ContractsList() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const pagination = usePagination(PAGE_SIZE);

  useEffect(() => { fetchContracts(); }, []);

  const fetchContracts = async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, project:projects(name, client_id, client:clients(name))')
      .order('created_at', { ascending: false });
    if (!error) setContracts(data || []);
    setLoading(false);
  };

  const filtered = contracts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.contract_number || '').toLowerCase().includes(s) ||
        (c.project?.name || '').toLowerCase().includes(s) ||
        (c.project?.client?.name || '').toLowerCase().includes(s);
    }
    return true;
  });

  // Sync pagination count when filter changes
  if (pagination.totalCount !== filtered.length) {
    pagination.setTotalCount(filtered.length);
    pagination.reset();
  }

  const pagedContracts = filtered.slice(pagination.from, pagination.to + 1);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση..." value={search} onChange={e => { setSearch(e.target.value); pagination.reset(); }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); pagination.reset(); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="renewed">Renewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Δεν βρέθηκαν συμβάσεις</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Σύμβαση</TableHead>
                <TableHead>Πελάτης</TableHead>
                <TableHead>Τύπος</TableHead>
                <TableHead>Περίοδος</TableHead>
                <TableHead className="text-right">Ποσό</TableHead>
                <TableHead>Πληρωμή</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedContracts.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${c.project_id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{c.contract_number || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{c.project?.client?.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{c.contract_type || '—'}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {c.start_date ? format(new Date(c.start_date), 'dd/MM/yy') : '—'}
                    {' → '}
                    {c.end_date ? format(new Date(c.end_date), 'dd/MM/yy') : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {c.total_amount ? `€${Number(c.total_amount).toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">{c.payment_terms || c.billing_frequency || '—'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[c.status || 'draft'] || ''}>{c.status || 'draft'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4">
            <PaginationControls pagination={pagination} />
          </div>
        </Card>
      )}
    </div>
  );
}
