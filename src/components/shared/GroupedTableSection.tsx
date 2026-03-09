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
  color?: string;
  summaryRow?: React.ReactNode;
  addTaskRow?: React.ReactNode;
}

export function GroupedTableSection({
  groupKey,
  groupLabel,
  itemCount,
  colSpan,
  children,
  defaultExpanded = true,
  badge,
  color,
  summaryRow,
  addTaskRow,
}: GroupedTableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <>
      <TableRow 
        className="hover:bg-transparent cursor-pointer border-y"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          borderLeft: color ? `4px solid ${color}` : undefined,
          backgroundColor: color ? `${color}12` : undefined,
        }}
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
            <span 
              className="font-semibold text-sm"
              style={{ color: color || undefined }}
            >
              {groupLabel}
            </span>
            {badge}
            <Badge variant="secondary" className="text-xs ml-1">
              {itemCount}
            </Badge>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <>
          {children}
          {summaryRow}
          {addTaskRow}
        </>
      )}
    </>
  );
}
