

# Interactive Drag & Resize σε όλα τα Gantt Views

## Τρέχουσα κατάσταση

- **MediaPlanGantt** — ήδη υποστηρίζει drag (move) και resize (left/right handles)
- **ProjectGanttView** — μόνο click → popover edit
- **TaskGanttView** — μόνο click → popover edit
- **ProjectMediaPlan GanttView** — στατικό, χωρίς interaction

## Λύση

Προσθήκη drag-to-move και resize handles (αριστερά/δεξιά) σε κάθε Gantt bar, με real-time visual feedback και save στο DB κατά το mouseup.

## Αλλαγές

### 1. `src/components/projects/ProjectGanttView.tsx`
- Προσθήκη `dragRef` state για tracking drag type (move/resize-start/resize-end), αρχικό mouseX, original dates
- Κάθε bar γίνεται `group` class, με δύο resize handles (αριστερά/δεξιά, `cursor-ew-resize`, visible on hover)
- `onMouseDown` στο bar body = move, στα handles = resize
- `mousemove` listener υπολογίζει daysDelta βάσει pixel width per tick, ενημερώνει visual position
- `mouseup` κάνει `supabase.from('projects').update({ start_date, end_date })` και trigger `onProjectUpdated()`
- Το popover edit παραμένει ως fallback (click χωρίς drag)

### 2. `src/components/tasks/TaskGanttView.tsx`
- Ίδιο pattern: `dragRef`, resize handles, mousemove/mouseup
- `mouseup` κάνει `supabase.from('tasks').update({ start_date, due_date })` και `onTaskUpdated()`
- Διαχωρισμός click vs drag: αν δεν υπήρξε movement (< 3px), ανοίγει popover· αλλιώς save dates

### 3. `src/components/projects/ProjectMediaPlan.tsx` (GanttView function)
- Προσθήκη `onItemUpdate` callback prop
- Ίδιο drag/resize pattern στα bars
- Save μέσω parent component που κάνει update στον `media_plan_items` table

## Τεχνική Υλοποίηση

Κοινό pattern για όλα:

```typescript
// Drag state ref
const dragRef = useRef<{
  type: 'move' | 'resize-start' | 'resize-end';
  itemId: string;
  startX: number;
  originalStart: string;
  originalEnd: string;
} | null>(null);

// Local overrides for visual feedback during drag
const [dragOverrides, setDragOverrides] = useState<Map<string, { start: string; end: string }>>(new Map());

// onMouseDown → set dragRef, add window listeners
// onMouseMove → calculate daysDelta, update dragOverrides for live preview
// onMouseUp → save to DB, clear dragOverrides, refresh data
```

Τα bars θα χρησιμοποιούν τα `dragOverrides` dates αντί των πραγματικών κατά τη διάρκεια του drag, ώστε ο χρήστης να βλέπει real-time preview.

