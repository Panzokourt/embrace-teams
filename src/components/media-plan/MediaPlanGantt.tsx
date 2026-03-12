import { useMemo, useState, useRef, useCallback } from 'react';
import { format, differenceInDays, addDays, startOfDay, max, min } from 'date-fns';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS, type MediaActionStatus, OBJECTIVES } from './mediaConstants';
import { getChannelGroup, DEFAULT_CHANNEL_TAXONOMY } from './channelTaxonomy';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GanttItem {
  id: string;
  title: string | null;
  medium: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  budget: number | null;
  objective: string | null;
  dependency_id: string | null;
  owner_id: string | null;
}

interface MediaPlanGanttProps {
  items: GanttItem[];
  onSelectItem: (id: string) => void;
  selectedItemId: string | null;
  onInlineUpdate?: (itemId: string, field: string, value: any) => void;
  groupBy?: string;
}

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';
type ColorBy = 'status' | 'channel' | 'objective';

// Color maps for channel groups
const CHANNEL_GROUP_COLORS: Record<string, string> = {
  'Paid Digital': 'bg-blue-500/60',
  'Organic / Owned': 'bg-green-500/60',
  'PR / Earned': 'bg-purple-500/60',
  'Offline / Hybrid': 'bg-amber-500/60',
  'Internal / CRM / Retention': 'bg-rose-500/60',
};

const OBJECTIVE_COLORS: Record<string, string> = {
  'Brand Awareness': 'bg-sky-500/60',
  'Reach': 'bg-indigo-500/60',
  'Traffic': 'bg-teal-500/60',
  'Engagement': 'bg-pink-500/60',
  'Lead Generation': 'bg-orange-500/60',
  'Conversions': 'bg-emerald-500/60',
  'Sales': 'bg-green-600/60',
  'App Installs': 'bg-violet-500/60',
  'Video Views': 'bg-red-500/60',
};

function getBarColor(item: GanttItem, colorBy: ColorBy): string {
  if (colorBy === 'status') {
    const sc = STATUS_COLORS[item.status as MediaActionStatus];
    return sc || 'bg-primary/20';
  }
  if (colorBy === 'channel') {
    const group = getChannelGroup(item.medium);
    return group ? CHANNEL_GROUP_COLORS[group] || 'bg-primary/30' : 'bg-primary/30';
  }
  if (colorBy === 'objective') {
    return OBJECTIVE_COLORS[item.objective || ''] || 'bg-primary/30';
  }
  return 'bg-primary/20';
}

export function MediaPlanGantt({ items, onSelectItem, selectedItemId, onInlineUpdate, groupBy }: MediaPlanGanttProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [colorBy, setColorBy] = useState<ColorBy>('status');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    type: 'move' | 'resize-start' | 'resize-end';
    itemId: string;
    startX: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);

  const validItems = useMemo(() => items.filter(i => i.start_date), [items]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (validItems.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: today, timelineEnd: addDays(today, 30), totalDays: 30 };
    }
    const starts = validItems.map(i => new Date(i.start_date!));
    const ends = validItems.map(i => i.end_date ? new Date(i.end_date) : new Date(i.start_date!));
    const earliest = addDays(min(starts), -3);
    const latest = addDays(max(ends), 7);
    return {
      timelineStart: earliest,
      timelineEnd: latest,
      totalDays: Math.max(differenceInDays(latest, earliest), 7),
    };
  }, [validItems]);

  const dayWidth = zoom === 'day' ? 40 : zoom === 'week' ? 16 : zoom === 'month' ? 5 : 2;
  const timelineWidth = totalDays * dayWidth;

  // Group items
  const groupedItems = useMemo(() => {
    if (!groupBy || groupBy === 'none') return [{ key: '__all__', label: '', items: validItems }];
    const groups = new Map<string, GanttItem[]>();
    validItems.forEach(item => {
      const val = (item as any)[groupBy] || 'Uncategorized';
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val)!.push(item);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: groupBy === 'status' ? STATUS_LABELS[key as MediaActionStatus] || key : key,
      items,
    }));
  }, [validItems, groupBy]);

  // Flat list for rendering (with group headers)
  const flatRows = useMemo(() => {
    const rows: { type: 'group' | 'item'; key: string; label?: string; item?: GanttItem; count?: number }[] = [];
    groupedItems.forEach(g => {
      if (g.key !== '__all__') {
        rows.push({ type: 'group', key: g.key, label: g.label, count: g.items.length });
      }
      if (g.key === '__all__' || !collapsedGroups.has(g.key)) {
        g.items.forEach(item => rows.push({ type: 'item', key: item.id, item }));
      }
    });
    return rows;
  }, [groupedItems, collapsedGroups]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Date headers
  const dateHeaders = useMemo(() => {
    const headers: { date: Date; label: string; isToday: boolean }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(timelineStart, i);
      const isT = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      if (zoom === 'day') {
        headers.push({ date: d, label: format(d, 'dd'), isToday: isT });
      } else if (zoom === 'week' && d.getDay() === 1) {
        headers.push({ date: d, label: format(d, 'dd/MM'), isToday: false });
      } else if (zoom === 'month' && d.getDate() === 1) {
        headers.push({ date: d, label: format(d, 'MMM'), isToday: false });
      } else if (zoom === 'quarter' && d.getDate() === 1 && [0, 3, 6, 9].includes(d.getMonth())) {
        headers.push({ date: d, label: `Q${Math.floor(d.getMonth() / 3) + 1} ${format(d, 'yy')}`, isToday: false });
      }
    }
    return headers;
  }, [totalDays, timelineStart, zoom]);

  const todayOffset = differenceInDays(startOfDay(new Date()), timelineStart) * dayWidth;

  // Item positions map for dependency lines
  const itemPositions = useMemo(() => {
    const positions = new Map<string, { left: number; right: number; row: number }>();
    let rowIdx = 0;
    flatRows.forEach(r => {
      if (r.type === 'group') { rowIdx++; return; }
      const item = r.item!;
      const start = differenceInDays(new Date(item.start_date!), timelineStart);
      const end = item.end_date ? differenceInDays(new Date(item.end_date), timelineStart) : start;
      positions.set(item.id, {
        left: start * dayWidth,
        right: (end + 1) * dayWidth,
        row: rowIdx,
      });
      rowIdx++;
    });
    return positions;
  }, [flatRows, timelineStart, dayWidth]);

  // Dependencies
  const dependencyLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    validItems.forEach(item => {
      if (!item.dependency_id) return;
      const from = itemPositions.get(item.dependency_id);
      const to = itemPositions.get(item.id);
      if (from && to) {
        lines.push({
          x1: from.right,
          y1: from.row * 40 + 20, // center of row (40px height)
          x2: to.left,
          y2: to.row * 40 + 20,
        });
      }
    });
    return lines;
  }, [validItems, itemPositions]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, itemId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    if (!onInlineUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    const item = validItems.find(i => i.id === itemId);
    if (!item) return;
    dragRef.current = {
      type,
      itemId,
      startX: e.clientX,
      originalStart: item.start_date!,
      originalEnd: item.end_date || item.start_date!,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const daysDelta = Math.round(dx / dayWidth);
      if (daysDelta === 0) return;

      const { type, itemId, originalStart, originalEnd } = dragRef.current;
      if (type === 'move') {
        const newStart = format(addDays(new Date(originalStart), daysDelta), 'yyyy-MM-dd');
        const newEnd = format(addDays(new Date(originalEnd), daysDelta), 'yyyy-MM-dd');
        onInlineUpdate(itemId, 'start_date', newStart);
        onInlineUpdate(itemId, 'end_date', newEnd);
      } else if (type === 'resize-end') {
        const newEnd = addDays(new Date(originalEnd), daysDelta);
        if (newEnd >= new Date(originalStart)) {
          onInlineUpdate(itemId, 'end_date', format(newEnd, 'yyyy-MM-dd'));
        }
      } else if (type === 'resize-start') {
        const newStart = addDays(new Date(originalStart), daysDelta);
        if (newStart <= new Date(originalEnd)) {
          onInlineUpdate(itemId, 'start_date', format(newStart, 'yyyy-MM-dd'));
        }
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onInlineUpdate, validItems, dayWidth]);

  const ROW_HEIGHT = 40;
  const HEADER_HEIGHT = 32;
  const totalHeight = HEADER_HEIGHT + flatRows.length * ROW_HEIGHT;

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
          {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map(z => (
            <Button key={z} variant={zoom === z ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5 text-xs" onClick={() => setZoom(z)}>
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </Button>
          ))}
        </div>
        <Select value={colorBy} onValueChange={v => setColorBy(v as ColorBy)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Color by Status</SelectItem>
            <SelectItem value="channel">Color by Channel</SelectItem>
            <SelectItem value="objective">Color by Objective</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl overflow-auto" style={{ maxHeight: '65vh' }} ref={containerRef}>
        <div className="flex">
          {/* Labels column */}
          <div className="sticky left-0 z-20 bg-card border-r min-w-[220px]">
            <div className="h-8 border-b bg-muted/30 flex items-center px-3 text-xs font-medium text-muted-foreground">
              Action
            </div>
            {flatRows.map(row => (
              row.type === 'group' ? (
                <div
                  key={`g-${row.key}`}
                  className="h-10 border-b px-3 flex items-center gap-2 text-xs font-semibold bg-muted/20 cursor-pointer hover:bg-muted/40"
                  onClick={() => toggleGroup(row.key)}
                >
                  {collapsedGroups.has(row.key) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {row.label} <span className="text-muted-foreground font-normal">({row.count})</span>
                </div>
              ) : (
                <div
                  key={row.key}
                  className={cn(
                    'h-10 border-b px-3 flex items-center text-xs cursor-pointer truncate transition-colors',
                    selectedItemId === row.key ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                  )}
                  onClick={() => onSelectItem(row.key)}
                >
                  {row.item!.title || row.item!.medium}
                </div>
              )
            ))}
          </div>

          {/* Timeline area */}
          <div style={{ minWidth: timelineWidth }} className="relative">
            {/* Header */}
            <div className="h-8 border-b bg-muted/30 flex items-end relative">
              {dateHeaders.map((h, i) => {
                const offset = differenceInDays(h.date, timelineStart) * dayWidth;
                return (
                  <div
                    key={i}
                    className={cn('absolute text-[10px] text-muted-foreground', h.isToday && 'text-primary font-bold')}
                    style={{ left: offset, bottom: 2 }}
                  >
                    {h.label}
                  </div>
                );
              })}
            </div>

            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= timelineWidth && (
              <div className="absolute top-8 bottom-0 w-px bg-primary/50 z-10" style={{ left: todayOffset }} />
            )}

            {/* SVG dependency lines */}
            <svg
              className="absolute top-8 left-0 pointer-events-none z-[5]"
              width={timelineWidth}
              height={flatRows.length * ROW_HEIGHT}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" className="fill-muted-foreground/60" />
                </marker>
              </defs>
              {dependencyLines.map((line, i) => {
                const midX = (line.x1 + line.x2) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                    fill="none"
                    className="stroke-muted-foreground/40"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
            </svg>

            {/* Rows */}
            {flatRows.map(row => {
              if (row.type === 'group') {
                return <div key={`g-${row.key}`} className="h-10 border-b bg-muted/10" />;
              }
              const item = row.item!;
              const start = differenceInDays(new Date(item.start_date!), timelineStart);
              const end = item.end_date ? differenceInDays(new Date(item.end_date), timelineStart) : start;
              const barLeft = start * dayWidth;
              const barWidth = Math.max((end - start + 1) * dayWidth, dayWidth);
              const barColor = getBarColor(item, colorBy);

              return (
                <div key={row.key} className="h-10 border-b relative flex items-center">
                  <div
                    className={cn('absolute h-6 rounded-md cursor-pointer transition-opacity hover:opacity-80 group', barColor)}
                    style={{ left: barLeft, width: barWidth }}
                    onClick={() => onSelectItem(item.id)}
                    title={`${item.title || item.medium} (${item.start_date} → ${item.end_date || item.start_date})`}
                  >
                    {/* Resize handle left */}
                    {onInlineUpdate && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-foreground/10 rounded-l-md"
                        onMouseDown={e => handleMouseDown(e, item.id, 'resize-start')}
                      />
                    )}
                    <span
                      className="text-[10px] font-medium px-2 truncate block leading-6 select-none"
                      onMouseDown={e => onInlineUpdate && handleMouseDown(e, item.id, 'move')}
                    >
                      {zoom !== 'quarter' && (item.title || item.medium)}
                    </span>
                    {/* Resize handle right */}
                    {onInlineUpdate && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-foreground/10 rounded-r-md"
                        onMouseDown={e => handleMouseDown(e, item.id, 'resize-end')}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {validItems.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No actions with dates to display. Add start dates to your actions.
        </p>
      )}
    </div>
  );
}
