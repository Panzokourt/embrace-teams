import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

interface Props {
  members: TeamMember[];
  onEdit?: () => void;
}

export function ClientTeamCard({ members, onEdit }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Internal Team
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <button
            onClick={onEdit}
            className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm">Δεν υπάρχουν μέλη ομάδας</span>
            <span className="text-xs">Ανατέθηκε αυτόματα μέσω projects</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {m.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.full_name}</p>
                  {m.role && <p className="text-xs text-muted-foreground truncate">{m.role}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
