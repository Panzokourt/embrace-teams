import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  FolderKanban, 
  AlertCircle, 
  Target,
  Loader2
} from 'lucide-react';

interface KPIs {
  pipelineValue: number;
  activeProjects: number;
  overdueTasks: number;
  winRate: number;
  pipelineCount: number;
  completedProjects: number;
}

export function WorkOverview() {
  const { isAdmin, isManager } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ pipelineValue: 0, activeProjects: 0, overdueTasks: 0, winRate: 0, pipelineCount: 0, completedProjects: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status, budget');

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status, due_date');

      const allProjects = projects || [];
      const allTasks = tasks || [];

      const pipelineStatuses = ['lead', 'proposal', 'negotiation'];
      const pipelineProjects = allProjects.filter(p => pipelineStatuses.includes(p.status));
      const activeProjects = allProjects.filter(p => p.status === 'active');
      const completedProjects = allProjects.filter(p => p.status === 'completed');
      const wonProjects = allProjects.filter(p => p.status === 'won' || p.status === 'active' || p.status === 'completed');
      const lostProjects = allProjects.filter(p => p.status === 'lost');
      
      const totalDecided = wonProjects.length + lostProjects.length;
      const winRate = totalDecided > 0 ? Math.round((wonProjects.length / totalDecided) * 100) : 0;

      const today = new Date().toISOString().split('T')[0];
      const overdueTasks = allTasks.filter(t => 
        t.due_date && t.due_date < today && t.status !== 'completed'
      );

      const pipelineValue = pipelineProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

      setKpis({
        pipelineValue,
        activeProjects: activeProjects.length,
        overdueTasks: overdueTasks.length,
        winRate,
        pipelineCount: pipelineProjects.length,
        completedProjects: completedProjects.length,
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Pipeline Value',
      value: `€${kpis.pipelineValue.toLocaleString('el-GR')}`,
      subtitle: `${kpis.pipelineCount} ευκαιρίες`,
      icon: TrendingUp,
      color: 'text-blue-500',
    },
    {
      title: 'Ενεργά Έργα',
      value: kpis.activeProjects.toString(),
      subtitle: `${kpis.completedProjects} ολοκληρωμένα`,
      icon: FolderKanban,
      color: 'text-success',
    },
    {
      title: 'Εκπρόθεσμα Tasks',
      value: kpis.overdueTasks.toString(),
      subtitle: 'χρειάζονται προσοχή',
      icon: AlertCircle,
      color: kpis.overdueTasks > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      title: 'Win Rate',
      value: `${kpis.winRate}%`,
      subtitle: 'ποσοστό επιτυχίας',
      icon: Target,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-border/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
