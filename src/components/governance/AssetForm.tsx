import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { GovAsset, GovPlatform } from '@/hooks/useGovernance';

const ASSET_TYPES = [
  'BM', 'Ad Account', 'Page', 'Pixel', 'Catalog', 'IG', 'Domain',
  'Google Ads', 'GA4', 'GTM', 'Merchant Center', 'Search Console',
  'YouTube', 'LinkedIn Ads', 'TikTok Ads', 'Newsletter', 'CMS', 'Hosting', 'Other',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: GovPlatform[];
  clients: { id: string; name: string }[];
  companyId: string;
  asset?: GovAsset | null;
  onSave: (data: Partial<GovAsset>) => void;
}

export function AssetForm({ open, onOpenChange, platforms, clients, companyId, asset, onSave }: Props) {
  const [form, setForm] = useState<Partial<GovAsset>>({
    company_id: companyId,
    platform_id: asset?.platform_id || '',
    client_id: asset?.client_id || null,
    asset_type: asset?.asset_type || 'Other',
    asset_name: asset?.asset_name || '',
    asset_external_id: asset?.asset_external_id || '',
    url: asset?.url || '',
    status: asset?.status || 'active',
    owner_entity: asset?.owner_entity || '',
    billing_owner: asset?.billing_owner || '',
    created_by_person: asset?.created_by_person || '',
    notes: asset?.notes || '',
    ...(asset?.id ? { id: asset.id } : {}),
  });

  const handleSave = () => {
    if (!form.asset_name || !form.platform_id) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Επεξεργασία Asset' : 'Νέο Digital Asset'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Πλατφόρμα *</Label>
              <Select value={form.platform_id} onValueChange={v => setForm(f => ({ ...f, platform_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                <SelectContent>
                  {platforms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Τύπος *</Label>
              <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Όνομα Asset *</Label>
            <Input value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Πελάτης</Label>
            <Select value={form.client_id || '__none'} onValueChange={v => setForm(f => ({ ...f, client_id: v === '__none' ? null : v }))}>
              <SelectTrigger><SelectValue placeholder="Κανένας" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Κανένας</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>External ID</Label>
              <Input value={form.asset_external_id || ''} onChange={e => setForm(f => ({ ...f, asset_external_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={form.url || ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner Entity</Label>
              <Input value={form.owner_entity || ''} onChange={e => setForm(f => ({ ...f, owner_entity: e.target.value }))} placeholder="Agency / Client" />
            </div>
            <div className="space-y-2">
              <Label>Billing Owner</Label>
              <Input value={form.billing_owner || ''} onChange={e => setForm(f => ({ ...f, billing_owner: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Δημιουργήθηκε από</Label>
              <Input value={form.created_by_person || ''} onChange={e => setForm(f => ({ ...f, created_by_person: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Σημειώσεις</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button onClick={handleSave}>Αποθήκευση</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
