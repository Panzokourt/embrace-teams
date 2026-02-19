import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { Loader2, Trash2, Shield, Crown, Briefcase, Users, Building2 } from 'lucide-react';
import { CompanyRole, UserStatus } from '@/contexts/AuthContext';
import { CompanyUser } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Department {
  id: string;
  name: string;
  color: string;
}

interface EditUserDialogProps {
  user: CompanyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onChangeRole: (userId: string, role: CompanyRole) => Promise<void>;
  onChangeStatus: (userId: string, status: UserStatus) => Promise<void>;
}

const ROLE_OPTIONS: { value: CompanyRole; label: string; icon: React.ReactNode }[] = [
  { value: 'owner', label: 'Owner', icon: <Crown className="h-4 w-4" /> },
  { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
  { value: 'manager', label: 'Manager', icon: <Briefcase className="h-4 w-4" /> },
  { value: 'member', label: 'Member', icon: <Users className="h-4 w-4" /> },
  { value: 'viewer', label: 'Viewer', icon: <Users className="h-4 w-4" /> },
  { value: 'billing', label: 'Billing', icon: <Users className="h-4 w-4" /> },
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Ενεργός' },
  { value: 'suspended', label: 'Ανεσταλμένος' },
  { value: 'deactivated', label: 'Απενεργοποιημένος' },
];

export function EditUserDialog({ 
  user, 
  open, 
  onOpenChange, 
  onSuccess,
  onChangeRole,
  onChangeStatus 
}: EditUserDialogProps) {
  const { isSuperAdmin, user: currentUser, company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<CompanyRole>('member');
  const [status, setStatus] = useState<UserStatus>('active');
  const [departmentId, setDepartmentId] = useState<string>('none');
  const [departments, setDepartments] = useState<Department[]>([]);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!company?.id) return;
      const { data } = await supabase
        .from('departments')
        .select('id, name, color')
        .eq('company_id', company.id)
        .order('name');
      setDepartments(data || []);
    };
    if (open) fetchDepartments();
  }, [open, company?.id]);

  // Fetch user's current department
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!user?.user_id) return;
      const { data } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', user.user_id)
        .single();
      setDepartmentId(data?.department_id || 'none');
    };
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role);
      setStatus(user.status);
      fetchUserDepartment();
    }
  }, [user]);

  const isCurrentUser = currentUser?.id === user?.user_id;
  const isSuperAdminUser = user?.role === 'owner';
  const canModifyRole = isSuperAdmin || !isSuperAdminUser;
  const canDelete = (isSuperAdmin || !isSuperAdminUser) && !isCurrentUser;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profile name and department
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          department_id: departmentId === 'none' ? null : departmentId
        })
        .eq('id', user.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      if (role !== user.role && canModifyRole) {
        await onChangeRole(user.user_id, role);
      }

      // Update status if changed
      if (status !== user.status) {
        await onChangeStatus(user.user_id, status);
      }

      toast.success('Ο χρήστης ενημερώθηκε');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Σφάλμα κατά την ενημέρωση');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !company) return;
    setDeleting(true);

    try {
      // Delete user's permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', user.user_id)
        .eq('company_id', company.id);

      // Delete user's access assignments
      await supabase
        .from('user_access_assignments')
        .delete()
        .eq('user_id', user.user_id)
        .eq('company_id', company.id);

      // Delete user's company role (removes from company)
      const { error } = await supabase
        .from('user_company_roles')
        .delete()
        .eq('user_id', user.user_id)
        .eq('company_id', company.id);

      if (error) throw error;

      toast.success('Ο χρήστης αφαιρέθηκε από την εταιρεία');
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              Επεξεργασία Χρήστη
            </DialogTitle>
            <DialogDescription>
              {user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ονοματεπώνυμο</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="π.χ. Γιάννης Παπαδόπουλος"
              />
            </div>

            <div className="space-y-2">
              <Label>Ρόλος</Label>
              <Select 
                value={role} 
                onValueChange={(v) => setRole(v as CompanyRole)}
                disabled={!canModifyRole || isCurrentUser}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter(r => isSuperAdmin || r.value !== 'owner').map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Κατάσταση</Label>
              <Select 
                value={status} 
                onValueChange={(v) => setStatus(v as UserStatus)}
                disabled={isCurrentUser}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Τμήμα
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τμήμα" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένα τμήμα</SelectItem>
                  {departments.filter(dept => dept.id).map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: dept.color }}
                        />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Διαγραφή
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή χρήστη</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να αφαιρέσετε τον χρήστη "{user.full_name || user.email}" 
              από την εταιρεία; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
