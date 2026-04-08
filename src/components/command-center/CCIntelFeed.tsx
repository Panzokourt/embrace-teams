import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, Activity, ChevronRight, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface InsightItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}

export default function CCIntelFeed() {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    Promise.all([
      supabase.from('brain_insights')
        .select('id, title, category, priority, created_at')
        .eq('company_id', company.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('activity_log')
        .select('id, action, entity_type, entity_name, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(8),
    ]).then(([insRes, actRes]) => {
      setInsights(insRes.data || []);
      setActivities(actRes.data || []);
    });
  }, [company?.id]);

  const priorityDot: Record<string, string> = {
    high: 'bg-destructive',
    medium: 'bg-warning',
    low: 'bg-success',
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Intel Feed
        </h3>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="border-b border-border/10">
          <div className="px-4 py-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
              <Brain className="h-3 w-3" /> AI Insights
            </span>
          </div>
          {insights.map(i => (
            <button key={i.id}
              onClick={() => navigate('/brain')}
              className="w-full px-4 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
            >
              <div className={`h-2 w-2 rounded-full ${priorityDot[i.priority] || 'bg-muted-foreground'}`} />
              <span className="text-xs text-foreground truncate flex-1">{i.title}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(i.created_at), { addSuffix: true, locale: el })}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="px-4 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
            <Activity className="h-3 w-3" /> Πρόσφατη Δραστηριότητα
          </span>
        </div>
        {activities.length === 0 && (
          <p className="px-4 py-4 text-xs text-muted-foreground text-center">Καμία δραστηριότητα</p>
        )}
        {activities.map(a => (
          <div key={a.id} className="px-4 py-2 flex items-center gap-2 text-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            <span className="text-muted-foreground">{a.action}</span>
            {a.entity_name && <span className="text-foreground font-medium truncate">{a.entity_name}</span>}
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: el })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
