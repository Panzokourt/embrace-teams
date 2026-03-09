

# Πλάνο: Drag & Drop Reordering στο Sidebar Project Tree (Manual Mode)

## Τρέχουσα Κατάσταση

Το sidebar ήδη υποστηρίζει drag-and-drop **μόνο για μετακίνηση projects σε φακέλους**. Χρησιμοποιεί `@dnd-kit/core` με `useDraggable` / `useDroppable`. Δεν υπάρχει reordering (αλλαγή σειράς) ούτε drag φακέλων.

## Τι θα προστεθεί

1. **Reorder projects μέσα σε φάκελο** — drag ένα project πάνω/κάτω για αλλαγή σειράς
2. **Reorder φακέλων** — drag φάκελο για αλλαγή σειράς στο root level
3. **Move project σε άλλο φάκελο** — ήδη λειτουργεί, θα βελτιωθεί με highlight
4. **Move φάκελο σε άλλο φάκελο** — nested folders via drag

## Τεχνική Προσέγγιση

### Database
- Ο πίνακας `project_folders` ήδη έχει `sort_order` και `parent_folder_id` — δεν χρειάζεται migration
- Ο πίνακας `projects` χρειάζεται ένα `sort_order` πεδίο για reordering εντός φακέλου — **νέα migration**

### Migration
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sidebar_sort_order integer DEFAULT 0;
```

### Component Changes (`SidebarProjectTree.tsx`)

**Φάκελοι:**
- Κάνω τους φακέλους draggable (με `useDraggable`) + droppable (ήδη είναι)
- Στο `handleDragEnd`: αν σύρω φάκελο πάνω σε φάκελο → `parent_folder_id` update
- Αν σύρω φάκελο στο root → `parent_folder_id = null`
- Reorder: update `sort_order` σε όλους τους siblings

**Projects:**
- Κάνω τα projects sortable μέσα στον φάκελό τους (χρήση `@dnd-kit/sortable` αντί για απλό `useDraggable`)
- Στο drag end: αν ο target φάκελος διαφέρει → move, αλλιώς → reorder (update `sidebar_sort_order`)

**Visual feedback:**
- Highlight (ring + bg change) στο drop target folder — ήδη υπάρχει μέσω `isOver`, θα ενισχυθεί
- `DragOverlay` ήδη υπάρχει — θα προστεθεί και για folders

### Αρχεία προς τροποποίηση
- `src/components/layout/SidebarProjectTree.tsx` — κύριες αλλαγές DnD logic
- Migration για `sidebar_sort_order` στο projects table

### Queries
- Projects query θα κάνει `order('sidebar_sort_order')` αντί `order('name')`
- Folders query ήδη κάνει `order('sort_order')`

