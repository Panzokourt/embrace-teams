import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings2, GripVertical, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WidgetSize, WidgetViewType } from '@/hooks/useDashboardConfig';

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

const VIEW_LABELS: Record<WidgetViewType, string> = {
  card: 'Card',
  table: 'Table',
  list: 'List',
};

interface WidgetWrapperProps {
  id: string;
  size: WidgetSize;
  viewType?: WidgetViewType;
  onResize: (size: WidgetSize) => void;
  onHide: () => void;
  onViewTypeChange?: (vt: WidgetViewType) => void;
  className?: string;
  children: React.ReactNode;
}

export default function WidgetWrapper({
  id, size, viewType, onResize, onHide, onViewTypeChange, className, children,
}: WidgetWrapperProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const supportedViews: WidgetViewType[] | undefined = undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative',
        isDragging && 'opacity-50 z-50',
        className
      )}
      {...attributes}
    >
      {/* Controls overlay - visible on hover */}
      <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...listeners}
          className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              className="h-6 w-6 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground"
              aria-label="Widget settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-3 space-y-3">
            {/* Size */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Μέγεθος</p>
              <div className="flex gap-1">
                {SIZE_OPTIONS.map(s => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={size === s.value ? 'default' : 'outline'}
                    className="h-7 flex-1 text-xs"
                    onClick={() => onResize(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* View type */}
            {supportedViews && supportedViews.length > 1 && onViewTypeChange && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Προβολή</p>
                <div className="flex gap-1">
                  {supportedViews.map(vt => (
                    <Button
                      key={vt}
                      size="sm"
                      variant={viewType === vt ? 'default' : 'outline'}
                      className="h-7 flex-1 text-xs"
                      onClick={() => onViewTypeChange(vt)}
                    >
                      {VIEW_LABELS[vt]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Hide */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground justify-start gap-2"
              onClick={() => { onHide(); setPopoverOpen(false); }}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Απόκρυψη
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {children}
    </div>
  );
}
