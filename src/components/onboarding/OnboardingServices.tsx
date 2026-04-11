import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import type { WorkspacePreset } from './workspacePresets';

interface ServiceRow {
  name: string;
  default_price: number;
  unit: string;
  enabled: boolean;
  isCustom?: boolean;
}

interface Props {
  companyId: string | undefined;
  preset: WorkspacePreset | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function OnboardingServices({ companyId, preset, onNext, onBack, onSkip }: Props) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('/μήνα');

  useEffect(() => {
    if (preset) {
      setServices(preset.services.map(s => ({ ...s, enabled: true })));
    }
  }, [preset]);

  const enabledCount = services.filter(s => s.enabled).length;

  const toggleService = (idx: number) => {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
  };

  const updatePrice = (idx: number, price: number) => {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, default_price: price } : s));
  };

  const removeCustom = (idx: number) => {
    setServices(prev => prev.filter((_, i) => i !== idx));
  };

  const addCustomService = () => {
    if (!newName.trim()) return;
    setServices(prev => [...prev, {
      name: newName.trim(),
      default_price: parseFloat(newPrice) || 0,
      unit: newUnit || '/μήνα',
      enabled: true,
      isCustom: true,
    }]);
    setNewName('');
    setNewPrice('');
    setNewUnit('/μήνα');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const enabled = services.filter(s => s.enabled);
      const { error } = await supabase.from('services').insert(
        enabled.map((s, i) => ({
          company_id: companyId,
          name: s.name,
          list_price: s.default_price,
          pricing_unit: s.unit,
          category: preset?.type || 'general',
          is_active: true,
          sort_order: i,
        }))
      );
      if (error) throw error;
      toast.success(`${enabled.length} υπηρεσίες αποθηκεύτηκαν!`);
      onNext();
    } catch (err: any) {
      toast.error(err.message || 'Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Υπηρεσίες σας</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Προσαρμόστε τις υπηρεσίες και τιμές. Θα χρησιμοποιηθούν στα invoices.
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {services.map((s, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
              s.enabled ? 'border-primary/30' : 'border-border/30 opacity-50'
            }`}
          >
            <Checkbox
              checked={s.enabled}
              onCheckedChange={() => toggleService(idx)}
            />
            <span className="flex-1 text-sm truncate text-foreground">{s.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">€</span>
              <Input
                type="number"
                value={s.default_price}
                onChange={e => updatePrice(idx, parseFloat(e.target.value) || 0)}
                className="w-20 text-right h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground w-14 text-right">{s.unit}</span>
            </div>
            {s.isCustom && (
              <button onClick={() => removeCustom(idx)} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showAddForm ? (
        <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Όνομα υπηρεσίας" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 h-8 text-sm" />
            <Input type="number" placeholder="Τιμή" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="w-20 h-8 text-sm" />
            <Input placeholder="/μήνα" value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-20 h-8 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addCustomService} disabled={!newName.trim()}>Προσθήκη</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Ακύρωση</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full rounded-xl border border-dashed border-border/60 p-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Προσθήκη custom υπηρεσίας
        </button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        {enabledCount} υπηρεσίες επιλεγμένες · Οι τιμές μπορούν να αλλάξουν ανά πελάτη
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Πίσω</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>Skip</Button>
          <Button onClick={handleSave} disabled={saving || enabledCount === 0}>
            {saving ? 'Αποθήκευση...' : `Αποθήκευση (${enabledCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
