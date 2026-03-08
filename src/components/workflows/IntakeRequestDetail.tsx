import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle2, XCircle, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useWorkflowStages, useIntakeRequests, type IntakeRequest, type IntakeRequestHistory, type IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';
import { toast } from '@/hooks/use-toast';

interface IntakeRequestDetailProps {
  request: IntakeRequest;
  onBack: () => void;
}

export function IntakeRequestDetail({ request, onBack }: IntakeRequestDetailProps) {
  const { stages } = useWorkflowStages(request.workflow_id);
  const { updateRequest, addHistory, fetchHistory } = useIntakeRequests();
  const [history, setHistory] = useState<IntakeRequestHistory[]>([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchHistory(request.id).then(setHistory);
  }, [request.id]);

  const currentStageIndex = stages.findIndex(s => s.id === request.current_stage_id);

  const handleAction = async (action: 'approved' | 'rejected') => {
    const nextStage = action === 'approved' && currentStageIndex < stages.length - 1
      ? stages[currentStageIndex + 1]
      : null;

    const isFinalApproval = action === 'approved' && currentStageIndex === stages.length - 1;
    const newStatus = action === 'rejected' ? 'rejected' : isFinalApproval ? 'approved' : 'in_progress';

    await addHistory({
      request_id: request.id,
      stage_id: request.current_stage_id,
      action,
      comment: comment || null,
    });

    await updateRequest(request.id, {
      status: newStatus,
      current_stage_id: nextStage?.id || request.current_stage_id,
    });

    if (nextStage) {
      await addHistory({
        request_id: request.id,
        stage_id: nextStage.id,
        action: 'entered',
      });
    }

    toast({ title: action === 'approved' ? 'Approved!' : 'Rejected' });
    setComment('');
    fetchHistory(request.id).then(setHistory);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    await addHistory({
      request_id: request.id,
      stage_id: request.current_stage_id,
      action: 'commented',
      comment: comment.trim(),
    });
    setComment('');
    fetchHistory(request.id).then(setHistory);
  };

  const isTerminal = request.status === 'approved' || request.status === 'rejected';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <h2 className="text-lg font-semibold flex-1">{request.title}</h2>
        <Badge variant="outline" className={cn(
          request.status === 'approved' && 'bg-emerald-500/15 text-emerald-400',
          request.status === 'rejected' && 'bg-red-500/15 text-red-400',
          request.status === 'in_progress' && 'bg-blue-500/15 text-blue-400',
        )}>
          {request.status}
        </Badge>
      </div>

      {/* Stage progress */}
      {stages.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {stages.map((stage, i) => {
            const isPast = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  isPast && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                  isCurrent && "bg-primary/15 text-primary border-primary/30 ring-2 ring-primary/20",
                  !isPast && !isCurrent && "bg-muted text-muted-foreground border-border/40",
                )}>
                  {stage.name}
                </div>
                {i < stages.length - 1 && <div className="w-4 h-px bg-border" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Description & form data */}
      {(request.description || Object.keys(request.form_data || {}).length > 0) && (
        <Card className="p-4 space-y-2">
          {request.description && <p className="text-sm text-muted-foreground">{request.description}</p>}
          {Object.entries(request.form_data || {}).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <span className="text-muted-foreground capitalize">{k}:</span>
              <span className="text-foreground">{String(v)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Actions */}
      {!isTerminal && (
        <Card className="p-4 space-y-3">
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
          />
          <div className="flex gap-2">
            <Button onClick={() => handleAction('approved')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button variant="destructive" onClick={() => handleAction('rejected')} className="gap-1.5">
              <XCircle className="h-4 w-4" /> Reject
            </Button>
            <Button variant="outline" onClick={handleComment} disabled={!comment.trim()} className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Comment
            </Button>
          </div>
        </Card>
      )}

      {/* History timeline */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">History</h4>
        <Separator />
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No history yet.</p>
        ) : (
          <div className="space-y-3 py-2">
            {history.map(h => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {h.action === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {h.action === 'rejected' && <XCircle className="h-4 w-4 text-red-400" />}
                  {h.action === 'commented' && <MessageSquare className="h-4 w-4 text-blue-400" />}
                  {h.action === 'entered' && <Clock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize text-foreground">{h.action}</span>
                    <span className="text-[11px] text-muted-foreground">{format(new Date(h.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                  {h.comment && <p className="text-sm text-muted-foreground mt-0.5">{h.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
