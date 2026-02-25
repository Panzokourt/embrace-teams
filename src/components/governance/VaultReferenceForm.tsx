import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GovVaultReference, GovAsset } from '@/hooks/useGovernance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: GovAsset[];
  companyId: string;
  vaultRef?: GovVaultReference | null;
  onSave: (data: Partial<GovVaultReference>) => void;
}

export function VaultReferenceForm({ open, onOpenChange, assets, companyId, vaultRef, onSave }: Props) {
  const [form, setForm] = useState<Partial<GovVaultReference>>({
    company_id: companyId,
    asset_id: vaultRef?.asset_id || '',
    vault_provider: vaultRef?.vault_provider || '1Password',
    vault_location: vaultRef?.vault_location || '',
    vault_entry_name: vaultRef?.vault_entry_name || '',
    last_verified_date: vaultRef?.last_verified_date || '',
    ...(vaultRef?.id ? { id: vaultRef.id } : {}),
  });

  const handleSave = () => {
    if (!form.asset_id) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vaultRef ? 'Επεξεργασία Vault Reference' : 'Νέο Vault Reference'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Asset *</Label>
            <Select value={form.asset_id} onValueChange={v => setForm(f => ({ ...f, asset_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
              <SelectContent>
                {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vault Provider</Label>
            <Select value={form.vault_provider} onValueChange={v => setForm(f => ({ ...f, vault_provider: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1Password">1Password</SelectItem>
                <SelectItem value="Bitwarden">Bitwarden</SelectItem>
                <SelectItem value="LastPass">LastPass</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location / Folder</Label>
            <Input value={form.vault_location || ''} onChange={e => setForm(f => ({ ...f, vault_location: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Entry Name</Label>
            <Input value={form.vault_entry_name || ''} onChange={e => setForm(f => ({ ...f, vault_entry_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Last Verified</Label>
            <Input type="date" value={form.last_verified_date || ''} onChange={e => setForm(f => ({ ...f, last_verified_date: e.target.value }))} />
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
