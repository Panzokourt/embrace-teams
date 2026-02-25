import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import type { KBArticle } from '@/hooks/useKnowledgeBase';

interface KBArticleCardProps {
  article: KBArticle;
  onClick: () => void;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'warning',
  approved: 'success',
  deprecated: 'destructive',
};

export function KBArticleCard({ article, onClick }: KBArticleCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium text-sm truncate">{article.title}</h3>
          </div>
          <Badge variant={statusVariant[article.status] || 'default'} className="shrink-0 text-[10px]">
            {article.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {article.body.slice(0, 150)}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(article.updated_at), 'dd/MM/yyyy')}
          </span>
          <span>v{article.version}</span>
          {article.tags?.length > 0 && (
            <span className="truncate">{article.tags.slice(0, 2).join(', ')}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
