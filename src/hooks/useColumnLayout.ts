import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

/**
 * Generic reusable table-column layout system.
 *
 * Provides:
 * - per-column width with drag-to-resize
 * - drag-and-drop column reordering
 * - column hide/show
 * - sort field + direction
 * - localStorage persistence (widths / order / hidden)
 *
 * Designed to wrap any existing table.  See SortableTableHead for the header
 * cell implementation that uses the values returned here.
 */

export type ColumnDef<K extends string> = {
  key: K;
  label: string;
  /** default width in px */
  width: number;
  /** if true, column cannot be hidden, reordered or resized (e.g. checkbox / actions) */
  locked?: boolean;
  /** field name to use when sorting; if omitted column is non-sortable */
  sortField?: string;
};

export interface UseColumnLayoutOptions<K extends string> {
  /** unique key, used for localStorage namespacing (e.g. "projects-table") */
  storageKey: string;
  /** column definitions in default visual order */
  columns: ColumnDef<K>[];
  /** minimum column width in px */
  minWidth?: number;
}

export function useColumnLayout<K extends string>({
  storageKey,
  columns,
  minWidth = 60,
}: UseColumnLayoutOptions<K>) {
  const defaultWidths = useMemo(() => {
    const m = {} as Record<K, number>;
    columns.forEach(c => { m[c.key] = c.width; });
    return m;
  }, [columns]);

  const defaultOrder = useMemo(() => columns.map(c => c.key), [columns]);

  const lockedKeys = useMemo(
    () => new Set(columns.filter(c => c.locked).map(c => c.key)),
    [columns]
  );

  const colMap = useMemo(() => {
    const m = new Map<K, ColumnDef<K>>();
    columns.forEach(c => m.set(c.key, c));
    return m;
  }, [columns]);

  const WIDTHS_KEY = `${storageKey}-col-widths-v1`;
  const ORDER_KEY = `${storageKey}-col-order-v1`;
  const HIDDEN_KEY = `${storageKey}-col-hidden-v1`;

  const [widths, setWidths] = useState<Record<K, number>>(() => {
    if (typeof window === 'undefined') return defaultWidths;
    try {
      const raw = localStorage.getItem(WIDTHS_KEY);
      if (raw) return { ...defaultWidths, ...JSON.parse(raw) };
    } catch {}
    return defaultWidths;
  });

  const [order, setOrder] = useState<K[]>(() => {
    if (typeof window === 'undefined') return defaultOrder;
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as K[];
        const ok =
          defaultOrder.every(k => parsed.includes(k)) &&
          parsed.length === defaultOrder.length;
        if (ok) return parsed;
      }
    } catch {}
    return defaultOrder;
  });

  const [hidden, setHidden] = useState<Set<K>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(HIDDEN_KEY);
      if (raw) return new Set(JSON.parse(raw) as K[]);
    } catch {}
    return new Set();
  });

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Persist
  useEffect(() => {
    try { localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths)); } catch {}
  }, [widths, WIDTHS_KEY]);
  useEffect(() => {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch {}
  }, [order, ORDER_KEY]);
  useEffect(() => {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(hidden))); } catch {}
  }, [hidden, HIDDEN_KEY]);

  const visibleOrder = useMemo(
    () => order.filter(k => !hidden.has(k)),
    [order, hidden]
  );

  // Resize
  const dragRef = useRef<{ key: K; startX: number; startW: number } | null>(null);
  const startResize = useCallback(
    (key: K) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { key, startX: e.clientX, startW: widths[key] };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        const next = Math.max(minWidth, dragRef.current.startW + delta);
        setWidths(prev => ({ ...prev, [dragRef.current!.key]: next }));
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [widths, minWidth]
  );

  // Reorder
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder(prev => {
      const oldIdx = prev.indexOf(active.id as K);
      const newIdx = prev.indexOf(over.id as K);
      if (oldIdx < 0 || newIdx < 0) return prev;
      // do not allow moving a locked column or moving over a locked one at idx 0
      const movedKey = prev[oldIdx];
      if (lockedKeys.has(movedKey)) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, [lockedKeys]);

  // Visibility / sort actions
  const hideColumn = useCallback((key: K) => {
    if (lockedKeys.has(key)) return;
    setHidden(prev => new Set(prev).add(key));
  }, [lockedKeys]);
  const showColumn = useCallback((key: K) => setHidden(prev => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  }), []);
  const toggleColumn = useCallback((key: K) => {
    if (lockedKeys.has(key)) return;
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [lockedKeys]);

  const resetColumnWidth = useCallback((key: K) => {
    setWidths(prev => ({ ...prev, [key]: defaultWidths[key] }));
  }, [defaultWidths]);

  const resetAll = useCallback(() => {
    setWidths(defaultWidths);
    setOrder(defaultOrder);
    setHidden(new Set());
    setSortField(null);
  }, [defaultWidths, defaultOrder]);

  const sortAsc = useCallback((field: string) => {
    setSortField(field);
    setSortDirection('asc');
  }, []);
  const sortDesc = useCallback((field: string) => {
    setSortField(field);
    setSortDirection('desc');
  }, []);
  const clearSort = useCallback(() => setSortField(null), []);
  const toggleSort = useCallback((field: string) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  return {
    // state
    widths,
    order,
    visibleOrder,
    hidden,
    sortField,
    sortDirection,
    columns,
    colMap,
    lockedKeys,

    // resize
    startResize,

    // reorder (use these to wrap your <Table>)
    sensors,
    handleDragEnd,
    DndContext,
    SortableContext,
    horizontalListSortingStrategy,
    closestCenter,

    // visibility / sort actions
    hideColumn,
    showColumn,
    toggleColumn,
    resetColumnWidth,
    resetAll,
    sortAsc,
    sortDesc,
    clearSort,
    toggleSort,
    setSortField,
    setSortDirection,
  };
}

export type ColumnLayout<K extends string> = ReturnType<typeof useColumnLayout<K>>;
