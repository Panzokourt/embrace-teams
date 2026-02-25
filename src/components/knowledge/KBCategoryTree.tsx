import { cn } from '@/lib/utils';
import { ChevronRight, Folder } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { KBCategory } from '@/hooks/useKnowledgeBase';

interface KBCategoryTreeProps {
  categories: KBCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function KBCategoryTree({ categories, selectedId, onSelect }: KBCategoryTreeProps) {
  const roots = categories.filter(c => !c.parent_id);

  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const renderNode = (cat: KBCategory) => {
    const children = getChildren(cat.id);
    const isSelected = selectedId === cat.id;

    if (children.length === 0) {
      return (
        <button
          key={cat.id}
          onClick={() => onSelect(isSelected ? null : cat.id)}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg transition-colors text-left',
            isSelected ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          <Folder className="h-3.5 w-3.5 shrink-0" />
          {cat.name}
        </button>
      );
    }

    return (
      <Collapsible key={cat.id} defaultOpen={cat.level === 1}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg hover:bg-muted/60 transition-colors group text-left">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <span className={cn(
            'font-medium',
            isSelected ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {cat.name}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-0.5">
          <button
            onClick={() => onSelect(isSelected ? null : cat.id)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-1 text-xs rounded-lg transition-colors text-left',
              isSelected ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-muted/60'
            )}
          >
            Όλα
          </button>
          {children.map(renderNode)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-lg transition-colors text-left',
          !selectedId ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/60'
        )}
      >
        Όλες οι κατηγορίες
      </button>
      {roots.map(renderNode)}
    </div>
  );
}
