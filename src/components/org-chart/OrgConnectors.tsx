import { useEffect, useRef, useState, useCallback } from 'react';

interface ConnectorLine {
  parentId: string;
  childId: string;
  color: string;
}

interface OrgConnectorsProps {
  lines: ConnectorLine[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface PathData {
  d: string;
  color: string;
  key: string;
}

export function OrgConnectors({ lines, containerRef }: OrgConnectorsProps) {
  const [paths, setPaths] = useState<PathData[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const newPaths: PathData[] = [];

    for (const line of lines) {
      const parentEl = container.querySelector(`[data-node-id="${line.parentId}"]`);
      const childEl = container.querySelector(`[data-node-id="${line.childId}"]`);
      if (!parentEl || !childEl) continue;

      const pRect = parentEl.getBoundingClientRect();
      const chRect = childEl.getBoundingClientRect();

      const x1 = pRect.left + pRect.width / 2 - cRect.left;
      const y1 = pRect.bottom - cRect.top;
      const x2 = chRect.left + chRect.width / 2 - cRect.left;
      const y2 = chRect.top - cRect.top;

      const midY = y1 + (y2 - y1) * 0.5;

      const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

      newPaths.push({ d, color: line.color, key: `${line.parentId}-${line.childId}` });
    }

    setPaths(newPaths);
  }, [lines, containerRef]);

  useEffect(() => {
    computePaths();
    const observer = new MutationObserver(computePaths);
    const container = containerRef.current;
    if (container) {
      observer.observe(container, { childList: true, subtree: true, attributes: true });
    }
    window.addEventListener('resize', computePaths);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', computePaths);
    };
  }, [computePaths]);

  // Recompute periodically after mount for layout settling
  useEffect(() => {
    const timers = [
      setTimeout(computePaths, 100),
      setTimeout(computePaths, 300),
      setTimeout(computePaths, 600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [computePaths]);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <style>{`
          @keyframes dashFlow {
            to { stroke-dashoffset: -20; }
          }
        `}</style>
      </defs>
      {paths.map(p => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke={p.color + '40'}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            strokeDasharray: '6 4',
            animation: 'dashFlow 1.5s linear infinite',
          }}
        />
      ))}
    </svg>
  );
}
