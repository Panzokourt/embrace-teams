import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'dock:visibility:v1';

export type DockMode = 'visible' | 'minimized' | 'auto-hide';

interface DockVisibilityState {
  mode: DockMode;
  setMode: (mode: DockMode) => void;
  /** True when dock should currently render expanded (taking into account auto-hide hover state) */
  isExpanded: boolean;
  /** Hover handlers for the trigger zone / dock itself */
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  /** Lock the dock open (e.g. while a popover/dropdown is open). Returns an unlock fn. */
  setLocked: (locked: boolean) => void;
}

export function useDockVisibility(): DockVisibilityState {
  const [mode, setModeState] = useState<DockMode>(() => {
    if (typeof window === 'undefined') return 'visible';
    const stored = localStorage.getItem(STORAGE_KEY) as DockMode | null;
    return stored ?? 'visible';
  });
  const [isHovering, setIsHovering] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const setMode = useCallback((next: DockMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const onHoverEnter = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsHovering(true);
  }, []);

  const onHoverLeave = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsHovering(false);
      hideTimerRef.current = null;
    }, 600);
  }, []);

  const setLocked = useCallback((locked: boolean) => {
    setIsLocked(locked);
    if (locked && hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const isExpanded =
    mode === 'visible'
      ? true
      : mode === 'auto-hide'
        ? isHovering || isLocked
        : isLocked;

  return { mode, setMode, isExpanded, onHoverEnter, onHoverLeave, setLocked };
}
