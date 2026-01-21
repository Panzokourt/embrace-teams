import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupedTableSectionProps {
  groupKey: string;
  groupLabel: string;
  itemCount: number;
  colSpan: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
}

export function GroupedTableSection({
  groupKey,
  groupLabel,
  itemCount,
  colSpan,
  children,
  defaultExpanded = true,
  badge,
}: GroupedTableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <>
      <TableRow 
        className="bg-muted/30 hover:bg-muted/50 cursor-pointer border-y"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell colSpan={colSpan} className="py-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="font-medium text-sm">{groupLabel}</span>
            {badge}
            <Badge variant="secondary" className="text-xs ml-1">
              {itemCount}
            </Badge>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && children}
    </>
  );
}
