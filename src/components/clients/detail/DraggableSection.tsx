import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  onHide?: (id: string) => void;
  children: React.ReactNode;
}

export function DraggableSection({ id, onHide, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative group/section', isDragging && 'opacity-50 z-50')}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
        {onHide && (
          <button
            type="button"
            onClick={() => onHide(id)}
            className="h-6 w-6 rounded-md bg-background/90 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 shadow-sm"
            title="Απόκρυψη section"
            aria-label="Απόκρυψη section"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="h-6 w-6 rounded-md bg-background/90 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shadow-sm touch-none"
          title="Μετακίνηση section"
          aria-label="Μετακίνηση section"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}
