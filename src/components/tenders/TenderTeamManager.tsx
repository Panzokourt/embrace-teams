import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, UserMinus, Users, Crown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  tender_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface TenderTeamManagerProps {
  tenderId: string;
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  lead: { label: 'Team Lead', icon: <Crown className="h-3 w-3" />, className: 'bg-warning/10 text-warning border-warning/20' },
  member: { label: 'Μέλος', icon: <User className="h-3 w-3" />, className: 'bg-muted text-muted-foreground' },
};

export function TenderTeamManager({ tenderId }: TenderTeamManagerProps) {
  const { isAdmin, isManager } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const canManage = isAdmin || isManager;

  const fetchTeamMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tender_team_access')
        .select('*')
        .eq('tender_id', tenderId);

      if (error) throw error;

      // Fetch profiles for team members
      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          const membersWithProfiles = data.map(member => ({
            ...member,
            profile: profiles.find(p => p.id === member.user_id)
          }));
          setMembers(membersWithProfiles);
        } else {
          setMembers(data);
        }
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Σφάλμα κατά τη φόρτωση ομάδας');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  const fetchAvailableProfiles = useCallback(async () => {
    try {
      // Get active users from user_company_roles and join with profiles
      const { data: activeUsers, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('status', 'active');

      if (rolesError) throw rolesError;

      if (activeUsers && activeUsers.length > 0) {
        const userIds = activeUsers.map(u => u.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        setAvailableProfiles(profiles || []);
      } else {
        // Fallback: get all profiles in the company
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url');

        if (error) throw error;
        setAvailableProfiles(data || []);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
    fetchAvailableProfiles();
  }, [fetchTeamMembers, fetchAvailableProfiles]);

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Επιλέξτε χρήστη');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tender_team_access')
        .insert({
          tender_id: tenderId,
          user_id: selectedUserId,
          role: selectedRole
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Ο χρήστης είναι ήδη μέλος της ομάδας');
        } else {
          throw error;
        }
      } else {
        toast.success('Το μέλος προστέθηκε!');
        setDialogOpen(false);
        setSelectedUserId('');
        setSelectedRole('member');
        fetchTeamMembers();
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Σφάλμα κατά την προσθήκη');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('tender_team_access')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Το μέλος αφαιρέθηκε!');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Σφάλμα κατά την αφαίρεση');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('tender_team_access')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      toast.success('Ο ρόλος ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  // Filter out already assigned users
  const unassignedProfiles = availableProfiles.filter(
    profile => !members.some(m => m.user_id === profile.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ομάδα Διαγωνισμού
          </CardTitle>
          <CardDescription>
            Διαχείριση μελών της ομάδας που εργάζεται στον διαγωνισμό
          </CardDescription>
        </div>
        {canManage && unassignedProfiles.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Προσθήκη Μέλους
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Προσθήκη Μέλους</DialogTitle>
                <DialogDescription>
                  Επιλέξτε χρήστη για να τον προσθέσετε στην ομάδα
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Χρήστης</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε χρήστη" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedProfiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ρόλος</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Team Lead</SelectItem>
                      <SelectItem value="member">Μέλος</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Ακύρωση
                </Button>
                <Button onClick={handleAddMember} disabled={saving || !selectedUserId}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Προσθήκη
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Δεν έχουν προστεθεί μέλη στην ομάδα</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const config = roleConfig[member.role] || roleConfig.member;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.profile?.full_name || 'Χωρίς Όνομα'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.profile?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Team Lead</SelectItem>
                          <SelectItem value="member">Μέλος</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
                        {config.icon}
                        {config.label}
                      </Badge>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
