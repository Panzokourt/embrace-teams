import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { Plus, Loader2, Package, Percent } from 'lucide-react';

const CATEGORIES = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'project', label: 'Project' },
  { value: 'addon', label: 'Add-on' },
  { value: 'media_fee', label: 'Media Fee' },
];

const UNITS = [
  { value: 'month', label: 'Μήνα' },
  { value: 'hour', label: 'Ώρα' },
  { value: 'project', label: 'Έργο' },
  { value: 'piece', label: 'Τεμάχιο' },
];

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  list_price: number;
  pricing_unit: string;
  internal_cost: number;
  target_margin: number;
  role_hours: Record<string, number>;
  role_rates: Record<string, number>;
  is_active: boolean;
  sort_order: number;
}

const defaultForm = {
  name: '', description: '', category: 'project', list_price: '',
  pricing_unit: 'project', internal_cost: '', target_margin: '',
  role_hours: '{}', role_rates: '{}',
};

export default function ServicesCatalog() {
  const { isAdmin, isManager } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(defaultForm);

  const canManage = isAdmin || isManager;

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*').order('sort_order');
    if (!error) setServices((data || []) as Service[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let roleHours = {};
      let roleRates = {};
      try { roleHours = JSON.parse(form.role_hours); } catch {}
      try { roleRates = JSON.parse(form.role_rates); } catch {}

      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        list_price: parseFloat(form.list_price) || 0,
        pricing_unit: form.pricing_unit,
        internal_cost: parseFloat(form.internal_cost) || 0,
        target_margin: parseFloat(form.target_margin) || 0,
        role_hours: roleHours,
        role_rates: roleRates,
      };

      if (editing) {
        const { error } = await supabase.from('services').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Η υπηρεσία ενημερώθηκε');
      } else {
        const { error } = await supabase.from('services').insert(payload);
        if (error) throw error;
        toast.success('Η υπηρεσία δημιουργήθηκε');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm);
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setSaving(false); }
  };

  const handleEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || '',
      category: s.category,
      list_price: s.list_price.toString(),
      pricing_unit: s.pricing_unit,
      internal_cost: s.internal_cost.toString(),
      target_margin: s.target_margin.toString(),
      role_hours: JSON.stringify(s.role_hours || {}),
      role_rates: JSON.stringify(s.role_rates || {}),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) { toast.error('Σφάλμα διαγραφής'); return; }
    toast.success('Η υπηρεσία διαγράφηκε');
    fetchServices();
  };

  const getCategoryLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label || v;
  const getUnitLabel = (v: string) => UNITS.find(u => u.value === v)?.label || v;

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Κατάλογος υπηρεσιών — "τι πουλάμε και πόσο κοστίζει"</p>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(defaultForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Νέα Υπηρεσία</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Επεξεργασία' : 'Νέα Υπηρεσία'}</DialogTitle>
                <DialogDescription>Καθορίστε τιμολόγηση και εσωτερικό κόστος</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Όνομα *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Περιγραφή</Label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Κατηγορία</Label>
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Μονάδα χρέωσης</Label>
                    <Select value={form.pricing_unit} onValueChange={v => setForm(p => ({ ...p, pricing_unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Τιμή (€)</Label>
                    <Input type="number" step="0.01" value={form.list_price} onChange={e => setForm(p => ({ ...p, list_price: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Εσωτ. Κόστος (€)</Label>
                    <Input type="number" step="0.01" value={form.internal_cost} onChange={e => setForm(p => ({ ...p, internal_cost: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Margin %</Label>
                    <Input type="number" step="0.1" value={form.target_margin} onChange={e => setForm(p => ({ ...p, target_margin: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ώρες/ρόλο (JSON)</Label>
                    <Input value={form.role_hours} onChange={e => setForm(p => ({ ...p, role_hours: e.target.value }))} placeholder='{"account":10}' />
                  </div>
                  <div className="space-y-2">
                    <Label>Rates/ρόλο (JSON)</Label>
                    <Input value={form.role_rates} onChange={e => setForm(p => ({ ...p, role_rates: e.target.value }))} placeholder='{"account":50}' />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Ακύρωση</Button>
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

      {services.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Δεν υπάρχουν υπηρεσίες. Προσθέστε την πρώτη!</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Υπηρεσία</TableHead>
                <TableHead>Κατηγορία</TableHead>
                <TableHead className="text-right">Τιμή</TableHead>
                <TableHead>Μονάδα</TableHead>
                <TableHead className="text-right">Κόστος</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                {canManage && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map(s => {
                const actualMargin = s.list_price > 0 ? (((s.list_price - s.internal_cost) / s.list_price) * 100).toFixed(1) : '0';
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{getCategoryLabel(s.category)}</Badge></TableCell>
                    <TableCell className="text-right font-medium">€{s.list_price.toLocaleString()}</TableCell>
                    <TableCell>{getUnitLabel(s.pricing_unit)}</TableCell>
                    <TableCell className="text-right">€{s.internal_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={Number(actualMargin) >= (s.target_margin || 0) ? 'default' : 'destructive'}>
                        {actualMargin}%
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <EditDeleteActions onEdit={() => handleEdit(s)} onDelete={() => handleDelete(s.id)} itemName="υπηρεσία" />
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
