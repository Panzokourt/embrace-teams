import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ServiceWithCosts } from '@/hooks/usePricingData';
import ServiceCostingTable from './ServiceCostingTable';

const CATEGORIES = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'project', label: 'Project' },
  { value: 'addon', label: 'Add-on' },
  { value: 'media_fee', label: 'Media Fee' },
];

const PRICING_MODELS = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'retainer', label: 'Monthly Retainer' },
  { value: 'value_based', label: 'Value Based' },
];

const UNITS = [
  { value: 'month', label: 'Μήνα' },
  { value: 'hour', label: 'Ώρα' },
  { value: 'project', label: 'Έργο' },
  { value: 'piece', label: 'Τεμάχιο' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithCosts | null;
  onSaved: () => void;
}

export default function ServiceForm({ open, onOpenChange, service, onSaved }: Props) {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [serviceId, setServiceId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', description: '', category: 'project', subcategory: '',
    pricing_model: 'fixed', pricing_unit: 'project',
    list_price: '', external_cost: '', target_margin: '',
    deliverables: '',
    notes: '', estimated_turnaround: '',
  });

  useEffect(() => {
    if (service) {
      setServiceId(service.id);
      setForm({
        name: service.name,
        description: service.description || '',
        category: service.category,
        subcategory: (service as any).subcategory || '',
        pricing_model: (service as any).pricing_model || 'fixed',
        pricing_unit: service.pricing_unit,
        list_price: service.list_price.toString(),
        external_cost: ((service as any).external_cost || 0).toString(),
        target_margin: (service.target_margin || 0).toString(),
        deliverables: ((service as any).deliverables || []).join('\n'),
        notes: (service as any).notes || '',
        estimated_turnaround: (service as any).estimated_turnaround || '',
      });
    } else {
      setServiceId(null);
      setForm({
        name: '', description: '', category: 'project', subcategory: '',
        pricing_model: 'fixed', pricing_unit: 'project',
        list_price: '', external_cost: '', target_margin: '',
        deliverables: '', notes: '', estimated_turnaround: '',
      });
    }
    setActiveTab('general');
  }, [service, open]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Το όνομα είναι υποχρεωτικό'); return; }
    if (!company?.id) return;
    setSaving(true);

    const deliverables = form.deliverables.split('\n').map(d => d.trim()).filter(Boolean);

    const payload: any = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      subcategory: form.subcategory || null,
      pricing_model: form.pricing_model,
      pricing_unit: form.pricing_unit,
      list_price: parseFloat(form.list_price) || 0,
      external_cost: parseFloat(form.external_cost) || 0,
      target_margin: parseFloat(form.target_margin) || 0,
      deliverables: deliverables.length > 0 ? deliverables : null,
      notes: form.notes || null,
      estimated_turnaround: form.estimated_turnaround || null,
      company_id: company.id,
    };

    try {
      if (serviceId) {
        const { error } = await supabase.from('services').update(payload).eq('id', serviceId);
        if (error) throw error;
        toast.success('Η υπηρεσία ενημερώθηκε');
      } else {
        const { data, error } = await supabase.from('services').insert(payload).select('id').single();
        if (error) throw error;
        setServiceId(data.id);
        toast.success('Η υπηρεσία δημιουργήθηκε');
        // Switch to costing tab after creation
        setActiveTab('costing');
      }
      onSaved();
      if (serviceId) onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Επεξεργασία Υπηρεσίας' : 'Νέα Υπηρεσία'}</DialogTitle>
          <DialogDescription>Ορίστε τιμολόγηση, κόστος και παραδοτέα</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">Γενικά</TabsTrigger>
            <TabsTrigger value="pricing">Τιμολόγηση</TabsTrigger>
            <TabsTrigger value="costing" disabled={!serviceId}>Κοστολόγηση</TabsTrigger>
            <TabsTrigger value="details">Λεπτομέρειες</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Όνομα *</Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="π.χ. Social Media Management" />
            </div>
            <div className="space-y-2">
              <Label>Περιγραφή</Label>
              <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Κατηγορία</Label>
                <Select value={form.category} onValueChange={v => update('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Υποκατηγορία</Label>
                <Input value={form.subcategory} onChange={e => update('subcategory', e.target.value)} placeholder="π.χ. Content Creation" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Μοντέλο Τιμολόγησης</Label>
                <Select value={form.pricing_model} onValueChange={v => update('pricing_model', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRICING_MODELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Μονάδα Χρέωσης</Label>
                <Select value={form.pricing_unit} onValueChange={v => update('pricing_unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Τιμή Πώλησης (€)</Label>
                <Input type="number" step="0.01" value={form.list_price} onChange={e => update('list_price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Εξωτ. Κόστος (€)</Label>
                <Input type="number" step="0.01" value={form.external_cost} onChange={e => update('external_cost', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Target Margin %</Label>
                <Input type="number" step="0.1" value={form.target_margin} onChange={e => update('target_margin', e.target.value)} />
              </div>
            </div>
            {/* Live margin preview */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">Πρόβλεψη Margin</p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">Τιμή:</span> <span className="font-medium">€{(parseFloat(form.list_price) || 0).toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Εξωτ. κόστος:</span> <span className="font-medium">€{(parseFloat(form.external_cost) || 0).toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{form.target_margin || 0}%</span></div>
                <div><span className="text-muted-foreground">Min τιμή:</span> <span className="font-medium">
                  €{((parseFloat(form.external_cost) || 0) / (1 - (parseFloat(form.target_margin) || 0) / 100) || 0).toFixed(2)}
                </span></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="costing" className="mt-4">
            {serviceId ? (
              <ServiceCostingTable serviceId={serviceId} />
            ) : (
              <p className="text-muted-foreground text-center py-8">Αποθηκεύστε πρώτα την υπηρεσία για να προσθέσετε κοστολόγηση ομάδας.</p>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Παραδοτέα (ένα ανά γραμμή)</Label>
              <Textarea value={form.deliverables} onChange={e => update('deliverables', e.target.value)} rows={4} placeholder="π.χ. Monthly content calendar&#10;10 social media posts&#10;2 blog articles" />
            </div>
            <div className="space-y-2">
              <Label>Εκτιμώμενος χρόνος παράδοσης</Label>
              <Input value={form.estimated_turnaround} onChange={e => update('estimated_turnaround', e.target.value)} placeholder="π.χ. 2-3 εβδομάδες" />
            </div>
            <div className="space-y-2">
              <Label>Σημειώσεις</Label>
              <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {service ? 'Αποθήκευση' : serviceId ? 'Αποθήκευση' : 'Δημιουργία'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
