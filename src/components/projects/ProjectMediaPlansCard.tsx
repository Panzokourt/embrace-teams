import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProjectMediaPlansCard({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  const { data: plans = [] } = useQuery({
    queryKey: ['project-media-plans-overview', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('media_plans')
        .select('id, name, status, total_budget')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return [];

      // Get active actions count per plan
      const planIds = data.map(p => p.id);
      const { data: items } = await supabase
        .from('media_plan_items')
        .select('media_plan_id, status')
        .in('media_plan_id', planIds);

      const statsMap = new Map<string, { total: number; active: number }>();
      (items || []).forEach(i => {
        const s = statsMap.get(i.media_plan_id) || { total: 0, active: 0 };
        s.total++;
        if (i.status === 'live' || i.status === 'in_production') s.active++;
        statsMap.set(i.media_plan_id, s);
      });

      return data.map(p => ({
        ...p,
        stats: statsMap.get(p.id) || { total: 0, active: 0 },
      }));
    },
    enabled: !!projectId,
  });

  const totalBudget = plans.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
  const totalActions = plans.reduce((s, p) => s + p.stats.total, 0);

  if (plans.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Media Plans</p>
          <Badge variant="secondary" className="text-[10px]">{plans.length}</Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Budget: <span className="font-medium text-foreground">€{totalBudget.toLocaleString()}</span></span>
          <span>Ενέργειες: <span className="font-medium text-foreground">{totalActions}</span></span>
        </div>

        <div className="space-y-1.5">
          {plans.map(plan => (
            <div
              key={plan.id}
              onClick={() => navigate(`/media-planning/${plan.id}`)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <span className="text-sm font-medium truncate">{plan.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{plan.stats.total} ενέργειες</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
