import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Shield, CheckCircle2, XCircle } from 'lucide-react';

interface OrgSecurityTabProps {
  companyId: string;
  domain: string;
  domainVerified: boolean;
  initialAllowDomainRequests: boolean;
  initialSsoEnforced: boolean;
  isOwner: boolean;
}

export function OrgSecurityTab({
  companyId, domain, domainVerified,
  initialAllowDomainRequests, initialSsoEnforced, isOwner,
}: OrgSecurityTabProps) {
  const [allowDomainRequests, setAllowDomainRequests] = useState(initialAllowDomainRequests);
  const [ssoEnforced, setSsoEnforced] = useState(initialSsoEnforced);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({ allow_domain_requests: allowDomainRequests, sso_enforced: ssoEnforced } as any)
      .eq('id', companyId);
    setSaving(false);

    if (error) {
      toast.error(`Σφάλμα αποθήκευσης: ${error.message}`);
    } else {
      toast.success('Ρυθμίσεις ασφαλείας αποθηκεύτηκαν');
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Ασφάλεια & Domain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-w-lg">
        {/* Domain verification status */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <span className="text-sm font-medium text-foreground">Domain: {domain}</span>
          {domainVerified ? (
            <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Verified</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Unverified</Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Domain join requests</p>
            <p className="text-sm text-muted-foreground">Επιτρέψτε αιτήματα εισόδου μέσω @{domain}</p>
          </div>
          <Switch checked={allowDomainRequests} onCheckedChange={setAllowDomainRequests} disabled={!isOwner} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">SSO Enforcement</p>
            <p className="text-sm text-muted-foreground">Υποχρεωτική σύνδεση μόνο μέσω SSO</p>
          </div>
          <Switch checked={ssoEnforced} onCheckedChange={setSsoEnforced} disabled={!isOwner} />
        </div>

        {isOwner && (
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Αποθήκευση
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
