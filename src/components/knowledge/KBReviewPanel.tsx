import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClipboardCheck, Check, X, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useKBReview } from '@/hooks/useKBReview';
import { KBReviewerSelector } from './KBReviewerSelector';
import { format } from 'date-fns';
import type { KBArticle } from '@/hooks/useKnowledgeBase';

interface KBReviewPanelProps {
  article: KBArticle;
}

/** Card στο Article Detail page: status, reviewer assignment, approve/changes actions. */
export function KBReviewPanel({ article }: KBReviewPanelProps) {
  const { profile, companyRole } = useAuth();
  const { requestReview, approveReview, requestChanges, useArticleHistory } = useKBReview();
  const historyQ = useArticleHistory(article.id);

  const [reviewerId, setReviewerId] = useState<string | null>(article.reviewer_id || null);
  const [requestNotes, setRequestNotes] = useState('');
  const [changesNotes, setChangesNotes] = useState('');
  const [showChanges, setShowChanges] = useState(false);

  const isReviewer = profile?.id === article.reviewer_id;
  const isOwnerOrAdmin = profile?.id === article.owner_id || ['owner', 'super_admin', 'admin', 'manager'].includes(companyRole?.role || '');
  const canApprove = isReviewer || isOwnerOrAdmin;
  const status = article.review_status || 'none';

  const statusBadge = () => {
    if (status === 'pending') return <Badge variant="warning">Αναμονή review</Badge>;
    if (status === 'approved') return <Badge variant="success">Εγκεκριμένο</Badge>;
    if (status === 'changes_requested') return <Badge variant="destructive">Ζητήθηκαν αλλαγές</Badge>;
    return <Badge variant="outline">Χωρίς review</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" /> Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">{statusBadge()}</div>

        {/* Assign reviewer (πάντα ορατό σε admin/owner) */}
        {isOwnerOrAdmin && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ανάθεση reviewer</p>
            <KBReviewerSelector value={reviewerId} onChange={setReviewerId} excludeUserId={article.owner_id} />
            {(status === 'none' || status === 'changes_requested' || status === 'approved') && reviewerId && (
              <>
                <Textarea
                  value={requestNotes} onChange={e => setRequestNotes(e.target.value)}
                  rows={2} placeholder="Σημειώσεις προς reviewer (προαιρετικό)" className="text-xs"
                />
                <Button
                  size="sm" className="w-full gap-1"
                  onClick={() => requestReview.mutate({ articleId: article.id, reviewerId, notes: requestNotes })}
                  disabled={requestReview.isPending}
                >
                  <Send className="h-3 w-3" /> Αίτημα review
                </Button>
              </>
            )}
          </div>
        )}

        {/* Reviewer actions */}
        {status === 'pending' && canApprove && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">Ενέργειες reviewer</p>
            {article.review_notes && (
              <div className="text-xs p-2 bg-muted rounded">
                <span className="font-medium">Note: </span>{article.review_notes}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm" className="flex-1 gap-1" variant="default"
                onClick={() => approveReview.mutate({ articleId: article.id })}
                disabled={approveReview.isPending}
              >
                <Check className="h-3 w-3" /> Έγκριση
              </Button>
              <Button
                size="sm" className="flex-1 gap-1" variant="outline"
                onClick={() => setShowChanges(s => !s)}
              >
                <X className="h-3 w-3" /> Αλλαγές
              </Button>
            </div>
            {showChanges && (
              <div className="space-y-2">
                <Textarea
                  value={changesNotes} onChange={e => setChangesNotes(e.target.value)}
                  rows={3} placeholder="Τι πρέπει να αλλάξει;" className="text-xs"
                />
                <Button
                  size="sm" variant="destructive" className="w-full"
                  onClick={() => requestChanges.mutate({ articleId: article.id, notes: changesNotes })}
                  disabled={!changesNotes.trim() || requestChanges.isPending}
                >
                  Αποστολή αιτήματος αλλαγών
                </Button>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {(historyQ.data || []).length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Ιστορικό
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(historyQ.data || []).map((h: any) => (
                <div key={h.id} className="flex gap-2 text-xs">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback className="text-[9px]">
                      {(h.actor?.full_name || '?').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p>
                      <span className="font-medium">{h.actor?.full_name || 'Unknown'}</span>
                      <span className="text-muted-foreground"> • {h.action}</span>
                    </p>
                    {h.notes && <p className="text-muted-foreground text-[11px] truncate">"{h.notes}"</p>}
                    <p className="text-muted-foreground text-[10px]">{format(new Date(h.created_at), 'dd/MM HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
