import { useState, useEffect, useCallback } from 'react';
import { ColumnConfig } from '@/components/shared/ColumnVisibilityToggle';

export type GroupByField = 'none' | 'status' | 'assignee' | 'project' | 'priority';

export interface SavedView {
  id: string;
  name: string;
  columns: ColumnConfig[];
  columnWidths?: Record<string, number>;
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
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(`${storageKey}_columns`);
    return saved ? JSON.parse(saved) : defaultColumns;
  });
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`${storageKey}_widths`);
    return saved ? JSON.parse(saved) : {};
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

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}_columns`, JSON.stringify(columns));
  }, [columns, storageKey]);

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}_widths`, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);

  // Save groupBy to localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}_groupBy`, groupBy);
  }, [groupBy, storageKey]);

  // Save views to localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}_views`, JSON.stringify(savedViews));
  }, [savedViews, storageKey]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, []);

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
      sortField,
      sortDirection,
      groupBy,
    };
    setSavedViews(prev => [...prev, newView]);
    setCurrentViewId(newView.id);
    return newView;
  }, [columns, columnWidths, groupBy]);

  const loadView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setColumns(view.columns);
      if (view.columnWidths) setColumnWidths(view.columnWidths);
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
    setGroupBy('none');
    setCurrentViewId(null);
  }, [defaultColumns]);

  return {
    columns,
    setColumns,
    columnWidths,
    setColumnWidth,
    groupBy,
    setGroupBy,
    savedViews,
    currentViewId,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
  };
}
