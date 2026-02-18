import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetViewType = 'card' | 'table' | 'list';

export interface WidgetConfig {
  id: string;
  visible: boolean;
  size: WidgetSize;
  viewType?: WidgetViewType;
}

export interface DashboardFilters {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  clientId: string | null;
  projectId: string | null;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  filters: DashboardFilters;
}

export interface SavedLayout {
  name: string;
  config: DashboardConfig;
}

const STORAGE_KEY = 'dashboard_config_v1';
const LAYOUTS_STORAGE_KEY = 'dashboard_saved_layouts_v1';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'total_revenue', visible: true, size: 'small' },
  { id: 'agency_fee', visible: true, size: 'small' },
  { id: 'net_profit', visible: true, size: 'small' },
  { id: 'pending_invoices', visible: true, size: 'small' },
  { id: 'active_tenders', visible: true, size: 'small' },
  { id: 'active_projects', visible: true, size: 'small' },
  { id: 'win_rate', visible: true, size: 'small' },
  { id: 'overdue', visible: true, size: 'small' },
  { id: 'today_hours', visible: true, size: 'small' },
  { id: 'utilization', visible: true, size: 'small' },
  { id: 'pipeline', visible: true, size: 'large', viewType: 'card' },
  { id: 'alerts', visible: true, size: 'medium', viewType: 'card' },
  { id: 'deadlines', visible: true, size: 'medium', viewType: 'card' },
  { id: 'recent_activity', visible: true, size: 'medium', viewType: 'card' },
  { id: 'revenue_chart', visible: false, size: 'large' },
  { id: 'project_progress', visible: false, size: 'medium', viewType: 'card' },
];

const DEFAULT_FILTERS: DashboardFilters = {
  period: 'month',
  clientId: null,
  projectId: null,
};

function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardConfig;
      const existingIds = new Set(parsed.widgets.map(w => w.id));
      const merged = [
        ...parsed.widgets,
        ...DEFAULT_WIDGETS.filter(w => !existingIds.has(w.id)),
      ];
      return { widgets: merged, filters: { ...DEFAULT_FILTERS, ...parsed.filters } };
    }
  } catch { /* ignore */ }
  return { widgets: DEFAULT_WIDGETS, filters: DEFAULT_FILTERS };
}

function saveConfig(config: DashboardConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function loadLayouts(): Record<string, DashboardConfig> {
  try {
    const raw = localStorage.getItem(LAYOUTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveLayouts(layouts: Record<string, DashboardConfig>) {
  localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
}

export function useDashboardConfig() {
  const [config, setConfigState] = useState<DashboardConfig>(loadConfig);
  const [savedLayouts, setSavedLayoutsState] = useState<Record<string, DashboardConfig>>(loadLayouts);

  const setConfig = useCallback((updater: DashboardConfig | ((prev: DashboardConfig) => DashboardConfig)) => {
    setConfigState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveConfig(next);
      return next;
    });
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w),
    }));
  }, [setConfig]);

  const setWidgetSize = useCallback((id: string, size: WidgetSize) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id ? { ...w, size } : w),
    }));
  }, [setConfig]);

  const setWidgetViewType = useCallback((id: string, viewType: WidgetViewType) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id ? { ...w, viewType } : w),
    }));
  }, [setConfig]);

  const setFilters = useCallback((filters: Partial<DashboardFilters>) => {
    setConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, [setConfig]);

  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setConfig(prev => {
      const oldIndex = prev.widgets.findIndex(w => w.id === activeId);
      const newIndex = prev.widgets.findIndex(w => w.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, widgets: arrayMove(prev.widgets, oldIndex, newIndex) };
    });
  }, [setConfig]);

  const getWidget = useCallback((id: string) => {
    return config.widgets.find(w => w.id === id);
  }, [config.widgets]);

  // Saved layouts
  const saveLayout = useCallback((name: string) => {
    setSavedLayoutsState(prev => {
      const next = { ...prev, [name]: structuredClone(config) };
      saveLayouts(next);
      return next;
    });
  }, [config]);

  const loadLayout = useCallback((name: string) => {
    const layout = savedLayouts[name];
    if (layout) setConfig(layout);
  }, [savedLayouts, setConfig]);

  const deleteLayout = useCallback((name: string) => {
    setSavedLayoutsState(prev => {
      const next = { ...prev };
      delete next[name];
      saveLayouts(next);
      return next;
    });
  }, []);

  const visibleWidgets = config.widgets.filter(w => w.visible);

  return {
    config,
    visibleWidgets,
    toggleWidget,
    setWidgetSize,
    setWidgetViewType,
    setFilters,
    getWidget,
    reorderWidgets,
    savedLayouts,
    saveLayout,
    loadLayout,
    deleteLayout,
  };
}

export function getFilterDateRange(period: DashboardFilters['period']): Date {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), qMonth, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
  }
}
