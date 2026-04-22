import { useState, useRef, useCallback } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from '@/components/ui/context-menu';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  EyeOff,
  RotateCcw,
  Columns3,
} from 'lucide-react';
import type { TableViewsLayout } from '@/hooks/useTableViews';

interface ResizableTableHeaderProps {
  children: React.ReactNode;
  width?: number;
  minWidth?: number;
  onWidthChange?: (width: number) => void;
  className?: string;
  onClick?: () => void;
  /** When provided, enables reorder + right-click context menu. */
  columnId?: string;
  /** Layout from useTableViews — required for reorder/context menu features. */
  layout?: TableViewsLayout;
  /** Sort field name; if set, context menu shows sort actions. */
  sortField?: string;
  /** Current sort field/direction for indicator (kept here for compatibility). */
  currentSortField?: string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
  onSort?: (field: string, dir: 'asc' | 'desc') => void;
  onClearSort?: () => void;
}

export function ResizableTableHeader({
  children,
  width,
  minWidth = 80,
  onWidthChange,
  className,
  onClick,
  columnId,
  layout,
  sortField,
  currentSortField,
  currentSortDirection,
  onSort,
  onClearSort,
}: ResizableTableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const headerRef = useRef<HTMLTableCellElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const enableReorder = !!(layout && columnId && !layout.lockedIds.has(columnId));
  const enableMenu = !!(layout && columnId);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId ?? '__noop__',
    disabled: !enableReorder,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!headerRef.current) return;

    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = headerRef.current.offsetWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minWidth, onWidthChange]);

  // Combine refs (sortable + ours)
  const setRefs = (node: HTMLTableCellElement | null) => {
    headerRef.current = node;
    if (enableReorder) setNodeRef(node);
  };

  const style: React.CSSProperties = {
    width: width ? `${width}px` : undefined,
    transform: enableReorder ? CSS.Transform.toString(transform) : undefined,
    transition: enableReorder ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  const isSorted = sortField && currentSortField === sortField;

  const headerInner = (
    <TableHead
      ref={setRefs}
      className={cn('relative select-none group/col', className)}
      style={style}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {enableReorder && (
          <span
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover/col:opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Μετακίνηση στήλης"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {/* Resize Handle */}
      {onWidthChange && (
        <div
          className={cn(
            'absolute right-0 top-0 h-full w-1 cursor-col-resize group bg-popover',
            isResizing && 'bg-primary/50'
          )}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-border rounded-full',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isResizing && 'opacity-100'
            )}
          />
        </div>
      )}
    </TableHead>
  );

  if (!enableMenu) return headerInner;

  // With context menu
  const colDef = layout!.orderedColumns.find(c => c.id === columnId);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{headerInner}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{colDef?.label || columnId}</ContextMenuLabel>
        <ContextMenuSeparator />

        {sortField && onSort && (
          <>
            <ContextMenuItem onClick={() => onSort(sortField, 'asc')}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Αύξουσα ταξινόμηση
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onSort(sortField, 'desc')}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Φθίνουσα ταξινόμηση
            </ContextMenuItem>
            {isSorted && onClearSort && (
              <ContextMenuItem onClick={onClearSort}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Καθαρισμός ταξινόμησης
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}

        {!layout!.lockedIds.has(columnId!) && (
          <>
            <ContextMenuItem onClick={() => layout!.hideColumn(columnId!)}>
              <EyeOff className="h-4 w-4 mr-2" />
              Απόκρυψη στήλης
            </ContextMenuItem>
            {onWidthChange && (
              <ContextMenuItem onClick={() => layout!.resetColumnWidth(columnId!)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Επαναφορά πλάτους
              </ContextMenuItem>
            )}
          </>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Columns3 className="h-4 w-4 mr-2" />
            Στήλες
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 max-h-80 overflow-y-auto">
            {layout!.orderedColumns.map(c => (
              <ContextMenuCheckboxItem
                key={c.id}
                checked={c.visible}
                disabled={(c as any).locked}
                onCheckedChange={() => layout!.toggleColumnVisible(c.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {c.label || c.id}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => layout!.resetToDefault()}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Επαναφορά όλων
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
