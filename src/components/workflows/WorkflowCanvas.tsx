import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

interface WorkflowCanvasProps {
  children: ReactNode;
  svgLayer?: ReactNode;
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (z: number) => void;
  onPanChange: (x: number, y: number) => void;
}

export function WorkflowCanvas({ children, svgLayer, zoom, panX, panY, onZoomChange, onPanChange }: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZoom = Math.min(2, Math.max(0.2, zoom + delta));

    // Zoom centered on cursor
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const scale = newZoom / zoom;
      const newPanX = cx - scale * (cx - panX);
      const newPanY = cy - scale * (cy - panY);
      onPanChange(newPanX, newPanY);
    }
    onZoomChange(newZoom);
  }, [zoom, panX, panY, onZoomChange, onPanChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on middle-click or when clicking empty canvas
    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).dataset.canvas === 'true')) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    onPanChange(panX + dx, panY + dy);
  }, [panX, panY, onPanChange]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background cursor-grab active:cursor-grabbing select-none"
      style={{ 
        backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${panX}px ${panY}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-canvas="true"
    >
      {/* SVG connections layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {svgLayer}
        </g>
      </svg>

      {/* Nodes layer */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          zIndex: 2,
        }}
        data-canvas="true"
      >
        {children}
      </div>
    </div>
  );
}
