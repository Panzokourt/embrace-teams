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
import { Plus, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-amber-500/10 text-amber-500',
  partially_paid: 'bg-blue-500/10 text-blue-500',
  paid: 'bg-emerald-500/10 text-emerald-500',
  overdue: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Απλήρωτο', partially_paid: 'Μερικώς', paid: 'Πληρωμένο', overdue: 'Εκπρόθεσμο', cancelled: 'Ακυρωμένο',
};

export default function InvoicesManager() {
  const { isAdmin, isManager } = useAuth();
  const { logCreate, logUpdate, logDelete } = useActivityLogger();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState({
    invoice_number: '', project_id: '', client_id: '', amount: '',
    net_amount: '', vat_rate: '24', issued_date: new Date().toISOString().split('T')[0],
    due_date: '', status: 'unpaid', paid_amount: '0', notes: '',
  });

  const canManage = isAdmin || isManager;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [inv, proj, cli] = await Promise.all([
      supabase.from('invoices').select('*, project:projects(name), client:clients(name)').order('issued_date', { ascending: false }),
      supabase.from('projects').select('id, name'),
      supabase.from('clients').select('id, name'),
    ]);
    setInvoices(inv.data || []);
    setProjects(proj.data || []);
    setClients(cli.data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ invoice_number: '', project_id: '', client_id: '', amount: '', net_amount: '', vat_rate: '24', issued_date: new Date().toISOString().split('T')[0], due_date: '', status: 'unpaid', paid_amount: '0', notes: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) { toast.error('Επιλέξτε έργο'); return; }
    setSaving(true);
    try {
      const netAmt = parseFloat(form.net_amount) || 0;
      const vatRate = parseFloat(form.vat_rate) || 24;
      const vatAmt = netAmt * (vatRate / 100);
      const total = netAmt + vatAmt;

      const payload = {
        invoice_number: form.invoice_number,
        project_id: form.project_id,
        client_id: form.client_id || null,
        amount: parseFloat(form.amount) || total,
        net_amount: netAmt,
        vat_rate: vatRate,
        vat_amount: vatAmt,
        issued_date: form.issued_date,
        due_date: form.due_date || null,
        status: form.status,
        paid: form.status === 'paid',
        paid_amount: parseFloat(form.paid_amount) || 0,
        notes: form.notes || null,
      };

      if (editing) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Τιμολόγιο ενημερώθηκε');
        logUpdate('invoice', editing.id, form.invoice_number);
      } else {
        const { data, error } = await supabase.from('invoices').insert(payload).select().single();
        if (error) throw error;
        toast.success('Τιμολόγιο δημιουργήθηκε');
        logCreate('invoice', data.id, form.invoice_number);
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setSaving(false); }
  };

  const handleEdit = (inv: any) => {
    setEditing(inv);
    setForm({
      invoice_number: inv.invoice_number, project_id: inv.project_id,
      client_id: inv.client_id || '', amount: inv.amount?.toString() || '',
      net_amount: inv.net_amount?.toString() || '', vat_rate: inv.vat_rate?.toString() || '24',
      issued_date: inv.issued_date, due_date: inv.due_date || '',
      status: inv.status || 'unpaid', paid_amount: inv.paid_amount?.toString() || '0',
      notes: inv.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) { toast.error('Σφάλμα διαγραφής'); return; }
    toast.success('Διαγράφηκε');
    logDelete('invoice', id, inv?.invoice_number);
    fetchData();
  };

  const handleMarkPaid = async (inv: any) => {
    const { error } = await supabase.from('invoices').update({ paid: true, status: 'paid', paid_amount: inv.amount, paid_date: new Date().toISOString() }).eq('id', inv.id);
    if (error) { toast.error('Σφάλμα'); return; }
    toast.success('Σημειώθηκε ως πληρωμένο');
    fetchData();
  };

  const filtered = invoices.filter(i => {
    if (statusFilter !== 'all' && (i.status || 'unpaid') !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return i.invoice_number.toLowerCase().includes(s) || (i.project?.name || '').toLowerCase().includes(s) || (i.client?.name || '').toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Αναζήτηση..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλα</SelectItem>
              <SelectItem value="unpaid">Απλήρωτα</SelectItem>
              <SelectItem value="partially_paid">Μερικώς</SelectItem>
              <SelectItem value="paid">Πληρωμένα</SelectItem>
              <SelectItem value="overdue">Εκπρόθεσμα</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Νέο Τιμολόγιο</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Επεξεργασία' : 'Νέο Τιμολόγιο'}</DialogTitle>
                <DialogDescription>Καταχώρηση τιμολογίου</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Αριθμός *</Label>
                    <Input value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Απλήρωτο</SelectItem>
                        <SelectItem value="partially_paid">Μερικώς</SelectItem>
                        <SelectItem value="paid">Πληρωμένο</SelectItem>
                        <SelectItem value="overdue">Εκπρόθεσμο</SelectItem>
                        <SelectItem value="cancelled">Ακυρωμένο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Έργο *</Label>
                    <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Επιλογή" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Πελάτης</Label>
                    <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Επιλογή" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Καθαρό (€)</Label>
                    <Input type="number" step="0.01" value={form.net_amount} onChange={e => {
                      const net = parseFloat(e.target.value) || 0;
                      const vat = parseFloat(form.vat_rate) || 24;
                      setForm(p => ({ ...p, net_amount: e.target.value, amount: (net + net * vat / 100).toFixed(2) }));
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>ΦΠΑ %</Label>
                    <Input type="number" step="1" value={form.vat_rate} onChange={e => {
                      const net = parseFloat(form.net_amount) || 0;
                      const vat = parseFloat(e.target.value) || 0;
                      setForm(p => ({ ...p, vat_rate: e.target.value, amount: (net + net * vat / 100).toFixed(2) }));
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Σύνολο (€)</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ημ/νία Έκδοσης</Label>
                    <Input type="date" value={form.issued_date} onChange={e => setForm(p => ({ ...p, issued_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ημ/νία Πληρωμής</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
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
        <Card><CardContent className="p-8 text-center text-muted-foreground">Δεν βρέθηκαν τιμολόγια</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Τιμολόγιο</TableHead>
                <TableHead>Πελάτης / Έργο</TableHead>
                <TableHead className="text-right">Ποσό</TableHead>
                <TableHead>Έκδοση</TableHead>
                <TableHead>Πληρωμή</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-[100px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => {
                const status = inv.status || (inv.paid ? 'paid' : 'unpaid');
                const agingDays = !inv.paid && inv.due_date ? differenceInDays(new Date(), new Date(inv.due_date)) : null;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{inv.client?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{inv.project?.name || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">€{Number(inv.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.issued_date), 'dd/MM/yy')}</TableCell>
                    <TableCell className="text-sm">{inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yy') : '—'}</TableCell>
                    <TableCell>
                      {agingDays !== null && agingDays > 0 ? (
                        <Badge variant="destructive" className="text-xs">{agingDays}d</Badge>
                      ) : agingDays !== null ? (
                        <span className="text-xs text-muted-foreground">{Math.abs(agingDays)}d left</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[status] || ''}>{STATUS_LABELS[status] || status}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {status !== 'paid' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkPaid(inv)} title="Πληρωμή">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </Button>
                          )}
                          <EditDeleteActions onEdit={() => handleEdit(inv)} onDelete={() => handleDelete(inv.id)} itemName="τιμολόγιο" />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
