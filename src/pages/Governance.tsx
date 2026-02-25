import { useGovernance } from '@/hooks/useGovernance';
import { GovernanceDashboardKPIs } from '@/components/governance/GovernanceDashboardKPIs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RiskBadge } from '@/components/governance/RiskBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Loader2, Database, Shield } from 'lucide-react';

export default function Governance() {
  const { assets, assetsLoading, reviewTasks, platforms, seedPlatforms, platformsLoading } = useGovernance();
  const navigate = useNavigate();

  if (assetsLoading || platformsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const needsSeed = platforms.length === 0;

  return (
    <div className="page-shell">
      <PageHeader
        icon={Shield}
        title="Digital Governance"
        subtitle="Παρακολούθηση ψηφιακών assets, πρόσβασης και ασφάλειας"
        breadcrumbs={[{ label: 'Governance' }]}
        actions={
          needsSeed ? (
            <Button onClick={() => seedPlatforms.mutate()} disabled={seedPlatforms.isPending}>
              <Database className="h-4 w-4 mr-2" />
              Δημιουργία Default Platforms
            </Button>
          ) : undefined
        }
      />

      <GovernanceDashboardKPIs assets={assets} reviewTasks={reviewTasks} />

      {/* High Risk Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Υψηλού Ρίσκου Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.filter(a => a.security_controls?.risk_level === 'high').length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Κανένα asset υψηλού ρίσκου 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.filter(a => a.security_controls?.risk_level === 'high').slice(0, 10).map(a => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/governance/assets/${a.id}`)}>
                    <TableCell className="font-medium">{a.asset_name}</TableCell>
                    <TableCell>{a.platform?.name || '—'}</TableCell>
                    <TableCell>{a.client?.name || '—'}</TableCell>
                    <TableCell><RiskBadge level={a.security_controls!.risk_level} score={a.security_controls!.risk_score} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
