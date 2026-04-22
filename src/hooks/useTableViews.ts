import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ColumnConfig } from '@/components/shared/ColumnVisibilityToggle';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

export type GroupByField = 'none' | 'status' | 'assignee' | 'project' | 'priority' | 'deliverable';

export interface SavedView {
  id: string;
  name: string;
  columns: ColumnConfig[];
  columnWidths?: Record<string, number>;
  columnOrder?: string[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
  groupBy?: GroupByField;
  filters?: Record<string, string>;
  isDefault?: boolean;
}

interface UseTableViewsOptions {
  storageKey: string;
  defaultColumns: ColumnConfig[];
}

export function useTableViews({ storageKey, defaultColumns }: UseTableViewsOptions) {
  const defaultOrder = useMemo(() => defaultColumns.map(c => c.id), [defaultColumns]);
  const lockedIds = useMemo(
    () => new Set(defaultColumns.filter(c => (c as any).locked).map(c => c.id)),
    [defaultColumns]
  );

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(`${storageKey}_columns`);
    return saved ? JSON.parse(saved) : defaultColumns;
  });
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`${storageKey}_widths`);
    return saved ? JSON.parse(saved) : {};
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_order`);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // sanity: ensure all default ids exist exactly once; otherwise fall back
        const ok = defaultOrder.every(id => parsed.includes(id)) && parsed.length === defaultOrder.length;
        if (ok) return parsed;
      }
    } catch {}
    return defaultOrder;
  });
  
  const [groupBy, setGroupBy] = useState<GroupByField>(() => {
    const saved = localStorage.getItem(`${storageKey}_groupBy`);
    return (saved as GroupByField) || 'none';
  });
  
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const saved = localStorage.getItem(`${storageKey}_views`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  // Persist state
  useEffect(() => {
    localStorage.setItem(`${storageKey}_columns`, JSON.stringify(columns));
  }, [columns, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_widths`, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_order`, JSON.stringify(columnOrder));
  }, [columnOrder, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_groupBy`, groupBy);
  }, [groupBy, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_views`, JSON.stringify(savedViews));
  }, [savedViews, storageKey]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, []);

  const resetColumnWidth = useCallback((columnId: string) => {
    setColumnWidths(prev => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  }, []);

  const setColumnVisible = useCallback((columnId: string, visible: boolean) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, visible } : c));
  }, []);

  const toggleColumnVisible = useCallback((columnId: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, visible: !c.visible } : c));
  }, []);

  const hideColumn = useCallback((columnId: string) => {
    if (lockedIds.has(columnId)) return;
    setColumnVisible(columnId, false);
  }, [lockedIds, setColumnVisible]);

  // Reorder
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder(prev => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx < 0 || newIdx < 0) return prev;
      const movedKey = prev[oldIdx];
      if (lockedIds.has(movedKey)) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, [lockedIds]);

  // Ordered columns based on saved order
  const orderedColumns = useMemo(() => {
    const map = new Map(columns.map(c => [c.id, c]));
    const result: ColumnConfig[] = [];
    columnOrder.forEach(id => {
      const c = map.get(id);
      if (c) result.push(c);
    });
    // Append any new columns not yet in saved order
    columns.forEach(c => { if (!columnOrder.includes(c.id)) result.push(c); });
    return result;
  }, [columns, columnOrder]);

  const saveView = useCallback((
    name: string, 
    sortField: string | null, 
    sortDirection: 'asc' | 'desc' | null
  ) => {
    const newView: SavedView = {
      id: Date.now().toString(),
      name,
      columns: [...columns],
      columnWidths: { ...columnWidths },
      columnOrder: [...columnOrder],
      sortField,
      sortDirection,
      groupBy,
    };
    setSavedViews(prev => [...prev, newView]);
    setCurrentViewId(newView.id);
    return newView;
  }, [columns, columnWidths, columnOrder, groupBy]);

  const loadView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setColumns(view.columns);
      if (view.columnWidths) setColumnWidths(view.columnWidths);
      if (view.columnOrder) setColumnOrder(view.columnOrder);
      if (view.groupBy) setGroupBy(view.groupBy);
      setCurrentViewId(viewId);
      return view;
    }
    return null;
  }, [savedViews]);

  const deleteView = useCallback((viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
    if (currentViewId === viewId) {
      setCurrentViewId(null);
    }
  }, [currentViewId]);

  const resetToDefault = useCallback(() => {
    setColumns(defaultColumns);
    setColumnWidths({});
    setColumnOrder(defaultOrder);
    setGroupBy('none');
    setCurrentViewId(null);
  }, [defaultColumns, defaultOrder]);

  return {
    columns,
    setColumns,
    orderedColumns,
    columnOrder,
    setColumnOrder,
    columnWidths,
    setColumnWidth,
    resetColumnWidth,
    setColumnVisible,
    toggleColumnVisible,
    hideColumn,
    lockedIds,
    groupBy,
    setGroupBy,
    savedViews,
    currentViewId,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
    // dnd helpers
    sensors,
    handleDragEnd,
    DndContext,
    SortableContext,
    horizontalListSortingStrategy,
    closestCenter,
  };
}

export type TableViewsLayout = ReturnType<typeof useTableViews>;
