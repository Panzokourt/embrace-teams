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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, X, Plus, Trash2 } from 'lucide-react';
import { useProjectCategories } from '@/hooks/useProjectCategories';
import { AIFillButton } from '@/components/shared/AIFillButton';

const defaultSectorOptions = [
  { value: 'public', label: 'Δημόσιος Τομέας' },
  { value: 'private', label: 'Ιδιωτικός Τομέας' },
  { value: 'non_profit', label: 'Μη Κερδοσκοπικός' },
  { value: 'government', label: 'Κυβερνητικός' },
  { value: 'mixed', label: 'Μικτός' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'risk', label: 'Risk' },
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

  const sectorOptions = categories.length > 0
    ? categories.map(c => ({ value: c.name, label: c.name }))
    : defaultSectorOptions;

  const [formData, setFormData] = useState({
    name: '', contact_email: '', contact_phone: '', address: '', notes: '',
    sector: '', website: '', tax_id: '', secondary_phone: '', tags: [] as string[],
    status: 'active',
    additional_websites: [] as { url: string; label: string }[],
    social_accounts: [] as { platform: string; account_name: string; url: string }[],
    ad_accounts: [] as { platform: string; account_name: string; url: string; ownership: string; has_risk: boolean }[],
    strategy: { goals: [] as string[], pillars: [] as string[], positioning: '' },
  });

  // Temp inputs
  const [goalInput, setGoalInput] = useState('');
  const [pillarInput, setPillarInput] = useState('');

  useEffect(() => {
    if (client) {
      const socialAccounts = Array.isArray(client.social_accounts) ? client.social_accounts : [];
      const adAccounts = Array.isArray(client.ad_accounts) ? client.ad_accounts : [];
      const additionalWebsites = Array.isArray(client.additional_websites) ? client.additional_websites : [];
      const strategy = (client.strategy && typeof client.strategy === 'object' && !Array.isArray(client.strategy))
        ? { goals: client.strategy.goals || [], pillars: client.strategy.pillars || [], positioning: client.strategy.positioning || '' }
        : { goals: [], pillars: [], positioning: '' };

      setFormData({
        name: client.name || '', contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '', address: client.address || '',
        notes: client.notes || '', sector: client.sector || '', website: client.website || '',
        tax_id: client.tax_id || '', secondary_phone: client.secondary_phone || '',
        tags: client.tags || [], status: client.status || 'active',
        additional_websites: additionalWebsites, social_accounts: socialAccounts,
        ad_accounts: adAccounts, strategy,
      });
    } else {
      setFormData({
        name: '', contact_email: '', contact_phone: '', address: '', notes: '',
        sector: '', website: '', tax_id: '', secondary_phone: '', tags: [],
        status: 'active', additional_websites: [], social_accounts: [], ad_accounts: [],
        strategy: { goals: [], pillars: [], positioning: '' },
      });
    }
    setTagInput(''); setGoalInput(''); setPillarInput('');
  }, [client, open]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !formData.tags.includes(t)) setFormData(p => ({ ...p, tags: [...p.tags, t] }));
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
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
        status: formData.status || 'active',
        additional_websites: formData.additional_websites,
        social_accounts: formData.social_accounts,
        ad_accounts: formData.ad_accounts,
        strategy: formData.strategy,
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

  const updateSocial = (idx: number, field: string, value: string) => {
    setFormData(p => ({
      ...p,
      social_accounts: p.social_accounts.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const updateAd = (idx: number, field: string, value: any) => {
    setFormData(p => ({
      ...p,
      ad_accounts: p.ad_accounts.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}</DialogTitle>
          <DialogDescription>{client ? 'Ενημερώστε τα στοιχεία του πελάτη' : 'Προσθέστε νέο πελάτη'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* AI Fill */}
          {!client && (
            <AIFillButton
              formType="client"
              onFill={(data) => {
                setFormData(prev => ({
                  ...prev,
                  name: data.name || prev.name,
                  sector: data.sector || prev.sector,
                  website: data.website || prev.website,
                  contact_email: data.contact_email || prev.contact_email,
                  notes: data.notes || prev.notes,
                }));
              }}
            />
          )}
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-medium">Επωνυμία *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
          </div>

          <Separator />

          {/* Additional Websites */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Additional Websites</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setFormData(p => ({ ...p, additional_websites: [...p.additional_websites, { url: '', label: '' }] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {formData.additional_websites.map((w, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input placeholder="Label" value={w.label} onChange={e => {
                  const arr = [...formData.additional_websites]; arr[i] = { ...arr[i], label: e.target.value };
                  setFormData(p => ({ ...p, additional_websites: arr }));
                }} className="w-1/3" />
                <Input placeholder="URL" value={w.url} onChange={e => {
                  const arr = [...formData.additional_websites]; arr[i] = { ...arr[i], url: e.target.value };
                  setFormData(p => ({ ...p, additional_websites: arr }));
                }} />
                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setFormData(p => ({ ...p, additional_websites: p.additional_websites.filter((_, j) => j !== i) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Social Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Social & Channels</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setFormData(p => ({ ...p, social_accounts: [...p.social_accounts, { platform: '', account_name: '', url: '' }] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {formData.social_accounts.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={s.platform} onValueChange={v => updateSocial(i, 'platform', v)}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    {['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Newsletter', 'Twitter'].map(p => (
                      <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Account name" value={s.account_name} onChange={e => updateSocial(i, 'account_name', e.target.value)} />
                <Input placeholder="URL" value={s.url} onChange={e => updateSocial(i, 'url', e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setFormData(p => ({ ...p, social_accounts: p.social_accounts.filter((_, j) => j !== i) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Ad Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Ad & Tracking Accounts</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setFormData(p => ({ ...p, ad_accounts: [...p.ad_accounts, { platform: '', account_name: '', url: '', ownership: 'agency', has_risk: false }] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {formData.ad_accounts.map((a, i) => (
              <div key={i} className="space-y-2 p-3 rounded-xl bg-secondary/50">
                <div className="flex gap-2 items-center">
                  <Select value={a.platform} onValueChange={v => updateAd(i, 'platform', v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Platform" /></SelectTrigger>
                    <SelectContent>
                      {['Business Manager', 'Meta Ad Account', 'Google Ads', 'GA4', 'GTM', 'Merchant Center', 'Search Console'].map(p => (
                        <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Account name" value={a.account_name} onChange={e => updateAd(i, 'account_name', e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setFormData(p => ({ ...p, ad_accounts: p.ad_accounts.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Input placeholder="URL" value={a.url} onChange={e => updateAd(i, 'url', e.target.value)} />
                  <Select value={a.ownership} onValueChange={v => updateAd(i, 'ownership', v)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={a.has_risk} onChange={e => updateAd(i, 'has_risk', e.target.checked)} className="rounded" />
                    Risk
                  </label>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Strategy */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Strategy</Label>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Goals</p>
                <div className="space-y-1 mb-2">
                  {formData.strategy.goals.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm flex-1">{g}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFormData(p => ({ ...p, strategy: { ...p.strategy, goals: p.strategy.goals.filter((_, j) => j !== i) } }))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="Add goal..." onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); const g = goalInput.trim(); if (g) { setFormData(p => ({ ...p, strategy: { ...p.strategy, goals: [...p.strategy.goals, g] } })); setGoalInput(''); } }
                  }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => { const g = goalInput.trim(); if (g) { setFormData(p => ({ ...p, strategy: { ...p.strategy, goals: [...p.strategy.goals, g] } })); setGoalInput(''); } }}>+</Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pillars</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.strategy.pillars.map((p, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{p}<X className="h-3 w-3 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, strategy: { ...prev.strategy, pillars: prev.strategy.pillars.filter((_, j) => j !== i) } }))} /></Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={pillarInput} onChange={e => setPillarInput(e.target.value)} placeholder="Add pillar..." onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); const p = pillarInput.trim(); if (p) { setFormData(prev => ({ ...prev, strategy: { ...prev.strategy, pillars: [...prev.strategy.pillars, p] } })); setPillarInput(''); } }
                  }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => { const p = pillarInput.trim(); if (p) { setFormData(prev => ({ ...prev, strategy: { ...prev.strategy, pillars: [...prev.strategy.pillars, p] } })); setPillarInput(''); } }}>+</Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Positioning</p>
                <Textarea value={formData.strategy.positioning} onChange={e => setFormData(p => ({ ...p, strategy: { ...p.strategy, positioning: e.target.value } }))} rows={2} className="resize-none" placeholder="Short positioning summary..." />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Σημειώσεις</Label>
            <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3} className="resize-none" />
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
