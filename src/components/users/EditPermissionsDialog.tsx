import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Shield, FolderOpen, Briefcase, Users } from 'lucide-react';
import { AccessScope, PermissionType } from '@/contexts/AuthContext';
import { CompanyUser, PERMISSION_CATEGORIES, useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';

interface EditPermissionsDialogProps {
  user: CompanyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPermissionsDialog({ user, open, onOpenChange, onSuccess }: EditPermissionsDialogProps) {
  const { updateUserPermissions, updateUserAccessScope } = useRBAC();
  const [saving, setSaving] = useState(false);
  const [accessScope, setAccessScope] = useState<AccessScope>('assigned');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (user) {
      setAccessScope(user.access_scope);
      setSelectedPermissions([...user.permissions]);
      setSelectedClients([...user.client_ids]);
      setSelectedProjects([...user.project_ids]);
    }
  }, [user]);

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
    if (!user) return;

    setSaving(true);
    try {
      await updateUserPermissions(user.user_id, selectedPermissions);
      await updateUserAccessScope(user.user_id, accessScope, selectedClients, selectedProjects);
      
      toast.success('Τα δικαιώματα ενημερώθηκαν');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast.error(error.message || 'Σφάλμα κατά την ενημέρωση');
    } finally {
      setSaving(false);
    }
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

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            Επεξεργασία Δικαιωμάτων
          </DialogTitle>
          <DialogDescription>
            {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Access Scope */}
              {user.role !== 'client' && (
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

              {/* Client/Project Selection */}
              {accessScope === 'assigned' && user.role !== 'client' && (
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
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Αποθήκευση
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}