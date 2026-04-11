import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectHours {
  project_name: string;
  total_hours: number;
  task_count: number;
}

export function WeeklyTimeSummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ projects: ProjectHours[]; totalHours: number } | null>(null);

  const fetchWeeklySummary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('duration_minutes, project:projects(name), task_id')
        .eq('user_id', user.id)
        .gte('start_time', weekAgo)
        .eq('is_running', false);

      if (error) throw error;

      const projectMap: Record<string, { total: number; tasks: Set<string> }> = {};
      let totalMinutes = 0;

      (entries || []).forEach((e: any) => {
        const name = e.project?.name || 'Χωρίς Project';
        if (!projectMap[name]) projectMap[name] = { total: 0, tasks: new Set() };
        projectMap[name].total += e.duration_minutes || 0;
        if (e.task_id) projectMap[name].tasks.add(e.task_id);
        totalMinutes += e.duration_minutes || 0;
      });

      const projects = Object.entries(projectMap)
        .map(([name, v]) => ({
          project_name: name,
          total_hours: Math.round((v.total / 60) * 10) / 10,
          task_count: v.tasks.size,
        }))
        .sort((a, b) => b.total_hours - a.total_hours);

      setData({ projects, totalHours: Math.round((totalMinutes / 60) * 10) / 10 });
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Εβδομαδιαία σύνοψη ωρών</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchWeeklySummary} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <BarChart3 className="h-3 w-3 mr-1" />}
            Εμφάνιση
          </Button>
        </CardContent>
      </Card>
    );
  }

  const maxHours = Math.max(...data.projects.map(p => p.total_hours), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Εβδομαδιαία Σύνοψη
          </span>
          <Badge variant="secondary" className="font-mono">
            <Clock className="h-3 w-3 mr-1" />
            {data.totalHours}ω σύνολο
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.projects.map((p) => (
          <div key={p.project_name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate max-w-[60%]">{p.project_name}</span>
              <span className="text-muted-foreground">{p.total_hours}ω · {p.task_count} tasks</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(p.total_hours / maxHours) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {data.projects.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Δεν υπάρχουν καταγραφές αυτή την εβδομάδα</p>
        )}
      </CardContent>
    </Card>
  );
}
