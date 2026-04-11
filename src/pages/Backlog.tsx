import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListTodo, Loader2, User, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-600',
  high: 'bg-orange-500/15 text-orange-600',
  medium: 'bg-amber-500/15 text-amber-600',
  low: 'bg-muted text-muted-foreground',
};

export default function Backlog() {
  const { company } = useAuth();
  const companyId = company?.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['backlog-tasks', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks')
        .select('*, projects(id, name, clients(name))')
        .in('status', ['todo', 'in_progress'])
        .or('assigned_to.is.null,due_date.is.null')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['backlog-profiles', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'active');
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase.from('tasks').update({ assigned_to: userId }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog-tasks'] });
      toast.success('Ανατέθηκε επιτυχώς');
    },
  });

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t: any) => {
      if (t.projects?.id) map.set(t.projects.id, t.projects.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t: any) => {
      if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterProject !== 'all' && t.project_id !== filterProject) return false;
      return true;
    });
  }, [tasks, search, filterProject]);

  // Group by project
  const grouped = useMemo(() => {
    const groups = new Map<string, { name: string; client: string; tasks: any[] }>();
    filtered.forEach((t: any) => {
      const key = t.project_id || 'unassigned';
      if (!groups.has(key)) {
        groups.set(key, {
          name: t.projects?.name || 'Χωρίς Έργο',
          client: t.projects?.clients?.name || '',
          tasks: [],
        });
      }
      groups.get(key)!.tasks.push(t);
    });
    return Array.from(groups.values());
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-[1200px] mx-auto">
      <PageHeader
        icon={ListTodo}
        title="Backlog"
        subtitle={`${filtered.length} εργασίες χωρίς ανάθεση ή προθεσμία`}
        breadcrumbs={[{ label: 'Backlog' }]}
        toolbar={
          <div className="flex items-center gap-3 mt-2">
            <Input
              placeholder="Αναζήτηση εργασίας..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder="Όλα τα έργα" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλα τα έργα</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mt-4 space-y-6">
        {grouped.map((group, gi) => (
          <div key={gi}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold">{group.name}</h3>
              {group.client && <span className="text-xs text-muted-foreground">• {group.client}</span>}
              <Badge variant="outline" className="text-xs">{group.tasks.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {group.tasks.map((t: any) => (
                <Card key={t.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {t.priority && (
                          <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[t.priority] || ''}`}>
                            {t.priority}
                          </Badge>
                        )}
                        {!t.assigned_to && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600">
                            <User className="h-3 w-3" /> Χωρίς ανάθεση
                          </span>
                        )}
                        {!t.due_date && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600">
                            <Calendar className="h-3 w-3" /> Χωρίς προθεσμία
                          </span>
                        )}
                      </div>
                    </div>
                    {!t.assigned_to && (
                      <Select onValueChange={v => assignMutation.mutate({ taskId: t.id, userId: v })}>
                        <SelectTrigger className="w-36 h-7 text-xs">
                          <SelectValue placeholder="Ανάθεση σε..." />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Δεν υπάρχουν εργασίες στο backlog</p>
          </div>
        )}
      </div>
    </div>
  );
}
