import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type DockPanelId = 'secretary' | 'notifications' | 'activity' | 'memory' | 'chat-picker' | null;

interface DockContextType {
  activePanel: DockPanelId;
  openPanel: (panel: Exclude<DockPanelId, null>) => void;
  closePanel: () => void;
  togglePanel: (panel: Exclude<DockPanelId, null>) => void;
  /** Notify dock that QuickChatBar opened — closes any active panel */
  notifyQuickChatOpened: () => void;
}

const DockContext = createContext<DockContextType | undefined>(undefined);

export function DockProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<DockPanelId>(null);

  const openPanel = useCallback((panel: Exclude<DockPanelId, null>) => {
    setActivePanel(panel);
    // Notify QuickChatBar to close
    window.dispatchEvent(new CustomEvent('dock-panel-opened'));
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const togglePanel = useCallback((panel: Exclude<DockPanelId, null>) => {
    setActivePanel(prev => {
      if (prev === panel) return null;
      window.dispatchEvent(new CustomEvent('dock-panel-opened'));
      return panel;
    });
  }, []);

  const notifyQuickChatOpened = useCallback(() => setActivePanel(null), []);

  // Listen for legacy / external events to open the secretary panel
  useEffect(() => {
    const handler = () => openPanel('secretary');
    window.addEventListener('open-secretary-panel', handler);
    return () => window.removeEventListener('open-secretary-panel', handler);
  }, [openPanel]);

  // ⌘+J → toggle secretary
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        togglePanel('secretary');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePanel]);

  return (
    <DockContext.Provider value={{ activePanel, openPanel, closePanel, togglePanel, notifyQuickChatOpened }}>
      {children}
    </DockContext.Provider>
  );
}

export function useDock() {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error('useDock must be used within DockProvider');
  return ctx;
}
