import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'kanban' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ viewMode, onViewModeChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg", className)}>
      <Button
        variant={viewMode === 'kanban' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => onViewModeChange('kanban')}
      >
        <LayoutGrid className="h-4 w-4 mr-1" />
        Kanban
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => onViewModeChange('list')}
      >
        <List className="h-4 w-4 mr-1" />
        Λίστα
      </Button>
    </div>
  );
}
