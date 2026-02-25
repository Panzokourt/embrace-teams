import { useParams, useNavigate } from 'react-router-dom';
import { useGovernance } from '@/hooks/useGovernance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SecurityControlsEditor } from '@/components/governance/SecurityControlsEditor';
import { AuditTimeline } from '@/components/governance/AuditTimeline';
import { RiskBadge } from '@/components/governance/RiskBadge';
import { AccessGrantForm } from '@/components/governance/AccessGrantForm';
import { VaultReferenceForm } from '@/components/governance/VaultReferenceForm';
import { ArrowLeft, Plus, Loader2, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function GovernanceAssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assets, assetsLoading, grants, upsertGrant, upsertSecurityControls, vaultRefs, upsertVault, auditEvents, companyId, roles } = useGovernance();
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [showVaultForm, setShowVaultForm] = useState(false);

  if (assetsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const asset = assets.find(a => a.id === id);
  if (!asset) {
    return <div className="p-6"><p className="text-muted-foreground">Asset not found.</p></div>;
  }

  const assetGrants = grants.filter(g => g.asset_id === id);
  const assetVaultRefs = vaultRefs.filter(v => (v as any).asset_id === id);
  const assetAuditEvents = auditEvents.filter(e => e.asset_id === id);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/governance/assets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{asset.asset_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{asset.asset_type}</Badge>
            <span className="text-muted-foreground">{asset.platform?.name}</span>
            {asset.client && <Badge variant="secondary">{asset.client.name}</Badge>}
          </div>
        </div>
      </div>

      {/* Asset Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Asset Info</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground block">Status</span><Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>{asset.status}</Badge></div>
            <div><span className="text-muted-foreground block">Owner</span>{asset.owner_entity || '—'}</div>
            <div><span className="text-muted-foreground block">Billing Owner</span>{asset.billing_owner || '—'}</div>
            <div><span className="text-muted-foreground block">External ID</span>{asset.asset_external_id || '—'}</div>
            {asset.url && (
              <div className="col-span-2">
                <span className="text-muted-foreground block">URL</span>
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  {asset.url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {asset.notes && <div className="col-span-2"><span className="text-muted-foreground block">Notes</span>{asset.notes}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Security Controls */}
      {companyId && (
        <SecurityControlsEditor
          controls={asset.security_controls || null}
          assetId={asset.id}
          companyId={companyId}
          onSave={(data) => upsertSecurityControls.mutate(data)}
        />
      )}

      {/* Access List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Access List</CardTitle>
          <Button size="sm" onClick={() => setShowGrantForm(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          {assetGrants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν access grants.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Όνομα</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Τύπος</TableHead>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetGrants.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.person_name}</TableCell>
                    <TableCell>{g.person_email || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{g.person_type}</Badge></TableCell>
                    <TableCell>{g.role_name_override || g.role?.role_name || '—'}</TableCell>
                    <TableCell><Badge variant={g.status === 'active' ? 'default' : 'secondary'}>{g.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Vault Reference */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Vault Reference</CardTitle>
          <Button size="sm" onClick={() => setShowVaultForm(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          {assetVaultRefs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Δεν υπάρχει vault reference.</p>
          ) : (
            <div className="space-y-2">
              {assetVaultRefs.map((v: any) => (
                <div key={v.id} className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">{v.vault_provider}</Badge>
                  <span>{v.vault_location}</span>
                  <span className="text-muted-foreground">{v.vault_entry_name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Audit Timeline</CardTitle></CardHeader>
        <CardContent>
          <AuditTimeline events={assetAuditEvents} />
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showGrantForm && companyId && (
        <AccessGrantForm
          open={showGrantForm}
          onOpenChange={setShowGrantForm}
          assets={assets}
          roles={roles}
          companyId={companyId}
          defaultAssetId={id}
          onSave={(data) => upsertGrant.mutate(data as any)}
        />
      )}
      {showVaultForm && companyId && (
        <VaultReferenceForm
          open={showVaultForm}
          onOpenChange={setShowVaultForm}
          assets={assets}
          companyId={companyId}
          onSave={(data) => upsertVault.mutate(data as any)}
        />
      )}
    </div>
  );
}
