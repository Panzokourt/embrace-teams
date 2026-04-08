import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import CCHeroZone from '@/components/command-center/CCHeroZone';
import CCMissionCards from '@/components/command-center/CCMissionCards';
import CCActiveMissions from '@/components/command-center/CCActiveMissions';
import CCTeamRadar from '@/components/command-center/CCTeamRadar';
import CCIntelFeed from '@/components/command-center/CCIntelFeed';
import CCQuickActions from '@/components/command-center/CCQuickActions';
import { Loader2 } from 'lucide-react';

interface CCData {
  pipelineValue: number;
  activeProjects: number;
  myTasks: number;
  overdueTasks: number;
  winRate: number;
  pendingInvoices: number;
  tasksCompletedToday: number;
  hoursToday: number;
  myActiveTasks: any[];
}

export default function CommandCenter() {
  const { user, isAdmin, isManager, isMember, isViewer, isOwner } = useAuth();
  const [data, setData] = useState<CCData | null>(null);
  const [loading, setLoading] = useState(true);

  const showFinancials = isAdmin || isManager || isOwner;
  const showTeamRadar = isAdmin || isManager || isOwner;
  const showIntel = isAdmin || isManager || isOwner;

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      const [projectsRes, tasksRes, timeRes] = await Promise.all([
        supabase.from('projects').select('id, status, budget, name'),
        supabase.from('tasks').select('id, title, status, priority, due_date, assigned_to, project_id'),
        supabase.from('time_entries').select('duration_minutes, start_time')
          .eq('user_id', user!.id)
          .gte('start_time', todayStart)
          .lte('start_time', todayEnd),
      ]);

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];
      const timeEntries = timeRes.data || [];

      const pipelineStatuses = ['lead', 'proposal', 'negotiation'];
      const pipelineProjects = projects.filter(p => pipelineStatuses.includes(p.status));
      const activeProjects = projects.filter(p => p.status === 'active');
      const wonProjects = projects.filter(p => ['won', 'active', 'completed'].includes(p.status));
      const lostProjects = projects.filter(p => p.status === 'lost');
      const totalDecided = wonProjects.length + lostProjects.length;

      const myPendingTasks = tasks.filter(t => t.assigned_to === user!.id && t.status !== 'completed');
      const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed');
      const todayCompleted = tasks.filter(t =>
        t.assigned_to === user!.id && t.status === 'completed'
      );

      const projectMap: Record<string, string> = {};
      projects.forEach(p => { projectMap[p.id] = p.name; });

      const myActiveTasks = myPendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority || 'medium',
        status: t.status,
        project_name: t.project_id ? projectMap[t.project_id] : undefined,
        due_date: t.due_date,
      }));

      const hoursToday = timeEntries.reduce((s, e) => s + ((e.duration_minutes || 0) / 60), 0);

      setData({
        pipelineValue: pipelineProjects.reduce((s, p) => s + (p.budget || 0), 0),
        activeProjects: activeProjects.length,
        myTasks: myPendingTasks.length,
        overdueTasks: overdueTasks.length,
        winRate: totalDecided > 0 ? Math.round((wonProjects.length / totalDecided) * 100) : 0,
        pendingInvoices: 0,
        tasksCompletedToday: todayCompleted.length,
        hoursToday,
        myActiveTasks,
      });
    } catch (err) {
      console.error('CC fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Hero Zone — always visible for non-viewers */}
      {!isViewer && (
        <CCHeroZone
          tasksCompletedToday={data.tasksCompletedToday}
          hoursToday={data.hoursToday}
        />
      )}

      {/* Mission Cards (KPIs) */}
      <CCMissionCards
        pipelineValue={data.pipelineValue}
        activeProjects={data.activeProjects}
        myTasks={data.myTasks}
        overdueTasks={data.overdueTasks}
        winRate={data.winRate}
        pendingInvoices={data.pendingInvoices}
        showFinancials={showFinancials}
      />

      {/* Panels */}
      <div className={`grid gap-5 ${showTeamRadar || showIntel ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left: Active Missions */}
        {!isViewer && (
          <CCActiveMissions tasks={data.myActiveTasks} />
        )}

        {/* Right: Team Radar or Intel */}
        <div className="space-y-5">
          {showTeamRadar && <CCTeamRadar />}
          {showIntel && <CCIntelFeed />}
        </div>
      </div>

      {/* Quick Actions */}
      {!isViewer && (
        <CCQuickActions
          isAdmin={isAdmin || isOwner}
          isManager={isManager}
          isMember={isMember}
        />
      )}
    </div>
  );
}
