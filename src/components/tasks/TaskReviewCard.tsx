import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { CheckCircle2, XCircle, AlertTriangle, Clock, ShieldCheck, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface Review {
  id: string;
  task_id: string;
  reviewer_id: string;
  review_type: string;
  status: string;
  comment: string | null;
  created_at: string;
  resolved_at: string | null;
  reviewer_name?: string;
}

interface TaskReviewCardProps {
  taskId: string;
  taskStatus: string;
  profiles: Profile[];
  internalReviewerId: string | null;
  approverId: string | null;
  onStatusChange: (status: string) => void;
  onUpdate: () => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3 text-warning" />,
  approved: <CheckCircle2 className="h-3 w-3 text-success" />,
  rejected: <XCircle className="h-3 w-3 text-destructive" />,
  changes_requested: <AlertTriangle className="h-3 w-3 text-orange-500" />,
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Εκκρεμεί',
  approved: 'Εγκρίθηκε',
  rejected: 'Απορρίφθηκε',
  changes_requested: 'Αλλαγές',
};

export function TaskReviewCard({ taskId, taskStatus, profiles, internalReviewerId, approverId, onStatusChange, onUpdate }: TaskReviewCardProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('task_reviews')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds);
      const nameMap = new Map(profs?.map(p => [p.id, p.full_name]) || []);
      setReviews(data.map(r => ({ ...r, reviewer_name: nameMap.get(r.reviewer_id) || 'Χρήστης' })));
    } else {
      setReviews([]);
    }
  }, [taskId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateReviewer = async (field: string, userId: string | null) => {
    const { error } = await supabase
      .from('tasks')
      .update({ [field]: userId })
      .eq('id', taskId);
    if (error) { toast.error('Σφάλμα'); return; }
    onUpdate();
  };

  const submitReview = async (action: 'approved' | 'rejected' | 'changes_requested') => {
    if (!user) return;
    setSubmitting(true);

    // Update pending review if exists, otherwise create new
    const pendingReview = reviews.find(r => r.reviewer_id === user.id && r.status === 'pending');
    
    if (pendingReview) {
      await supabase
        .from('task_reviews')
        .update({ status: action, comment: comment || null, resolved_at: new Date().toISOString() })
        .eq('id', pendingReview.id);
    } else {
      await supabase
        .from('task_reviews')
        .insert({
          task_id: taskId,
          reviewer_id: user.id,
          review_type: taskStatus === 'internal_review' ? 'internal' : taskStatus === 'client_review' ? 'client' : 'approval',
          status: action,
          comment: comment || null,
          resolved_at: new Date().toISOString(),
        });
    }

    // Auto-advance status on approval
    if (action === 'approved') {
      if (taskStatus === 'internal_review') onStatusChange('client_review');
      else if (taskStatus === 'client_review') onStatusChange('completed');
      else if (taskStatus === 'review') onStatusChange('completed');
    } else if (action === 'changes_requested') {
      onStatusChange('in_progress');
    }

    setComment('');
    setSubmitting(false);
    fetchReviews();
    toast.success(STATUS_LABEL[action]);
  };

  const createPendingReview = async () => {
    if (!user) return;
    const reviewerId = taskStatus === 'internal_review' ? internalReviewerId : approverId;
    if (!reviewerId) { toast.error('Δεν έχει οριστεί reviewer'); return; }
    
    await supabase.from('task_reviews').insert({
      task_id: taskId,
      reviewer_id: reviewerId,
      review_type: taskStatus === 'internal_review' ? 'internal' : 'client',
      status: 'pending',
    });
    fetchReviews();
    toast.success('Review δημιουργήθηκε');
  };

  const isReviewStatus = ['review', 'internal_review', 'client_review'].includes(taskStatus);
  const isCurrentReviewer = user && (user.id === internalReviewerId || user.id === approverId);
  const hasPendingForMe = reviews.some(r => r.reviewer_id === user?.id && r.status === 'pending');

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Έγκριση & Review
        </h4>

        {/* Reviewer / Approver selectors */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-20 shrink-0">Reviewer</span>
            <Select
              value={internalReviewerId || '__none__'}
              onValueChange={(v) => updateReviewer('internal_reviewer', v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">—</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.full_name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-20 shrink-0">Approver</span>
            <Select
              value={approverId || '__none__'}
              onValueChange={(v) => updateReviewer('approver', v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">—</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.full_name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Review actions — only show in review statuses */}
        {isReviewStatus && (
          <div className="border-t pt-3 space-y-2">
            {!hasPendingForMe && isCurrentReviewer ? (
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={createPendingReview}>
                Δημιουργία Review
              </Button>
            ) : hasPendingForMe ? (
              <>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Σχόλιο (προαιρετικό)..."
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => submitReview('approved')}
                    disabled={submitting}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Έγκριση
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1"
                    onClick={() => submitReview('changes_requested')}
                    disabled={submitting}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Αλλαγές
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs gap-1 px-3"
                    onClick={() => submitReview('rejected')}
                    disabled={submitting}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Review history */}
        {reviews.length > 0 && (
          <div className="border-t pt-2 space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">Ιστορικό</span>
            {reviews.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-start gap-2 text-xs py-1">
                {STATUS_ICON[r.status] || <Clock className="h-3 w-3" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{r.reviewer_name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 h-4">
                      {STATUS_LABEL[r.status] || r.status}
                    </Badge>
                  </div>
                  {r.comment && (
                    <p className="text-muted-foreground mt-0.5 text-[11px] line-clamp-2">{r.comment}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {format(new Date(r.created_at), 'd MMM, HH:mm', { locale: el })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
