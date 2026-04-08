import { useRef, useState, useCallback } from 'react';
import { format, addDays } from 'date-fns';

interface DragState {
  type: 'move' | 'resize-start' | 'resize-end';
  itemId: string;
  startX: number;
  originalStart: string;
  originalEnd: string;
  hasMoved: boolean;
}

interface DragOverride {
  start: string;
  end: string;
}

interface UseGanttDragOptions {
  /** Pixels per day in the current view */
  getDayWidth: () => number;
  /** Called on mouseup with final dates */
  onDragEnd: (itemId: string, startDate: string, endDate: string) => void;
}

export function useGanttDrag({ getDayWidth, onDragEnd }: UseGanttDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const [dragOverrides, setDragOverrides] = useState<Map<string, DragOverride>>(new Map());

  const getOverriddenDates = useCallback((itemId: string, originalStart: string, originalEnd: string) => {
    const override = dragOverrides.get(itemId);
    return override || { start: originalStart, end: originalEnd };
  }, [dragOverrides]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    itemId: string,
    type: DragState['type'],
    originalStart: string,
    originalEnd: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      type,
      itemId,
      startX: e.clientX,
      originalStart,
      originalEnd,
      hasMoved: false,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      if (Math.abs(dx) < 3 && !dragRef.current.hasMoved) return;
      dragRef.current.hasMoved = true;

      const dayWidth = getDayWidth();
      const daysDelta = Math.round(dx / dayWidth);
      const { type, itemId, originalStart, originalEnd } = dragRef.current;

      let newStart = originalStart;
      let newEnd = originalEnd;

      if (type === 'move') {
        newStart = format(addDays(new Date(originalStart), daysDelta), 'yyyy-MM-dd');
        newEnd = format(addDays(new Date(originalEnd), daysDelta), 'yyyy-MM-dd');
      } else if (type === 'resize-end') {
        const ne = addDays(new Date(originalEnd), daysDelta);
        if (ne >= new Date(originalStart)) {
          newEnd = format(ne, 'yyyy-MM-dd');
        }
      } else if (type === 'resize-start') {
        const ns = addDays(new Date(originalStart), daysDelta);
        if (ns <= new Date(originalEnd)) {
          newStart = format(ns, 'yyyy-MM-dd');
        }
      }

      setDragOverrides(prev => {
        const next = new Map(prev);
        next.set(itemId, { start: newStart, end: newEnd });
        return next;
      });
    };

    const handleMouseUp = () => {
      const state = dragRef.current;
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (state?.hasMoved) {
        const override = dragOverrides.get(state.itemId);
        // Use the latest from the map, but if not yet set, compute from last dx
        setDragOverrides(prev => {
          const next = new Map(prev);
          const final = next.get(state.itemId);
          next.delete(state.itemId);
          if (final) {
            onDragEnd(state.itemId, final.start, final.end);
          }
          return next;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [getDayWidth, onDragEnd, dragOverrides]);

  const isDragging = useCallback((itemId: string) => {
    return dragOverrides.has(itemId);
  }, [dragOverrides]);

  const wasDragged = useCallback(() => {
    return dragRef.current?.hasMoved ?? false;
  }, []);

  return {
    dragOverrides,
    getOverriddenDates,
    handleMouseDown,
    isDragging,
    wasDragged,
  };
}
