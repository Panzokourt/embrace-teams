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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Wand2, Check, ChevronsUpDown } from 'lucide-react';
import { CompanyRole, AccessScope, PermissionType } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_ROLE_PERMISSIONS } from '@/hooks/useRBAC';
import { PermissionModuleSelector } from './PermissionModuleSelector';
import { cn } from '@/lib/utils';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ROLE_OPTIONS: { value: CompanyRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'billing', label: 'Billing' },
];

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const { isSuperAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [reportsTo, setReportsTo] = useState('none');
  const [role, setRole] = useState<CompanyRole>('member');
  const [accessScope, setAccessScope] = useState<AccessScope>('assigned');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<string[]>([]);
  const [jobTitleOpen, setJobTitleOpen] = useState(false);
  const [jobTitleSearch, setJobTitleSearch] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchDepartments();
      fetchJobTitles();
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS.member);
    }
  }, [open]);

  useEffect(() => {
    if (role !== 'owner') {
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[role]);
    }
  }, [role]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    setUsers(data || []);
  };

  const fetchDepartments = async () => {
    const { company } = useAuth.getState?.() || {};
    const companyId = company?.id;
    if (!companyId) return;
    const { data } = await supabase.from('departments').select('id, name').eq('company_id', companyId).order('name');
    setDepartments(data || []);
  };

  const fetchJobTitles = async () => {
    const { data } = await supabase.from('profiles').select('job_title').not('job_title', 'is', null);
    const titles = [...new Set((data || []).map(p => p.job_title).filter(Boolean) as string[])].sort();
    setJobTitleOptions(titles);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setJobTitle('');
    setDepartment('');
    setPhone('');
    setReportsTo('none');
    setRole('member');
    setAccessScope('assigned');
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS.member);
  };

  const handleSubmit = async () => {
    if (!email || !password || !fullName) {
      toast.error('Συμπληρώστε email, κωδικό και ονοματεπώνυμο');
      return;
    }

    if (password.length < 6) {
      toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          full_name: fullName,
          role,
          job_title: jobTitle || null,
          department: department || null,
          phone: phone || null,
          reports_to: reportsTo === 'none' ? null : reportsTo,
          hire_date: new Date().toISOString().split('T')[0],
          access_scope: accessScope,
          permissions: selectedPermissions
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Ο χρήστης ${fullName} δημιουργήθηκε επιτυχώς!`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Σφάλμα κατά τη δημιουργία χρήστη');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Προσθήκη Νέου Χρήστη</DialogTitle>
          <DialogDescription>
            Δημιουργήστε έναν νέο χρήστη με email και κωδικό
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-6 pb-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Ονοματεπώνυμο *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="π.χ. Γιάννης Παπαδόπουλος"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Κωδικός *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generatePassword}
                  className="h-7 text-xs"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Αυτόματος
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Τουλάχιστον 6 χαρακτήρες"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Τίτλος / Θέση</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="π.χ. Senior Developer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Τμήμα</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="π.χ. Development"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Τηλέφωνο</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="π.χ. 6912345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Αναφέρεται σε</Label>
                <Select value={reportsTo} onValueChange={setReportsTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Κανέναν" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Κανέναν</SelectItem>
                    {users.filter(u => u.id).map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || 'Χωρίς όνομα'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Ρόλος</Label>
              <div className="flex gap-2 flex-wrap">
                {isSuperAdmin && (
                  <Button
                    type="button"
                    variant={role === 'owner' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRole('owner')}
                  >
                    Owner
                  </Button>
                )}
                {ROLE_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={role === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRole(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Access Scope */}
            <div className="space-y-2">
              <Label>Εύρος Πρόσβασης</Label>
              <Select value={accessScope} onValueChange={(v) => setAccessScope(v as AccessScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company-wide (πλήρης πρόσβαση)</SelectItem>
                  <SelectItem value="assigned">Assigned only (ανατεθημένα)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Module Permissions */}
            <PermissionModuleSelector
              selectedPermissions={selectedPermissions}
              onChange={setSelectedPermissions}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Δημιουργία Χρήστη
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
