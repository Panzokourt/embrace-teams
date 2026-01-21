import { useState, useEffect, useCallback } from 'react';
import { ColumnConfig } from '@/components/shared/ColumnVisibilityToggle';

export interface SavedView {
  id: string;
  name: string;
  columns: ColumnConfig[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
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
  
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    const saved = localStorage.getItem(`${storageKey}_views`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}_columns`, JSON.stringify(columns));
  }, [columns, storageKey]);

  // Save views to localStorage
  useEffect(() => {
    localStorage.setItem(`${storageKey}_views`, JSON.stringify(savedViews));
  }, [savedViews, storageKey]);

  const saveView = useCallback((name: string, sortField: string | null, sortDirection: 'asc' | 'desc' | null) => {
    const newView: SavedView = {
      id: Date.now().toString(),
      name,
      columns: [...columns],
      sortField,
      sortDirection,
    };
    setSavedViews(prev => [...prev, newView]);
    setCurrentViewId(newView.id);
    return newView;
  }, [columns]);

  const loadView = useCallback((viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setColumns(view.columns);
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
    setCurrentViewId(null);
  }, [defaultColumns]);

  return {
    columns,
    setColumns,
    savedViews,
    currentViewId,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
  };
}
