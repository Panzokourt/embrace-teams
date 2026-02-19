import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Mail, Shield, Users, FolderOpen, Briefcase } from 'lucide-react';
import { CompanyRole, AccessScope, PermissionType } from '@/contexts/AuthContext';
import { useRBAC, PERMISSION_CATEGORIES, DEFAULT_ROLE_PERMISSIONS } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Set default permissions based on role
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  }, [role]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: clientsData }, { data: projectsData }] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('projects').select('id, name').order('name')
      ]);
      setClients(clientsData || []);
      setProjects(projectsData || []);
    };
    if (open) fetchData();
  }, [open]);

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
        client_ids: accessScope === 'assigned' ? selectedClients : [],
        project_ids: accessScope === 'assigned' ? selectedProjects : []
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
    setSelectedClients([]);
    setSelectedProjects([]);
  };

  const togglePermission = (permission: PermissionType) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleAllCategory = (category: string, permissions: readonly string[]) => {
    const allSelected = permissions.every(p => selectedPermissions.includes(p as PermissionType));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !permissions.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...permissions as unknown as PermissionType[]])]);
    }
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
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
                        <Shield className={cn("h-4 w-4", role === r ? "text-primary" : "text-muted-foreground")} />
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

              {/* Client/Project Selection for assigned scope */}
              {accessScope === 'assigned' && role !== 'billing' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clients ({selectedClients.length})
                    </Label>
                    <ScrollArea className="h-32 rounded-lg border p-2">
                      <div className="space-y-1">
                        {clients.map(client => (
                          <label key={client.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary cursor-pointer">
                            <Checkbox
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={(checked) => {
                                setSelectedClients(prev =>
                                  checked ? [...prev, client.id] : prev.filter(id => id !== client.id)
                                );
                              }}
                            />
                            <span className="text-sm">{client.name}</span>
                          </label>
                        ))}
                        {clients.length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">Δεν υπάρχουν clients</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Projects ({selectedProjects.length})
                    </Label>
                    <ScrollArea className="h-32 rounded-lg border p-2">
                      <div className="space-y-1">
                        {projects.map(project => (
                          <label key={project.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary cursor-pointer">
                            <Checkbox
                              checked={selectedProjects.includes(project.id)}
                              onCheckedChange={(checked) => {
                                setSelectedProjects(prev =>
                                  checked ? [...prev, project.id] : prev.filter(id => id !== project.id)
                                );
                              }}
                            />
                            <span className="text-sm">{project.name}</span>
                          </label>
                        ))}
                        {projects.length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">Δεν υπάρχουν projects</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Δικαιώματα ({selectedPermissions.length})
                </Label>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
                    const categorySelected = permissions.filter(p => selectedPermissions.includes(p as PermissionType)).length;
                    return (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={categorySelected === permissions.length}
                              onCheckedChange={() => toggleAllCategory(category, permissions)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span>{category}</span>
                            <Badge variant="secondary" className="ml-2">
                              {categorySelected}/{permissions.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-1 pl-6">
                            {permissions.map(permission => (
                              <label key={permission} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary cursor-pointer">
                                <Checkbox
                                  checked={selectedPermissions.includes(permission as PermissionType)}
                                  onCheckedChange={() => togglePermission(permission as PermissionType)}
                                />
                                <span className="text-sm">{permission.split('.')[1]}</span>
                              </label>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </ScrollArea>

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