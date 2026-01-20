import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  UserPlus,
  Loader2,
  Palette
} from 'lucide-react';

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
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const TEAM_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function TeamsPage() {
  const { isAdmin, isManager } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: TEAM_COLORS[0],
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          profile:profiles(full_name, email, avatar_url)
        `);

      if (membersError) throw membersError;

      const teamsWithMembers = (teamsData || []).map(team => ({
        ...team,
        members: (membersData || [])
          .filter(m => m.team_id === team.id)
          .map(m => ({
            id: m.id,
            user_id: m.user_id,
            profile: m.profile as any
          }))
      }));

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Σφάλμα κατά τη φόρτωση ομάδων');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        })
        .select()
        .single();

      if (error) throw error;

      setTeams(prev => [...prev, { ...data, members: [] }]);
      setDialogOpen(false);
      resetForm();
      toast.success('Η ομάδα δημιουργήθηκε!');
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Σφάλμα κατά τη δημιουργία');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: TEAM_COLORS[0],
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Νέα Ομάδα
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Δημιουργία Νέας Ομάδας</DialogTitle>
                <DialogDescription>
                  Δημιουργήστε μια νέα ομάδα για να οργανώσετε τα μέλη σας
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Δημιουργία
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {team.description}
                  </p>
                )}

                {/* Members */}
                <div className="space-y-3">
                  {(team.members || []).slice(0, 4).map(member => (
                    <div key={member.id} className="flex items-center gap-3">
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
                    </div>
                  ))}

                  {(team.members?.length || 0) > 4 && (
                    <p className="text-sm text-muted-foreground">
                      +{(team.members?.length || 0) - 4} ακόμα μέλη
                    </p>
                  )}

                  {team.members?.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Δεν υπάρχουν μέλη
                      </p>
                      {canManage && (
                        <Button variant="outline" size="sm">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Προσθήκη
                        </Button>
                      )}
                    </div>
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
