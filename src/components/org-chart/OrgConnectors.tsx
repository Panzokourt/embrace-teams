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

function getOffsetRelativeTo(el: HTMLElement, container: HTMLElement): { top: number; left: number; width: number; height: number } {
  let top = 0;
  let left = 0;
  let current: HTMLElement | null = el;
  while (current && current !== container) {
    top += current.offsetTop;
    left += current.offsetLeft;
    current = current.offsetParent as HTMLElement | null;
  }
  return { top, left, width: el.offsetWidth, height: el.offsetHeight };
}

export function OrgConnectors({ lines, containerRef }: OrgConnectorsProps) {
  const [paths, setPaths] = useState<PathData[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const newPaths: PathData[] = [];

    for (const line of lines) {
      const parentEl = container.querySelector(`[data-node-id="${line.parentId}"]`) as HTMLElement | null;
      const childEl = container.querySelector(`[data-node-id="${line.childId}"]`) as HTMLElement | null;
      if (!parentEl || !childEl) continue;

      const pOffset = getOffsetRelativeTo(parentEl, container);
      const chOffset = getOffsetRelativeTo(childEl, container);

      const x1 = pOffset.left + pOffset.width / 2;
      const y1 = pOffset.top + pOffset.height;
      const x2 = chOffset.left + chOffset.width / 2;
      const y2 = chOffset.top;

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

  // Recompute after layout settling
  useEffect(() => {
    const timers = [
      setTimeout(computePaths, 50),
      setTimeout(computePaths, 200),
      setTimeout(computePaths, 500),
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
          stroke={p.color + '60'}
          strokeWidth={2.5}
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
