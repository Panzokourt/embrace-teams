import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Archive, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { KBArticle } from '@/hooks/useKnowledgeBase';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const PAGE_SIZE = 15;

interface KBReviewQueueProps {
  articles: KBArticle[];
  onApprove: (id: string) => void;
  onDeprecate: (id: string) => void;
  onSelect: (article: KBArticle) => void;
}

export function KBReviewQueue({ articles, onApprove, onDeprecate, onSelect }: KBReviewQueueProps) {
  const reviewItems = articles.filter(a => {
    if (a.status === 'deprecated') return false;
    if (a.status === 'draft') return true;
    if (a.next_review_date && new Date(a.next_review_date) <= new Date()) return true;
    return false;
  });

  const pagination = usePagination(PAGE_SIZE);
  if (pagination.totalCount !== reviewItems.length) pagination.setTotalCount(reviewItems.length);
  const pagedItems = reviewItems.slice(pagination.from, pagination.to + 1);

  if (reviewItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Check className="h-8 w-8 mx-auto mb-2 text-success" />
        <p className="text-sm">Δεν υπάρχουν εκκρεμή reviews</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Τίτλος</TableHead>
            <TableHead>Status</TableHead>
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
                <Badge variant={article.status === 'draft' ? 'warning' : 'default'}>
                  {article.status}
                </Badge>
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
    </div>
  );
}
