import { useState } from 'react';
import { useGovernance } from '@/hooks/useGovernance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VaultReferenceForm } from '@/components/governance/VaultReferenceForm';
import { Plus, Loader2, Lock } from 'lucide-react';
import { format } from 'date-fns';

export default function GovernanceVault() {
  const { vaultRefs, vaultLoading, assets, companyId, upsertVault } = useGovernance();
  const [showForm, setShowForm] = useState(false);

  if (vaultLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credentials Vault</h1>
          <p className="text-muted-foreground">Αναφορές σε password managers — χωρίς αποθήκευση κωδικών</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Νέα Αναφορά
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Vault Provider</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Entry Name</TableHead>
            <TableHead>Last Verified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vaultRefs.map((v: any) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  {v.gov_assets?.asset_name || '—'}
                </div>
              </TableCell>
              <TableCell><Badge variant="outline">{v.vault_provider}</Badge></TableCell>
              <TableCell>{v.vault_location || '—'}</TableCell>
              <TableCell>{v.vault_entry_name || '—'}</TableCell>
              <TableCell>{v.last_verified_date ? format(new Date(v.last_verified_date), 'dd/MM/yyyy') : '—'}</TableCell>
            </TableRow>
          ))}
          {vaultRefs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Δεν υπάρχουν vault references.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showForm && companyId && (
        <VaultReferenceForm
          open={showForm}
          onOpenChange={setShowForm}
          assets={assets}
          companyId={companyId}
          onSave={(data) => upsertVault.mutate(data as any)}
        />
      )}
    </div>
  );
}
