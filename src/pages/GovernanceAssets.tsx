import { useState } from 'react';
import { useGovernance } from '@/hooks/useGovernance';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RiskBadge } from '@/components/governance/RiskBadge';
import { AssetForm } from '@/components/governance/AssetForm';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function GovernanceAssets() {
  const { assets, assetsLoading, platforms, companyId, upsertAsset } = useGovernance();
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const clientsQuery = useQuery({
    queryKey: ['clients_list', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name').eq('company_id', companyId!);
      return (data || []) as { id: string; name: string }[];
    },
    enabled: !!companyId,
  });

  if (assetsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Assets</h1>
          <p className="text-muted-foreground">{assets.length} assets καταγεγραμμένα</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Νέο Asset
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Πελάτης</TableHead>
            <TableHead>Πλατφόρμα</TableHead>
            <TableHead>Τύπος</TableHead>
            <TableHead>Όνομα</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map(a => (
            <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/governance/assets/${a.id}`)}>
              <TableCell>{a.client?.name || '—'}</TableCell>
              <TableCell>{a.platform?.name || '—'}</TableCell>
              <TableCell><Badge variant="outline">{a.asset_type}</Badge></TableCell>
              <TableCell className="font-medium">{a.asset_name}</TableCell>
              <TableCell>{a.owner_entity || '—'}</TableCell>
              <TableCell>
                <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>
                  {a.status}
                </Badge>
              </TableCell>
              <TableCell>
                {a.security_controls ? (
                  <RiskBadge level={a.security_controls.risk_level} score={a.security_controls.risk_score} />
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {assets.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Δεν υπάρχουν assets. Δημιουργήστε το πρώτο σας!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showForm && companyId && (
        <AssetForm
          open={showForm}
          onOpenChange={setShowForm}
          platforms={platforms}
          clients={clientsQuery.data || []}
          companyId={companyId}
          onSave={(data) => upsertAsset.mutate(data as any)}
        />
      )}
    </div>
  );
}
