import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Contact {
  id?: string;
  name: string;
  entity_type: string;
  email: string;
  phone: string;
  secondary_phone: string;
  address: string;
  website: string;
  tax_id: string;
  notes: string;
  tags: string[];
  category: string;
  avatar_url: string;
}

const defaultContact: Contact = {
  name: '', entity_type: 'person', email: '', phone: '', secondary_phone: '',
  address: '', website: '', tax_id: '', notes: '', tags: [], category: 'other', avatar_url: '',
};

const categories = [
  { value: 'client', label: 'Πελάτης' },
  { value: 'supplier', label: 'Προμηθευτής' },
  { value: 'partner', label: 'Συνεργάτης' },
  { value: 'media', label: 'Μέσα Ενημέρωσης' },
  { value: 'government', label: 'Φορέας' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'other', label: 'Άλλο' },
];

const entityTypes = [
  { value: 'person', label: 'Φυσικό Πρόσωπο' },
  { value: 'company', label: 'Εταιρεία' },
  { value: 'organization', label: 'Οργανισμός / Φορέας' },
];

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: any;
  onSaved: () => void;
}

export function ContactForm({ open, onOpenChange, contact, onSaved }: ContactFormProps) {
  const { company } = useAuth();
  const companyId = company?.id;
  const [form, setForm] = useState<Contact>(contact ? {
    ...defaultContact,
    ...contact,
    tags: contact.tags || [],
  } : defaultContact);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Contact, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set('tags', [...form.tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => set('tags', form.tags.filter(t => t !== tag));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Το όνομα είναι υποχρεωτικό'); return; }
    if (!companyId) { toast.error('Δεν βρέθηκε εταιρεία'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        entity_type: form.entity_type,
        email: form.email || null,
        phone: form.phone || null,
        secondary_phone: form.secondary_phone || null,
        address: form.address || null,
        website: form.website || null,
        tax_id: form.tax_id || null,
        notes: form.notes || null,
        tags: form.tags,
        category: form.category,
        avatar_url: form.avatar_url || null,
        company_id: companyId,
      };

      if (contact?.id) {
        const { error } = await supabase.from('contacts').update(payload).eq('id', contact.id);
        if (error) throw error;
        toast.success('Η επαφή ενημερώθηκε');
      } else {
        const { error } = await supabase.from('contacts').insert(payload);
        if (error) throw error;
        toast.success('Η επαφή δημιουργήθηκε');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact?.id ? 'Επεξεργασία Επαφής' : 'Νέα Επαφή'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Όνομα / Επωνυμία *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <Label>Τύπος</Label>
            <Select value={form.entity_type} onValueChange={v => set('entity_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {entityTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Κατηγορία</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Τηλέφωνο</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <Label>Δεύτερο Τηλέφωνο</Label>
            <Input value={form.secondary_phone} onChange={e => set('secondary_phone', e.target.value)} />
          </div>
          <div>
            <Label>ΑΦΜ</Label>
            <Input value={form.tax_id} onChange={e => set('tax_id', e.target.value)} />
          </div>
          <div>
            <Label>Ιστοσελίδα</Label>
            <Input value={form.website} onChange={e => set('website', e.target.value)} />
          </div>
          <div>
            <Label>Avatar URL</Label>
            <Input value={form.avatar_url} onChange={e => set('avatar_url', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Διεύθυνση</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Προσθήκη tag..."
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
          </div>
          <div className="col-span-2">
            <Label>Σημειώσεις</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Αποθήκευση...' : contact?.id ? 'Ενημέρωση' : 'Δημιουργία'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
