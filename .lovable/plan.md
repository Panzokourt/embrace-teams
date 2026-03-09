

# Monday.com-Style Task Table UI

## Τι αλλάζει

Μετασχηματισμός του πίνακα tasks σε Monday.com-inspired UI με χρωματιστές ομάδες, colored status/priority cells, summary row ανά ομάδα, και "+ Add task" inline row.

## Σημεία εφαρμογής
1. **TasksTableView** (σελίδα Tasks)
2. **ProjectTasksTable** (tab Tasks μέσα σε έργο)
3. **MyWork** (task lists — ελαφρύτερη προσαρμογή)

## Αλλαγές UI/UX

### 1. Χρωματιστές Ομάδες (Grouped Sections)
- Κάθε group (π.χ. "To-Do", "Completed") παίρνει μια χρωματιστή μπάρα αριστερά (border-left-4) και χρωματιστό header
- Τα χρώματα αντιστοιχούν στο status group: μπλε για To-Do, πράσινο για Done, πορτοκαλί για Working, κόκκινο για Stuck
- Default groupBy = 'status' αντί 'none'

### 2. Status & Priority ως Colored Badges (full-width cells)
- **Status cells**: Πλήρως χρωματισμένα backgrounds (π.χ. πορτοκαλί "Working on it", πράσινο "Done", κόκκινο "Stuck") — αντί plain text badges
- **Priority cells**: Χρωματιστά badges (πράσινο Low, κίτρινο Medium, κόκκινο High) σαν Monday.com
- Χρήση του ήδη υπάρχοντος `EnhancedInlineEditCell` type="select" αλλά με νέο `type="color-select"` rendering

### 3. Summary Row ανά Ομάδα
- Κάτω από κάθε group: μια summary row που δείχνει aggregated data
- Status: mini color bars (stacked horizontal)
- Priority: mini color bars
- Due date: range "Mar 6 - 11"
- Hours/Budget: sum

### 4. "+ Add task" Row
- Τελευταία γραμμή κάθε group: μια κενή γραμμή με "+ Add task" placeholder
- Click → inline input για γρήγορη δημιουργία task

### 5. Owner Column Avatar Style
- Η στήλη Owner δείχνει avatar circle (ήδη υπάρχει) αλλά centered, μεγαλύτερο

## Αρχεία προς τροποποίηση

1. **`src/components/shared/GroupedTableSection.tsx`** — Νέο Monday-style colored group header με border-left, colored background, collapse toggle
2. **`src/components/tasks/TasksTableView.tsx`** — Default groupBy='status', summary rows, "+ Add task" rows, colored status/priority cells
3. **`src/components/projects/ProjectTasksTable.tsx`** — Ίδιες αλλαγές: grouping, colored cells, summary rows, add task row
4. **`src/components/shared/EnhancedInlineEditCell.tsx`** — Νέος render mode για colored full-width status/priority display
5. **`src/pages/MyWork.tsx`** — Ελαφρύτερη προσαρμογή: colored status badges στα task items

## Τεχνικά

- Δεν χρειάζεται migration ή backend αλλαγή
- Όλα τα χρώματα ορίζονται σε config objects (STATUS_COLORS, PRIORITY_COLORS) ανά component
- Τα summary rows υπολογίζονται client-side από τα tasks κάθε group
- Το GroupedTableSection γίνεται reusable Monday-style component με color prop

