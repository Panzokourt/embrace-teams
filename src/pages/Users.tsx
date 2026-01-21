import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  UserCheck, 
  UserX, 
  Shield, 
  Clock, 
  CheckCircle2,
  XCircle,
  Users,
  UserPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Ban,
  Crown,
  Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserStatus = 'invited' | 'pending' | 'active' | 'suspended' | 'deactivated';
type AppRole = 'admin' | 'manager' | 'employee' | 'client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
  roles: AppRole[];
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ReactNode; className: string }> = {
  admin: { label: 'Admin', icon: <Shield className="h-3 w-3" />, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  manager: { label: 'Manager', icon: <Briefcase className="h-3 w-3" />, className: 'bg-primary/10 text-primary border-primary/20' },
  employee: { label: 'Employee', icon: <Users className="h-3 w-3" />, className: 'bg-secondary text-secondary-foreground border-border' },
  client: { label: 'Client', icon: <Users className="h-3 w-3" />, className: 'bg-success/10 text-success border-success/20' },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; icon: React.ReactNode; className: string }> = {
  invited: { label: 'Προσκλήθηκε', icon: <UserPlus className="h-3 w-3" />, className: 'bg-primary/10 text-primary border-primary/20' },
  pending: { label: 'Αναμονή', icon: <Clock className="h-3 w-3" />, className: 'bg-warning/10 text-warning border-warning/20' },
  active: { label: 'Ενεργός', icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-success/10 text-success border-success/20' },
  suspended: { label: 'Ανεσταλμένος', icon: <Ban className="h-3 w-3" />, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  deactivated: { label: 'Απενεργοποιημένος', icon: <XCircle className="h-3 w-3" />, className: 'bg-muted text-muted-foreground border-border' },
};

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '' as AppRole, status: '' as UserStatus });
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Σφάλμα κατά τη φόρτωση χρηστών');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.roles[0] || 'employee',
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: editForm.full_name,
          status: editForm.status 
        } as any)
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role - delete existing and insert new
      await supabase.from('user_roles').delete().eq('user_id', editingUser.id);
      
      if (editForm.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: editingUser.id, role: editForm.role });
        
        if (roleError) throw roleError;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, full_name: editForm.full_name, status: editForm.status, roles: editForm.role ? [editForm.role] : [] }
          : u
      ));

      toast.success('Ο χρήστης ενημερώθηκε!');
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: UserProfile) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);

    try {
      // Delete user roles first
      await supabase.from('user_roles').delete().eq('user_id', deletingUser.id);
      
      // Delete profile (this won't delete auth user, just the profile)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id));
      toast.success('Ο χρήστης διαγράφηκε!');
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleting(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus } as any)
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));

      toast.success('Η κατάσταση ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    } finally {
      setActionLoading(null);
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    setActionLoading(userId);
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, roles: [role] } : u
      ));

      toast.success(`Ο ρόλος "${role}" ανατέθηκε επιτυχώς`);
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Σφάλμα κατά την ανάθεση ρόλου');
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingUsers = users.filter(u => u.status === 'pending' || u.status === 'invited');
  const activeUsers = users.filter(u => u.status === 'active');
  const inactiveUsers = users.filter(u => u.status === 'deactivated' || u.status === 'suspended');

  if (!isAdmin) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Δεν έχετε πρόσβαση</CardTitle>
            <CardDescription>
              Μόνο οι Admins μπορούν να διαχειριστούν χρήστες.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" />
            Διαχείριση Χρηστών
          </h1>
          <p className="text-muted-foreground mt-1">
            Έγκριση, ανάθεση ρόλων και διαχείριση πρόσβασης
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Αναζήτηση χρήστη..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingUsers.length}</p>
                <p className="text-sm text-muted-foreground">Αναμονή έγκρισης</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers.length}</p>
                <p className="text-sm text-muted-foreground">Ενεργοί χρήστες</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <UserX className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveUsers.length}</p>
                <p className="text-sm text-muted-foreground">Ανενεργοί</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Σύνολο</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-warning" />
              Αιτήσεις προς έγκριση ({pendingUsers.length})
            </CardTitle>
            <CardDescription>
              Οι παρακάτω χρήστες περιμένουν έγκριση για να αποκτήσουν πρόσβαση
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-background border">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.full_name || 'Χωρίς όνομα'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      onValueChange={(role) => assignRole(user.id, role as AppRole)}
                      disabled={actionLoading === user.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Επιλογή ρόλου" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm" 
                      onClick={() => updateUserStatus(user.id, 'active')}
                      disabled={actionLoading === user.id || user.roles.length === 0}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Έγκριση
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Όλοι οι Χρήστες</CardTitle>
          <CardDescription>
            Διαχείριση ρόλων και κατάστασης χρηστών
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Δεν βρέθηκαν χρήστες
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Χρήστης</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead>Ημ/νία εγγραφής</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => {
                  const roleConfig = user.roles[0] ? ROLE_CONFIG[user.roles[0]] : null;
                  const statusConfig = STATUS_CONFIG[user.status];
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name || 'Χωρίς όνομα'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {roleConfig ? (
                          <Badge variant="outline" className={cn("flex items-center gap-1 w-fit", roleConfig.className)}>
                            {roleConfig.icon}
                            {roleConfig.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Χωρίς ρόλο</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("flex items-center gap-1 w-fit", statusConfig.className)}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('el-GR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ενέργειες</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Επεξεργασία
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Γρήγορη αλλαγή ρόλου</DropdownMenuLabel>
                            {(['admin', 'manager', 'employee', 'client'] as AppRole[]).map(role => (
                              <DropdownMenuItem 
                                key={role}
                                disabled={user.roles[0] === role || actionLoading === user.id}
                                onClick={() => assignRole(user.id, role)}
                              >
                                {ROLE_CONFIG[role].icon}
                                <span className="ml-2">{ROLE_CONFIG[role].label}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {user.status === 'active' ? (
                              <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'suspended')}>
                                <Ban className="h-4 w-4 mr-2 text-warning" />
                                Αναστολή
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateUserStatus(user.id, 'active')}>
                                <UserCheck className="h-4 w-4 mr-2 text-success" />
                                Ενεργοποίηση
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Διαγραφή
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editingUser && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={editingUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(editingUser.full_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              Επεξεργασία Χρήστη
            </DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ονοματεπώνυμο</Label>
              <Input
                id="fullName"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="π.χ. Γιάννης Παπαδόπουλος"
              />
            </div>
            <div className="space-y-2">
              <Label>Ρόλος</Label>
              <Select 
                value={editForm.role} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, role: v as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε ρόλο" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Κατάσταση</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v as UserStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ενεργός</SelectItem>
                  <SelectItem value="suspended">Ανεσταλμένος</SelectItem>
                  <SelectItem value="deactivated">Απενεργοποιημένος</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή χρήστη</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη "{deletingUser?.full_name || deletingUser?.email}"; 
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
