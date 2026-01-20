import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnifiedViewMode = 'card' | 'table' | 'kanban';

interface UnifiedViewToggleProps {
  viewMode: UnifiedViewMode;
  onViewModeChange: (mode: UnifiedViewMode) => void;
  showKanban?: boolean;
  className?: string;
}

export function UnifiedViewToggle({ 
  viewMode, 
  onViewModeChange, 
  showKanban = true,
  className 
}: UnifiedViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg", className)}>
      <Button
        variant={viewMode === 'card' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => onViewModeChange('card')}
        title="Προβολή καρτών"
      >
        <LayoutGrid className="h-4 w-4 mr-1.5" />
        Cards
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => onViewModeChange('table')}
        title="Προβολή πίνακα"
      >
        <List className="h-4 w-4 mr-1.5" />
        Πίνακας
      </Button>
      {showKanban && (
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-3"
          onClick={() => onViewModeChange('kanban')}
          title="Προβολή Kanban"
        >
          <Columns className="h-4 w-4 mr-1.5" />
          Kanban
        </Button>
      )}
    </div>
  );
}
