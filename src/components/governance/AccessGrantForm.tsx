import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { GovAccessGrant, GovAsset, GovAccessRole } from '@/hooks/useGovernance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: GovAsset[];
  roles: GovAccessRole[];
  companyId: string;
  grant?: GovAccessGrant | null;
  defaultAssetId?: string;
  onSave: (data: Partial<GovAccessGrant>) => void;
}

export function AccessGrantForm({ open, onOpenChange, assets, roles, companyId, grant, defaultAssetId, onSave }: Props) {
  const [form, setForm] = useState<Partial<GovAccessGrant>>({
    company_id: companyId,
    asset_id: grant?.asset_id || defaultAssetId || '',
    person_name: grant?.person_name || '',
    person_email: grant?.person_email || '',
    person_type: grant?.person_type || 'internal',
    role_id: grant?.role_id || null,
    role_name_override: grant?.role_name_override || '',
    granted_on: grant?.granted_on || new Date().toISOString().split('T')[0],
    granted_by: grant?.granted_by || '',
    status: grant?.status || 'active',
    review_cycle_days: grant?.review_cycle_days || 90,
    notes: grant?.notes || '',
    ...(grant?.id ? { id: grant.id } : {}),
  });

  const handleSave = () => {
    if (!form.person_name || !form.asset_id) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{grant ? 'Επεξεργασία Access' : 'Νέο Access Grant'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Asset *</Label>
            <Select value={form.asset_id} onValueChange={v => setForm(f => ({ ...f, asset_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Επιλέξτε asset..." /></SelectTrigger>
              <SelectContent>
                {assets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.asset_name} ({a.asset_type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Όνομα *</Label>
              <Input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.person_email || ''} onChange={e => setForm(f => ({ ...f, person_email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Τύπος</Label>
              <Select value={form.person_type} onValueChange={v => setForm(f => ({ ...f, person_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ρόλος (override)</Label>
              <Input value={form.role_name_override || ''} onChange={e => setForm(f => ({ ...f, role_name_override: e.target.value }))} placeholder="π.χ. Admin, Editor" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Granted On</Label>
              <Input type="date" value={form.granted_on || ''} onChange={e => setForm(f => ({ ...f, granted_on: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Granted By</Label>
              <Input value={form.granted_by || ''} onChange={e => setForm(f => ({ ...f, granted_by: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Review Cycle (days)</Label>
              <Input type="number" value={form.review_cycle_days} onChange={e => setForm(f => ({ ...f, review_cycle_days: parseInt(e.target.value) || 90 }))} />
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
