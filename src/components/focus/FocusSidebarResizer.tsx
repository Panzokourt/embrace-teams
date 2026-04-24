import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FocusSidebarResizerProps {
  width: number;
  setWidth: (w: number) => void;
  min?: number;
  max?: number;
}

/**
 * Vertical drag handle on the LEFT edge of the focus sidebar.
 * Dragging left grows the sidebar (sidebar is on the right).
 */
export default function FocusSidebarResizer({
  width, setWidth, min = 240, max = 480,
}: FocusSidebarResizerProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(width);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const delta = startX.current - e.clientX; // moving left = positive
    const next = Math.max(min, Math.min(max, startW.current + delta));
    setWidth(next);
  }, [min, max, setWidth]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [onPointerMove, onPointerUp, width]);

  useEffect(() => () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove, onPointerUp]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Up Next sidebar"
      onPointerDown={onPointerDown}
      className={cn(
        'absolute top-0 left-0 h-full w-1.5 -translate-x-1/2 cursor-col-resize z-20',
        'group',
      )}
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/10 group-hover:bg-[#3b82f6]/60 group-active:bg-[#3b82f6] transition-colors" />
    </div>
  );
}
