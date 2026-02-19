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
import { Loader2, Shield, FolderOpen, Briefcase, Users, Building2, UsersRound } from 'lucide-react';
import { AccessScope, PermissionType } from '@/contexts/AuthContext';
import { CompanyUser, PERMISSION_CATEGORIES, useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EditPermissionsDialogProps {
  user: CompanyUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

interface Team {
  id: string;
  name: string;
  color: string | null;
}

export function EditPermissionsDialog({ user, open, onOpenChange, onSuccess }: EditPermissionsDialogProps) {
  const { company } = useAuth();
  const { updateUserPermissions, updateUserAccessScope } = useRBAC();
  const [saving, setSaving] = useState(false);
  const [accessScope, setAccessScope] = useState<AccessScope>('assigned');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('none');
  const [selectedTeam, setSelectedTeam] = useState<string>('none');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

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
      if (!company?.id) return;
      
      const [
        { data: clientsData }, 
        { data: projectsData },
        { data: departmentsData },
        { data: teamsData },
        { data: profileData }
      ] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('departments').select('id, name, color').eq('company_id', company.id).order('name'),
        supabase.from('teams').select('id, name, color').eq('company_id', company.id).order('name'),
        user ? supabase.from('profiles').select('department_id').eq('id', user.user_id).single() : Promise.resolve({ data: null })
      ]);
      
      setClients(clientsData || []);
      setProjects(projectsData || []);
      setDepartments(departmentsData || []);
      setTeams(teamsData || []);
      
      if (profileData?.department_id) {
        setSelectedDepartment(profileData.department_id);
      }
      
      // Fetch user's team membership
      if (user) {
        const { data: teamMembership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.user_id)
          .limit(1)
          .maybeSingle();
        
        if (teamMembership?.team_id) {
          setSelectedTeam(teamMembership.team_id);
        }
      }
    };
    if (open) fetchData();
  }, [open, company?.id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Update department in profile if scope is department
      if (accessScope === 'department' && selectedDepartment !== 'none') {
        await supabase
          .from('profiles')
          .update({ department_id: selectedDepartment })
          .eq('id', user.user_id);
      }
      
      // Update team membership if scope is team
      if (accessScope === 'team' && selectedTeam !== 'none') {
        // Remove from other teams first
        await supabase
          .from('team_members')
          .delete()
          .eq('user_id', user.user_id);
        
        // Add to selected team
        await supabase
          .from('team_members')
          .insert({ user_id: user.user_id, team_id: selectedTeam });
      }
      
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
              {user.role !== 'billing' && (
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
                      <SelectItem value="department">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Τμήμα
                        </div>
                      </SelectItem>
                      <SelectItem value="team">
                        <div className="flex items-center gap-2">
                          <UsersRound className="h-4 w-4" />
                          Ομάδα
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

              {/* Department Selection for department scope */}
              {accessScope === 'department' && user.role !== 'billing' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Τμήμα Πρόσβασης
                  </Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε τμήμα" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Επιλέξτε τμήμα</SelectItem>
                      {departments.map(dept => (
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
                  <p className="text-xs text-muted-foreground">
                    Ο χρήστης θα βλέπει όλα τα δεδομένα του τμήματος
                  </p>
                </div>
              )}

              {/* Team Selection for team scope */}
              {accessScope === 'team' && user.role !== 'billing' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4" />
                    Ομάδα Πρόσβασης
                  </Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε ομάδα" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Επιλέξτε ομάδα</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: team.color || '#3B82F6' }}
                            />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ο χρήστης θα βλέπει τα δεδομένα της ομάδας και των υφισταμένων του
                  </p>
                </div>
              )}

              {/* Client/Project Selection */}
              {accessScope === 'assigned' && user.role !== 'billing' && (
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