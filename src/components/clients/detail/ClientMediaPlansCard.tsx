import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface MediaPlan {
  id: string;
  name: string;
  status: string;
  total_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  item_count?: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/10 text-success',
  completed: 'bg-foreground/10 text-foreground',
  archived: 'bg-muted text-muted-foreground',
};

export function ClientMediaPlansCard({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<MediaPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('media_plans')
        .select('id, name, status, total_budget')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        // Get item counts
        const planIds = data.map(p => p.id);
        const { data: items } = await supabase
          .from('media_plan_items')
          .select('media_plan_id')
          .in('media_plan_id', planIds);

        const countMap = new Map<string, number>();
        (items || []).forEach(i => {
          countMap.set(i.media_plan_id, (countMap.get(i.media_plan_id) || 0) + 1);
        });

        setPlans(data.map(p => ({ ...p, item_count: countMap.get(p.id) || 0 })));
      } else {
        setPlans([]);
      }
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Media Plans</p>
          {plans.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{plans.length}</Badge>
          )}
        </div>

        {plans.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Δεν υπάρχουν media plans</p>
        ) : (
          <div className="space-y-2">
            {plans.map(plan => (
              <div
                key={plan.id}
                onClick={() => navigate(`/media-planning/${plan.id}`)}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{plan.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {plan.start_date && (
                      <span>{format(new Date(plan.start_date), 'MMM yyyy', { locale: el })}</span>
                    )}
                    {plan.item_count !== undefined && (
                      <span>{plan.item_count} ενέργειες</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {plan.total_budget ? (
                    <span className="text-xs font-medium">€{Number(plan.total_budget).toLocaleString()}</span>
                  ) : null}
                  <Badge className={`text-[10px] border-0 ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                    {plan.status}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
