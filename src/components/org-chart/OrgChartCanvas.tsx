import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Hand, MousePointer } from 'lucide-react';

interface OrgChartCanvasProps {
  children: ReactNode;
  className?: string;
}

export function OrgChartCanvas({ children, className = '' }: OrgChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [handMode, setHandMode] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const clampZoom = (z: number) => Math.min(2, Math.max(0.2, z));

  // Wheel → zoom centered on cursor
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = clampZoom(zoom * factor);
    const ratio = newZoom / zoom;

    setPan(prev => ({
      x: cursorX - ratio * (cursorX - prev.x),
      y: cursorY - ratio * (cursorY - prev.y),
    }));
    setZoom(newZoom);
  }, [zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Space key for hand mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const isHandActive = handMode || spaceHeld;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Middle-click or hand mode or space
    if (e.button === 1 || (e.button === 0 && isHandActive)) {
      e.preventDefault();
      setIsPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [isHandActive]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, [isPanning]);

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const cRect = container.getBoundingClientRect();
    const sRect = content.scrollWidth;
    const sHeight = content.scrollHeight;

    const scaleX = (cRect.width - 80) / sRect;
    const scaleY = (cRect.height - 80) / sHeight;
    const newZoom = clampZoom(Math.min(scaleX, scaleY, 1));

    setZoom(newZoom);
    setPan({
      x: (cRect.width - sRect * newZoom) / 2,
      y: (cRect.height - sHeight * newZoom) / 2,
    });
  }, []);

  // Touch: pinch-to-zoom + two-finger pan
  const touchRef = useRef<{ dist: number; cx: number; cy: number; zoom: number; panX: number; panY: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      touchRef.current = { dist, cx, cy, zoom, panX: pan.x, panY: pan.y };
    }
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;

      const ratio = dist / touchRef.current.dist;
      const newZoom = clampZoom(touchRef.current.zoom * ratio);

      const dx = cx - touchRef.current.cx;
      const dy = cy - touchRef.current.cy;

      setPan({
        x: touchRef.current.panX + dx,
        y: touchRef.current.panY + dy,
      });
      setZoom(newZoom);
    }
  }, []);

  return (
    <div className={`relative overflow-hidden bg-muted/30 rounded-xl border border-border ${className}`}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-sm">
        <Button
          variant={handMode ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => setHandMode(!handMode)}
          title="Hand tool (Space)"
        >
          {handMode ? <Hand className="h-4 w-4" /> : <MousePointer className="h-4 w-4" />}
        </Button>
        <div className="w-px h-5 bg-border" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(z => clampZoom(z * 0.85)); }}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center font-mono select-none">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(z => clampZoom(z * 1.15)); }}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToScreen} title="Fit to screen">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[600px]"
        style={{ cursor: isHandActive ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div
          ref={contentRef}
          className="origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
