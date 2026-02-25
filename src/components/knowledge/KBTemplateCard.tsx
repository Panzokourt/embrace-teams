import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileStack, PlayCircle } from 'lucide-react';
import type { KBTemplate } from '@/hooks/useKnowledgeBase';

interface KBTemplateCardProps {
  template: KBTemplate;
  onUse: () => void;
  onEdit: () => void;
}

const typeLabels: Record<string, string> = {
  brief: 'Brief',
  'media-plan': 'Media Plan',
  report: 'Report',
  checklist: 'Checklist',
  sop: 'SOP',
};

export function KBTemplateCard({ template, onUse, onEdit }: KBTemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileStack className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-medium text-sm truncate cursor-pointer hover:text-primary" onClick={onEdit}>
              {template.title}
            </h3>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {typeLabels[template.template_type] || template.template_type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Χρήσεις: {template.usage_count}
          </span>
          <Button size="sm" variant="outline" onClick={onUse} className="h-7 text-xs gap-1">
            <PlayCircle className="h-3 w-3" /> Χρήση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
