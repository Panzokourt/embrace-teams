import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, 
  UserPlus, 
  UserMinus, 
  Users,
  Search,
  X 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamMember {
  id: string;
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  role?: {
    role: string;
  };
}

interface AvailableUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string;
}

interface ProjectTeamManagerProps {
  projectId: string;
  canEdit: boolean;
}

// Get company ID from the auth context's company object

export function ProjectTeamManager({ projectId, canEdit }: ProjectTeamManagerProps) {
  const { company } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [projectId]);

  useEffect(() => {
    if (addDialogOpen) {
      fetchAvailableUsers();
    }
  }, [addDialogOpen]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_user_access')
        .select('id, user_id')
        .eq('project_id', projectId);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        // Fetch roles
        const { data: roles } = await supabase
          .from('user_company_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const rolesMap = new Map(roles?.map(r => [r.user_id, r]) || []);

        const members = data.map(m => ({
          ...m,
          profile: profilesMap.get(m.user_id) || { id: m.user_id, full_name: null, email: 'Unknown', avatar_url: null },
          role: rolesMap.get(m.user_id),
        }));

        setTeamMembers(members);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!company?.id) return;

    try {
      // Get users from the same company
      const { data: companyUsers } = await supabase
        .from('user_company_roles')
        .select('user_id, role')
        .eq('company_id', company.id)
        .eq('status', 'active');

      if (!companyUsers || companyUsers.length === 0) {
        setAvailableUsers([]);
        return;
      }

      const userIds = companyUsers.map(u => u.user_id);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      // Filter out already assigned users
      const assignedIds = new Set(teamMembers.map(m => m.user_id));
      const rolesMap = new Map(companyUsers.map(u => [u.user_id, u.role]));

      const available = (profiles || [])
        .filter(p => !assignedIds.has(p.id))
        .map(p => ({
          ...p,
          role: rolesMap.get(p.id),
        }));

      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const addMember = async (userId: string) => {
    setAdding(userId);
    try {
      const { error } = await supabase
        .from('project_user_access')
        .insert({
          project_id: projectId,
          user_id: userId,
        });

      if (error) throw error;

      toast.success('Το μέλος προστέθηκε στην ομάδα!');
      fetchTeamMembers();
      fetchAvailableUsers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Σφάλμα κατά την προσθήκη');
    } finally {
      setAdding(null);
    }
  };

  const removeMember = async (accessId: string) => {
    setRemoving(accessId);
    try {
      const { error } = await supabase
        .from('project_user_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast.success('Το μέλος αφαιρέθηκε από την ομάδα!');
      setTeamMembers(prev => prev.filter(m => m.id !== accessId));
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Σφάλμα κατά την αφαίρεση');
    } finally {
      setRemoving(null);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role?: string) => {
    const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      owner: { label: 'Owner', variant: 'default' },
      admin: { label: 'Admin', variant: 'default' },
      manager: { label: 'Manager', variant: 'secondary' },
      member: { label: 'Member', variant: 'outline' },
      viewer: { label: 'Viewer', variant: 'outline' },
      billing: { label: 'Billing', variant: 'outline' },
    };
    const config = roleLabels[role || 'member'] || roleLabels.member;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredUsers = availableUsers.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      (user.full_name?.toLowerCase().includes(search) || false) ||
      user.email.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Ομάδα Έργου</h3>
          <Badge variant="secondary">{teamMembers.length} μέλη</Badge>
        </div>
        
        {canEdit && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Προσθήκη Μέλους
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Προσθήκη Μέλους</DialogTitle>
                <DialogDescription>
                  Επιλέξτε χρήστη για να προσθέσετε στην ομάδα του έργου
                </DialogDescription>
              </DialogHeader>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Αναζήτηση χρήστη..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[300px] pr-4">
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Δεν βρέθηκαν διαθέσιμοι χρήστες
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>{getInitials(user.full_name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {user.full_name || user.email.split('@')[0]}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {getRoleBadge(user.role)}
                        <Button
                          size="sm"
                          onClick={() => addMember(user.id)}
                          disabled={adding === user.id}
                        >
                          {adding === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team members list */}
      {teamMembers.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">Δεν έχουν ανατεθεί μέλη στο έργο</p>
          {canEdit && (
            <p className="text-sm text-muted-foreground mt-1">
              Πατήστε "Προσθήκη Μέλους" για να ξεκινήσετε
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {teamMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 group"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={member.profile.avatar_url || ''} />
                <AvatarFallback>
                  {getInitials(member.profile.full_name, member.profile.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {member.profile.full_name || member.profile.email.split('@')[0]}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {member.profile.email}
                </p>
              </div>
              {getRoleBadge(member.role?.role)}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => removeMember(member.id)}
                  disabled={removing === member.id}
                  title="Αφαίρεση"
                >
                  {removing === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
