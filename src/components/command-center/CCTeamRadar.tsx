import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  taskCount: number;
}

export default function CCTeamRadar() {
  const { company } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(20);

      if (!profiles) return;

      const { data: tasks } = await supabase
        .from('tasks')
        .select('assigned_to')
        .in('status', ['todo', 'in_progress', 'review', 'internal_review', 'client_review']);

      const countMap: Record<string, number> = {};
      tasks?.forEach(t => {
        if (t.assigned_to) countMap[t.assigned_to] = (countMap[t.assigned_to] || 0) + 1;
      });

      const result = profiles.map(p => ({
        id: p.id,
        full_name: p.full_name || 'Unknown',
        avatar_url: p.avatar_url,
        taskCount: countMap[p.id] || 0,
      })).sort((a, b) => b.taskCount - a.taskCount).slice(0, 8);

      setMembers(result);
    })();
  }, [company?.id]);

  const maxTasks = Math.max(...members.map(m => m.taskCount), 1);

  return (
    <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team Radar
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Δεν βρέθηκαν μέλη</p>
        )}
        {members.map((m) => {
          const pct = Math.round((m.taskCount / maxTasks) * 100);
          const barColor = pct > 80 ? 'bg-destructive/60' : pct > 50 ? 'bg-warning/60' : 'bg-primary/60';
          const initials = m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2);

          return (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate">{m.full_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{m.taskCount} tasks</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
