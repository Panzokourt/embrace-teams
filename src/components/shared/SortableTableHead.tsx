import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableHead } from '@/components/ui/table';
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
import { cn } from '@/lib/utils';
import type { ColumnLayout, ColumnDef } from '@/hooks/useColumnLayout';

interface SortableTableHeadProps<K extends string> {
  colKey: K;
  layout: ColumnLayout<K>;
  className?: string;
  children: React.ReactNode;
  /** override sortField from columns def */
  sortField?: string;
  /** custom right-aligned column (e.g. actions) */
  align?: 'left' | 'right' | 'center';
}

/**
 * Drop-in replacement for <TableHead> that adds:
 *  - drag-to-reorder
 *  - drag-to-resize
 *  - right-click context menu (sort, hide, show, reset)
 *  - sort indicator + click-to-sort
 */
export function SortableTableHead<K extends string>({
  colKey,
  layout,
  className,
  children,
  sortField: sortFieldOverride,
  align = 'left',
}: SortableTableHeadProps<K>) {
  const colDef = layout.colMap.get(colKey);
  const isLocked = layout.lockedKeys.has(colKey);
  const sortField = sortFieldOverride ?? colDef?.sortField;
  const isSorted = sortField && layout.sortField === sortField;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: colKey, disabled: isLocked });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: layout.widths[colKey],
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  const SortIcon = () => {
    if (!sortField) return null;
    if (!isSorted) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return layout.sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const onHeaderClick = () => {
    if (sortField) layout.toggleSort(sortField);
  };

  const alignClass =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : '';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableHead
          ref={setNodeRef}
          style={style}
          className={cn('relative group/col select-none', className)}
        >
          <div className={cn('flex items-center gap-1.5 min-w-0', alignClass)}>
            {!isLocked && (
              <span
                {...attributes}
                {...listeners}
                className="opacity-0 group-hover/col:opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 min-w-0 flex-1',
                sortField && 'cursor-pointer',
                alignClass
              )}
              onClick={onHeaderClick}
            >
              <span className="truncate">{children}</span>
              <SortIcon />
            </div>
          </div>

          {!isLocked && (
            <span
              onMouseDown={layout.startResize(colKey)}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
              aria-hidden
            />
          )}
        </TableHead>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuLabel>{colDef?.label ?? String(colKey)}</ContextMenuLabel>
        <ContextMenuSeparator />

        {sortField && (
          <>
            <ContextMenuItem onClick={() => layout.sortAsc(sortField)}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Αύξουσα ταξινόμηση
            </ContextMenuItem>
            <ContextMenuItem onClick={() => layout.sortDesc(sortField)}>
              <ArrowDown className="h-4 w-4 mr-2" />
              Φθίνουσα ταξινόμηση
            </ContextMenuItem>
            {isSorted && (
              <ContextMenuItem onClick={layout.clearSort}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Καθαρισμός ταξινόμησης
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}

        {!isLocked && (
          <ContextMenuItem onClick={() => layout.hideColumn(colKey)}>
            <EyeOff className="h-4 w-4 mr-2" />
            Απόκρυψη στήλης
          </ContextMenuItem>
        )}
        {!isLocked && (
          <ContextMenuItem onClick={() => layout.resetColumnWidth(colKey)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Επαναφορά πλάτους
          </ContextMenuItem>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Columns3 className="h-4 w-4 mr-2" />
            Στήλες
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56">
            {layout.columns.map((c: ColumnDef<K>) => (
              <ContextMenuCheckboxItem
                key={c.key}
                checked={!layout.hidden.has(c.key)}
                disabled={c.locked}
                onCheckedChange={() => layout.toggleColumn(c.key)}
                onSelect={(e) => e.preventDefault()}
              >
                {c.label}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <ContextMenuItem onClick={layout.resetAll}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Επαναφορά όλων
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
