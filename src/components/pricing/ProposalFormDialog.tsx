import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Proposal, useServices, usePackages } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, TrendingUp, TrendingDown, Camera } from 'lucide-react';

interface ProposalItemRow {
  item_type: string; // service, package, custom
  service_id: string;
  package_id: string;
  custom_name: string;
  custom_description: string;
  quantity: string;
  duration_months: string;
  unit_price: string;
  unit_cost: string;
  discount_percent: string;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal | null;
  onSaved: () => void;
}

export default function ProposalFormDialog({ open, onOpenChange, proposal, onSaved }: Props) {
  const { company, profile } = useAuth();
  const { services } = useServices();
  const { packages } = usePackages();
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('draft');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [items, setItems] = useState<ProposalItemRow[]>([]);

  useEffect(() => {
    if (company?.id) {
      supabase.from('clients').select('id, name').eq('company_id', company.id).order('name')
        .then(({ data }) => setClients(data || []));
    }
  }, [company?.id]);

  useEffect(() => {
    if (proposal) {
      setName(proposal.name);
      setClientId(proposal.client_id || '');
      setStatus(proposal.status);
      setDiscountPercent((proposal.discount_percent || 0).toString());
      setValidUntil(proposal.valid_until || '');
      setNotes(proposal.notes || '');
      setAssumptions(proposal.assumptions || '');
      setItems(((proposal.items || []) as any[]).map(i => ({
        item_type: i.item_type || 'service',
        service_id: i.service_id || '',
        package_id: i.package_id || '',
        custom_name: i.custom_name || '',
        custom_description: i.custom_description || '',
        quantity: (i.quantity || 1).toString(),
        duration_months: (i.duration_months || 1).toString(),
        unit_price: (i.unit_price || 0).toString(),
        unit_cost: (i.unit_cost || 0).toString(),
        discount_percent: (i.discount_percent || 0).toString(),
      })));
    } else {
      setName('');
      setClientId('');
      setStatus('draft');
      setDiscountPercent('0');
      setValidUntil('');
      setNotes('');
      setAssumptions('');
      setItems([]);
    }
  }, [proposal, open]);

  const addItem = (type: string) => {
    setItems(prev => [...prev, {
      item_type: type,
      service_id: '', package_id: '', custom_name: '', custom_description: '',
      quantity: '1', duration_months: '1', unit_price: '0', unit_cost: '0', discount_percent: '0',
    }]);
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'service_id') {
        const svc = services.find(s => s.id === value);
        if (svc) {
          updated.unit_price = svc.list_price.toString();
          updated.unit_cost = (svc.total_cost || 0).toString();
        }
      }
      if (field === 'package_id') {
        const pkg = packages.find(p => p.id === value);
        if (pkg) {
          updated.unit_price = (pkg.final_price || pkg.list_price).toString();
          updated.unit_cost = (pkg.internal_cost || 0).toString();
        }
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const activeServices = services.filter(s => s.is_active && !s.archived_at);
  const activePackages = packages.filter(p => p.is_active);

  const computed = useMemo(() => {
    const globalDiscount = parseFloat(discountPercent) || 0;

    const totalRevenue = items.reduce((s, item) => {
      const linePrice = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1) * (parseInt(item.duration_months) || 1);
      const lineDiscount = parseFloat(item.discount_percent) || 0;
      return s + linePrice * (1 - lineDiscount / 100);
    }, 0) * (1 - globalDiscount / 100);

    const totalCost = items.reduce((s, item) => {
      return s + (parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity) || 1) * (parseInt(item.duration_months) || 1);
    }, 0);

    const marginEur = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (marginEur / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, marginEur, marginPct };
  }, [items, discountPercent]);

  const handleSave = async () => {
    if (!company?.id || !name.trim()) { toast.error('Το όνομα είναι υποχρεωτικό'); return; }
    setSaving(true);
    try {
      const payload: any = {
        company_id: company.id,
        name,
        client_id: clientId || null,
        status,
        discount_percent: parseFloat(discountPercent) || 0,
        valid_until: validUntil || null,
        notes: notes || null,
        assumptions: assumptions || null,
        created_by: profile?.id || null,
      };

      let proposalId = proposal?.id;

      if (proposalId) {
        const { error } = await supabase.from('proposals' as any).update(payload).eq('id', proposalId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('proposals' as any).insert(payload).select('id').single();
        if (error) throw error;
        proposalId = (data as any).id;
      }

      // Replace items
      await supabase.from('proposal_items' as any).delete().eq('proposal_id', proposalId);

      const validItems = items.filter(i => i.service_id || i.package_id || i.custom_name);
      if (validItems.length > 0) {
        const inserts = validItems.map((item, idx) => ({
          proposal_id: proposalId,
          item_type: item.item_type,
          service_id: item.service_id || null,
          package_id: item.package_id || null,
          custom_name: item.custom_name || null,
          custom_description: item.custom_description || null,
          quantity: parseInt(item.quantity) || 1,
          duration_months: parseInt(item.duration_months) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0,
          discount_percent: parseFloat(item.discount_percent) || 0,
          sort_order: idx,
        }));
        const { error } = await supabase.from('proposal_items' as any).insert(inserts);
        if (error) throw error;
      }

      toast.success(proposal ? 'Η προσφορά ενημερώθηκε' : 'Η προσφορά δημιουργήθηκε');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setSaving(false); }
  };

  const handleSnapshot = async () => {
    if (!proposal?.id) return;
    setSnapshotting(true);
    try {
      // Increment version
      const newVersion = (proposal.version || 1) + 1;
      await supabase.from('proposals' as any).update({ version: newVersion }).eq('id', proposal.id);

      // Save snapshot
      const snapshotData = {
        items: items.map(i => ({ ...i })),
        discount_percent: discountPercent,
        computed,
        name, clientId, status, notes, assumptions,
      };

      const { error } = await supabase.from('proposal_snapshots' as any).insert({
        proposal_id: proposal.id,
        version: proposal.version || 1,
        snapshot_data: snapshotData,
        created_by: profile?.id || null,
      });
      if (error) throw error;

      toast.success(`Snapshot v${proposal.version} αποθηκεύτηκε — τώρα v${newVersion}`);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα snapshot');
    } finally { setSnapshotting(false); }
  };

  const getItemName = (item: ProposalItemRow) => {
    if (item.item_type === 'service') return services.find(s => s.id === item.service_id)?.name || 'Υπηρεσία';
    if (item.item_type === 'package') return packages.find(p => p.id === item.package_id)?.name || 'Πακέτο';
    return item.custom_name || 'Custom';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal ? `Επεξεργασία: ${proposal.name}` : 'Νέα Προσφορά'}</DialogTitle>
          <DialogDescription>Δημιουργήστε προσφορά με live margin preview</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Τίτλος *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="π.χ. Digital Strategy Q2 2026" />
            </div>
            <div className="space-y-2">
              <Label>Πελάτης</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">— Κανένας —</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Συνολική Έκπτωση %</Label>
              <Input type="number" step="0.1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ισχύς έως</Label>
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <div className="h-10 flex items-center rounded-xl border border-border bg-muted/30 px-3.5 text-sm">
                v{proposal?.version || 1}
                {proposal && (
                  <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={handleSnapshot} disabled={snapshotting}>
                    <Camera className="h-3 w-3 mr-1" />{snapshotting ? 'Saving...' : 'Snapshot'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Γραμμές Προσφοράς</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addItem('service')}><Plus className="h-3.5 w-3.5 mr-1" />Υπηρεσία</Button>
                <Button variant="outline" size="sm" onClick={() => addItem('package')}><Plus className="h-3.5 w-3.5 mr-1" />Πακέτο</Button>
                <Button variant="outline" size="sm" onClick={() => addItem('custom')}><Plus className="h-3.5 w-3.5 mr-1" />Custom</Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Προσθέστε υπηρεσίες, πακέτα ή custom items
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Item</TableHead>
                      <TableHead className="w-[60px]">Τύπος</TableHead>
                      <TableHead className="w-[60px]">Ποσ.</TableHead>
                      <TableHead className="w-[60px]">Μήν.</TableHead>
                      <TableHead className="w-[100px] text-right">Τιμή</TableHead>
                      <TableHead className="w-[100px] text-right">Κόστος</TableHead>
                      <TableHead className="w-[70px]">Έκπτ.%</TableHead>
                      <TableHead className="w-[100px] text-right">Σύνολο</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const linePrice = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1) * (parseInt(item.duration_months) || 1) * (1 - (parseFloat(item.discount_percent) || 0) / 100);
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            {item.item_type === 'service' && (
                              <Select value={item.service_id} onValueChange={v => updateItem(idx, 'service_id', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Υπηρεσία..." /></SelectTrigger>
                                <SelectContent>
                                  {activeServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                            {item.item_type === 'package' && (
                              <Select value={item.package_id} onValueChange={v => updateItem(idx, 'package_id', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Πακέτο..." /></SelectTrigger>
                                <SelectContent>
                                  {activePackages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                            {item.item_type === 'custom' && (
                              <Input className="h-8 text-xs" value={item.custom_name} onChange={e => updateItem(idx, 'custom_name', e.target.value)} placeholder="Περιγραφή..." />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{item.item_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="1" className="h-8 text-xs w-14" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="1" className="h-8 text-xs w-14" value={item.duration_months} onChange={e => updateItem(idx, 'duration_months', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="h-8 text-xs text-right w-24" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="h-8 text-xs text-right w-24" value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.1" className="h-8 text-xs w-16" value={item.discount_percent} onChange={e => updateItem(idx, 'discount_percent', e.target.value)} />
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">€{linePrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Margin summary */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-3">Live Margin Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Συνολικά Έσοδα</span>
                <span className="text-lg font-bold">€{computed.totalRevenue.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Συνολικό Κόστος</span>
                <span className="text-lg font-bold">€{computed.totalCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Margin €</span>
                <span className={`text-lg font-bold ${computed.marginEur >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  €{computed.marginEur.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Margin %</span>
                <Badge variant={computed.marginPct >= 30 ? 'default' : 'destructive'} className="text-sm">
                  {computed.marginPct >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {computed.marginPct.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes & assumptions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Σημειώσεις</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Εσωτερικές σημειώσεις..." />
            </div>
            <div className="space-y-2">
              <Label>Παραδοχές / Assumptions</Label>
              <Textarea value={assumptions} onChange={e => setAssumptions(e.target.value)} rows={3} placeholder="π.χ. Ο πελάτης παρέχει content..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {proposal ? 'Αποθήκευση' : 'Δημιουργία'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
