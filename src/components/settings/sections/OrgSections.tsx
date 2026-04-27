import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { OrgGeneralTab } from '@/components/organization/OrgGeneralTab';
import { OrgSecurityTab } from '@/components/organization/OrgSecurityTab';
import { OrgActivityTab } from '@/components/organization/OrgActivityTab';

function useCompanyData() {
  const { company } = useAuth();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!company) return;
    supabase.from('companies').select('allow_domain_requests, sso_enforced, domain_verified, settings')
      .eq('id', company.id).single().then(({ data }) => setData(data));
  }, [company]);
  return data;
}

export function OrgGeneralSection() {
  const { company, isOwner } = useAuth();
  const companyData = useCompanyData();
  if (!company) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return (
    <OrgGeneralTab
      companyId={company.id}
      initialName={company.name}
      initialDomain={company.domain}
      settings={(companyData?.settings as Record<string, any>) || {}}
      isOwner={isOwner}
    />
  );
}

export function OrgSecuritySection() {
  const { company, isOwner } = useAuth();
  const companyData = useCompanyData();
  if (!company || !companyData) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return (
    <OrgSecurityTab
      companyId={company.id}
      domain={company.domain}
      domainVerified={(companyData as any)?.domain_verified ?? false}
      initialAllowDomainRequests={(companyData as any)?.allow_domain_requests ?? true}
      initialSsoEnforced={(companyData as any)?.sso_enforced ?? false}
      isOwner={isOwner}
    />
  );
}

export function OrgActivitySection() {
  const { company } = useAuth();
  if (!company) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  return <OrgActivityTab companyId={company.id} />;
}
