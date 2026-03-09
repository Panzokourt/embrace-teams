import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GanttChartSquare, List, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnifiedViewMode = 'gantt' | 'table' | 'kanban';

interface UnifiedViewToggleProps {
  viewMode?: UnifiedViewMode;
  onViewModeChange?: (mode: UnifiedViewMode) => void;
  showKanban?: boolean;
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
      if (saved && ['gantt', 'table', 'kanban'].includes(saved)) {
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
  className,
  storageKey,
  defaultMode = 'table'
}: UnifiedViewToggleProps) {
  const [internalViewMode, setInternalViewMode] = usePersistedViewMode(
    storageKey || 'default',
    defaultMode
  );

  // Use controlled mode if provided, otherwise use internal state
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
      <Button
        variant={viewMode === 'card' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => handleChange('card')}
        title="Προβολή καρτών">

        <LayoutGrid className="h-4 w-4 mr-1.5" />
        Cards
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => handleChange('table')}
        title="Προβολή πίνακα">

        <List className="h-4 w-4 mr-1.5" />
        Πίνακας
      </Button>
      {showKanban &&
      <Button
        variant={viewMode === 'kanban' ? 'default' : 'ghost'}
        size="sm"
        className="h-8 px-3"
        onClick={() => handleChange('kanban')}
        title="Προβολή Kanban">

          <Columns className="h-4 w-4 mr-1.5" />
          Kanban
        </Button>
      }
    </div>);

}