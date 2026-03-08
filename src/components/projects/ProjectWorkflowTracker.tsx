import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import {
  CheckCircle2, XCircle, MessageSquare, Clock, GitBranch,
  ArrowRight, AlertTriangle, Link2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInHours } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';

interface WorkflowStage {
  id: string;
  name: string;
  sort_order: number;
  stage_type: string;
  sla_hours: number | null;
  responsible_roles: string[];
}

interface IntakeRequest {
  id: string;
  title: string;
  status: string;
  current_stage_id: string | null;
  workflow_id: string;
  created_at: string;
  updated_at: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  comment: string | null;
  created_at: string;
  stage_id: string | null;
  actor_id: string;
}

interface WorkflowInfo {
  id: string;
  name: string;
}

export function ProjectWorkflowTracker({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [request, setRequest] = useState<IntakeRequest | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowInfo | null>(null);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Find request linked to this project
    const { data: reqData } = await supabase
      .from('intake_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    const req = reqData?.[0] as unknown as IntakeRequest | undefined;
    if (!req) { setRequest(null); setLoading(false); return; }
    setRequest(req);

    // Fetch workflow + stages + history in parallel
    const [wfRes, stRes, hRes] = await Promise.all([
      supabase.from('intake_workflows').select('id, name').eq('id', req.workflow_id).single(),
      supabase.from('intake_workflow_stages').select('*').eq('workflow_id', req.workflow_id).order('sort_order'),
      supabase.from('intake_request_history').select('*').eq('request_id', req.id).order('created_at', { ascending: true }),
    ]);

    if (wfRes.data) setWorkflow(wfRes.data as unknown as WorkflowInfo);
    setStages((stRes.data as unknown as WorkflowStage[]) || []);
    setHistory((hRes.data as unknown as HistoryEntry[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentStageIndex = stages.findIndex(s => s.id === request?.current_stage_id);
  const currentStage = stages[currentStageIndex];
  const isTerminal = request?.status === 'approved' || request?.status === 'rejected';

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!request || !user) return;
    setActing(true);
    const nextStage = action === 'approved' && currentStageIndex < stages.length - 1
      ? stages[currentStageIndex + 1] : null;
    const isFinalApproval = action === 'approved' && currentStageIndex === stages.length - 1;
    const newStatus = action === 'rejected' ? 'rejected' : isFinalApproval ? 'approved' : 'in_progress';

    await supabase.from('intake_request_history').insert({
      request_id: request.id, stage_id: request.current_stage_id,
      action, comment: comment || null, actor_id: user.id,
    } as any);

    await supabase.from('intake_requests').update({
      status: newStatus,
      current_stage_id: nextStage?.id || request.current_stage_id,
    } as any).eq('id', request.id);

    if (nextStage) {
      await supabase.from('intake_request_history').insert({
        request_id: request.id, stage_id: nextStage.id,
        action: 'entered', actor_id: user.id,
      } as any);
    }

    toast.success(action === 'approved' ? 'Εγκρίθηκε!' : 'Απορρίφθηκε');
    setComment('');
    setActing(false);
    fetchData();
  };

  const handleComment = async () => {
    if (!comment.trim() || !request || !user) return;
    setActing(true);
    await supabase.from('intake_request_history').insert({
      request_id: request.id, stage_id: request.current_stage_id,
      action: 'commented', comment: comment.trim(), actor_id: user.id,
    } as any);
    setComment('');
    setActing(false);
    fetchData();
  };

  // SLA calculation
  const getSlaInfo = () => {
    if (!currentStage?.sla_hours || !request) return null;
    const stageEntry = history.filter(h => h.stage_id === currentStage.id && h.action === 'entered').pop();
    if (!stageEntry) return null;
    const elapsed = differenceInHours(new Date(), new Date(stageEntry.created_at));
    const remaining = currentStage.sla_hours - elapsed;
    return { remaining, total: currentStage.sla_hours, overdue: remaining < 0 };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No linked request
  if (!request) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center space-y-3">
          <GitBranch className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Αυτό το έργο δεν ανήκει σε κάποια ροή εργασίας.</p>
          <p className="text-xs text-muted-foreground">
            Μπορείτε να συνδέσετε μια ροή δημιουργώντας αίτημα από τη σελίδα <strong>Ροές Εργασίας</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sla = getSlaInfo();
  const actionIcon = (action: string) => {
    switch (action) {
      case 'approved': return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'rejected': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case 'commented': return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
      case 'entered': return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Workflow header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              {workflow?.name || 'Ροή'}
            </CardTitle>
            <Badge variant="outline" className={cn(
              request.status === 'approved' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
              request.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/30',
              request.status === 'in_progress' && 'bg-primary/10 text-primary border-primary/30',
              request.status === 'submitted' && 'bg-warning/10 text-warning border-warning/30',
            )}>
              {request.status === 'in_progress' ? 'Σε εξέλιξη' :
               request.status === 'approved' ? 'Εγκρίθηκε' :
               request.status === 'rejected' ? 'Απορρίφθηκε' :
               request.status === 'submitted' ? 'Υποβλήθηκε' : request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mini flow diagram */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {stages.map((stage, i) => {
              const isPast = i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              const isFuture = i > currentStageIndex;
              return (
                <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-default",
                        isPast && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                        isCurrent && "bg-primary/15 text-primary border-primary/40 ring-2 ring-primary/20 shadow-sm",
                        isFuture && "bg-muted/50 text-muted-foreground border-border/40",
                        isTerminal && request.status === 'rejected' && isCurrent && "bg-destructive/10 text-destructive border-destructive/30 ring-destructive/20",
                      )}>
                        {isPast && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                        {stage.name}
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-56 text-xs space-y-1">
                      <p className="font-semibold">{stage.name}</p>
                      <p className="text-muted-foreground">Τύπος: {stage.stage_type}</p>
                      {stage.sla_hours && <p className="text-muted-foreground">SLA: {stage.sla_hours}h</p>}
                      {stage.responsible_roles?.length > 0 && (
                        <p className="text-muted-foreground">Υπεύθυνοι: {stage.responsible_roles.join(', ')}</p>
                      )}
                    </HoverCardContent>
                  </HoverCard>
                  {i < stages.length - 1 && <div className="w-6 h-px bg-border" />}
                </div>
              );
            })}
          </div>

          {/* SLA indicator */}
          {sla && !isTerminal && (
            <div className={cn(
              "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
              sla.overdue ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"
            )}>
              {sla.overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {sla.overdue
                ? `Εκπρόθεσμο κατά ${Math.abs(sla.remaining)}h`
                : `${sla.remaining}h απομένουν (SLA: ${sla.total}h)`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {!isTerminal && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Προσθέστε σχόλιο..."
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => handleAction('approved')}
                disabled={acting}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Έγκριση
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction('rejected')}
                disabled={acting}
                className="gap-1.5"
                size="sm"
              >
                <XCircle className="h-3.5 w-3.5" /> Απόρριψη
              </Button>
              <Button
                variant="outline"
                onClick={handleComment}
                disabled={!comment.trim() || acting}
                className="gap-1.5"
                size="sm"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Σχόλιο
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Ιστορικό Ροής</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχει ιστορικό ακόμα.</p>
          ) : (
            <div className="relative space-y-0">
              {/* vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              {history.map(h => {
                const stageName = stages.find(s => s.id === h.stage_id)?.name;
                return (
                  <div key={h.id} className="relative flex items-start gap-3 py-2">
                    <div className="relative z-10 mt-0.5 bg-card">{actionIcon(h.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium capitalize text-foreground">
                          {h.action === 'approved' ? 'Εγκρίθηκε' :
                           h.action === 'rejected' ? 'Απορρίφθηκε' :
                           h.action === 'commented' ? 'Σχόλιο' :
                           h.action === 'entered' ? `Μετάβαση → ${stageName || ''}` :
                           h.action}
                        </span>
                        {stageName && h.action !== 'entered' && (
                          <Badge variant="outline" className="text-[10px] py-0">{stageName}</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(h.created_at), 'dd MMM HH:mm', { locale: el })}
                        </span>
                      </div>
                      {h.comment && (
                        <p className="text-sm text-muted-foreground mt-0.5">{h.comment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
