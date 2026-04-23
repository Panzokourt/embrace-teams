import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hooks για το reviewer workflow πάνω στα kb_articles.
 * Καλύπτει: request review, approve, request changes, reassign + history fetch.
 */
export function useKBReview() {
  const { profile, companyRole } = useAuth();
  const qc = useQueryClient();
  const companyId = companyRole?.company_id;

  const logHistory = async (articleId: string, action: string, opts: { reviewerId?: string | null; notes?: string }) => {
    if (!companyId) return;
    await supabase.from('kb_review_history').insert({
      article_id: articleId,
      company_id: companyId,
      actor_id: profile?.id || null,
      action,
      reviewer_id: opts.reviewerId || null,
      notes: opts.notes || null,
    } as any);
  };

  const requestReview = useMutation({
    mutationFn: async ({ articleId, reviewerId, notes }: { articleId: string; reviewerId: string; notes?: string }) => {
      const { error } = await supabase.from('kb_articles').update({
        reviewer_id: reviewerId,
        review_status: 'pending',
        review_requested_at: new Date().toISOString(),
        reviewed_at: null,
        review_notes: notes || null,
      } as any).eq('id', articleId);
      if (error) throw error;
      await logHistory(articleId, 'request', { reviewerId, notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Στάλθηκε αίτημα για review');
    },
    onError: (e: Error) => toast.error(`Σφάλμα: ${e.message}`),
  });

  const approveReview = useMutation({
    mutationFn: async ({ articleId, notes }: { articleId: string; notes?: string }) => {
      const { error } = await supabase.from('kb_articles').update({
        review_status: 'approved',
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      } as any).eq('id', articleId);
      if (error) throw error;
      await logHistory(articleId, 'approve', { notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Άρθρο εγκρίθηκε');
    },
    onError: (e: Error) => toast.error(`Σφάλμα: ${e.message}`),
  });

  const requestChanges = useMutation({
    mutationFn: async ({ articleId, notes }: { articleId: string; notes: string }) => {
      const { error } = await supabase.from('kb_articles').update({
        review_status: 'changes_requested',
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      } as any).eq('id', articleId);
      if (error) throw error;
      await logHistory(articleId, 'changes_requested', { notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Ζητήθηκαν αλλαγές');
    },
    onError: (e: Error) => toast.error(`Σφάλμα: ${e.message}`),
  });

  const useArticleHistory = (articleId: string) =>
    useQuery({
      queryKey: ['kb-review-history', articleId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('kb_review_history')
          .select('*, actor:profiles!kb_review_history_actor_id_fkey(full_name), reviewer:profiles!kb_review_history_reviewer_id_fkey(full_name)')
          .eq('article_id', articleId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },
      enabled: !!articleId,
    });

  return { requestReview, approveReview, requestChanges, useArticleHistory };
}
