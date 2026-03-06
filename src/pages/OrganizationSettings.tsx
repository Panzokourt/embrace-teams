import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC, type CompanyUser } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Building2, Users, Shield, UserPlus, XCircle, CheckCircle, Clock, AlertTriangle, Activity } from 'lucide-react';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { CompanyRole } from '@/contexts/AuthContext';
import { OrgGeneralTab } from '@/components/organization/OrgGeneralTab';
import { OrgSecurityTab } from '@/components/organization/OrgSecurityTab';
import { OrgActivityTab } from '@/components/organization/OrgActivityTab';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Manager',
  member: 'Member', viewer: 'Viewer', billing: 'Billing'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ενεργός', suspended: 'Ανεσταλμένος', deactivated: 'Απενεργοποιημένος',
  pending: 'Εκκρεμεί', invited: 'Προσκεκλημένος'
};

export default function OrganizationSettings() {
  const { company, isOwner, isCompanyAdmin, refreshUserData } = useAuth();
  const { users, invitations, loading, updateUserRole, updateUserStatus, cancelInvitation, refreshData } = useRBAC();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Company extra data
  const [companyData, setCompanyData] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  useEffect(() => {
    if (company) {
      fetchCompanyData();
      fetchJoinRequests();
    }
  }, [company]);

  const fetchCompanyData = async () => {
    if (!company) return;
    const { data } = await supabase
      .from('companies')
      .select('allow_domain_requests, sso_enforced, domain_verified, settings')
      .eq('id', company.id)
      .single();
    setCompanyData(data);
  };

  const fetchJoinRequests = async () => {
    if (!company) return;
    const { data } = await supabase
      .from('join_requests')
      .select('*, profiles:user_id(email, full_name)')
      .eq('company_id', company.id)
      .eq('status', 'pending');
    setJoinRequests(data || []);
  };

  const handleApproveJoinRequest = async (requestId: string, userId: string) => {
    if (!company) return;
    await supabase
      .from('join_requests')
      .update({ status: 'approved', reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);
    await supabase
      .from('user_company_roles')
      .insert({ user_id: userId, company_id: company.id, role: 'member', status: 'active', access_scope: 'assigned' });
    await supabase.from('profiles').update({ status: 'active' } as any).eq('id', userId);
    toast.success('Αίτημα εγκρίθηκε');
    fetchJoinRequests();
    refreshData();
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    await supabase
      .from('join_requests')
      .update({ status: 'rejected', reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);
    toast.success('Αίτημα απορρίφθηκε');
    fetchJoinRequests();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole as CompanyRole);
      toast.success('Ο ρόλος ενημερώθηκε');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateUserStatus(userId, newStatus as any);
      toast.success(`Χρήστης ${newStatus === 'active' ? 'ενεργοποιήθηκε' : 'ανεστάλη'}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!company) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-foreground" /></div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ρυθμίσεις Εταιρείας</h1>
        <p className="text-muted-foreground">{company.name}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-2"><Building2 className="h-4 w-4" />Γενικά</TabsTrigger>
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" />Μέλη</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Ασφάλεια</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" />Activity Log</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <OrgGeneralTab
            companyId={company.id}
            initialName={company.name}
            initialDomain={company.domain}
            settings={(companyData?.settings as Record<string, any>) || {}}
            isOwner={isOwner}
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          {joinRequests.length > 0 && (
            <Card className="border-warning/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Αιτήματα εισόδου ({joinRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {joinRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{(req.profiles as any)?.full_name || 'Χωρίς όνομα'}</p>
                      <p className="text-sm text-muted-foreground">{(req.profiles as any)?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRejectJoinRequest(req.id)}><XCircle className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={() => handleApproveJoinRequest(req.id, req.user_id)}><CheckCircle className="h-4 w-4 mr-1" />Έγκριση</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Μέλη ({users.length})</CardTitle>
              {isCompanyAdmin && (
                <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />Πρόσκληση
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Χρήστης</TableHead>
                      <TableHead>Ρόλος</TableHead>
                      <TableHead>Κατάσταση</TableHead>
                      <TableHead className="text-right">Ενέργειες</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted text-foreground text-xs">
                                {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground text-sm">{u.full_name || 'Χωρίς όνομα'}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isCompanyAdmin && u.role !== 'owner' ? (
                            <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'owner' || isOwner).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">{ROLE_LABELS[u.role] || u.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                            {STATUS_LABELS[u.status] || u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isCompanyAdmin && u.role !== 'owner' && (
                            <Button size="sm" variant="ghost" onClick={() => handleStatusToggle(u.user_id, u.status)}>
                              {u.status === 'active' ? 'Αναστολή' : 'Ενεργοποίηση'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {invitations.filter(i => i.status === 'pending').length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Εκκρεμείς προσκλήσεις
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitations.filter(i => i.status === 'pending').map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-foreground text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">Ρόλος: {ROLE_LABELS[inv.role] || inv.role} • Λήγει: {new Date(inv.expires_at).toLocaleDateString('el')}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { cancelInvitation(inv.id); toast.success('Πρόσκληση ανακλήθηκε'); }}>
                      Ανάκληση
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          {companyData && (
            <OrgSecurityTab
              companyId={company.id}
              domain={company.domain}
              domainVerified={(companyData as any)?.domain_verified ?? false}
              initialAllowDomainRequests={(companyData as any)?.allow_domain_requests ?? true}
              initialSsoEnforced={(companyData as any)?.sso_enforced ?? false}
              isOwner={isOwner}
            />
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <OrgActivityTab companyId={company.id} />
        </TabsContent>
      </Tabs>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onSuccess={() => refreshData()} />
    </div>
  );
}
