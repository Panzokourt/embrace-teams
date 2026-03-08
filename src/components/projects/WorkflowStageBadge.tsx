import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CachedStageInfo {
  stageName: string;
  workflowName: string;
  status: string;
}

// Simple module-level cache to avoid repeated DB calls
const stageCache = new Map<string, CachedStageInfo | null>();

export function WorkflowStageBadge({ projectId }: { projectId: string }) {
  const [info, setInfo] = useState<CachedStageInfo | null | undefined>(undefined);

  useEffect(() => {
    if (stageCache.has(projectId)) {
      setInfo(stageCache.get(projectId) ?? null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('intake_requests')
        .select('status, current_stage_id, workflow_id')
        .eq('project_id', projectId)
        .in('status', ['submitted', 'in_progress'])
        .limit(1);

      if (cancelled) return;
      const req = (data as any[])?.[0];
      if (!req?.current_stage_id) {
        stageCache.set(projectId, null);
        setInfo(null);
        return;
      }

      const [stRes, wfRes] = await Promise.all([
        supabase.from('intake_workflow_stages').select('name').eq('id', req.current_stage_id).single(),
        supabase.from('intake_workflows').select('name').eq('id', req.workflow_id).single(),
      ]);

      if (cancelled) return;
      const result: CachedStageInfo = {
        stageName: (stRes.data as any)?.name || '-',
        workflowName: (wfRes.data as any)?.name || 'Ροή',
        status: req.status,
      };
      stageCache.set(projectId, result);
      setInfo(result);
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  if (!info) return null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] py-0 px-1.5 gap-0.5 cursor-default ml-1",
            "border-primary/30 text-primary bg-primary/5"
          )}
        >
          <GitBranch className="h-2.5 w-2.5" />
          {info.stageName}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="w-48 text-xs space-y-1">
        <p className="font-semibold">{info.workflowName}</p>
        <p className="text-muted-foreground">Στάδιο: {info.stageName}</p>
        <p className="text-muted-foreground">Status: {info.status === 'in_progress' ? 'Σε εξέλιξη' : info.status}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
