import { Card, CardContent } from '@/components/ui/card';
import { Shield, ShieldAlert, ShieldOff, ShieldCheck, Clock, UserX } from 'lucide-react';
import type { GovAsset, GovReviewTask } from '@/hooks/useGovernance';

interface Props {
  assets: GovAsset[];
  reviewTasks: GovReviewTask[];
}

export function GovernanceDashboardKPIs({ assets, reviewTasks }: Props) {
  const total = assets.length;
  const noMfa = assets.filter(a => a.security_controls && !a.security_controls.mfa_enabled).length;
  const noBackup = assets.filter(a => a.security_controls && !a.security_controls.backup_admin_present).length;
  const highRisk = assets.filter(a => a.security_controls?.risk_level === 'high').length;
  const pendingReviews = reviewTasks.filter(t => t.status === 'pending').length;
  const personalLogins = assets.filter(a => a.security_controls?.personal_login_used).length;

  const kpis = [
    { label: 'Σύνολο Assets', value: total, icon: Shield, color: 'text-primary' },
    { label: 'Χωρίς MFA', value: noMfa, icon: ShieldOff, color: noMfa > 0 ? 'text-destructive' : 'text-green-500' },
    { label: 'Χωρίς Backup Admin', value: noBackup, icon: ShieldAlert, color: noBackup > 0 ? 'text-yellow-500' : 'text-green-500' },
    { label: 'Υψηλού Ρίσκου', value: highRisk, icon: ShieldAlert, color: highRisk > 0 ? 'text-destructive' : 'text-green-500' },
    { label: 'Εκκρεμή Reviews', value: pendingReviews, icon: Clock, color: pendingReviews > 0 ? 'text-yellow-500' : 'text-green-500' },
    { label: 'Personal Logins', value: personalLogins, icon: UserX, color: personalLogins > 0 ? 'text-destructive' : 'text-green-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map(k => (
        <Card key={k.label}>
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <k.icon className={`h-6 w-6 ${k.color}`} />
            <span className="text-2xl font-bold">{k.value}</span>
            <span className="text-xs text-muted-foreground">{k.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
