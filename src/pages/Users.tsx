import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserStatus = 'pending' | 'active' | 'inactive';
type AppRole = 'admin' | 'manager' | 'employee' | 'client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  status: UserStatus;
  created_at: string;
  roles: AppRole[];
}

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status } : u
      ));

      toast.success(status === 'active' ? 'Ο χρήστης εγκρίθηκε!' : 'Ο χρήστης απενεργοποιήθηκε');
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
      // First, remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then add new role
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

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" /> Αναμονή</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Ενεργός</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><XCircle className="h-3 w-3 mr-1" /> Ανενεργός</Badge>;
    }
  };

  const getRoleBadge = (role: AppRole) => {
    const styles = {
      admin: 'bg-destructive/10 text-destructive border-destructive/20',
      manager: 'bg-primary/10 text-primary border-primary/20',
      employee: 'bg-accent/10 text-accent border-accent/20',
      client: 'bg-success/10 text-success border-success/20',
    };
    
    const labels = {
      admin: 'Admin',
      manager: 'Manager',
      employee: 'Employee',
      client: 'Client',
    };

    return (
      <Badge variant="outline" className={styles[role]}>
        {labels[role]}
      </Badge>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active');
  const inactiveUsers = users.filter(u => u.status === 'inactive');

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" />
            Διαχείριση Χρηστών
          </h1>
          <p className="text-muted-foreground mt-1">
            Έγκριση, ανάθεση ρόλων και διαχείριση πρόσβασης
          </p>
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

      {/* All Users Table */}
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Χρήστης</TableHead>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                  <TableHead>Ημ/νία εγγραφής</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'Χωρίς όνομα'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map(role => (
                            <span key={role}>{getRoleBadge(role)}</span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Χωρίς ρόλο</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('el-GR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={user.roles[0] || ''}
                          onValueChange={(role) => assignRole(user.id, role as AppRole)}
                          disabled={actionLoading === user.id}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue placeholder="Ρόλος" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {user.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, 'inactive')}
                            disabled={actionLoading === user.id}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : user.status === 'inactive' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, 'active')}
                            disabled={actionLoading === user.id}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
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
