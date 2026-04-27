import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRBAC, type CompanyUser } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, UserPlus, XCircle, CheckCircle, Clock, AlertTriangle, MoreHorizontal, ExternalLink, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { EditPermissionsDialog } from '@/components/users/EditPermissionsDialog';
import { CompanyRole } from '@/contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Manager', member: 'Member', viewer: 'Viewer', billing: 'Billing'
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Ενεργός', suspended: 'Ανεσταλμένος', deactivated: 'Απενεργοποιημένος', pending: 'Εκκρεμεί', invited: 'Προσκεκλημένος'
};

export function OrgMembersSection() {
  const navigate = useNavigate();
  const { company, isOwner, isCompanyAdmin } = useAuth();
  const { users, invitations, loading, updateUserRole, updateUserStatus, cancelInvitation, refreshData } = useRBAC();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editPermUser, setEditPermUser] = useState<CompanyUser | null>(null);
  const [profileExtras, setProfileExtras] = useState<Map<string, { job_title: string | null; department: string | null; phone: string | null }>>(new Map());
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  useEffect(() => {
    if (company) fetchJoinRequests();
  }, [company]);

  useEffect(() => {
    const fetchExtras = async () => {
      if (users.length === 0) return;
      const userIds = users.map(u => u.user_id);
      const { data } = await supabase.from('profiles').select('id, job_title, department, phone').in('id', userIds);
      const map = new Map<string, any>();
      data?.forEach(p => map.set(p.id, { job_title: p.job_title, department: p.department, phone: p.phone }));
      setProfileExtras(map);
    };
    fetchExtras();
  }, [users]);

  const fetchJoinRequests = async () => {
    if (!company) return;
    const { data } = await supabase.from('join_requests')
      .select('*, profiles:user_id(email, full_name)').eq('company_id', company.id).eq('status', 'pending');
    setJoinRequests(data || []);
  };

  const handleApproveJoinRequest = async (requestId: string, userId: string) => {
    if (!company) return;
    await supabase.from('join_requests').update({
      status: 'approved', reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString()
    }).eq('id', requestId);
    await supabase.from('user_company_roles').insert({
      user_id: userId, company_id: company.id, role: 'member', status: 'active', access_scope: 'assigned'
    });
    await supabase.from('profiles').update({ status: 'active' } as any).eq('id', userId);
    toast.success('Αίτημα εγκρίθηκε');
    fetchJoinRequests();
    refreshData();
  };

  const handleRejectJoinRequest = async (requestId: string) => {
    await supabase.from('join_requests').update({
      status: 'rejected', reviewed_by: (await supabase.auth.getUser()).data.user?.id, reviewed_at: new Date().toISOString()
    }).eq('id', requestId);
    toast.success('Αίτημα απορρίφθηκε');
    fetchJoinRequests();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try { await updateUserRole(userId, newRole as CompanyRole); toast.success('Ο ρόλος ενημερώθηκε'); }
    catch (error: any) { toast.error(error.message); }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try { await updateUserStatus(userId, newStatus as any); toast.success(`Χρήστης ${newStatus === 'active' ? 'ενεργοποιήθηκε' : 'ανεστάλη'}`); }
    catch (error: any) { toast.error(error.message); }
  };

  return (
    <div className="space-y-6">
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
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Χρήστης</TableHead>
                  <TableHead>Θέση</TableHead>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const extras = profileExtras.get(u.user_id);
                  return (
                    <TableRow key={u.id} className="group">
                      <TableCell>
                        <button onClick={() => navigate(`/hr/employee/${u.user_id}`)}
                          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-foreground text-xs">
                              {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm hover:underline">{u.full_name || 'Χωρίς όνομα'}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{extras?.job_title || '—'}</span></TableCell>
                      <TableCell>
                        {isCompanyAdmin && u.role !== 'owner' ? (
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
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
                      <TableCell>
                        {isCompanyAdmin && u.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/hr/employee/${u.user_id}`)}>
                                <ExternalLink className="h-4 w-4 mr-2" />Προβολή Προφίλ
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditPermUser(u)}>
                                <ShieldCheck className="h-4 w-4 mr-2" />Δικαιώματα
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusToggle(u.user_id, u.status)}
                                className={u.status === 'active' ? 'text-destructive' : ''}>
                                {u.status === 'active' ? <><UserX className="h-4 w-4 mr-2" />Αναστολή</> : <><UserCheck className="h-4 w-4 mr-2" />Ενεργοποίηση</>}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invitations.filter(i => i.status === 'pending').length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />Εκκρεμείς προσκλήσεις
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

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onSuccess={() => refreshData()} />
      <EditPermissionsDialog user={editPermUser} open={!!editPermUser} onOpenChange={(o) => { if (!o) setEditPermUser(null); }} onSuccess={() => refreshData()} />
    </div>
  );
}
