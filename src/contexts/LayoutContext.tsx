import { createContext, useContext } from 'react';
import { useLayoutState, type LayoutState, type SidebarMode, type RightPanelMode, type Density } from '@/hooks/useLayoutState';

interface LayoutContextType {
  layoutState: LayoutState;
  sidebarMode: SidebarMode;
  rightPanelMode: RightPanelMode;
  density: Density;
}

const LayoutContext = createContext<LayoutContextType>({
  layoutState: 'wide',
  sidebarMode: 'expanded',
  rightPanelMode: 'docked',
  density: 'comfortable',
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const state = useLayoutState();
  return (
    <LayoutContext.Provider value={state}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
