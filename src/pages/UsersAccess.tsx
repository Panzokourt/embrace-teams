import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC, CompanyUser } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Shield, Clock, Search, 
  Mail, X, History, Loader2, Crown, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { UserCard } from '@/components/users/UserCard';
import { EditPermissionsDialog } from '@/components/users/EditPermissionsDialog';
import { CompanyRole, UserStatus } from '@/contexts/AuthContext';

export default function UsersAccessPage() {
  const { isCompanyAdmin, isSuperAdmin, company } = useAuth();
  const { users, invitations, auditLog, loading, updateUserRole, updateUserStatus, cancelInvitation, refreshData } = useRBAC();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUsers = filteredUsers.filter(u => u.status === 'active');
  const pendingUsers = filteredUsers.filter(u => u.status === 'pending' || u.status === 'invited');
  const inactiveUsers = filteredUsers.filter(u => u.status === 'suspended' || u.status === 'deactivated');
  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  const handleChangeRole = async (userId: string, role: CompanyRole) => {
    try {
      await updateUserRole(userId, role);
      toast.success('Ο ρόλος ενημερώθηκε');
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα');
    }
  };

  const handleChangeStatus = async (userId: string, status: UserStatus) => {
    try {
      await updateUserStatus(userId, status);
      toast.success('Η κατάσταση ενημερώθηκε');
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα');
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      await cancelInvitation(id);
      toast.success('Η πρόσκληση ακυρώθηκε');
    } catch (error) {
      toast.error('Σφάλμα');
    }
  };

  if (!isCompanyAdmin) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Δεν έχετε πρόσβαση</CardTitle>
            <CardDescription>Μόνο Admins μπορούν να διαχειριστούν χρήστες.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Users & Access
          </h1>
          <p className="text-muted-foreground mt-1">
            {company?.name} • Διαχείριση χρηστών, ρόλων και δικαιωμάτων
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Πρόσκληση Χρήστη
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-success" /></div><div><p className="text-2xl font-bold">{activeUsers.length}</p><p className="text-sm text-muted-foreground">Ενεργοί</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center"><Clock className="h-6 w-6 text-warning" /></div><div><p className="text-2xl font-bold">{pendingUsers.length}</p><p className="text-sm text-muted-foreground">Αναμονή</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Mail className="h-6 w-6 text-primary" /></div><div><p className="text-2xl font-bold">{pendingInvitations.length}</p><p className="text-sm text-muted-foreground">Προσκλήσεις</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Crown className="h-6 w-6 text-amber-600" /></div><div><p className="text-2xl font-bold">{users.filter(u => u.role === 'super_admin' || u.role === 'admin').length}</p><p className="text-sm text-muted-foreground">Admins</p></div></div></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="users">Χρήστες ({users.length})</TabsTrigger>
              <TabsTrigger value="invitations">Προσκλήσεις ({pendingInvitations.length})</TabsTrigger>
              {isSuperAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
            </TabsList>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Αναζήτηση..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          <TabsContent value="users" className="space-y-4">
            {filteredUsers.length === 0 ? (
              <Card className="py-12 text-center"><CardContent><Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p>Δεν βρέθηκαν χρήστες</p></CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">{filteredUsers.map(user => (
                <UserCard key={user.id} user={user} onEditPermissions={setEditingUser} onChangeRole={handleChangeRole} onChangeStatus={handleChangeStatus} />
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader><CardTitle>Εκκρεμείς Προσκλήσεις</CardTitle></CardHeader>
              <CardContent>
                {pendingInvitations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Δεν υπάρχουν εκκρεμείς προσκλήσεις</p>
                ) : (
                  <div className="space-y-3">{pendingInvitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border">
                      <div>
                        <p className="font-medium">{inv.email}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{inv.role}</Badge>
                          <span className="text-xs text-muted-foreground">Λήγει: {format(new Date(inv.expires_at), 'd MMM', { locale: el })}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleCancelInvitation(inv.id)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="audit">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Audit Log</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {auditLog.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Δεν υπάρχουν καταγραφές</p>
                    ) : (
                      <div className="space-y-2">{auditLog.map(log => (
                        <div key={log.id} className="p-3 rounded-lg bg-secondary/30 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.actor_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'd MMM HH:mm', { locale: el })}</span>
                          </div>
                          <p className="text-muted-foreground">{log.action} {log.target_user_name && `→ ${log.target_user_name}`}</p>
                        </div>
                      ))}</div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onSuccess={refreshData} />
      <EditPermissionsDialog user={editingUser} open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)} onSuccess={refreshData} />
    </div>
  );
}