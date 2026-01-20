import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

interface DroppableColumnProps {
  id: string;
  items: string[];
  children: React.ReactNode;
  className?: string;
}

export function DroppableColumn({ id, items, children, className }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[200px] rounded-lg transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/20",
        className
      )}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}
