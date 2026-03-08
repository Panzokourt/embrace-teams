import { useMemo } from 'react';

interface MinimapNode {
  x: number;
  y: number;
  type?: string;
}

interface WorkflowMinimapProps {
  nodes: MinimapNode[];
  zoom: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (x: number, y: number) => void;
}

export function WorkflowMinimap({ nodes, zoom, panX, panY, canvasWidth, canvasHeight, onNavigate }: WorkflowMinimapProps) {
  const MINIMAP_W = 160;
  const MINIMAP_H = 100;

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600, scaleX: 1, scaleY: 1 };
    const padding = 100;
    const minX = Math.min(...nodes.map(n => n.x)) - padding;
    const minY = Math.min(...nodes.map(n => n.y)) - padding;
    const maxX = Math.max(...nodes.map(n => n.x)) + padding;
    const maxY = Math.max(...nodes.map(n => n.y)) + padding;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    return { minX, minY, maxX, maxY, scaleX: MINIMAP_W / rangeX, scaleY: MINIMAP_H / rangeY };
  }, [nodes]);

  const viewportX = (-panX / zoom - bounds.minX) * bounds.scaleX;
  const viewportY = (-panY / zoom - bounds.minY) * bounds.scaleY;
  const viewportW = (canvasWidth / zoom) * bounds.scaleX;
  const viewportH = (canvasHeight / zoom) * bounds.scaleY;

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = mx / bounds.scaleX + bounds.minX;
    const worldY = my / bounds.scaleY + bounds.minY;
    onNavigate(-worldX * zoom + canvasWidth / 2, -worldY * zoom + canvasHeight / 2);
  };

  return (
    <div
      className="absolute bottom-4 right-4 border border-border/50 rounded-xl bg-card/90 backdrop-blur-sm shadow-soft overflow-hidden cursor-pointer"
      style={{ width: MINIMAP_W, height: MINIMAP_H, zIndex: 10 }}
      onClick={handleClick}
    >
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={(n.x - bounds.minX) * bounds.scaleX}
            cy={(n.y - bounds.minY) * bounds.scaleY}
            r={3}
            fill={n.type === 'start' ? 'hsl(var(--success))' : n.type === 'end' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground) / 0.5)'}
          />
        ))}
        <rect
          x={viewportX}
          y={viewportY}
          width={Math.max(viewportW, 10)}
          height={Math.max(viewportH, 8)}
          fill="hsl(var(--ring) / 0.15)"
          stroke="hsl(var(--ring))"
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  );
}
