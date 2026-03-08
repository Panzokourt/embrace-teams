import { cn } from '@/lib/utils';

export interface ConnectionData {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label?: string;
  selected?: boolean;
}

interface WorkflowConnectionProps {
  connection: ConnectionData;
  onClick?: () => void;
}

export function WorkflowConnection({ connection, onClick }: WorkflowConnectionProps) {
  const { fromX, fromY, toX, toY, label, selected } = connection;

  const dx = toX - fromX;
  const cpOffset = Math.max(60, Math.abs(dx) * 0.4);

  const path = `M ${fromX} ${fromY} C ${fromX + cpOffset} ${fromY}, ${toX - cpOffset} ${toY}, ${toX} ${toY}`;

  // Midpoint for label
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  return (
    <g className="cursor-pointer" onClick={onClick}>
      {/* Wider invisible hit area */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={16} className="pointer-events-auto" />

      {/* Visible path */}
      <path
        d={path}
        fill="none"
        stroke={selected ? 'hsl(var(--ring))' : 'hsl(var(--muted-foreground) / 0.35)'}
        strokeWidth={selected ? 2.5 : 2}
        strokeDasharray={selected ? 'none' : '6 3'}
        className="transition-all"
      >
        <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1s" repeatCount="indefinite" />
      </path>

      {/* Arrow head */}
      <polygon
        points={`${toX - 8},${toY - 5} ${toX},${toY} ${toX - 8},${toY + 5}`}
        fill={selected ? 'hsl(var(--ring))' : 'hsl(var(--muted-foreground) / 0.35)'}
      />

      {/* Label chip */}
      {label && (
        <g>
          <rect
            x={midX - label.length * 3.5 - 8}
            y={midY - 10}
            width={label.length * 7 + 16}
            height={20}
            rx={10}
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth={1}
            className="pointer-events-auto"
          />
          <text
            x={midX}
            y={midY + 4}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize={10}
            fontWeight={500}
            fontFamily="Inter, sans-serif"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

/** Temporary line while dragging a new connection */
export function WorkflowConnectionDraft({ fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number }) {
  const dx = toX - fromX;
  const cpOffset = Math.max(40, Math.abs(dx) * 0.3);
  const path = `M ${fromX} ${fromY} C ${fromX + cpOffset} ${fromY}, ${toX - cpOffset} ${toY}, ${toX} ${toY}`;

  return (
    <path
      d={path}
      fill="none"
      stroke="hsl(var(--ring) / 0.5)"
      strokeWidth={2}
      strokeDasharray="4 4"
    />
  );
}
