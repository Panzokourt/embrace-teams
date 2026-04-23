import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Archive, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { KBArticle } from '@/hooks/useKnowledgeBase';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 15;

interface KBReviewQueueProps {
  articles: KBArticle[];
  onApprove: (id: string) => void;
  onDeprecate: (id: string) => void;
  onSelect: (article: KBArticle) => void;
}

type Filter = 'mine' | 'all' | 'overdue';

export function KBReviewQueue({ articles, onApprove, onDeprecate, onSelect }: KBReviewQueueProps) {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<Filter>('mine');

  const allReviewItems = useMemo(() => articles.filter(a => {
    if (a.status === 'deprecated') return false;
    if (a.review_status === 'pending') return true;
    if (a.status === 'draft') return true;
    if (a.next_review_date && new Date(a.next_review_date) <= new Date()) return true;
    return false;
  }), [articles]);

  const reviewItems = useMemo(() => {
    if (filter === 'mine') return allReviewItems.filter(a => a.reviewer_id === profile?.id);
    if (filter === 'overdue') return allReviewItems.filter(a => a.next_review_date && new Date(a.next_review_date) <= new Date());
    return allReviewItems;
  }, [allReviewItems, filter, profile?.id]);

  const counts = {
    mine: allReviewItems.filter(a => a.reviewer_id === profile?.id).length,
    all: allReviewItems.length,
    overdue: allReviewItems.filter(a => a.next_review_date && new Date(a.next_review_date) <= new Date()).length,
  };

  const pagination = usePagination(PAGE_SIZE);
  if (pagination.totalCount !== reviewItems.length) pagination.setTotalCount(reviewItems.length);
  const pagedItems = reviewItems.slice(pagination.from, pagination.to + 1);

  const tabs: { key: Filter; label: string }[] = [
    { key: 'mine', label: `Σε εμένα (${counts.mine})` },
    { key: 'all', label: `Όλα (${counts.all})` },
    { key: 'overdue', label: `Ληγμένα (${counts.overdue})` },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex bg-muted rounded-md p-0.5 text-xs">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded transition-colors ${
              filter === t.key ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {reviewItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 text-success" />
          <p className="text-sm">
            {filter === 'mine' ? 'Δεν έχεις άρθρα για review' : 'Δεν υπάρχουν εκκρεμή reviews'}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Τίτλος</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Review Due</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[120px]">Ενέργειες</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map(article => (
                <TableRow key={article.id} className="cursor-pointer" onClick={() => onSelect(article)}>
                  <TableCell className="font-medium">{article.title}</TableCell>
                  <TableCell>
                    {article.review_status === 'pending' ? (
                      <Badge variant="warning">pending review</Badge>
                    ) : (
                      <Badge variant={article.status === 'draft' ? 'warning' : 'default'}>
                        {article.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {article.reviewer_id === profile?.id ? (
                      <Badge variant="outline" className="text-[10px]">Εσύ</Badge>
                    ) : article.reviewer_id ? '—' : <span className="italic">Μη ορισμένος</span>}
                  </TableCell>
                  <TableCell>
                    {article.next_review_date ? (
                      <span className="flex items-center gap-1 text-warning text-sm">
                        <AlertTriangle className="h-3 w-3" />
                        {format(new Date(article.next_review_date), 'dd/MM/yy')}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(article.updated_at), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onApprove(article.id)}>
                        <Check className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDeprecate(article.id)}>
                        <Archive className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4">
            <PaginationControls pagination={pagination} />
          </div>
        </>
      )}
    </div>
  );
}
