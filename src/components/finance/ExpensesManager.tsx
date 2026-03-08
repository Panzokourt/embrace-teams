import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Plus, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const EXPENSE_TYPES = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'media', label: 'Media' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'subscription', label: 'Subscription' },
];

const CATEGORIES = ['Υπηρεσίες', 'Υλικά', 'Ταξίδια', 'Software', 'Marketing', 'Media', 'Γραφείο', 'Άλλο'];

const APPROVAL_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  paid: 'bg-primary/10 text-primary',
};

const PAGE_SIZE = 25;

export default function ExpensesManager() {
  const { isAdmin, isManager } = useAuth();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const pagination = usePagination(PAGE_SIZE);

  const [form, setForm] = useState({
    description: '', project_id: '', client_id: '', amount: '',
    expense_date: new Date().toISOString().split('T')[0], category: '',
    vendor_name: '', expense_type: 'vendor', approval_status: 'draft', notes: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [exp, proj, cli] = await Promise.all([
      supabase.from('expenses').select('*, project:projects(name), client:clients(name)').order('expense_date', { ascending: false }),
      supabase.from('projects').select('id, name'),
      supabase.from('clients').select('id, name'),
    ]);
    setExpenses(exp.data || []);
    setProjects(proj.data || []);
    setClients(cli.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ description: '', project_id: '', client_id: '', amount: '', expense_date: new Date().toISOString().split('T')[0], category: '', vendor_name: '', expense_type: 'vendor', approval_status: 'draft', notes: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        expense_date: form.expense_date,
        category: form.category || null,
        vendor_name: form.vendor_name || null,
        expense_type: form.expense_type,
        approval_status: form.approval_status,
        notes: form.notes || null,
        project_id: form.project_id || null,
        client_id: form.client_id || null,
      };

      if (editing) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Έξοδο ενημερώθηκε');
        logUpdate('expense', editing.id, form.description);
      } else {
        const { data, error } = await supabase.from('expenses').insert(payload).select().single();
        if (error) throw error;
        toast.success('Έξοδο δημιουργήθηκε');
        logCreate('expense', data.id, form.description);
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setSaving(false); }
  };

  const handleEdit = (exp: any) => {
    setEditing(exp);
    setForm({
      description: exp.description, project_id: exp.project_id || '',
      client_id: exp.client_id || '', amount: exp.amount.toString(),
      expense_date: exp.expense_date, category: exp.category || '',
      vendor_name: exp.vendor_name || '', expense_type: exp.expense_type || 'vendor',
      approval_status: exp.approval_status || 'draft', notes: exp.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { toast.error('Σφάλμα'); return; }
    toast.success('Διαγράφηκε');
    logDelete('expense', id, exp?.description);
    fetchData();
  };

  const filtered = expenses.filter(e => {
    if (typeFilter !== 'all' && (e.expense_type || 'vendor') !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return e.description.toLowerCase().includes(s) || (e.vendor_name || '').toLowerCase().includes(s) || (e.project?.name || '').toLowerCase().includes(s);
    }
    return true;
  });

  if (pagination.totalCount !== filtered.length) {
    pagination.setTotalCount(filtered.length);
  }

  const pagedExpenses = filtered.slice(pagination.from, pagination.to + 1);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Αναζήτηση..." value={search} onChange={e => { setSearch(e.target.value); pagination.reset(); }} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); pagination.reset(); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλα</SelectItem>
              {EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Νέο Έξοδο</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Επεξεργασία' : 'Νέο Έξοδο'}</DialogTitle>
                <DialogDescription>Καταχώρηση εξόδου</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Περιγραφή *</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ποσό (€) *</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Ημ/νία</Label>
                    <Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Τύπος</Label>
                    <Select value={form.expense_type} onValueChange={v => setForm(p => ({ ...p, expense_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Κατηγορία</Label>
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Επιλογή" /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Προμηθευτής</Label>
                    <Input value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Κατάσταση</Label>
                    <Select value={form.approval_status} onValueChange={v => setForm(p => ({ ...p, approval_status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Έργο</Label>
                    <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Κανένα" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Κανένα</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Πελάτης</Label>
                    <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Κανένας" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Κανένας</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Σημειώσεις</Label>
                  <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ακύρωση</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editing ? 'Αποθήκευση' : 'Δημιουργία'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Δεν βρέθηκαν έξοδα</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Περιγραφή</TableHead>
                <TableHead>Προμηθευτής</TableHead>
                <TableHead>Τύπος</TableHead>
                <TableHead>Έργο / Πελάτης</TableHead>
                <TableHead className="text-right">Ποσό</TableHead>
                <TableHead>Ημ/νία</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedExpenses.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{exp.description}</p>
                      {exp.category && <p className="text-xs text-muted-foreground">{exp.category}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{exp.vendor_name || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{EXPENSE_TYPES.find(t => t.value === (exp.expense_type || 'vendor'))?.label || exp.expense_type}</Badge></TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{exp.project?.name || '—'}</p>
                      {exp.client?.name && <p className="text-xs text-muted-foreground">{exp.client.name}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">€{Number(exp.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{format(new Date(exp.expense_date), 'dd/MM/yy')}</TableCell>
                  <TableCell>
                    <Badge className={APPROVAL_COLORS[exp.approval_status || 'draft'] || ''}>{exp.approval_status || 'draft'}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <EditDeleteActions onEdit={() => handleEdit(exp)} onDelete={() => handleDelete(exp.id)} itemName="έξοδο" />
                    </TableCell>
                  )}
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
