import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTeamsRealtime } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  UserPlus,
  Loader2,
  X
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  user_id: string;
  profile?: Profile;
}

const TEAM_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

export default function TeamsPage() {
  const { isAdmin, isManager } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
  });

  const fetchTeams = useCallback(async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('id, team_id, user_id');

      if (membersError) throw membersError;

      // Fetch profiles separately for each member
      const memberUserIds = [...new Set((membersData || []).map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', memberUserIds.length > 0 ? memberUserIds : ['no-users']);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const teamsWithMembers = (teamsData || []).map(team => ({
        ...team,
        members: (membersData || [])
          .filter(m => m.team_id === team.id)
          .map(m => ({
            id: m.id,
            user_id: m.user_id,
            profile: profilesMap.get(m.user_id) as Profile | undefined
          }))
      }));

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Σφάλμα κατά τη φόρτωση ομάδων');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // First get active users from user_company_roles for this company
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('status', 'active');

      if (rolesError) throw rolesError;
      
      const userIds = rolesData?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        setAvailableUsers([]);
        return;
      }

      // Then fetch profiles for those users
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  // Subscribe to realtime updates
  useTeamsRealtime(fetchTeams);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, [fetchTeams, fetchUsers]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const teamData = {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
      };

      if (editingTeam) {
        const { data, error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', editingTeam.id)
          .select()
          .single();

        if (error) throw error;
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...data, members: editingTeam.members } : t));
        toast.success('Η ομάδα ενημερώθηκε!');
      } else {
        const { data, error } = await supabase
          .from('teams')
          .insert(teamData)
          .select()
          .single();

        if (error) throw error;
        setTeams(prev => [...prev, { ...data, members: [] }]);
        toast.success('Η ομάδα δημιουργήθηκε!');
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      setTeams(prev => prev.filter(t => t.id !== teamId));
      toast.success('Η ομάδα διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return;
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({ team_id: selectedTeam.id, user_id: selectedUserId })
        .select(`id, team_id, user_id, profile:profiles(id, full_name, email, avatar_url)`)
        .single();

      if (error) throw error;

      const newMember: TeamMember = {
        id: data.id,
        user_id: data.user_id,
        profile: data.profile as any
      };

      setTeams(prev => prev.map(t => 
        t.id === selectedTeam.id 
          ? { ...t, members: [...(t.members || []), newMember] }
          : t
      ));

      setMemberDialogOpen(false);
      setSelectedUserId('');
      toast.success('Το μέλος προστέθηκε!');
    } catch (error: any) {
      console.error('Error adding member:', error);
      if (error.code === '23505') {
        toast.error('Το μέλος υπάρχει ήδη στην ομάδα');
      } else {
        toast.error('Σφάλμα κατά την προσθήκη');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setTeams(prev => prev.map(t => 
        t.id === teamId 
          ? { ...t, members: (t.members || []).filter(m => m.id !== memberId) }
          : t
      ));
      toast.success('Το μέλος αφαιρέθηκε!');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Σφάλμα κατά την αφαίρεση');
    }
  };

  const resetForm = () => {
    setEditingTeam(null);
    setFormData({ name: '', description: '', color: TEAM_COLORS[0] });
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvailableUsersForTeam = (team: Team) => {
    const memberIds = (team.members || []).map(m => m.user_id);
    return availableUsers.filter(u => !memberIds.includes(u.id));
  };

  const canManage = isAdmin || isManager;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" />
            Ομάδες
          </h1>
          <p className="text-muted-foreground mt-1">
            Διαχείριση ομάδων και μελών
          </p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Νέα Ομάδα
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTeam ? 'Επεξεργασία Ομάδας' : 'Δημιουργία Νέας Ομάδας'}</DialogTitle>
                <DialogDescription>
                  {editingTeam ? 'Ενημερώστε τα στοιχεία της ομάδας' : 'Δημιουργήστε μια νέα ομάδα'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Όνομα Ομάδας *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="π.χ. Creative Team"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Περιγραφή</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Χρώμα</Label>
                  <div className="flex gap-2">
                    {TEAM_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`h-8 w-8 rounded-full transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingTeam ? 'Αποθήκευση' : 'Δημιουργία'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Προσθήκη Μέλους</DialogTitle>
            <DialogDescription>
              Προσθέστε ένα μέλος στην ομάδα "{selectedTeam?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Επιλέξτε χρήστη</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε χρήστη" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTeam && getAvailableUsersForTeam(selectedTeam).map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
              Ακύρωση
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Προσθήκη
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν ομάδες</h3>
            <p className="text-muted-foreground mb-4">
              Δημιουργήστε την πρώτη σας ομάδα για να οργανώσετε τα μέλη
            </p>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Νέα Ομάδα
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>
                        {team.members?.length || 0} μέλη
                      </CardDescription>
                    </div>
                  </div>
                  {canManage && (
                    <EditDeleteActions
                      onEdit={() => handleEdit(team)}
                      onDelete={() => handleDelete(team.id)}
                      itemName={`την ομάδα "${team.name}"`}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {team.description}
                  </p>
                )}

                {/* Members */}
                <div className="space-y-2">
                  {(team.members || []).map(member => (
                    <div key={member.id} className="flex items-center gap-3 group">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile?.email}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMember(team.id, member.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {canManage && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => { setSelectedTeam(team); setMemberDialogOpen(true); }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Προσθήκη Μέλους
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
