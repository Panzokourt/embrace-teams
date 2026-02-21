import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

import { useProjectCategories } from '@/hooks/useProjectCategories';

const defaultSectorOptions = [
  { value: 'public', label: 'Δημόσιος Τομέας' },
  { value: 'private', label: 'Ιδιωτικός Τομέας' },
  { value: 'non_profit', label: 'Μη Κερδοσκοπικός' },
  { value: 'government', label: 'Κυβερνητικός' },
  { value: 'mixed', label: 'Μικτός' },
];

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: any;
  onSaved: () => void;
}

export function ClientForm({ open, onOpenChange, client, onSaved }: ClientFormProps) {
  const { data: categories = [] } = useProjectCategories();
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Build sector options: use categories if available, else defaults
  const sectorOptions = categories.length > 0
    ? categories.map(c => ({ value: c.name, label: c.name }))
    : defaultSectorOptions;
  const [formData, setFormData] = useState({
    name: '', contact_email: '', contact_phone: '', address: '', notes: '',
    sector: '', website: '', tax_id: '', secondary_phone: '', tags: [] as string[],
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        address: client.address || '',
        notes: client.notes || '',
        sector: client.sector || '',
        website: client.website || '',
        tax_id: client.tax_id || '',
        secondary_phone: client.secondary_phone || '',
        tags: client.tags || [],
      });
    } else {
      setFormData({ name: '', contact_email: '', contact_phone: '', address: '', notes: '', sector: '', website: '', tax_id: '', secondary_phone: '', tags: [] });
    }
    setTagInput('');
  }, [client, open]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !formData.tags.includes(t)) setFormData(prev => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        address: formData.address || null,
        notes: formData.notes || null,
        sector: formData.sector || null,
        website: formData.website || null,
        tax_id: formData.tax_id || null,
        secondary_phone: formData.secondary_phone || null,
        tags: formData.tags,
      };

      if (client?.id) {
        const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
        if (error) throw error;
        toast.success('Ο πελάτης ενημερώθηκε!');
      } else {
        const { error } = await supabase.from('clients').insert(payload);
        if (error) throw error;
        toast.success('Ο πελάτης δημιουργήθηκε!');
      }
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}</DialogTitle>
          <DialogDescription>{client ? 'Ενημερώστε τα στοιχεία του πελάτη' : 'Προσθέστε νέο πελάτη'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Επωνυμία *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Τομέας</Label>
              <Select value={formData.sector} onValueChange={v => setFormData(p => ({ ...p, sector: v }))}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε τομέα" /></SelectTrigger>
                <SelectContent>
                  {sectorOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">ΑΦΜ</Label>
              <Input value={formData.tax_id} onChange={e => setFormData(p => ({ ...p, tax_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input type="email" value={formData.contact_email} onChange={e => setFormData(p => ({ ...p, contact_email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Τηλέφωνο</Label>
              <Input value={formData.contact_phone} onChange={e => setFormData(p => ({ ...p, contact_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Δεύτερο Τηλέφωνο</Label>
              <Input value={formData.secondary_phone} onChange={e => setFormData(p => ({ ...p, secondary_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ιστοσελίδα</Label>
              <Input value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Διεύθυνση</Label>
              <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex gap-1 mb-2 flex-wrap">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => setFormData(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} /></Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Προσθήκη tag..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Σημειώσεις</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {client ? 'Αποθήκευση' : 'Δημιουργία'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
