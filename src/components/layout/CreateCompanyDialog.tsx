import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCompanyDialog({ open, onOpenChange }: CreateCompanyDialogProps) {
  const { refreshUserData, switchCompany } = useAuth();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [taxId, setTaxId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !domain.trim()) {
      toast.error('Συμπλήρωσε όνομα και domain');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_company_with_owner', {
        _name: name.trim(),
        _domain: domain.trim().toLowerCase(),
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Υπάρχει ήδη εταιρεία με αυτό το domain');
        } else {
          toast.error(error.message);
        }
        return;
      }

      const newCompanyId = data as string;

      // If tax_id provided, update the company
      if (taxId.trim()) {
        await supabase
          .from('companies')
          .update({ settings: { tax_id: taxId.trim() } })
          .eq('id', newCompanyId);
      }

      toast.success('Η εταιρεία δημιουργήθηκε!');
      await refreshUserData();
      switchCompany(newCompanyId);
      onOpenChange(false);
      setName('');
      setDomain('');
      setTaxId('');
    } catch (err) {
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Νέα Εταιρεία</DialogTitle>
          <DialogDescription>Δημιούργησε μια νέα εταιρεία με ξεχωριστά δεδομένα.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Όνομα εταιρείας *</Label>
            <Input id="company-name" value={name} onChange={e => setName(e.target.value)} placeholder="π.χ. Advize" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-domain">Domain *</Label>
            <Input id="company-domain" value={domain} onChange={e => setDomain(e.target.value)} placeholder="π.χ. advize.gr" />
            <p className="text-xs text-muted-foreground">Δεν χρειάζεται να ταιριάζει με το email σου.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-tax">ΑΦΜ (προαιρετικό)</Label>
            <Input id="company-tax" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="π.χ. 123456789" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Ακύρωση</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Δημιουργία...' : 'Δημιουργία'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
