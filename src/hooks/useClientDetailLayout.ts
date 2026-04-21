import { useCallback, useEffect, useState } from 'react';

export type SectionColumn = 'left' | 'right';

export interface ClientSectionConfig {
  id: string;
  visible: boolean;
  column: SectionColumn;
}

export interface ClientSectionMeta {
  id: string;
  label: string;
}

const STORAGE_KEY = 'client_detail_layout_v1';

export const CLIENT_SECTION_META: ClientSectionMeta[] = [
  { id: 'business_info', label: 'Επιχειρηματικά Στοιχεία' },
  { id: 'websites', label: 'Websites' },
  { id: 'social', label: 'Social & Channels' },
  { id: 'ad_accounts', label: 'Ad Accounts' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'pl_summary', label: 'P&L Summary' },
  { id: 'projects', label: 'Projects' },
  { id: 'media_plans', label: 'Media Plans' },
  { id: 'tasks_snapshot', label: 'Tasks Snapshot' },
  { id: 'briefs', label: 'Briefs' },
  { id: 'team', label: 'Team' },
  { id: 'contacts', label: 'Contacts' },
];

const DEFAULT_LAYOUT: ClientSectionConfig[] = [
  { id: 'business_info', visible: true, column: 'left' },
  { id: 'websites', visible: true, column: 'left' },
  { id: 'social', visible: true, column: 'left' },
  { id: 'ad_accounts', visible: true, column: 'left' },
  { id: 'strategy', visible: true, column: 'left' },
  { id: 'pl_summary', visible: true, column: 'right' },
  { id: 'projects', visible: true, column: 'right' },
  { id: 'media_plans', visible: true, column: 'right' },
  { id: 'tasks_snapshot', visible: true, column: 'right' },
  { id: 'briefs', visible: true, column: 'right' },
  { id: 'team', visible: true, column: 'right' },
  { id: 'contacts', visible: true, column: 'right' },
];

function loadLayout(): ClientSectionConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as ClientSectionConfig[];
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;

    // Merge with defaults so newly added sections appear automatically
    const known = new Map(parsed.map(s => [s.id, s]));
    const merged: ClientSectionConfig[] = [];
    for (const def of DEFAULT_LAYOUT) {
      const existing = known.get(def.id);
      if (existing) {
        merged.push({
          id: def.id,
          visible: existing.visible,
          column: existing.column === 'left' || existing.column === 'right' ? existing.column : def.column,
        });
        known.delete(def.id);
      } else {
        merged.push(def);
      }
    }
    return merged;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function useClientDetailLayout() {
  const [layout, setLayoutState] = useState<ClientSectionConfig[]>(loadLayout);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout]);

  const setLayout = useCallback(
    (updater: ClientSectionConfig[] | ((prev: ClientSectionConfig[]) => ClientSectionConfig[])) => {
      setLayoutState(prev => (typeof updater === 'function' ? (updater as any)(prev) : updater));
    },
    []
  );

  const toggleVisibility = useCallback((id: string) => {
    setLayoutState(prev => prev.map(s => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }, []);

  const hideSection = useCallback((id: string) => {
    setLayoutState(prev => prev.map(s => (s.id === id ? { ...s, visible: false } : s)));
  }, []);

  const resetLayout = useCallback(() => {
    setLayoutState(DEFAULT_LAYOUT);
  }, []);

  const moveSection = useCallback((activeId: string, overId: string, overColumn?: SectionColumn) => {
    setLayoutState(prev => {
      const activeIdx = prev.findIndex(s => s.id === activeId);
      if (activeIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(activeIdx, 1);

      // If dropped on a column container directly
      if (overId.startsWith('column:')) {
        const col = overId.split(':')[1] as SectionColumn;
        moved.column = col;
        next.push(moved);
        return next;
      }

      const overIdx = next.findIndex(s => s.id === overId);
      if (overIdx === -1) {
        if (overColumn) moved.column = overColumn;
        next.push(moved);
        return next;
      }
      moved.column = next[overIdx].column;
      next.splice(overIdx, 0, moved);
      return next;
    });
  }, []);

  const leftSections = layout.filter(s => s.column === 'left' && s.visible);
  const rightSections = layout.filter(s => s.column === 'right' && s.visible);

  return {
    layout,
    leftSections,
    rightSections,
    setLayout,
    toggleVisibility,
    hideSection,
    resetLayout,
    moveSection,
  };
}
