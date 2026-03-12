import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { MEDIA_ACTION_STATUSES, STATUS_LABELS, STATUS_COLORS, type MediaActionStatus } from './mediaConstants';
import { getChannelGroup } from './channelTaxonomy';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, DollarSign, User } from 'lucide-react';

interface BoardItem {
  id: string;
  title: string | null;
  medium: string;
  status: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  objective: string | null;
  owner_id: string | null;
}

interface MediaPlanBoardProps {
  items: BoardItem[];
  onSelectItem: (id: string) => void;
  selectedItemId: string | null;
  onInlineUpdate: (itemId: string, field: string, value: any) => void;
  profiles?: { id: string; full_name: string | null }[];
}

type GroupMode = 'status' | 'channel' | 'objective';

function SortableCard({ item, onSelectItem, selectedItemId, profiles }: {
  item: BoardItem;
  onSelectItem: (id: string) => void;
  selectedItemId: string | null;
  profiles?: { id: string; full_name: string | null }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const owner = profiles?.find(p => p.id === item.owner_id);
  const channelGroup = getChannelGroup(item.medium);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all touch-none',
        isDragging && 'opacity-50 shadow-lg z-50',
        selectedItemId === item.id && 'ring-2 ring-primary',
      )}
      onClick={() => onSelectItem(item.id)}
    >
      <p className="text-sm font-medium truncate mb-1.5">{item.title || item.medium}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.medium}</Badge>
        {channelGroup && (
          <span className="text-[10px] text-muted-foreground">{channelGroup}</span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
        {item.budget != null && (
          <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{item.budget.toLocaleString()}</span>
        )}
        {item.start_date && (
          <span className="flex items-center gap-0.5"><CalendarDays className="h-3 w-3" />{item.start_date}</span>
        )}
        {owner && (
          <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{owner.full_name}</span>
        )}
      </div>
    </div>
  );
}

export function MediaPlanBoard({ items, onSelectItem, selectedItemId, onInlineUpdate, profiles }: MediaPlanBoardProps) {
  const [groupMode, setGroupMode] = useState<GroupMode>('status');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    if (groupMode === 'status') {
      return MEDIA_ACTION_STATUSES.map(s => ({
        key: s,
        label: STATUS_LABELS[s],
        colorClass: STATUS_COLORS[s],
        items: items.filter(i => (i.status || 'draft') === s),
      }));
    }
    // Generic grouping
    const field = groupMode === 'channel' ? 'medium' : 'objective';
    const groups = new Map<string, BoardItem[]>();
    items.forEach(item => {
      const val = (item as any)[field] || 'Uncategorized';
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val)!.push(item);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: key,
      colorClass: 'bg-muted text-foreground',
      items,
    }));
  }, [items, groupMode]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    const itemId = active.id as string;
    // Find which column the item was dropped into
    const targetColumn = columns.find(col =>
      col.key === over.id || col.items.some(i => i.id === over.id)
    );

    if (targetColumn && groupMode === 'status') {
      const item = items.find(i => i.id === itemId);
      if (item && item.status !== targetColumn.key) {
        onInlineUpdate(itemId, 'status', targetColumn.key);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={groupMode} onValueChange={v => setGroupMode(v as GroupMode)}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Group by Status</SelectItem>
            <SelectItem value="channel">Group by Channel</SelectItem>
            <SelectItem value="objective">Group by Objective</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '50vh' }}>
          {columns.map(col => (
            <div key={col.key} className="flex-shrink-0 w-[280px]">
              <div className={cn('rounded-t-lg px-3 py-2 flex items-center justify-between', col.colorClass)}>
                <span className="text-xs font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{col.items.length}</Badge>
              </div>
              <div className="bg-muted/20 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[100px]">
                <SortableContext items={col.items.map(i => i.id)} strategy={verticalListSortingStrategy} id={col.key}>
                  {col.items.map(item => (
                    <SortableCard
                      key={item.id}
                      item={item}
                      onSelectItem={onSelectItem}
                      selectedItemId={selectedItemId}
                      profiles={profiles}
                    />
                  ))}
                  {col.items.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">Drop here</div>
                  )}
                </SortableContext>
              </div>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
