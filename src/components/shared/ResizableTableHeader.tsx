import { useState, useRef, useCallback } from 'react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ResizableTableHeaderProps {
  children: React.ReactNode;
  width?: number;
  minWidth?: number;
  onWidthChange?: (width: number) => void;
  className?: string;
  onClick?: () => void;
}

export function ResizableTableHeader({
  children,
  width,
  minWidth = 80,
  onWidthChange,
  className,
  onClick
}: ResizableTableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const headerRef = useRef<HTMLTableCellElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!headerRef.current) return;

    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = headerRef.current.offsetWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [minWidth, onWidthChange]);

  return (
    <TableHead
      ref={headerRef}
      className={cn("relative select-none", className)}
      style={{ width: width ? `${width}px` : undefined }}
      onClick={onClick}>

      {children}
      
      {/* Resize Handle */}
      {onWidthChange &&
      <div
        className={cn("absolute right-0 top-0 h-full w-1 cursor-col-resize group bg-popover",


        isResizing && "bg-primary/50"
        )}
        onMouseDown={handleMouseDown}>

          <div className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-border rounded-full",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isResizing && "opacity-100"
        )} />
        </div>
      }
    </TableHead>);

}