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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, UserPlus, Shield, Clock, Search, 
  Mail, X, History, Loader2, Crown, CheckCircle2,
  MoreHorizontal, Pencil, Trash2, UserCog, Ban, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';
import { EditPermissionsDialog } from '@/components/users/EditPermissionsDialog';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { CompanyRole, UserStatus } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const roleLabels: Record<CompanyRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  standard: 'Standard',
  client: 'Client'
};

const statusLabels: Record<UserStatus, string> = {
  invited: 'Προσκεκλημένος',
  pending: 'Αναμονή',
  active: 'Ενεργός',
  suspended: 'Ανεσταλμένος',
  deactivated: 'Απενεργοποιημένος'
};

const roleColors: Record<CompanyRole, string> = {
  super_admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  standard: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  client: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
};

const statusColors: Record<UserStatus, string> = {
  invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  deactivated: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
};

export default function UsersAccessPage() {
  const { isCompanyAdmin, isSuperAdmin, company, user: currentUser } = useAuth();
  const { users, invitations, auditLog, loading, updateUserRole, updateUserStatus, cancelInvitation, refreshData } = useRBAC();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<CompanyUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<CompanyUser | null>(null);
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

  const handleDeleteUser = async () => {
    if (!deletingUser || !company) return;
    try {
      // Delete user_company_roles
      await supabase
        .from('user_company_roles')
        .delete()
        .eq('user_id', deletingUser.user_id)
        .eq('company_id', company.id);

      // Delete user_permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', deletingUser.user_id)
        .eq('company_id', company.id);

      // Delete user_access_assignments
      await supabase
        .from('user_access_assignments')
        .delete()
        .eq('user_id', deletingUser.user_id)
        .eq('company_id', company.id);

      toast.success('Ο χρήστης διαγράφηκε από την εταιρεία');
      setDeletingUser(null);
      refreshData();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή');
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Χρήστης</TableHead>
                      <TableHead>Ρόλος</TableHead>
                      <TableHead>Κατάσταση</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Τελευταία Σύνδεση</TableHead>
                      <TableHead className="text-right">Ενέργειες</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <span className="text-muted-foreground">Δεν βρέθηκαν χρήστες</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(user.full_name, user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{user.full_name || 'Χωρίς όνομα'}</span>
                                  {user.user_id === currentUser?.id && (
                                    <Badge variant="secondary" className="text-xs">Εσείς</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColors[user.role]}>
                              {roleLabels[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[user.status]}>
                              {statusLabels[user.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {user.access_scope === 'company' ? 'Company-wide' : 'Assigned'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {user.last_login_at 
                                ? format(new Date(user.last_login_at), 'd MMM yyyy', { locale: el })
                                : '-'
                              }
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ενέργειες</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Επεξεργασία
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditingPermissionsUser(user)}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Δικαιώματα
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Αλλαγή Ρόλου</DropdownMenuLabel>
                                {(['super_admin', 'admin', 'manager', 'standard', 'client'] as CompanyRole[]).map((role) => (
                                  <DropdownMenuItem 
                                    key={role} 
                                    onClick={() => handleChangeRole(user.user_id, role)}
                                    disabled={user.role === role || user.user_id === currentUser?.id}
                                  >
                                    {roleLabels[role]}
                                    {user.role === role && <CheckCircle2 className="h-4 w-4 ml-auto text-success" />}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                {user.status === 'active' ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleChangeStatus(user.user_id, 'suspended')}
                                    disabled={user.user_id === currentUser?.id}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Αναστολή
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleChangeStatus(user.user_id, 'active')}>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Ενεργοποίηση
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeletingUser(user)}
                                  className="text-destructive"
                                  disabled={user.user_id === currentUser?.id}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Διαγραφή
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader><CardTitle>Εκκρεμείς Προσκλήσεις</CardTitle></CardHeader>
              <CardContent>
                {pendingInvitations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Δεν υπάρχουν εκκρεμείς προσκλήσεις</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Ρόλος</TableHead>
                        <TableHead>Ημ. Λήξης</TableHead>
                        <TableHead className="text-right">Ενέργειες</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvitations.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{roleLabels[inv.role]}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(inv.expires_at), 'd MMM yyyy', { locale: el })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCancelInvitation(inv.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      {/* Dialogs */}
      <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onSuccess={refreshData} />
      <EditPermissionsDialog user={editingPermissionsUser} open={!!editingPermissionsUser} onOpenChange={(o) => !o && setEditingPermissionsUser(null)} onSuccess={refreshData} />
      <EditUserDialog 
        user={editingUser} 
        open={!!editingUser} 
        onOpenChange={(o) => !o && setEditingUser(null)} 
        onSuccess={refreshData}
        onChangeRole={handleChangeRole}
        onChangeStatus={handleChangeStatus}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Χρήστη</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <strong>{deletingUser?.full_name || deletingUser?.email}</strong> από την εταιρεία; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
