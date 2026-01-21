import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Columns3, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // If true, column cannot be hidden
}

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  className?: string;
}

export function ColumnVisibilityToggle({
  columns,
  onColumnsChange,
  className
}: ColumnVisibilityToggleProps) {
  const [open, setOpen] = useState(false);

  const toggleColumn = (columnId: string) => {
    const newColumns = columns.map(col => 
      col.id === columnId && !col.locked 
        ? { ...col, visible: !col.visible }
        : col
    );
    onColumnsChange(newColumns);
  };

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Columns3 className="h-4 w-4" />
          Στήλες ({visibleCount}/{columns.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-1">
          <h4 className="font-medium text-sm mb-3">Εμφάνιση Στηλών</h4>
          {columns.map((column) => (
            <div 
              key={column.id}
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted transition-colors",
                column.locked && "opacity-50"
              )}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
              <Checkbox
                id={column.id}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
                disabled={column.locked}
              />
              <label 
                htmlFor={column.id}
                className={cn(
                  "text-sm flex-1 cursor-pointer select-none",
                  column.locked && "cursor-not-allowed"
                )}
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
