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
import { toast } from 'sonner';
import { Loader2, Mail, Shield, FolderOpen, Briefcase } from 'lucide-react';
import { CompanyRole, AccessScope, PermissionType } from '@/contexts/AuthContext';
import { useRBAC, DEFAULT_ROLE_PERMISSIONS } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';
import { PermissionModuleSelector } from './PermissionModuleSelector';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing'
};

const ROLE_DESCRIPTIONS: Record<CompanyRole, string> = {
  owner: 'Πλήρης πρόσβαση σε όλα + settings + audit',
  admin: 'Διαχείριση χρηστών, clients, projects',
  manager: 'Διαχείριση assigned clients/projects',
  member: 'Πρόσβαση σε assigned projects/tasks',
  viewer: 'Μόνο ανάγνωση',
  billing: 'Πρόσβαση μόνο στο billing section'
};

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const { createInvitation } = useRBAC();
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>('member');
  const [accessScope, setAccessScope] = useState<AccessScope>('assigned');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);

  useEffect(() => {
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Εισάγετε email');
      return;
    }

    setSaving(true);
    try {
      await createInvitation({
        email,
        role,
        access_scope: accessScope,
        permissions: selectedPermissions,
        client_ids: [],
        project_ids: []
      });

      toast.success(`Η πρόσκληση στάλθηκε στο ${email}`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      if (error.code === '23505') {
        toast.error('Υπάρχει ήδη πρόσκληση για αυτό το email');
      } else {
        toast.error('Σφάλμα κατά την αποστολή πρόσκλησης');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setRole('member');
    setAccessScope('assigned');
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS['member']);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Πρόσκληση Νέου Χρήστη
          </DialogTitle>
          <DialogDescription>
            Στείλτε πρόσκληση σε νέο χρήστη με magic link
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto pr-4">
            <div className="space-y-6 pb-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Ρόλος</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['admin', 'manager', 'member', 'viewer', 'billing'] as CompanyRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all duration-200",
                        role === r
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className={cn("h-4 w-4", role === r ? "text-foreground" : "text-muted-foreground")} />
                        <span className="font-medium">{ROLE_LABELS[r]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[r]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Access Scope */}
              {role !== 'billing' && (
                <div className="space-y-2">
                  <Label>Εύρος Πρόσβασης</Label>
                  <Select value={accessScope} onValueChange={(v) => setAccessScope(v as AccessScope)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Όλη η εταιρεία
                        </div>
                      </SelectItem>
                      <SelectItem value="assigned">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          Μόνο ανατεθειμένα
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Module Permissions */}
              <PermissionModuleSelector
                selectedPermissions={selectedPermissions}
                onChange={setSelectedPermissions}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Αποστολή Πρόσκλησης
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
