

# Task Files — Task-Scoped Files, Drag & Drop & Non-Empty Indicator

## Τρέχουσα κατάσταση
- Η καρτέλα "Αρχεία" στο TaskDetail δείχνει `<FileExplorer projectId={task.project_id} />` — δηλαδή **όλα τα αρχεία του project**, όχι τα αρχεία του task.
- Η `file_attachments` table έχει ήδη `task_id` column — αλλά δεν χρησιμοποιείται στο FileExplorer.
- Drag & drop λειτουργεί ήδη στο FinderColumnView (OS files + internal move).
- Δεν υπάρχει visual indicator σε φακέλους που περιέχουν αρχεία.

## Αλλαγές

### 1. Task-scoped file filtering
- Προσθήκη `taskId` prop στο `FileExplorer` component.
- Όταν `taskId` είναι παρόν, τα queries θα φιλτράρουν `file_attachments` με `.eq('task_id', taskId)` και `file_folders` με project scope (φάκελοι είναι κοινοί σε project level).
- Κατά το upload, αν υπάρχει `taskId`, θα γράφεται αυτόματα στο `task_id` field.
- Στο TaskDetail: `<FileExplorer projectId={task.project_id} taskId={task.id} />`

### 2. Non-empty folder indicator
- Στο `FinderColumnView`, υπολογισμός ενός `Set` με τα folder IDs που έχουν τουλάχιστον ένα αρχείο ή child folder.
- Εμφάνιση μικρού dot/badge δίπλα στο folder icon (πριν το chevron) για τους μη-κενούς φακέλους.

### 3. Drag & Drop στο folder area
- Ήδη υποστηρίζεται — θα βεβαιωθούμε ότι λειτουργεί σωστά και στο task context (τα uploads θα παίρνουν task_id).

## Files

| File | Αλλαγή |
|------|--------|
| `src/components/files/FileExplorer.tsx` | Προσθήκη `taskId` prop, φιλτράρισμα queries, pass task_id σε uploads |
| `src/components/files/FinderColumnView.tsx` | Non-empty folder indicator (dot badge) |
| `src/pages/TaskDetail.tsx` | Pass `taskId={task.id}` στο FileExplorer |

