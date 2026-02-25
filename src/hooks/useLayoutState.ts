import { useState, useEffect, useMemo } from 'react';

export type LayoutState = 'wide' | 'standard' | 'narrow' | 'mobile';
export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';
export type RightPanelMode = 'docked' | 'overlay' | 'drawer';
export type Density = 'comfortable' | 'compact';

const WIDE_BP = 1440;
const STANDARD_BP = 1200;
const NARROW_BP = 992;

function getLayoutState(width: number): LayoutState {
  if (width >= WIDE_BP) return 'wide';
  if (width >= STANDARD_BP) return 'standard';
  if (width >= NARROW_BP) return 'narrow';
  return 'mobile';
}

export function useLayoutState() {
  const [layoutState, setLayoutState] = useState<LayoutState>(() =>
    typeof window !== 'undefined' ? getLayoutState(window.innerWidth) : 'wide'
  );

  useEffect(() => {
    const mqWide = window.matchMedia(`(min-width: ${WIDE_BP}px)`);
    const mqStandard = window.matchMedia(`(min-width: ${STANDARD_BP}px)`);
    const mqNarrow = window.matchMedia(`(min-width: ${NARROW_BP}px)`);

    const update = () => {
      if (mqWide.matches) setLayoutState('wide');
      else if (mqStandard.matches) setLayoutState('standard');
      else if (mqNarrow.matches) setLayoutState('narrow');
      else setLayoutState('mobile');
    };

    mqWide.addEventListener('change', update);
    mqStandard.addEventListener('change', update);
    mqNarrow.addEventListener('change', update);
    update();

    return () => {
      mqWide.removeEventListener('change', update);
      mqStandard.removeEventListener('change', update);
      mqNarrow.removeEventListener('change', update);
    };
  }, []);

  const derived = useMemo(() => {
    const sidebarMode: SidebarMode =
      layoutState === 'mobile' ? 'hidden' :
      layoutState === 'narrow' ? 'collapsed' : 'expanded';

    const rightPanelMode: RightPanelMode =
      layoutState === 'wide' ? 'docked' :
      layoutState === 'mobile' ? 'drawer' : 'overlay';

    const density: Density =
      (layoutState === 'narrow' || layoutState === 'mobile') ? 'compact' : 'comfortable';

    return { sidebarMode, rightPanelMode, density };
  }, [layoutState]);

  return {
    layoutState,
    ...derived,
  };
}
