import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GanttChartSquare, LayoutGrid, List, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnifiedViewMode = 'card' | 'gantt' | 'table' | 'kanban';

interface UnifiedViewToggleProps {
  viewMode?: UnifiedViewMode;
  onViewModeChange?: (mode: UnifiedViewMode) => void;
  showKanban?: boolean;
  showGantt?: boolean;
  showCards?: boolean;
  className?: string;
  storageKey?: string;
  defaultMode?: UnifiedViewMode;
}

export function usePersistedViewMode(
storageKey: string,
defaultMode: UnifiedViewMode = 'table')
: [UnifiedViewMode, (mode: UnifiedViewMode) => void] {
  const [viewMode, setViewMode] = useState<UnifiedViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`viewMode_${storageKey}`);
      if (saved && ['card', 'gantt', 'table', 'kanban'].includes(saved)) {
        return saved as UnifiedViewMode;
      }
    }
    return defaultMode;
  });

  const handleViewModeChange = useCallback((mode: UnifiedViewMode) => {
    setViewMode(mode);
    localStorage.setItem(`viewMode_${storageKey}`, mode);
  }, [storageKey]);

  return [viewMode, handleViewModeChange];
}

export function UnifiedViewToggle({
  viewMode: controlledViewMode,
  onViewModeChange,
  showKanban = true,
  showGantt = false,
  showCards = false,
  className,
  storageKey,
  defaultMode = 'table'
}: UnifiedViewToggleProps) {
  const [internalViewMode, setInternalViewMode] = usePersistedViewMode(
    storageKey || 'default',
    defaultMode
  );

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  const handleChange = (mode: UnifiedViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    if (storageKey) {
      setInternalViewMode(mode);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-lg bg-secondary shadow-md opacity-85", className)}>
      {showCards && (
        <Button
          variant={viewMode === 'card' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-3"
          onClick={() => handleChange('card')}
          title="Προβολή καρτών">
          <LayoutGrid className="h-4 w-4 mr-1.5" />
          Cards
        </Button>
      )}
      {showGantt && (
        <Button
          variant={viewMode === 'gantt' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-3"
          onClick={() => handleChange('gantt')}
          title="Προβολή Gantt">
          <GanttChartSquare className="h-4 w-4 mr-1.5" />
          Gantt
        </Button>
      )}
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => handleChange('table')}
        title="Προβολή πίνακα">
        <List className="h-4 w-4 mr-1.5" />
        Πίνακας
      </Button>
      {showKanban && (
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          className="h-8 px-3"
          onClick={() => handleChange('kanban')}
          title="Προβολή Kanban">
          <Columns className="h-4 w-4 mr-1.5" />
          Kanban
        </Button>
      )}
    </div>
  );
}