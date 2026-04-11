import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Megaphone, Plus, Calendar, DollarSign, MoreHorizontal, Pencil, Trash2, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

const STATUSES = [
  { value: 'planning', label: 'Σχεδιασμός', color: 'bg-muted text-muted-foreground' },
  { value: 'active', label: 'Ενεργή', color: 'bg-emerald-500/15 text-emerald-600' },
  { value: 'paused', label: 'Σε παύση', color: 'bg-amber-500/15 text-amber-600' },
  { value: 'completed', label: 'Ολοκληρωμένη', color: 'bg-primary/15 text-primary' },
];

interface CampaignForm {
  name: string;
  description: string;
  status: string;
  client_id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  budget: string;
}

const emptyForm: CampaignForm = {
  name: '', description: '', status: 'planning', client_id: '', project_id: '',
  start_date: '', end_date: '', budget: '',
};

export default function Campaigns() {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, clients(id, name), projects(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name');
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name');
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (f: CampaignForm) => {
      const payload = {
        name: f.name,
        description: f.description || null,
        status: f.status,
        client_id: f.client_id || null,
        project_id: f.project_id || null,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        budget: f.budget ? Number(f.budget) : 0,
        company_id: companyId!,
        created_by: user?.id,
      };
      if (editingId) {
        const { error } = await supabase.from('campaigns').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campaigns').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? 'Η καμπάνια ενημερώθηκε' : 'Η καμπάνια δημιουργήθηκε');
    },
    onError: () => toast.error('Σφάλμα αποθήκευσης'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Η καμπάνια διαγράφηκε');
    },
  });

  const openEdit = useCallback((c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description || '',
      status: c.status,
      client_id: c.client_id || '',
      project_id: c.project_id || '',
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      budget: c.budget?.toString() || '',
    });
    setDialogOpen(true);
  }, []);

  const statusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status);
    return <Badge variant="secondary" className={s?.color}>{s?.label || status}</Badge>;
  };

  const CampaignCard = ({ c }: { c: any }) => (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="font-medium truncate">{c.name}</h3>
            {c.clients?.name && (
              <p className="text-xs text-muted-foreground">{c.clients.name}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(c)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Επεξεργασία
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Διαγραφή
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {c.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(c.start_date), 'dd MMM', { locale: el })}
              {c.end_date && ` – ${format(new Date(c.end_date), 'dd MMM', { locale: el })}`}
            </span>
          )}
          {c.budget > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {Number(c.budget).toLocaleString('el-GR')}€
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="page-shell max-w-[1400px] mx-auto">
      <PageHeader
        icon={Megaphone}
        title="Καμπάνιες"
        breadcrumbs={[{ label: 'Καμπάνιες' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
              <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('kanban')}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('table')}>
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Νέα Καμπάνια
            </Button>
          </div>
        }
      />

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {STATUSES.map(s => {
            const items = campaigns.filter((c: any) => c.status === s.value);
            return (
              <div key={s.value} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{s.label}</h3>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {items.map((c: any) => <CampaignCard key={c.id} c={c} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Όνομα</th>
                <th className="text-left p-3 font-medium">Πελάτης</th>
                <th className="text-left p-3 font-medium">Κατάσταση</th>
                <th className="text-left p-3 font-medium">Περίοδος</th>
                <th className="text-right p-3 font-medium">Budget</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.clients?.name || '—'}</td>
                  <td className="p-3">{statusBadge(c.status)}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {c.start_date ? format(new Date(c.start_date), 'dd/MM/yy') : '—'}
                    {c.end_date && ` – ${format(new Date(c.end_date), 'dd/MM/yy')}`}
                  </td>
                  <td className="p-3 text-right">{c.budget > 0 ? `${Number(c.budget).toLocaleString('el-GR')}€` : '—'}</td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Επεξεργασία
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Διαγραφή
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Δεν υπάρχουν καμπάνιες</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Επεξεργασία Καμπάνιας' : 'Νέα Καμπάνια'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Όνομα *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Περιγραφή</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Κατάσταση</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget (€)</Label>
                <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Πελάτης</Label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map((cl: any) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Έργο</Label>
                <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ημ/νία Έναρξης</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Ημ/νία Λήξης</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Ακύρωση</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
