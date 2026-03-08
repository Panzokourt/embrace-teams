import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, GitBranch, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInHours } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';

interface PendingRequest {
  id: string;
  title: string;
  status: string;
  current_stage_id: string | null;
  workflow_id: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  workflow_name?: string;
  stage_name?: string;
  sla_hours?: number | null;
  stage_entered_at?: string | null;
}

export function PendingApprovalsCard() {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    if (!company?.id || !user) return;
    setLoading(true);

    // Get all active (non-terminal) requests for company
    const { data: reqData } = await supabase
      .from('intake_requests')
      .select('*')
      .eq('company_id', company.id)
      .in('status', ['submitted', 'in_progress'])
      .order('updated_at', { ascending: false });

    if (!reqData || reqData.length === 0) { setRequests([]); setLoading(false); return; }

    // Enrich with workflow + stage names
    const workflowIds = [...new Set((reqData as any[]).map(r => r.workflow_id))];
    const stageIds = [...new Set((reqData as any[]).filter(r => r.current_stage_id).map(r => r.current_stage_id))];

    const [wfRes, stRes] = await Promise.all([
      supabase.from('intake_workflows').select('id, name').in('id', workflowIds),
      stageIds.length > 0
        ? supabase.from('intake_workflow_stages').select('id, name, sla_hours').in('id', stageIds)
        : Promise.resolve({ data: [] }),
    ]);

    const wfMap = new Map((wfRes.data || []).map((w: any) => [w.id, w.name]));
    const stMap = new Map((stRes.data || []).map((s: any) => [s.id, { name: s.name, sla_hours: s.sla_hours }]));

    const enriched: PendingRequest[] = (reqData as any[]).map(r => ({
      ...r,
      workflow_name: wfMap.get(r.workflow_id) || 'Ροή',
      stage_name: stMap.get(r.current_stage_id)?.name || '-',
      sla_hours: stMap.get(r.current_stage_id)?.sla_hours || null,
    }));

    setRequests(enriched);
    setLoading(false);
  }, [company?.id, user]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleQuickAction = async (requestId: string, action: 'approved' | 'rejected', currentStageId: string | null) => {
    if (!user) return;
    await supabase.from('intake_request_history').insert({
      request_id: requestId, stage_id: currentStageId,
      action, actor_id: user.id,
    } as any);

    // For simplicity, on reject → set rejected. On approve → just move status
    const newStatus = action === 'rejected' ? 'rejected' : 'approved';
    await supabase.from('intake_requests').update({ status: newStatus } as any).eq('id', requestId);

    toast.success(action === 'approved' ? 'Εγκρίθηκε!' : 'Απορρίφθηκε');
    fetchPending();
  };

  if (loading || requests.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Εκκρεμείς Εγκρίσεις Ροών
          <Badge variant="default" className="text-xs ml-1">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {requests.slice(0, 8).map(req => {
            const getSlaRemaining = () => {
              if (!req.sla_hours) return null;
              const elapsed = differenceInHours(new Date(), new Date(req.updated_at));
              const remaining = req.sla_hours - elapsed;
              return { remaining, overdue: remaining < 0 };
            };
            const sla = getSlaRemaining();

            return (
              <div key={req.id} className="flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{req.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{req.workflow_name}</span>
                    <Badge variant="outline" className="text-[10px] py-0">{req.stage_name}</Badge>
                    {sla && (
                      <span className={cn(
                        "text-[10px] flex items-center gap-0.5",
                        sla.overdue ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {sla.overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {sla.overdue ? `+${Math.abs(sla.remaining)}h` : `${sla.remaining}h`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => handleQuickAction(req.id, 'approved', req.current_stage_id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleQuickAction(req.id, 'rejected', req.current_stage_id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  {req.project_id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => navigate(`/projects/${req.project_id}`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
