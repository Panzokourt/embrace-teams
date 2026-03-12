import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MediaSource {
  plan_id: string;
  plan_name: string;
  item_title: string;
  item_id: string;
  medium: string | null;
  status: string | null;
}

export function TaskMediaSourceCard({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  const [source, setSource] = useState<MediaSource | null>(null);

  useEffect(() => {
    (async () => {
      // Check if this task is linked to a media plan item
      const { data: links } = await supabase
        .from('media_plan_item_tasks')
        .select('media_plan_item_id')
        .eq('task_id', taskId)
        .limit(1);

      if (!links || links.length === 0) return;

      const itemId = links[0].media_plan_item_id;
      const { data: item } = await supabase
        .from('media_plan_items')
        .select('id, title, medium, status, media_plan_id')
        .eq('id', itemId)
        .single();

      if (!item) return;

      const { data: plan } = await supabase
        .from('media_plans')
        .select('id, name')
        .eq('id', item.media_plan_id)
        .single();

      if (plan) {
        setSource({
          plan_id: plan.id,
          plan_name: plan.name,
          item_title: item.title,
          item_id: item.id,
          medium: item.medium,
          status: item.status,
        });
      }
    })();
  }, [taskId]);

  if (!source) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Media Plan</h4>
        <div
          onClick={() => navigate(`/media-planning/${source.plan_id}`)}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
        >
          <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{source.plan_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{source.item_title}</p>
          </div>
          {source.medium && (
            <Badge variant="secondary" className="text-[10px] shrink-0">{source.medium}</Badge>
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
