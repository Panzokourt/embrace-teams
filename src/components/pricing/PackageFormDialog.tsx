import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ServicePackage, ServiceWithCosts } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, TrendingUp, TrendingDown, Sparkles, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AIPackageSuggestion } from './PackagesList';

interface PackageItemRow {
  service_id: string;
  quantity: string;
  duration_months: string;
  unit_price: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: ServicePackage | null;
  services: ServiceWithCosts[];
  onSaved: () => void;
  aiSuggestion?: AIPackageSuggestion | null;
}

export default function PackageFormDialog({ open, onOpenChange, pkg, services, onSaved, aiSuggestion }: Props) {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [durationType, setDurationType] = useState('monthly');
  const [durationValue, setDurationValue] = useState('1');
  const [items, setItems] = useState<PackageItemRow[]>([]);
  const [showAiBanner, setShowAiBanner] = useState(false);

  useEffect(() => {
    if (aiSuggestion && !pkg) {
      // Pre-fill from AI suggestion
      setName(aiSuggestion.package_name);
      setDescription(aiSuggestion.description);
      setListPrice(aiSuggestion.list_price.toString());
      setDiscountPercent(aiSuggestion.discount_percent.toString());
      setDurationType((aiSuggestion as any).duration_type || 'monthly');
      setDurationValue(((aiSuggestion as any).duration_value || 1).toString());
      setItems(aiSuggestion.items.map(item => {
        const svc = services.find(s => s.id === item.service_id);
        return {
          service_id: item.service_id,
          quantity: item.quantity.toString(),
          duration_months: item.duration_months.toString(),
          unit_price: svc ? svc.list_price.toString() : '0',
        };
      }));
      setShowAiBanner(true);
    } else if (pkg) {
      setName(pkg.name);
      setDescription(pkg.description || '');
      setListPrice(pkg.list_price.toString());
      setDiscountPercent((pkg.discount_percent || 0).toString());
      setDurationType(pkg.duration_type || 'monthly');
      setDurationValue((pkg.duration_value || 1).toString());
      setItems((pkg.items || []).map(i => ({
        service_id: i.service_id,
        quantity: i.quantity.toString(),
        duration_months: i.duration_months.toString(),
        unit_price: i.unit_price.toString(),
      })));
      setShowAiBanner(false);
    } else {
      setName('');
      setDescription('');
      setListPrice('');
      setDiscountPercent('0');
      setDurationType('monthly');
      setDurationValue('1');
      setItems([]);
      setShowAiBanner(false);
    }
  }, [pkg, open, aiSuggestion]);

  const addItem = () => {
    setItems(prev => [...prev, { service_id: '', quantity: '1', duration_months: '1', unit_price: '0' }]);
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Auto-fill price when selecting service
      if (field === 'service_id') {
        const svc = services.find(s => s.id === value);
        if (svc) updated.unit_price = svc.list_price.toString();
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  // Computed
  const activeServices = services.filter(s => s.is_active && !s.archived_at);

  const computedValues = useMemo(() => {
    const price = parseFloat(listPrice) || 0;
    const discount = parseFloat(discountPercent) || 0;
    const finalPrice = price * (1 - discount / 100);

    const itemsCost = items.reduce((s, item) => {
      const svc = services.find(sv => sv.id === item.service_id);
      const cost = svc?.total_cost || 0;
      return s + cost * (parseInt(item.quantity) || 1) * (parseInt(item.duration_months) || 1);
    }, 0);

    const sumItemPrices = items.reduce((s, item) => {
      return s + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1) * (parseInt(item.duration_months) || 1);
    }, 0);

    const marginEur = finalPrice - itemsCost;
    const marginPct = finalPrice > 0 ? (marginEur / finalPrice) * 100 : 0;

    return { finalPrice, itemsCost, sumItemPrices, marginEur, marginPct };
  }, [listPrice, discountPercent, items, services]);

  const handleSave = async () => {
    if (!company?.id || !name.trim()) { toast.error('Το όνομα είναι υποχρεωτικό'); return; }
    setSaving(true);
    try {
      const payload: any = {
        company_id: company.id,
        name,
        description: description || null,
        list_price: parseFloat(listPrice) || 0,
        discount_percent: parseFloat(discountPercent) || 0,
        duration_type: durationType,
        duration_value: parseInt(durationValue) || 1,
      };

      let packageId = pkg?.id;

      if (packageId) {
        const { error } = await supabase.from('service_packages' as any).update(payload).eq('id', packageId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('service_packages' as any).insert(payload).select('id').single();
        if (error) throw error;
        packageId = (data as any).id;
      }

      // Replace items
      await supabase.from('package_items' as any).delete().eq('package_id', packageId);

      const validItems = items.filter(i => i.service_id);
      if (validItems.length > 0) {
        const inserts = validItems.map((item, idx) => ({
          package_id: packageId,
          service_id: item.service_id,
          quantity: parseInt(item.quantity) || 1,
          duration_months: parseInt(item.duration_months) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          sort_order: idx,
        }));
        const { error } = await supabase.from('package_items' as any).insert(inserts);
        if (error) throw error;
      }

      toast.success(pkg ? 'Το πακέτο ενημερώθηκε' : 'Το πακέτο δημιουργήθηκε');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pkg ? 'Επεξεργασία Πακέτου' : 'Νέο Πακέτο'}</DialogTitle>
          <DialogDescription>Συνδυάστε υπηρεσίες με bundle pricing</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {showAiBanner && (
            <Alert className="border-primary/30 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between">
                <span>Προτεινόμενο από AI — ελέγξτε και προσαρμόστε πριν αποθηκεύσετε</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAiBanner(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Όνομα *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="π.χ. Digital Growth Package" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Περιγραφή</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Τύπος Διάρκειας</Label>
              <Select value={durationType} onValueChange={v => {
                setDurationType(v);
                const autoValues: Record<string, string> = { monthly: '1', quarterly: '3', semi_annual: '6', annual: '12' };
                if (autoValues[v]) setDurationValue(autoValues[v]);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Μηνιαίο</SelectItem>
                  <SelectItem value="quarterly">Τριμηνιαίο</SelectItem>
                  <SelectItem value="semi_annual">Εξαμηνιαίο</SelectItem>
                  <SelectItem value="annual">Ετήσιο</SelectItem>
                  <SelectItem value="fixed_days">Σταθερές Ημέρες</SelectItem>
                  <SelectItem value="custom_months">Custom (μήνες)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{durationType === 'fixed_days' ? 'Ημέρες' : 'Μήνες'}</Label>
              <Input type="number" min="1" value={durationValue} onChange={e => setDurationValue(e.target.value)} />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Τιμή Πακέτου (€)</Label>
              <Input type="number" step="0.01" value={listPrice} onChange={e => setListPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Έκπτωση %</Label>
              <Input type="number" step="0.1" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Τελική Τιμή</Label>
              <div className="h-10 flex items-center rounded-xl border border-border bg-muted/30 px-3.5 text-sm font-medium">
                €{computedValues.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Service items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Υπηρεσίες στο Πακέτο</Label>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Υπηρεσία</Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Προσθέστε υπηρεσίες στο πακέτο
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Υπηρεσία</TableHead>
                      <TableHead className="w-[80px]">Ποσ.</TableHead>
                      <TableHead className="w-[80px]">Μήνες</TableHead>
                      <TableHead className="w-[110px] text-right">Τιμή/μον.</TableHead>
                      <TableHead className="w-[110px] text-right">Σύνολο</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const lineTotal = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 1) * (parseInt(item.duration_months) || 1);
                      const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select value={item.service_id} onValueChange={v => updateItem(idx, 'service_id', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                              <SelectContent>
                                {activeServices.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} — €{s.list_price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="1" className="h-8 text-xs w-16" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="1" className="h-8 text-xs w-16" value={item.duration_months} onChange={e => updateItem(idx, 'duration_months', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="h-8 text-xs text-right w-24" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">€{fmt(lineTotal)}</TableCell>
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

          {/* Margin preview */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-3">Live Margin Preview</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Τιμή items</span>
                <span className="font-medium">€{computedValues.sumItemPrices.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Τελική τιμή</span>
                <span className="font-medium">€{computedValues.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Κόστος</span>
                <span className="font-medium">€{computedValues.itemsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Margin €</span>
                <span className={`font-semibold ${computedValues.marginEur >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  €{computedValues.marginEur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Margin %</span>
                <Badge variant={computedValues.marginPct >= 30 ? 'default' : 'destructive'}>
                  {computedValues.marginPct >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {computedValues.marginPct.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {pkg ? 'Αποθήκευση' : 'Δημιουργία'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
